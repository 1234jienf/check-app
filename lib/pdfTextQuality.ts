/** pdf-parse 기본 pageJoiner: `-- 1 of 24 --` 등 */
export function stripPdfPageJoiners(text: string): string {
  return String(text || "")
    .replace(/\n?--\s*\d+\s+of\s+\d+\s*--\n?/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hangulCount(text: string): number {
  return (String(text || "").match(/[가-힣]/g) || []).length;
}

export function compactLen(text: string): number {
  return String(text || "").replace(/\s/g, "").length;
}

/**
 * 변환에 쓸 만한 본문인지.
 * 페이지 마커·짧은 잡음만 있으면 false.
 */
export function isUsefulExamExtract(text: string): boolean {
  const cleaned = stripPdfPageJoiners(text);
  const hangul = hangulCount(cleaned);
  const compact = compactLen(cleaned);

  if (hangul >= 80) return true;
  if (/\[\d+\s*[~～]\s*\d+\]/.test(cleaned) && hangul >= 40) return true;
  if (/\([가나다라마바사]\)|（[가나다라마바사]）/.test(cleaned) && hangul >= 40) {
    return true;
  }
  if (/[①②③④⑤]/.test(cleaned) && hangul >= 40) return true;
  // 영문 지문
  if (hangul < 10 && /[A-Za-z]{200,}/.test(cleaned)) return true;
  if (compact >= 200 && hangul >= 40) return true;
  return false;
}
