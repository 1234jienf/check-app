/**
 * 이미지(스캔) PDF → OpenAI Vision OCR
 * 수능/문제지 2단 레이아웃: 페이지를 왼/오른 반으로 잘라 순서대로 읽힌다.
 */

import { createCanvas, loadImage } from "@napi-rs/canvas";

const MAX_OCR_PAGES = Number(process.env.DASANG_OCR_MAX_PAGES || 80);
const TARGET_WIDTH = Number(process.env.DASANG_OCR_WIDTH || 1800);

function openaiApiKey(): string {
  const raw = String(process.env.OPENAI_API_KEY || "").trim();
  if (!raw) throw new Error("OPENAI_API_KEY가 없습니다.");
  let v = raw.replace(/^["']|["']$/g, "").trim();
  v = v.replace(/^Bearer\s+/i, "").trim();
  if (/\s/.test(v)) {
    const parts = v.split(/\s+/).filter(Boolean);
    v = parts.find((p) => p.startsWith("sk-")) || parts[0];
  }
  if (!v) throw new Error("OPENAI_API_KEY가 올바르지 않습니다.");
  return v;
}

function ocrModel() {
  // 정확도 우선: OCR은 gpt-4o 기본 (비용↑). 싸게 쓰려면 OPENAI_OCR_MODEL=gpt-4o-mini
  return process.env.OPENAI_OCR_MODEL || process.env.OPENAI_MODEL || "gpt-4o";
}

const SYSTEM = `당신은 한국어 시험지 OCR 전용 엔진입니다.
이미지에 보이는 글자만 있는 그대로 옮기세요.

절대 금지:
- 요약, 의역, 문장 재작성, 내용 추측/보완
- 안 보이는 글자 만들어내기
- 다른 단/페이지 내용 섞기

규칙:
- 읽기 순서: 위에서 아래. (이 이미지는 이미 한 단만 잘린 조각입니다)
- (가)(나), [1~3], ①②③④⑤, 문항 번호는 원문 기호 그대로
- 머리글/바닥글/페이지 번호/워터마크는 생략 가능
- 출력은 추출 본문만. 설명 문장 금지.`;

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

/** 페이지 PNG → 왼단/오른단 (가운데 약간 겹침) */
async function splitColumns(png: Buffer): Promise<{ left: string; right: string }> {
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
    left: leftCanvas.toDataURL("image/png"),
    right: rightCanvas.toDataURL("image/png"),
  };
}

async function ocrOneImage(
  dataUrl: string,
  label: string
): Promise<string> {
  const key = openaiApiKey();
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" } }
  > = [
    {
      type: "text",
      text: `${label}\n이 이미지 조각에 보이는 본문만 있는 그대로 옮기세요. 추측하지 마세요.`,
    },
    {
      type: "image_url",
      image_url: { url: dataUrl, detail: "high" },
    },
  ];

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
    const msg = data.error?.message || `OCR API 실패 (${res.status})`;
    throw new Error(msg.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 200));
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

    // 페이지당 1장 렌더 → 왼단 OCR → 오른단 OCR (2단 섞임 방지)
    for (let page = 1; page <= limit; page++) {
      const result = await parser.getScreenshot({
        partial: [page],
        desiredWidth: TARGET_WIDTH,
        imageBuffer: true,
        imageDataUrl: false,
      });
      const shots = ((result as { pages?: ShotPage[] })?.pages || []) as ShotPage[];
      const shot = shots[0];
      const png = shot ? toPngBuffer(shot) : null;
      if (!png) continue;

      const { left, right } = await splitColumns(png);
      const leftText = await ocrOneImage(left, `페이지 ${page} · 왼쪽 단`);
      const rightText = await ocrOneImage(right, `페이지 ${page} · 오른쪽 단`);

      const pageText = [leftText, rightText].filter(Boolean).join("\n\n");
      if (pageText) parts.push(pageText);
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
