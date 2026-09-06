import { readFile } from "fs/promises";
import { join } from "path";
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmlElement, Node as XmlNode } from "@xmldom/xmldom";
import type { ExamGroup } from "@/lib/parseExamGroups";

type El = XmlElement;

const PREFERRED_ZIP = [
  "mimetype",
  "version.xml",
  "Contents/header.xml",
  "Contents/masterpage0.xml",
  "Contents/masterpage1.xml",
  "BinData/image1.bmp",
  "BinData/image2.bmp",
  "Contents/section0.xml",
  "Preview/PrvText.txt",
  "settings.xml",
  "Preview/PrvImage.png",
  "META-INF/container.rdf",
  "Contents/content.hpf",
  "META-INF/container.xml",
  "META-INF/manifest.xml",
];

const REVIEW_LABELS = new Set([
  "내가 고른 답",
  "정답",
  "헷갈린 선지",
  "헷갈린 이유",
  "정답의 이유",
  "인사이트",
]);

function localName(node: XmlNode): string {
  const el = node as El;
  if (!el.tagName) return "";
  const t = el.tagName;
  const i = t.indexOf(":");
  return i >= 0 ? t.slice(i + 1) : t;
}

function kids(el: El): El[] {
  return Array.from(el.childNodes || []).filter((n) => n.nodeType === 1) as El[];
}

function walk(el: El): El[] {
  const out: El[] = [];
  const stack: El[] = [el];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    const ch = kids(cur);
    for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
  }
  return out;
}

function tNodes(el: El): El[] {
  return walk(el).filter((n) => localName(n) === "t");
}

function etxt(el: El): string {
  return tNodes(el)
    .map((t) => t.textContent || "")
    .join("");
}

function remove(node: El) {
  if (node.parentNode) node.parentNode.removeChild(node);
}

function clearAllText(el: El) {
  for (const t of tNodes(el)) t.textContent = "";
  for (const seg of walk(el).filter((n) => localName(n) === "linesegarray")) remove(seg);
}

function setSingleText(el: El, text: string, pageBreak?: boolean) {
  const ts = tNodes(el);
  if (!ts.length) return;
  ts[0].textContent = text;
  for (let i = 1; i < ts.length; i++) ts[i].textContent = "";
  for (const seg of walk(el).filter((n) => localName(n) === "linesegarray")) remove(seg);
  if (pageBreak != null && localName(el) === "p") {
    el.setAttribute("pageBreak", pageBreak ? "1" : "0");
  }
}

function keepReviewLabels(el: El) {
  for (const t of tNodes(el)) {
    const cur = (t.textContent || "").trim();
    if (!REVIEW_LABELS.has(cur)) t.textContent = "";
  }
  for (const seg of walk(el).filter((n) => localName(n) === "linesegarray")) remove(seg);
}

function clone(el: El): El {
  return el.cloneNode(true) as El;
}

function passageParas(passage: string, n = 3): string[] {
  const lines = passage.split(/\r?\n/);
  const body = lines
    .slice(lines[0]?.startsWith("[") ? 1 : 0)
    .join("\n")
    .trim();
  let paras = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return Array(n).fill("");
  if (paras.length === n) return paras;
  if (paras.length > n) return paras.slice(0, n - 1).concat([paras.slice(n - 1).join(" ")]);
  while (paras.length < n) {
    let idx = 0;
    for (let i = 1; i < paras.length; i++) if (paras[i].length > paras[idx].length) idx = i;
    const s = paras[idx];
    let cut = s.indexOf(". ", Math.floor(s.length / 3));
    let a: string;
    let b: string;
    if (cut === -1 || cut > Math.floor((s.length * 2) / 3)) {
      cut = Math.max(Math.floor(s.length / 2), 1);
      a = s.slice(0, cut).trim();
      b = s.slice(cut).trim();
    } else {
      a = s.slice(0, cut + 1).trim();
      b = s.slice(cut + 2).trim();
    }
    paras = [...paras.slice(0, idx), ...[a, b].filter(Boolean), ...paras.slice(idx + 1)];
  }
  return paras.slice(0, n);
}

function padOpts(q: ExamGroup["questions"][0]): string[] {
  const opts = [...(q.options || [])];
  const marks = "①②③④⑤";
  while (opts.length < 5) opts.push(`${marks[opts.length]} `);
  return opts.slice(0, 5);
}

type Parts = {
  instr: El;
  passPara: El;
  qStem: El;
  qOpt: El;
  review: El;
  spacer: El;
  dropFrom: number;
};

function buildParts(root: El): Parts {
  const children = kids(root);
  let si = -1;
  let ei = -1;
  for (let i = 0; i < children.length; i++) {
    const t = etxt(children[i]);
    if (si < 0 && t.includes("[1~3]")) si = i;
    if (ei < 0 && t.includes("[35~37]")) {
      ei = i;
      break;
    }
  }
  if (si < 0) throw new Error("템플릿에서 [1~3] 구간을 찾지 못했습니다.");
  if (ei < 0) ei = Math.min(si + 40, children.length);
  const unit = children.slice(si, ei);

  const instr = clone(unit[0]);
  const passPara = clone(unit[1]);
  const qStem = clone(unit[6]);
  const qOpt = clone(unit[7]);
  const review = clone(unit[19]);
  clearAllText(instr);
  clearAllText(passPara);
  clearAllText(qStem);
  clearAllText(qOpt);
  keepReviewLabels(review);

  const spacer = clone(unit[4] || unit[0]);
  clearAllText(spacer);
  if (localName(spacer) === "p") {
    spacer.setAttribute("pageBreak", "0");
    spacer.setAttribute("columnBreak", "0");
  }

  return { instr, passPara, qStem, qOpt, review, spacer, dropFrom: si };
}

function appendQuestion(root: El, parts: Parts, q: ExamGroup["questions"][0]) {
  const stemEl = clone(parts.qStem);
  setSingleText(stemEl, q.stem);
  root.appendChild(stemEl);
  for (const opt of padOpts(q)) {
    const optEl = clone(parts.qOpt);
    setSingleText(optEl, opt);
    root.appendChild(optEl);
  }
  root.appendChild(clone(parts.spacer));
  root.appendChild(clone(parts.review));
  root.appendChild(clone(parts.spacer));
}

function stripWeekBoxes(root: El) {
  for (const t of [...tNodes(root)]) {
    const cur = (t.textContent || "").trim();
    if (!(cur.startsWith("Week") || /^\(다상다독\s*\d+\s*회\)$/.test(cur))) continue;
    let node: El | null = t;
    let target: El | null = null;
    while (node) {
      const tag = localName(node);
      if (["rect", "drawText", "pic", "container"].includes(tag)) {
        target = node;
        if (tag === "rect") break;
      }
      node = node.parentNode as El | null;
    }
    if (target) remove(target);
    else t.textContent = "";
  }
}

function stripScheduleTables(root: El) {
  for (const tbl of [...walk(root)].filter((n) => localName(n) === "tbl")) {
    const tx = etxt(tbl);
    if (!(tx.includes("유형") && (tx.includes("비문학") || tx.includes("독서론") || tx.includes("화법")))) {
      continue;
    }
    let run: El | null = tbl.parentNode as El | null;
    while (run && localName(run) !== "run") run = run.parentNode as El | null;
    if (run) remove(run);
    else remove(tbl);
  }
}

async function packHwpx(files: Map<string, Uint8Array>): Promise<Buffer> {
  const zip = new JSZip();
  const names = [...files.keys()];
  const ordered = [
    ...PREFERRED_ZIP.filter((n) => names.includes(n)),
    ...names.filter((n) => !PREFERRED_ZIP.includes(n)).sort(),
  ];
  for (const name of ordered) {
    const data = files.get(name);
    if (!data) continue;
    zip.file(name, data, {
      compression: name === "mimetype" || name === "version.xml" ? "STORE" : "DEFLATE",
    });
  }
  return Buffer.from(await zip.generateAsync({ type: "uint8array", platform: "DOS" }));
}

export async function buildHwpxBuffer(opts: {
  rawText: string;
  groups: ExamGroup[];
  hoe: number;
}): Promise<{ buffer: Buffer; meta: { groups: number; questions: number; labels: string[] } }> {
  const groups = opts.groups;
  if (!groups.length) throw new Error("[1~3] 형식의 지문 그룹을 찾지 못했습니다.");

  const templatePath = join(process.cwd(), "scripts", "dasang_template.hwpx");
  const tpl = await readFile(templatePath);
  const src = await JSZip.loadAsync(tpl);
  const files = new Map<string, Uint8Array>();
  for (const name of Object.keys(src.files)) {
    const f = src.files[name];
    if (f.dir) continue;
    files.set(name, await f.async("uint8array"));
  }

  const secName = "Contents/section0.xml";
  const secXml = Buffer.from(files.get(secName) || []).toString("utf-8");
  const doc = new DOMParser().parseFromString(secXml, "text/xml");
  const root = doc.documentElement;
  if (!root) throw new Error("한글 템플릿 XML을 읽지 못했습니다.");

  const parts = buildParts(root);
  stripWeekBoxes(root);
  stripScheduleTables(root);

  let si = -1;
  const children = kids(root);
  for (let i = 0; i < children.length; i++) {
    const t = etxt(children[i]);
    if (t.includes("[1~3]") || t.includes("[1～3]")) {
      si = i;
      break;
    }
  }
  if (si < 0) si = parts.dropFrom;
  for (const node of kids(root).slice(si)) remove(node);

  let first = true;
  for (const g of groups) {
    const label = `[${g.a}~${g.b}] 다음 글을 읽고 물음에 답하시오.`;
    const instr = clone(parts.instr);
    setSingleText(instr, label, !first);
    first = false;
    root.appendChild(instr);

    for (const para of passageParas(g.passage, 3)) {
      const pEl = clone(parts.passPara);
      setSingleText(pEl, para);
      root.appendChild(pEl);
    }
    root.appendChild(clone(parts.spacer));
    for (const q of g.questions) appendQuestion(root, parts, q);
  }

  for (const n of [...walk(root)]) {
    if (localName(n) === "linesegarray") remove(n);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${new XMLSerializer().serializeToString(root)}`;
  files.set(secName, new TextEncoder().encode(xml));

  const buffer = await packHwpx(files);
  return {
    buffer,
    meta: {
      groups: groups.length,
      questions: groups.reduce((n, g) => n + g.questions.length, 0),
      labels: groups.map((g) => `[${g.a}~${g.b}]`),
    },
  };
}

export async function zipBuffers(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.buffer);
  return Buffer.from(await zip.generateAsync({ type: "uint8array" }));
}
