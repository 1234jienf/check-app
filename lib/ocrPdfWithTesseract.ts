/**
 * 이미지(스캔) PDF → Tesseract OCR (API 비용 없음)
 * 2단 시험지: 페이지를 왼/오른으로 잘라 순서대로 인식.
 */

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createWorker, PSM } from "tesseract.js";

const MAX_OCR_PAGES = Number(process.env.DASANG_OCR_MAX_PAGES || 80);
const TARGET_WIDTH = Number(process.env.DASANG_OCR_WIDTH || 1600);

type ShotPage = {
  pageNumber: number;
  dataUrl?: string;
  data?: Uint8Array | Buffer;
};

function toPngBuffer(page: ShotPage): Buffer | null {
  if (page.data) return Buffer.from(page.data);
  if (page.dataUrl?.startsWith("data:")) {
    const b64 = page.dataUrl.split(",")[1] || "";
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  }
  return null;
}

async function splitColumns(png: Buffer): Promise<{ left: Buffer; right: Buffer }> {
  const img = await loadImage(png);
  const w = img.width;
  const h = img.height;
  const mid = Math.floor(w / 2);
  const overlap = Math.max(8, Math.floor(w * 0.02));

  const leftW = mid + overlap;
  const rightX = Math.max(0, mid - overlap);
  const rightW = w - rightX;

  const leftCanvas = createCanvas(leftW, h);
  const rightCanvas = createCanvas(rightW, h);
  leftCanvas.getContext("2d").drawImage(img, 0, 0, leftW, h, 0, 0, leftW, h);
  rightCanvas.getContext("2d").drawImage(img, rightX, 0, rightW, h, 0, 0, rightW, h);

  return {
    left: leftCanvas.toBuffer("image/png"),
    right: rightCanvas.toBuffer("image/png"),
  };
}

export async function ocrPdfToExamText(
  buf: Buffer
): Promise<{ text: string; pages: number; ocrPages: number }> {
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf, CanvasFactory });

  const worker = await createWorker(["kor", "eng"], 1, {
    // Vercel/서버리스에서 로그 노이즈 줄이기
    logger: () => undefined,
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: "1",
    });

    const info = await parser.getInfo();
    const total = Number((info as { total?: number })?.total || 0);
    if (!total || total < 1) {
      throw new Error("PDF 페이지 정보를 읽지 못했습니다.");
    }

    const limit = Math.min(total, MAX_OCR_PAGES);
    const parts: string[] = [];

    for (let page = 1; page <= limit; page++) {
      const result = await parser.getScreenshot({
        partial: [page],
        desiredWidth: TARGET_WIDTH,
        imageBuffer: true,
        imageDataUrl: false,
      });
      const shots = ((result as { pages?: ShotPage[] })?.pages || []) as ShotPage[];
      const png = shots[0] ? toPngBuffer(shots[0]) : null;
      if (!png) continue;

      const { left, right } = await splitColumns(png);
      const leftRes = await worker.recognize(left);
      const rightRes = await worker.recognize(right);
      const pageText = [leftRes.data.text, rightRes.data.text]
        .map((t) => t.replace(/\r/g, "").trim())
        .filter(Boolean)
        .join("\n\n");
      if (pageText) parts.push(pageText);
    }

    const text = parts.join("\n\n").trim();
    if (!text) throw new Error("OCR 결과가 비어 있습니다.");

    return { text, pages: total, ocrPages: limit };
  } finally {
    try {
      await worker.terminate();
    } catch {
      /* ignore */
    }
    try {
      await (parser as { destroy?: () => Promise<void> }).destroy?.();
    } catch {
      /* ignore */
    }
  }
}
