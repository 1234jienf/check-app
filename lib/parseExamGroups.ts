export type ExamQuestion = {
  num: number;
  stem: string;
  options: string[];
};

export type ExamGroup = {
  title: string;
  a: number;
  b: number;
  passage: string;
  questions: ExamQuestion[];
};

const CIRCLED = "①②③④⑤";
const Q_START = /^(\d{1,2})\.\s+(.*)$/;
const GROUP_START = /^\[(\d+)~(\d+)\]/;

/** "5,6회" / "3~4회" / "5회" / "5,6" → [5,6] */
export function detectHoes(...sources: string[]): number[] {
  const found = new Set<number>();
  for (const src of sources) {
    if (!src) continue;
    const range = src.match(/(\d+)\s*[,~,\-]\s*(\d+)\s*회?/);
    if (range) {
      const a = parseInt(range[1], 10);
      const b = parseInt(range[2], 10);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      for (let i = lo; i <= hi; i++) found.add(i);
      continue;
    }
    const single = src.match(/(\d+)\s*회/);
    if (single) found.add(parseInt(single[1], 10));
    for (const part of src.split(/[,|/]/)) {
      const n = parseInt(part.trim(), 10);
      if (Number.isFinite(n) && n >= 1 && n <= 99) found.add(n);
    }
  }
  const list = [...found].filter((n) => n >= 1 && n <= 99).sort((a, b) => a - b);
  return list.length > 0 ? list : [3];
}

/** 문항 구간이 다시 [1~…]으로 시작하면 회차 분리 */
export function splitRoundsByRestart(text: string): string[] {
  const re = /\[1\s*[~～]\s*\d+\]/g;
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    indices.push(m.index);
  }
  if (indices.length === 0) {
    return text.trim() ? [text.trim()] : [];
  }
  const chunks: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk.replace(/\s/g, "").length >= 40) chunks.push(chunk);
  }
  return chunks;
}

export function assignHoeNumbers(chunkCount: number, hints: number[]): number[] {
  if (chunkCount <= 0) return [];
  if (hints.length >= chunkCount) return hints.slice(0, chunkCount);
  if (hints.length === 1) {
    const start = hints[0];
    return Array.from({ length: chunkCount }, (_, i) => start + i);
  }
  if (hints.length > 0) {
    const out = [...hints];
    let n = hints[hints.length - 1] + 1;
    while (out.length < chunkCount) out.push(n++);
    return out;
  }
  return Array.from({ length: chunkCount }, (_, i) => i + 1);
}

export function parseExamGroups(text: string): ExamGroup[] {
  const m = text.match(/\[\d+~\d+\]/);
  if (m && m.index != null) text = text.slice(m.index);

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const groups: ExamGroup[] = [];
  let cur: (ExamGroup & { passage_lines: string[] }) | null = null;
  let mode: "passage" | "question" = "passage";
  let qBuf: string[] = [];
  let qNum: number | null = null;
  let qStem = "";

  const flushQ = () => {
    if (!cur || qNum == null) {
      qBuf = [];
      return;
    }
    const opts: string[] = [];
    const stemExtra: string[] = [];
    for (const ln of qBuf) {
      if (ln && CIRCLED.includes(ln[0])) opts.push(ln);
      else if (opts.length) opts[opts.length - 1] = `${opts[opts.length - 1]} ${ln}`;
      else stemExtra.push(ln);
    }
    let stem = qStem;
    if (stemExtra.length) stem = `${stem}\n${stemExtra.join("\n")}`;
    cur.questions.push({ num: qNum, stem: stem.trim(), options: opts });
    qBuf = [];
    qNum = null;
    qStem = "";
  };

  const flushGroup = () => {
    flushQ();
    if (!cur) return;
    let passage = (cur.passage_lines || []).join("\n").trim();
    while (passage.includes("\n\n\n")) passage = passage.replace(/\n\n\n/g, "\n\n");
    const { passage_lines: _, ...rest } = cur;
    const g: ExamGroup = { ...rest, passage };
    if (g.passage || g.questions.length) groups.push(g);
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const stripped = line.trim();
    if (!stripped) {
      if (mode === "passage" && cur) cur.passage_lines.push("");
      else if (mode === "question" && qNum != null) qBuf.push("");
      continue;
    }

    const gm = stripped.match(GROUP_START);
    if (gm) {
      flushGroup();
      cur = {
        title: stripped,
        a: parseInt(gm[1], 10),
        b: parseInt(gm[2], 10),
        passage_lines: [stripped],
        passage: "",
        questions: [],
      };
      mode = "passage";
      continue;
    }

    const qm = stripped.match(Q_START);
    if (qm && cur) {
      const num = parseInt(qm[1], 10);
      if (cur.a <= num && num <= cur.b + 5 || mode === "question" || num >= cur.a) {
        flushQ();
        mode = "question";
        qNum = num;
        qStem = stripped;
        qBuf = [];
        continue;
      }
    }

    if (!cur) continue;
    if (mode === "passage") cur.passage_lines.push(stripped);
    else qBuf.push(stripped);
  }

  flushGroup();
  return groups;
}
