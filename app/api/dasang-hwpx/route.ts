import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  assignHoeNumbers,
  detectHoes,
  parseExamGroups,
  splitRoundsByRestart,
} from "@/lib/parseExamGroups";
import { buildHwpxBuffer, zipBuffers } from "@/lib/buildHwpx";
import { extractPdfText } from "@/lib/extractPdfText";
import { ocrPdfToExamText } from "@/lib/ocrPdfWithTesseract";

export const runtime = "nodejs";
export const maxDuration = 300;

const STORAGE_PREFIX = "dasang-hwpx/";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function isSafeStoragePath(path: string): boolean {
  return (
    !!path &&
    path.startsWith(STORAGE_PREFIX) &&
    !path.includes("..") &&
    !path.includes("\\") &&
    path.toLowerCase().endsWith(".pdf")
  );
}

/** 업로드 파일명 → 확장자 없는 안전한 출력 베이스명 */
function outputBaseName(fileName: string): string {
  const raw = (fileName || "").trim().replace(/^.*[\\/]/, "");
  const noExt = raw.replace(/\.(pdf|txt|md)$/i, "").trim();
  const cleaned = noExt
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  return cleaned || "변환결과";
}

function looksLikeExamText(text: string): boolean {
  const chars = text.replace(/\s/g, "").length;
  if (chars < 80) return false;
  if (/\[\d+\s*[~～]\s*\d+\]/.test(text)) return true;
  if (/\([가나다라마바사]\)/.test(text)) return true;
  if (/[①②③④⑤]/.test(text) && /[가-힣]{30,}/.test(text)) return true;
  return /[가-힣]{80,}/.test(text);
}

/** 수능 등 [1~3] 없는 본문도 HWPX 파이프라인이 받도록 최소 구간 표기 부여 */
function ensureGroupMarker(text: string): string {
  if (/\[\d+\s*[~～]\s*\d+\]/.test(text)) return text;
  return `[1~50]\n${text.trim()}`;
}

async function textFromPdfBuf(
  buf: Buffer
): Promise<{ fullText: string; sourceNote: string } | { error: string; status: number }> {
  const extracted = await extractPdfText(buf);
  if (looksLikeExamText(extracted.text)) {
    return {
      fullText: ensureGroupMarker(extracted.text),
      sourceNote: `PDF 텍스트 추출 (${extracted.pages || "?"}p)`,
    };
  }

  try {
    const ocr = await ocrPdfToExamText(buf);
    if (!looksLikeExamText(ocr.text)) {
      return {
        error: "OCR은 됐지만 본문을 충분히 읽지 못했습니다. 복붙용 .txt를 올려 주세요.",
        status: 400,
      };
    }
    const note =
      ocr.ocrPages < ocr.pages
        ? `이미지 PDF Tesseract OCR (${ocr.ocrPages}/${ocr.pages}p)`
        : `이미지 PDF Tesseract OCR (${ocr.pages}p)`;
    return { fullText: ensureGroupMarker(ocr.text), sourceNote: note };
  } catch (e: unknown) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 180);
    return {
      error: `이미지 PDF OCR 실패: ${msg}. 복붙용 .txt를 올려 주세요.`,
      status: 400,
    };
  }
}

async function loadPdfFromStorage(
  storagePath: string
): Promise<{ buf: Buffer; cleanupStorage: () => Promise<void> }> {
  if (!isSafeStoragePath(storagePath)) {
    throw new Error("잘못된 저장 경로입니다.");
  }

  const service = getServiceClient();
  const { data, error } = await service.storage.from("files").download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || "Storage에서 PDF를 받지 못했습니다.");
  }

  const buf = Buffer.from(await data.arrayBuffer());
  const cleanupStorage = async () => {
    try {
      await service.storage.from("files").remove([storagePath]);
    } catch {
      /* ignore */
    }
  };

  return { buf, cleanupStorage };
}

export async function POST(request: NextRequest) {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(tmpdir(), `dasang_hwpx_${stamp}`);
  let cleanupStorage: (() => Promise<void>) | null = null;

  try {
    await mkdir(workDir, { recursive: true });
    const formData = await request.formData();
    const hoeRaw = String(formData.get("hoe") || "");
    const pasted = String(formData.get("text") || "").trim();
    const file = formData.get("file") as File | null;
    const storagePath = String(formData.get("storagePath") || "").trim();
    const originalName = String(formData.get("originalName") || "").trim();
    const fileName = file?.name || originalName || "";

    const hoeHints = detectHoes(hoeRaw, fileName);

    let fullText = pasted;
    let sourceNote = pasted ? "붙여넣기 텍스트" : "";

    if (storagePath) {
      const loaded = await loadPdfFromStorage(storagePath);
      cleanupStorage = loaded.cleanupStorage;
      // keep a local copy for debugging if needed
      await writeFile(join(workDir, `input_${stamp}.pdf`), loaded.buf);
      const fromPdf = await textFromPdfBuf(loaded.buf);
      if ("error" in fromPdf) {
        return NextResponse.json({ error: fromPdf.error }, { status: fromPdf.status });
      }
      fullText = fromPdf.fullText;
      sourceNote = `Storage PDF → ${fromPdf.sourceNote}`;
    } else if (file && file.size > 0) {
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());

      if (name.endsWith(".txt") || name.endsWith(".md")) {
        fullText = buf.toString("utf-8");
        sourceNote = `업로드 텍스트: ${file.name}`;
      } else if (name.endsWith(".pdf")) {
        const fromPdf = await textFromPdfBuf(buf);
        if ("error" in fromPdf) {
          return NextResponse.json({ error: fromPdf.error }, { status: fromPdf.status });
        }
        fullText = fromPdf.fullText;
        sourceNote = fromPdf.sourceNote;
      } else {
        return NextResponse.json(
          { error: ".txt(복붙용) 또는 .pdf 파일만 지원합니다." },
          { status: 400 }
        );
      }
    }

    if (!fullText || fullText.replace(/\s/g, "").length < 40) {
      return NextResponse.json(
        { error: "변환할 텍스트가 없습니다. PDF/복붙용 txt를 올려 주세요." },
        { status: 400 }
      );
    }

    if (!/\[\d+\s*[~～]\s*\d+\]/.test(fullText)) {
      return NextResponse.json(
        { error: "[1~3] 같은 지문 구간 표기가 없습니다. 복붙용 형식인지 확인해 주세요." },
        { status: 400 }
      );
    }

    const chunks = splitRoundsByRestart(fullText);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "회차로 나눌 본문을 찾지 못했습니다." }, { status: 400 });
    }

    const hoes = assignHoeNumbers(chunks.length, hoeHints);
    const jobs = chunks.map((text, i) => ({ hoe: hoes[i], text }));
    sourceNote = `${sourceNote} · ${chunks.length}개 회차([1~ 재시작 기준)`;

    const files: { name: string; buffer: Buffer }[] = [];
    const metaJobs: { hoe: number; groups: number; questions: number; labels: string[] }[] = [];
    const base = outputBaseName(fileName);

    for (const job of jobs) {
      const groups = parseExamGroups(job.text);
      if (!groups.length) throw new Error(`${job.hoe}회 지문 그룹을 찾지 못했습니다.`);

      const built = await buildHwpxBuffer({
        rawText: job.text,
        groups,
        hoe: job.hoe,
      });
      const outName =
        jobs.length === 1 ? `${base}.hwpx` : `${base}_${job.hoe}회.hwpx`;
      files.push({
        name: outName,
        buffer: built.buffer,
      });
      metaJobs.push({
        hoe: job.hoe,
        groups: built.meta.groups,
        questions: built.meta.questions,
        labels: built.meta.labels,
      });
    }

    if (files.length === 1) {
      const one = files[0];
      const meta = metaJobs[0];
      return new NextResponse(new Uint8Array(one.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(one.name)}`,
          "X-Dasang-Meta": encodeURIComponent(
            JSON.stringify({
              hoes: [meta.hoe],
              hoe: meta.hoe,
              groups: meta.groups,
              questions: meta.questions,
              labels: meta.labels,
              source: sourceNote,
            })
          ),
        },
      });
    }

    const zipBuf = await zipBuffers(files);
    const zipName = `${base}.zip`;
    return new NextResponse(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`,
        "X-Dasang-Meta": encodeURIComponent(
          JSON.stringify({
            hoes: metaJobs.map((b) => b.hoe),
            files: files.map((f) => f.name),
            source: sourceNote,
          })
        ),
      },
    });
  } catch (error: any) {
    const msg = error?.message || "한글 변환 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (cleanupStorage) {
      await cleanupStorage();
    }
    try {
      const { rm } = await import("fs/promises");
      await rm(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
