/**
 * 이미지(스캔) PDF → Tesseract OCR (API 비용 없음)
 * Vercel 시간 제한 때문에 페이지가 많으면 OCR을 시작하지 않고 바로 안내합니다.
 */

import { createWorker, PSM } from "tesseract.js";

/** 서버리스에서 현실적으로 돌릴 수 있는 상한 (페이지당 OCR이 수십 초) */
const MAX_OCR_PAGES = Number(process.env.DASANG_OCR_MAX_PAGES || 4);
const TARGET_WIDTH = Number(process.env.DASANG_OCR_WIDTH || 1000);

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

export async function ocrPdfToExamText(
  buf: Buffer
): Promise<{ text: string; pages: number; ocrPages: number }> {
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf, CanvasFactory });

  try {
    const info = await parser.getInfo();
    const total = Number((info as { total?: number })?.total || 0);
    if (!total || total < 1) {
      throw new Error("PDF 페이지 정보를 읽지 못했습니다.");
    }

    if (total > MAX_OCR_PAGES) {
      throw new Error(
        `이미지 PDF가 ${total}페이지라 서버 시간 제한으로 OCR할 수 없습니다. 복붙용 .txt를 올려 주세요. (자동 OCR은 ${MAX_OCR_PAGES}페이지 이하만 가능)`
      );
    }

    const worker = await createWorker(["kor", "eng"], 1, {
      logger: () => undefined,
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });

      const parts: string[] = [];
      for (let page = 1; page <= total; page++) {
        const result = await parser.getScreenshot({
          partial: [page],
          desiredWidth: TARGET_WIDTH,
          imageBuffer: true,
          imageDataUrl: false,
        });
        const shots = ((result as { pages?: ShotPage[] })?.pages || []) as ShotPage[];
        const png = shots[0] ? toPngBuffer(shots[0]) : null;
        if (!png) continue;

        // 페이지당 1회만 인식 (2단 분할은 시간 초과 원인)
        const rec = await worker.recognize(png);
        const pageText = String(rec.data.text || "")
          .replace(/\r/g, "")
          .trim();
        if (pageText) parts.push(pageText);
      }

      const text = parts.join("\n\n").trim();
      if (!text) throw new Error("OCR 결과가 비어 있습니다.");

      return { text, pages: total, ocrPages: total };
    } finally {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    }
  } finally {
    try {
      await (parser as { destroy?: () => Promise<void> }).destroy?.();
    } catch {
      /* ignore */
    }
  }
}
