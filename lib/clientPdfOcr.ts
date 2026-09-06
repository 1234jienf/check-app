"use client";

/**
 * 브라우저에서 PDF 글자 추출 → 없으면 Tesseract OCR.
 * 서버(Vercel) 시간 제한을 피하기 위해 PC에서 돌립니다. API 비용 없음.
 */

import { createWorker, PSM } from "tesseract.js";

export type ClientOcrProgress = {
  phase: "load" | "text" | "ocr" | "done";
  page: number;
  total: number;
  message: string;
};

function looksUseful(text: string): boolean {
  // 임베디드 글자가 조금이라도 있으면 OCR로 넘기지 않음
  const compact = text.replace(/\s/g, "");
  if (compact.length < 40) return false;
  return /[가-힣A-Za-z0-9\[\]①-⑮]/.test(compact);
}

/** pdf.js TextItem → 줄바꿈 유지 텍스트 (2단은 y→x 정렬) */
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

  // 위→아래, 같으면 왼→오
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
      // 단어 간격
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
  // CDN worker — Next 번들 worker 경로 이슈 회피
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  return pdfjs;
}

/** 임베디드 텍스트 먼저 시도 */
async function extractEmbeddedText(
  data: ArrayBuffer,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<{ text: string; pages: number }> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
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

  return { text: parts.join("\n\n").trim(), pages: total };
}

/** 페이지 캔버스 → OCR (2단이면 왼/오 반씩) */
async function ocrPdfPages(
  data: ArrayBuffer,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<{ text: string; pages: number }> {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
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
        message: `이미지 OCR 중… ${i}/${total} (브라우저에서 처리, 기다려 주세요)`,
      });

      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<
        typeof page.render
      >[0]).promise;

      // 넓은 페이지(2단)면 왼→오 분리
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

    return { text: parts.join("\n\n").trim(), pages: total };
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
  const data = await file.arrayBuffer();

  const embedded = await extractEmbeddedText(data, onProgress);
  if (looksUseful(embedded.text)) {
    onProgress?.({
      phase: "done",
      page: embedded.pages,
      total: embedded.pages,
      message: `텍스트 PDF로 인식됨 (${embedded.pages}p) → 한글 변환`,
    });
    return { text: embedded.text, pages: embedded.pages, via: "text" };
  }

  onProgress?.({
    phase: "ocr",
    page: 0,
    total: embedded.pages || 0,
    message: "임베디드 글자 없음 → 이미지 OCR 시작…",
  });
  const ocr = await ocrPdfPages(data, onProgress);
  if (!ocr.text.trim()) {
    throw new Error("브라우저 OCR 결과가 비어 있습니다. 복붙용 .txt를 올려 주세요.");
  }
  onProgress?.({
    phase: "done",
    page: ocr.pages,
    total: ocr.pages,
    message: "OCR 완료",
  });
  return { text: ocr.text, pages: ocr.pages, via: "ocr" };
}
