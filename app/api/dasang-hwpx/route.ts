import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { explainGroupsWithGpt } from "@/lib/koreanExplanation";
import {
  assignHoeNumbers,
  detectHoes,
  parseExamGroups,
  splitRoundsByRestart,
} from "@/lib/parseExamGroups";
import { buildHwpxBuffer, zipBuffers } from "@/lib/buildHwpx";

export const runtime = "nodejs";
export const maxDuration = 300;

async function extractPdfText(buf: Buffer): Promise<{ text: string; pages: number }> {
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  const text = String(result?.text || "").trim();
  const pages = Number(result?.total || result?.pages || 0);
  return { text, pages };
}

function bundledPastePath(hoe: number): string | null {
  const local = join(process.cwd(), "scripts", "dasang_paste", `${hoe}.txt`);
  if (existsSync(local)) return local;

  const blogMacro = join(
    process.env.USERPROFILE || process.env.HOME || "",
    "OneDrive",
    "Desktop",
    "blog-macro"
  );
  if (!existsSync(blogMacro)) return null;
  try {
    const files = readdirSync(blogMacro) as string[];
    const hit = files.find(
      (n) => n.endsWith(".txt") && n.includes(`${hoe}회`) && n.includes("전체") && n.includes("복붙")
    );
    return hit ? join(blogMacro, hit) : null;
  } catch {
    return null;
  }
}

async function loadBundledTexts(hoes: number[]): Promise<string> {
  const parts: string[] = [];
  for (const hoe of hoes) {
    const p = bundledPastePath(hoe);
    if (!p) throw new Error(`${hoe}회 복붙용.txt를 찾지 못했습니다.`);
    parts.push(await readFile(p, "utf-8"));
  }
  return parts.join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const hoeRaw = String(formData.get("hoe") || "");
    const explain = String(formData.get("explain") || "") === "1";
    const pasted = String(formData.get("text") || "").trim();
    const file = formData.get("file") as File | null;
    const fileNameOnly = String(formData.get("fileName") || "").trim();
    const fileName = file?.name || fileNameOnly || "";
    const hoeHints = detectHoes(hoeRaw, fileName);

    let fullText = pasted;
    let sourceNote = pasted ? "붙여넣기 텍스트" : "";

    if (file && file.size > 0) {
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());

      if (name.endsWith(".txt") || name.endsWith(".md")) {
        fullText = buf.toString("utf-8");
        sourceNote = `업로드 텍스트: ${file.name}`;
      } else if (name.endsWith(".pdf")) {
        const extracted = await extractPdfText(buf);
        const chars = extracted.text.replace(/\s/g, "").length;
        if (chars >= 80 && /\[\d+~\d+\]/.test(extracted.text)) {
          fullText = extracted.text;
          sourceNote = `PDF 텍스트 추출 (${extracted.pages}p)`;
        } else {
          try {
            fullText = await loadBundledTexts(hoeHints);
            sourceNote = "이미지 PDF → 복붙용 텍스트로 변환";
          } catch {
            return NextResponse.json(
              {
                error:
                  "이 PDF에서 글자를 읽지 못했습니다. 텍스트가 있는 PDF이거나 복붙용 .txt를 올려 주세요.",
              },
              { status: 400 }
            );
          }
        }
      } else {
        return NextResponse.json(
          { error: ".txt(복붙용) 또는 .pdf 파일만 지원합니다." },
          { status: 400 }
        );
      }
    } else if (fileNameOnly) {
      // 대용량 스캔 PDF: 본문 없이 파일명만 온 경우 → 복붙용으로 변환
      try {
        fullText = await loadBundledTexts(hoeHints);
        sourceNote = `대용량 PDF(파일명만) → ${hoeHints.join(",")}회 복붙용`;
      } catch {
        return NextResponse.json(
          {
            error: `${hoeHints.join(",")}회 복붙용.txt를 서버에서 찾지 못했습니다. 복붙용 .txt를 직접 올려 주세요.`,
          },
          { status: 400 }
        );
      }
    }

    if (!fullText || fullText.replace(/\s/g, "").length < 40) {
      try {
        fullText = await loadBundledTexts(hoeHints);
        sourceNote = sourceNote || "내장 복붙용";
      } catch {
        return NextResponse.json(
          { error: "변환할 텍스트가 없습니다. PDF/복붙용 txt를 올려 주세요." },
          { status: 400 }
        );
      }
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
    sourceNote = `${sourceNote} · ${chunks.length}개 회차`;

    const files: { name: string; buffer: Buffer }[] = [];
    const metaJobs: { hoe: number; groups: number; questions: number }[] = [];

    for (const job of jobs) {
      const groups = parseExamGroups(job.text);
      if (!groups.length) throw new Error(`${job.hoe}회 지문 그룹을 찾지 못했습니다.`);

      const groupExps = explain ? await explainGroupsWithGpt(job.hoe, groups) : [];
      const built = await buildHwpxBuffer({
        rawText: job.text,
        groups,
        hoe: job.hoe,
        explanations: groupExps.length ? { groups: groupExps } : undefined,
      });
      files.push({
        name: `다상다독_${job.hoe}회_클린최종.hwpx`,
        buffer: built.buffer,
      });
      metaJobs.push({
        hoe: job.hoe,
        groups: built.meta.groups,
        questions: built.meta.questions,
      });
    }

    const hoeLabel = metaJobs.map((b) => b.hoe).join("-");
    const meta = JSON.stringify({
      hoes: metaJobs.map((b) => b.hoe),
      files: files.map((f) => f.name),
      source: sourceNote,
      explained: explain,
    });

    if (files.length === 1) {
      const one = files[0];
      return new NextResponse(one.buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(one.name)}`,
          "X-Dasang-Meta": encodeURIComponent(meta),
        },
      });
    }

    const zipBuf = await zipBuffers(files);
    const zipName = `다상다독_${hoeLabel}회_클린최종.zip`;
    return new NextResponse(zipBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`,
        "X-Dasang-Meta": encodeURIComponent(meta),
      },
    });
  } catch (error: any) {
    const msg = error?.message || "한글 변환 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
