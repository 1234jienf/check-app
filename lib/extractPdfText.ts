/**
 * Vercel/Node에서 pdf-parse v2 사용 시 DOMMatrix 필요.
 * worker CanvasFactory를 먼저 로드한 뒤 PDFParse를 써야 합니다.
 *
 * 주의: pdf-parse 기본 pageJoiner가 `-- 1 of 24 --` 를 붙여
 * 본문이 비어 있어도 “글자가 있는 것처럼” 보일 수 있음 → 반드시 끔.
 */
import { stripPdfPageJoiners } from "@/lib/pdfTextQuality";

/** pdf-parse 내장 pdfjs-dist 버전과 맞춤 (CID/한글 폰트용 CMap) */
const PDFJS_CMAP = "https://unpkg.com/pdfjs-dist@5.4.296/cmaps/";
const PDFJS_FONTS = "https://unpkg.com/pdfjs-dist@5.4.296/standard_fonts/";

export async function extractPdfText(buf: Buffer): Promise<{ text: string; pages: number }> {
  // 순서 중요: worker → pdf-parse
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const data = new Uint8Array(buf);
  const parser = new PDFParse({
    data,
    CanvasFactory,
    useSystemFonts: true,
    cMapUrl: PDFJS_CMAP,
    cMapPacked: true,
    standardFontDataUrl: PDFJS_FONTS,
  });
  try {
    // pageJoiner: '' → `-- N of M --` 안 붙임
    const result = await parser.getText({ pageJoiner: "" });
    const text = stripPdfPageJoiners(String(result?.text || ""));
    const pages = Number(
      (result as { total?: number })?.total ||
        (Array.isArray((result as { pages?: unknown }).pages)
          ? (result as { pages: unknown[] }).pages.length
          : 0)
    );
    return { text, pages };
  } finally {
    try {
      await (parser as { destroy?: () => Promise<void> }).destroy?.();
    } catch {
      /* ignore */
    }
  }
}
