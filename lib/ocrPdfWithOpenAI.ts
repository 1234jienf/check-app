/**
 * 이미지(스캔) PDF → OpenAI Vision OCR → 복붙용에 가까운 텍스트
 * 페이지를 PNG로 렌더한 뒤 배치로 보냅니다.
 */

const MAX_OCR_PAGES = Number(process.env.DASANG_OCR_MAX_PAGES || 80);
const BATCH_SIZE = 2;
const TARGET_WIDTH = 1100;

function ocrModel() {
  return process.env.OPENAI_OCR_MODEL || "gpt-4o-mini";
}

const SYSTEM = `당신은 국어/입시 문제지 OCR 엔진입니다.
이미지에서 보이는 글자를 최대한 빠짐없이 그대로 옮기세요.

규칙:
- 지문 구간은 [1~3] 형식을 유지하세요. ([1～3]도 [1~3]으로)
- 문항은 "1. "처럼 번호로 시작하게 하세요.
- 선지는 ①②③④⑤ 기호를 유지하세요.
- 페이지 머리글/바닥글/워터마크/장식은 빼세요.
- 설명이나 요약 없이, 추출한 본문만 출력하세요.`;

type ShotPage = {
  pageNumber: number;
  dataUrl?: string;
  data?: Uint8Array | Buffer;
};

function toDataUrl(page: ShotPage): string | null {
  if (page.dataUrl && page.dataUrl.startsWith("data:")) return page.dataUrl;
  if (page.data) {
    const b64 = Buffer.from(page.data).toString("base64");
    return `data:image/png;base64,${b64}`;
  }
  return null;
}

async function ocrBatch(
  images: { pageNumber: number; dataUrl: string }[]
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY가 없습니다.");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [
    {
      type: "text",
      text: `다음 ${images.length}개 페이지(페이지 ${images
        .map((i) => i.pageNumber)
        .join(", ")})에서 문제지 본문을 추출하세요.`,
    },
  ];
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: img.dataUrl, detail: "high" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ocrModel(),
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
    }),
  });

  const raw = await res.text();
  let data: {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`OCR 응답 파싱 실패 (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error?.message || `OCR API 실패 (${res.status})`);
  }
  return String(data.choices?.[0]?.message?.content || "").trim();
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

    const limit = Math.min(total, MAX_OCR_PAGES);
    const parts: string[] = [];

    for (let start = 1; start <= limit; start += BATCH_SIZE) {
      const nums: number[] = [];
      for (let p = start; p < start + BATCH_SIZE && p <= limit; p++) nums.push(p);

      const result = await parser.getScreenshot({
        partial: nums,
        desiredWidth: TARGET_WIDTH,
        imageDataUrl: true,
      });
      const shots = ((result as { pages?: ShotPage[] })?.pages || []) as ShotPage[];
      const images: { pageNumber: number; dataUrl: string }[] = [];
      for (const shot of shots) {
        const dataUrl = toDataUrl(shot);
        if (dataUrl) images.push({ pageNumber: shot.pageNumber, dataUrl });
      }
      if (!images.length) continue;

      const chunk = await ocrBatch(images);
      if (chunk) parts.push(chunk);
    }

    const text = parts.join("\n\n").trim();
    if (!text) throw new Error("OCR 결과가 비어 있습니다.");

    return { text, pages: total, ocrPages: limit };
  } finally {
    try {
      await (parser as { destroy?: () => Promise<void> }).destroy?.();
    } catch {
      /* ignore */
    }
  }
}
