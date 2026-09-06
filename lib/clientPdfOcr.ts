"use client";

/**
 * 브라우저에서 PDF 글자 추출 → 없으면 Tesseract OCR.
 * pdf.js가 ArrayBuffer를 detach 하므로, 복사본으로 한 번만 연다.
 */

import { createWorker, PSM } from "tesseract.js";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ClientOcrProgress = {
  phase: "load" | "text" | "ocr" | "done";
  page: number;
  total: number;
  message: string;
};

function looksUseful(text: string): boolean {
  const compact = text.replace(/\s/g, "");
  if (compact.length < 40) return false;
  return /[가-힣A-Za-z0-9\[\]①-⑮]/.test(compact);
}

function textFromPdfItems(items: unknown[]): string {
  type Row = { str: string; x: number; y: number };
  const rows: Row[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object" || !("str" in it)) continue;
    const item = it as { str: string; transform?: number[] };
    const str = String(item.str || "");
    if (!str) continue;
    const tr = item.transform || [1, 0, 0, 1, 0, 0];
    rows.push({ str, x: tr[4] || 0, y: tr[5] || 0 });
  }
  if (!rows.length) return "";

  rows.sort((a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) > 3) return dy;
    return a.x - b.x;
  });

  let out = "";
  let lastY: number | null = null;
  let lastX: number | null = null;
  for (const r of rows) {
    if (lastY != null && Math.abs(lastY - r.y) > 4) {
      out += "\n";
    } else if (lastX != null && r.x - lastX > 2) {
      if (!/\s$/.test(out) && !/^\s/.test(r.str)) out += " ";
    }
    out += r.str;
    lastY = r.y;
    lastX = r.x + r.str.length * 2;
  }
  return out.trim();
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  return pdfjs;
}

/** 파일 → 독립 복사본 (pdf.js transfer/detach 대비) */
async function fileToOwnedBytes(file: File): Promise<Uint8Array> {
  const ab = await file.arrayBuffer();
  // slice로 새 ArrayBuffer를 만들고, 그걸 감싼 Uint8Array를 넘긴다
  return new Uint8Array(ab.slice(0));
}

async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  // 매 호출마다 복사본을 넘겨 pdf.js가 원본을 잡아도 안전
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}

async function extractEmbeddedText(
  doc: PDFDocumentProxy,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<string> {
  const total = doc.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= total; i++) {
    onProgress?.({
      phase: "text",
      page: i,
      total,
      message: `글자 추출 중… ${i}/${total}`,
    });
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(textFromPdfItems(content.items as unknown[]));
  }

  return parts.join("\n\n").trim();
}

async function ocrPdfPages(
  doc: PDFDocumentProxy,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<string> {
  const total = doc.numPages;
  const worker = await createWorker(["kor", "eng"], 1, {
    logger: () => undefined,
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });

    const parts: string[] = [];
    const scale = 1.6;

    for (let i = 1; i <= total; i++) {
      onProgress?.({
        phase: "ocr",
        page: i,
        total,
        message: `이미지 OCR 중… ${i}/${total} (브라우저에서 처리)`,
      });

      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      const task = page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as never);
      await task.promise;

      const isTwoCol = canvas.width > canvas.height * 0.85;
      if (isTwoCol) {
        const mid = Math.floor(canvas.width / 2);
        const overlap = Math.max(10, Math.floor(canvas.width * 0.02));

        const left = document.createElement("canvas");
        left.width = mid + overlap;
        left.height = canvas.height;
        left.getContext("2d")!.drawImage(
          canvas,
          0,
          0,
          left.width,
          canvas.height,
          0,
          0,
          left.width,
          canvas.height
        );

        const right = document.createElement("canvas");
        right.width = canvas.width - mid + overlap;
        right.height = canvas.height;
        right.getContext("2d")!.drawImage(
          canvas,
          mid - overlap,
          0,
          right.width,
          canvas.height,
          0,
          0,
          right.width,
          canvas.height
        );

        const leftRes = await worker.recognize(left);
        const rightRes = await worker.recognize(right);
        const pageText = [leftRes.data.text, rightRes.data.text]
          .map((t) => t.replace(/\r/g, "").trim())
          .filter(Boolean)
          .join("\n\n");
        if (pageText) parts.push(pageText);
      } else {
        const rec = await worker.recognize(canvas);
        const pageText = String(rec.data.text || "")
          .replace(/\r/g, "")
          .trim();
        if (pageText) parts.push(pageText);
      }
    }

    return parts.join("\n\n").trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * PDF File → 본문 텍스트 (임베디드 글자 우선, 없으면 브라우저 OCR)
 */
export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<{ text: string; pages: number; via: "text" | "ocr" }> {
  onProgress?.({
    phase: "load",
    page: 0,
    total: 0,
    message: "PDF 읽는 중…",
  });

  const bytes = await fileToOwnedBytes(file);
  const doc = await openPdf(bytes);
  const pages = doc.numPages;

  try {
    const embedded = await extractEmbeddedText(doc, onProgress);
    if (looksUseful(embedded)) {
      onProgress?.({
        phase: "done",
        page: pages,
        total: pages,
        message: `텍스트 PDF로 인식됨 (${pages}p) → 한글 변환`,
      });
      return { text: embedded, pages, via: "text" };
    }

    onProgress?.({
      phase: "ocr",
      page: 0,
      total: pages,
      message: "임베디드 글자 없음 → 이미지 OCR 시작…",
    });

    const ocrText = await ocrPdfPages(doc, onProgress);
    if (!ocrText.trim()) {
      throw new Error("브라우저 OCR 결과가 비어 있습니다. 복붙용 .txt를 올려 주세요.");
    }
    onProgress?.({
      phase: "done",
      page: pages,
      total: pages,
      message: "OCR 완료",
    });
    return { text: ocrText, pages, via: "ocr" };
  } finally {
    try {
      await (doc as { cleanup?: () => Promise<void> | void }).cleanup?.();
    } catch {
      /* ignore */
    }
  }
}
