/**
 * Vercel/Node에서 pdf-parse v2 사용 시 DOMMatrix 필요.
 * worker CanvasFactory를 먼저 로드한 뒤 PDFParse를 써야 합니다.
 */
export async function extractPdfText(buf: Buffer): Promise<{ text: string; pages: number }> {
  // 순서 중요: worker → pdf-parse
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  const parser = new PDFParse({ data: buf, CanvasFactory });
  try {
    const result = await parser.getText();
    const text = String(result?.text || "").trim();
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
