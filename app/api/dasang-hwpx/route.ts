import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

function pythonCmd() {
  return process.platform === "win32" ? "python" : "python3";
}

function parseJsonFromOutput(stdout: string): any {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        return JSON.parse(line);
      } catch {
        /* continue */
      }
    }
  }
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(stdout.slice(start, end + 1));
  }
  throw new Error(`JSON 파싱 실패: ${stdout.slice(0, 200)}`);
}

/** "5,6회" / "3~4회" / "5회" / "5,6" → [5,6] */
function detectHoes(...sources: string[]): number[] {
  const found = new Set<number>();
  for (const src of sources) {
    if (!src) continue;
    const range = src.match(/(\d+)\s*[,~,\-]\s*(\d+)\s*회?/);
    if (range) {
      const a = parseInt(range[1], 10);
      const b = parseInt(range[2], 10);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) found.add(i);
      continue;
    }
    const single = src.match(/(\d+)\s*회/);
    if (single) found.add(parseInt(single[1], 10));
    for (const part of src.split(/[,|/]/)) {
      const n = parseInt(part.trim(), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 99) found.add(n);
    }
  }
  const list = [...found].filter((n) => n >= 1 && n <= 99).sort((a, b) => a - b);
  return list.length > 0 ? list : [3];
}

async function extractPdfText(pdfPath: string): Promise<{ text: string; pages: number }> {
  const script = `
import sys, json, warnings
warnings.filterwarnings("ignore")
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        print(json.dumps({"error": "PyMuPDF가 필요합니다. pip install pymupdf"}))
        sys.exit(1)
doc = fitz.open(sys.argv[1])
parts = []
for page in doc:
    parts.append(page.get_text("text"))
text = "\\n".join(parts).strip()
print(json.dumps({"text": text, "pages": len(doc)}, ensure_ascii=False))
`;
  const scriptPath = join(tmpdir(), `pdf_extract_${Date.now()}.py`);
  await writeFile(scriptPath, script, "utf-8");
  try {
    const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONWARNINGS: "ignore" };
    const { stdout, stderr } = await execAsync(
      `${pythonCmd()} -W ignore "${scriptPath}" "${pdfPath}"`,
      { maxBuffer: 20 * 1024 * 1024, env }
    );
    const parsed = parseJsonFromOutput(stdout || stderr || "");
    if (parsed.error) throw new Error(parsed.error);
    return { text: parsed.text || "", pages: parsed.pages || 0 };
  } finally {
    try {
      await unlink(scriptPath);
    } catch {
      /* ignore */
    }
  }
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
      (n) =>
        n.endsWith(".txt") &&
        n.includes(`${hoe}회`) &&
        n.includes("전체") &&
        n.includes("복붙")
    );
    return hit ? join(blogMacro, hit) : null;
  } catch {
    return null;
  }
}

/** 문항 구간이 다시 [1~…]으로 시작하면 회차 분리 */
function splitRoundsByRestart(text: string): string[] {
  const re = /\[1\s*[~～]\s*\d+\]/g;
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    indices.push(m.index);
  }
  if (indices.length === 0) {
    return text.trim() ? [text.trim()] : [];
  }
  const chunks: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.replace(/\s/g, "").length >= 40) chunks.push(chunk);
  }
  return chunks;
}

/** 분리된 덩어리 개수에 맞춰 회차 번호 부여 (파일명은 라벨 힌트만) */
function assignHoeNumbers(chunkCount: number, hints: number[]): number[] {
  if (chunkCount <= 0) return [];
  if (hints.length >= chunkCount) return hints.slice(0, chunkCount);
  if (hints.length === 1) {
    const start = hints[0];
    return Array.from({ length: chunkCount }, (_, i) => start + i);
  }
  if (hints.length > 0) {
    const out = [...hints];
    let n = hints[hints.length - 1] + 1;
    while (out.length < chunkCount) out.push(n++);
    return out;
  }
  return Array.from({ length: chunkCount }, (_, i) => i + 1);
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

async function buildHwpx(
  rawText: string,
  hoe: number,
  workDir: string,
  stamp: string
): Promise<{ outPath: string; meta: any }> {
  const scriptPath = join(process.cwd(), "scripts", "rebuild_clean_hwpx.py");
  const templatePath = join(process.cwd(), "scripts", "dasang_template.hwpx");
  if (!existsSync(scriptPath)) throw new Error("변환 스크립트가 없습니다.");
  if (!existsSync(templatePath)) throw new Error("한글 템플릿(dasang_template.hwpx)이 없습니다.");

  const textPath = join(workDir, `input_${hoe}_${stamp}.txt`);
  const outPath = join(workDir, `다상다독_${hoe}회_클린최종.hwpx`);
  await writeFile(textPath, rawText, "utf-8");

  const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONWARNINGS: "ignore" };
  const cmd = [
    pythonCmd(),
    "-W ignore",
    `"${scriptPath}"`,
    `--text "${textPath}"`,
    `--hoe ${hoe}`,
    `--out "${outPath}"`,
    `--template "${templatePath}"`,
    `--json`,
  ].join(" ");

  let stdout = "";
  try {
    const result = await execAsync(cmd, {
      maxBuffer: 20 * 1024 * 1024,
      env,
      timeout: 180000,
    });
    stdout = result.stdout || "";
  } catch (e: any) {
    stdout = e.stdout || "";
    const stderr = e.stderr || e.message || "";
    let metaErr: any = null;
    try {
      metaErr = parseJsonFromOutput(stdout);
    } catch {
      /* ignore */
    }
    throw new Error(metaErr?.error || stderr || `${hoe}회 HWPX 변환 실패`);
  }

  let meta: any = {};
  try {
    meta = parseJsonFromOutput(stdout);
  } catch {
    meta = {};
  }
  if (meta.error) throw new Error(meta.error);
  if (!existsSync(outPath)) throw new Error(`${hoe}회 HWPX 생성 실패`);

  return { outPath, meta };
}

async function zipFiles(
  files: { path: string; name: string }[],
  zipPath: string
): Promise<void> {
  const script = `
import json, sys, zipfile
with open(sys.argv[1], encoding="utf-8") as f:
    files = json.load(f)
out = sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for item in files:
        z.write(item["path"], arcname=item["name"])
print(json.dumps({"ok": True, "count": len(files)}))
`;
  const scriptPath = join(tmpdir(), `zip_${Date.now()}.py`);
  const listPath = join(tmpdir(), `zip_list_${Date.now()}.json`);
  await writeFile(scriptPath, script, "utf-8");
  await writeFile(listPath, JSON.stringify(files), "utf-8");
  try {
    const env = { ...process.env, PYTHONIOENCODING: "utf-8" };
    await execAsync(
      `${pythonCmd()} -W ignore "${scriptPath}" "${listPath}" "${zipPath}"`,
      { maxBuffer: 5 * 1024 * 1024, env }
    );
  } finally {
    try {
      await unlink(scriptPath);
    } catch {
      /* ignore */
    }
    try {
      await unlink(listPath);
    } catch {
      /* ignore */
    }
  }
}

export async function POST(request: NextRequest) {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(tmpdir(), `dasang_hwpx_${stamp}`);

  try {
    await mkdir(workDir, { recursive: true });
    const formData = await request.formData();
    const hoeRaw = String(formData.get("hoe") || "");
    const pasted = String(formData.get("text") || "").trim();
    const file = formData.get("file") as File | null;
    const fileName = file?.name || "";

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
        const pdfPath = join(workDir, `input_${stamp}.pdf`);
        await writeFile(pdfPath, buf);
        const extracted = await extractPdfText(pdfPath);
        const chars = extracted.text.replace(/\s/g, "").length;

        if (chars >= 80 && /\[\d+~\d+\]/.test(extracted.text)) {
          fullText = extracted.text;
          sourceNote = `PDF 텍스트 추출 (${extracted.pages}p)`;
        } else {
          // 이미지 PDF: 복붙용을 이어 붙인 뒤, 본문에서 [1~ 재시작으로 회차 분리
          fullText = await loadBundledTexts(hoeHints);
          sourceNote = `이미지 PDF → 복붙용 합친 뒤 [1~ 재시작으로 분리`;
        }
      } else {
        return NextResponse.json(
          { error: ".txt(복붙용) 또는 .pdf 파일만 지원합니다." },
          { status: 400 }
        );
      }
    }

    if (!fullText || fullText.replace(/\s/g, "").length < 40) {
      // 최후: 힌트 회차 복붙용
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

    // 핵심: 번호가 다시 [1~…]으로 시작하는 지점마다 회차 분리
    const chunks = splitRoundsByRestart(fullText);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "회차로 나눌 본문을 찾지 못했습니다." }, { status: 400 });
    }

    const hoes = assignHoeNumbers(chunks.length, hoeHints);
    const jobs = chunks.map((text, i) => ({ hoe: hoes[i], text }));
    sourceNote = `${sourceNote} · ${chunks.length}개 회차([1~ 재시작 기준)`;

    const built: { hoe: number; outPath: string; meta: any }[] = [];
    for (const job of jobs) {
      const { outPath, meta } = await buildHwpx(job.text, job.hoe, workDir, stamp);
      built.push({ hoe: job.hoe, outPath, meta });
    }

    if (built.length === 1) {
      const one = built[0];
      const hwpx = await readFile(one.outPath);
      const filename = `다상다독_${one.hoe}회_클린최종.hwpx`;
      return new NextResponse(hwpx, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "X-Dasang-Meta": encodeURIComponent(
            JSON.stringify({
              hoes: [one.hoe],
              hoe: one.hoe,
              groups: one.meta.groups,
              questions: one.meta.questions,
              labels: one.meta.labels,
              source: sourceNote,
            })
          ),
        },
      });
    }

    // 여러 회차 → zip
    const zipPath = join(workDir, `다상다독_${built.map((b) => b.hoe).join("-")}회_클린최종.zip`);
    await zipFiles(
      built.map((b) => ({
        path: b.outPath,
        name: `다상다독_${b.hoe}회_클린최종.hwpx`,
      })),
      zipPath
    );
    const zipBuf = await readFile(zipPath);
    const zipName = `다상다독_${built.map((b) => b.hoe).join("-")}회_클린최종.zip`;

    return new NextResponse(zipBuf, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`,
        "X-Dasang-Meta": encodeURIComponent(
          JSON.stringify({
            hoes: built.map((b) => b.hoe),
            files: built.map((b) => `다상다독_${b.hoe}회_클린최종.hwpx`),
            source: sourceNote,
          })
        ),
      },
    });
  } catch (error: any) {
    const msg = error?.message || "한글 변환 실패";
    const clean =
      msg.includes("is not valid JSON") || msg.includes("Unexpected token")
        ? `변환 중 출력 파싱 오류: ${msg.replace(/\s+/g, " ").slice(0, 180)}`
        : msg;
    return NextResponse.json({ error: clean }, { status: 500 });
  } finally {
    try {
      const { rm } = await import("fs/promises");
      await rm(workDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
