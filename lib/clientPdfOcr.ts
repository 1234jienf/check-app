"use client";

/**
 * 브라우저에서 PDF 임베디드 텍스트만 추출.
 * (이미지 OCR은 텍스트 PDF를 오판할 때 방해되므로 여기서 하지 않음)
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

export type ClientOcrProgress = {
  phase: "load" | "text" | "ocr" | "done";
  page: number;
  total: number;
  message: string;
};

function textFromPdfItems(items: unknown[]): string {
  type Row = { str: string; x: number; y: number };
  const rows: Row[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object" || !("str" in it)) continue;
    const item = it as { str: string; transform?: number[]; hasEOL?: boolean };
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
    } else if (lastX != null && r.x - lastX > 1.5) {
      if (!/\s$/.test(out) && !/^\s/.test(r.str)) out += " ";
    }
    out += r.str;
    lastY = r.y;
    lastX = r.x + Math.max(r.str.length, 1) * 1.5;
  }
  return out.trim();
}

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  // public/ 에 복사한 worker 사용 (CDN 실패/버전 불일치 방지)
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  const ab = await file.arrayBuffer();
  // pdf.js가 buffer를 transfer해도 원본 File은 남음
  const data = new Uint8Array(ab.slice(0));
  return pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: false,
    // 한글 CID 폰트: CMap 없으면 글자 레이어가 비어 `-- N of M --`만 나오는 것처럼 보일 수 있음
    cMapUrl: "https://unpkg.com/pdfjs-dist@6.3.289/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "https://unpkg.com/pdfjs-dist@6.3.289/standard_fonts/",
  }).promise;
}

/**
 * PDF → 임베디드 텍스트. 글자 레이어가 있으면 그대로 반환 (짧아도 OCR로 안 넘김).
 */
export async function extractPdfTextInBrowser(
  file: File,
  onProgress?: (p: ClientOcrProgress) => void
): Promise<{ text: string; pages: number; charCount: number; via: "text" | "empty" }> {
  onProgress?.({
    phase: "load",
    page: 0,
    total: 0,
    message: "PDF 읽는 중…",
  });

  const doc = await openPdf(file);
  const pages = doc.numPages;

  try {
    const parts: string[] = [];
    let itemCount = 0;

    for (let i = 1; i <= pages; i++) {
      onProgress?.({
        phase: "text",
        page: i,
        total: pages,
        message: `글자 추출 중… ${i}/${pages}`,
      });
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items || []) as unknown[];
      itemCount += items.filter((it) => it && typeof it === "object" && "str" in it).length;
      const structured = textFromPdfItems(items);
      // 정렬이 망가져도 원문 글자는 살리기
      const flat = items
        .map((it) =>
          it && typeof it === "object" && "str" in it ? String((it as { str: string }).str) : ""
        )
        .join("");
      parts.push(structured.length >= flat.replace(/\s/g, "").length ? structured : flat);
    }

    const text = parts.join("\n\n").trim();
    const charCount = text.replace(/\s/g, "").length;

    onProgress?.({
      phase: "done",
      page: pages,
      total: pages,
      message:
        charCount > 0
          ? `텍스트 PDF 인식 (${pages}p, 글자 ${charCount}자)`
          : `글자 레이어 없음 (${pages}p, items ${itemCount})`,
    });

    return {
      text,
      pages,
      charCount,
      via: charCount > 0 ? "text" : "empty",
    };
  } finally {
    try {
      await (doc as { cleanup?: () => Promise<void> | void }).cleanup?.();
    } catch {
      /* ignore */
    }
  }
}
