# -*- coding: utf-8 -*-
"""
다상다독 복붙용 텍스트 → 한글(HWPX) 복습노트 변환

1회 템플릿의 레이아웃(2단·복습표·문단 서식)만 쓰고,
지문·문항은 업로드한 복붙용 텍스트로 채웁니다.

Usage:
  python rebuild_clean_hwpx.py --text input.txt --hoe 3 --out out.hwpx
  python rebuild_clean_hwpx.py --text input.txt --hoe 3 --out out.hwpx --template template.hwpx
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import shutil
import sys
import time
import zipfile
from pathlib import Path

from lxml import etree

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_TEMPLATE = SCRIPT_DIR / "dasang_template.hwpx"
NS = {"hp": "http://www.hancom.co.kr/hwpml/2011/paragraph"}

CIRCLED = "①②③④⑤"
Q_START = re.compile(r"^(\d{1,2})\.\s+(.*)$")
GROUP_START = re.compile(r"^\[(\d+)~(\d+)\]")

PREFERRED_ZIP = [
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
]


def parse_groups(text: str) -> list[dict]:
    """Return list of {title, a, b, passage, questions:[{num, stem, options}]}"""
    m = re.search(r"\[\d+~\d+\]", text)
    if m:
        text = text[m.start() :]

    lines = text.replace("\r\n", "\n").split("\n")
    groups: list[dict] = []
    cur = None
    mode = "passage"
    q_buf: list[str] = []
    q_num = None
    q_stem = ""

    def flush_q():
        nonlocal q_buf, q_num, q_stem
        if cur is None or q_num is None:
            q_buf = []
            return
        opts = []
        stem_extra = []
        for ln in q_buf:
            if ln and ln[0] in CIRCLED:
                opts.append(ln)
            else:
                if opts:
                    opts[-1] = opts[-1] + " " + ln
                else:
                    stem_extra.append(ln)
        stem = q_stem
        if stem_extra:
            stem = stem + "\n" + "\n".join(stem_extra)
        cur["questions"].append({"num": q_num, "stem": stem.strip(), "options": opts})
        q_buf = []
        q_num = None
        q_stem = ""

    def flush_group():
        nonlocal cur
        flush_q()
        if cur is None:
            return
        pl = cur.get("passage_lines") or []
        cur["passage"] = "\n".join(pl).strip()
        while "\n\n\n" in cur["passage"]:
            cur["passage"] = cur["passage"].replace("\n\n\n", "\n\n")
        cur.pop("passage_lines", None)
        if cur["passage"] or cur["questions"]:
            groups.append(cur)
        cur = None

    for raw in lines:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            if mode == "passage" and cur is not None:
                cur["passage_lines"].append("")
            elif mode == "question" and q_num is not None:
                q_buf.append("")
            continue

        gm = GROUP_START.match(stripped)
        if gm:
            flush_group()
            cur = {
                "title": stripped,
                "a": int(gm.group(1)),
                "b": int(gm.group(2)),
                "passage_lines": [stripped],
                "questions": [],
            }
            mode = "passage"
            continue

        qm = Q_START.match(stripped)
        if qm and cur is not None:
            num = int(qm.group(1))
            if cur["a"] <= num <= cur["b"] + 5 or mode == "question" or num >= cur["a"]:
                flush_q()
                mode = "question"
                q_num = num
                q_stem = stripped
                q_buf = []
                continue

        if cur is None:
            continue

        if mode == "passage":
            cur["passage_lines"].append(stripped)
        else:
            q_buf.append(stripped)

    flush_group()
    return groups


def unzip(src: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
        time.sleep(0.15)
    dest.mkdir(parents=True)
    with zipfile.ZipFile(src) as z:
        z.extractall(dest)


def zip_hwpx(src_dir: Path, dest: Path) -> None:
    files = [f for f in src_dir.rglob("*") if f.is_file()]
    rels = [f.relative_to(src_dir).as_posix() for f in files]
    ordered = [n for n in PREFERRED_ZIP if n in rels]
    ordered += [n for n in sorted(rels) if n not in ordered]
    if dest.exists():
        dest.unlink()
    with zipfile.ZipFile(dest, "w") as z:
        for name in ordered:
            info = zipfile.ZipInfo(filename=name)
            info.date_time = (2020, 1, 1, 0, 0, 0)
            info.compress_type = (
                zipfile.ZIP_STORED if name in ("mimetype", "version.xml") else zipfile.ZIP_DEFLATED
            )
            z.writestr(info, (src_dir / name).read_bytes())


def etxt(el) -> str:
    return "".join(el.xpath(".//hp:t/text()", namespaces=NS))


def clear_all_text(el) -> None:
    for t in el.xpath(".//hp:t", namespaces=NS):
        t.text = ""
    for seg in el.xpath(".//hp:linesegarray", namespaces=NS):
        parent = seg.getparent()
        if parent is not None:
            parent.remove(seg)


def set_single_text(el, text: str, *, page_break: bool | None = None) -> None:
    ts = el.xpath(".//hp:t", namespaces=NS)
    if not ts:
        return
    ts[0].text = text
    for t in ts[1:]:
        t.text = ""
    for seg in el.xpath(".//hp:linesegarray", namespaces=NS):
        parent = seg.getparent()
        if parent is not None:
            parent.remove(seg)
    if page_break is not None and el.tag.endswith("p"):
        el.set("pageBreak", "1" if page_break else "0")


def keep_review_labels(el) -> None:
    labels = {"내가 고른 답", "정답", "헷갈린 선지", "헷갈린 이유", "정답의 이유", "인사이트"}
    for t in el.xpath(".//hp:t", namespaces=NS):
        cur = (t.text or "").strip()
        if cur not in labels:
            t.text = ""
    for seg in el.xpath(".//hp:linesegarray", namespaces=NS):
        parent = seg.getparent()
        if parent is not None:
            parent.remove(seg)


def passage_paras(passage: str, n: int = 3) -> list[str]:
    lines = passage.splitlines()
    body = "\n".join(lines[1:] if lines and lines[0].startswith("[") else lines).strip()
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    if not paras:
        return [""] * n
    if len(paras) == n:
        return paras
    if len(paras) > n:
        return paras[: n - 1] + [" ".join(paras[n - 1 :])]
    while len(paras) < n:
        idx = max(range(len(paras)), key=lambda i: len(paras[i]))
        s = paras[idx]
        cut = s.find(". ", len(s) // 3)
        if cut == -1 or cut > len(s) * 2 // 3:
            cut = max(len(s) // 2, 1)
            a, b = s[:cut].strip(), s[cut:].strip()
        else:
            a, b = s[: cut + 1].strip(), s[cut + 2 :].strip()
        paras[idx : idx + 1] = [x for x in (a, b) if x]
    return paras[:n]


def pad_opts(q: dict) -> list[str]:
    opts = list(q.get("options") or [])
    marks = "①②③④⑤"
    while len(opts) < 5:
        opts.append(f"{marks[len(opts)]} ")
    return opts[:5]


def build_parts(root) -> dict:
    kids = list(root)
    si = ei = None
    for i, el in enumerate(kids):
        t = etxt(el)
        if si is None and "[1~3]" in t:
            si = i
        if ei is None and "[35~37]" in t:
            ei = i
            break
    if si is None:
        raise RuntimeError("템플릿에서 [1~3] 구간을 찾지 못했습니다.")
    if ei is None:
        ei = min(si + 40, len(kids))
    unit = kids[si:ei]

    instr = copy.deepcopy(unit[0])
    pass_para = copy.deepcopy(unit[1])
    q_stem = copy.deepcopy(unit[6])
    q_opt = copy.deepcopy(unit[7])
    review = copy.deepcopy(unit[19])

    clear_all_text(instr)
    clear_all_text(pass_para)
    clear_all_text(q_stem)
    clear_all_text(q_opt)
    keep_review_labels(review)

    spacer = copy.deepcopy(unit[4]) if len(unit) > 4 else copy.deepcopy(unit[0])
    clear_all_text(spacer)
    if spacer.tag.endswith("p"):
        spacer.set("pageBreak", "0")
        spacer.set("columnBreak", "0")

    return {
        "pre": kids[:si],
        "instr": instr,
        "pass_para": pass_para,
        "q_stem": q_stem,
        "q_opt": q_opt,
        "review": review,
        "spacer": spacer,
        "drop_from": si,
    }


def append_question(root, parts, q: dict) -> None:
    stem_el = copy.deepcopy(parts["q_stem"])
    set_single_text(stem_el, q["stem"])
    root.append(stem_el)
    for opt in pad_opts(q):
        opt_el = copy.deepcopy(parts["q_opt"])
        set_single_text(opt_el, opt)
        root.append(opt_el)
    root.append(copy.deepcopy(parts["spacer"]))
    root.append(copy.deepcopy(parts["review"]))
    root.append(copy.deepcopy(parts["spacer"]))


def rebuild_from_text(
    raw_text: str,
    hoe: int,
    out_path: Path,
    template: Path,
    work_dir: Path | None = None,
) -> dict:
    groups = parse_groups(raw_text)
    if not groups:
        raise RuntimeError("[1~3] 형식의 지문 그룹을 찾지 못했습니다. 복붙용 텍스트인지 확인하세요.")

    work = work_dir or (SCRIPT_DIR / "_tmp_hwpx" / f"clean_{hoe}_{int(time.time())}")
    unzip(template, work)
    sec = work / "Contents" / "section0.xml"
    tree = etree.parse(str(sec), etree.XMLParser(huge_tree=True))
    root = tree.getroot()

    parts = build_parts(root)

    # Week / 다상다독 떠있는 텍스트상자(rect/drawText) 제거
    for t in list(root.xpath(".//hp:t", namespaces=NS)):
        cur = (t.text or "").strip()
        if not (cur.startswith("Week") or re.fullmatch(r"\(다상다독\s*\d+\s*회\)", cur)):
            continue
        node = t
        target = None
        while node is not None:
            tag = node.tag.split("}")[-1] if isinstance(node.tag, str) else ""
            if tag in ("rect", "drawText", "pic", "container"):
                target = node
                if tag == "rect":
                    break
            node = node.getparent()
        if target is not None:
            parent = target.getparent()
            if parent is not None:
                parent.remove(target)
        else:
            t.text = ""

    # 유형/페이지(독서론·화법·비문학) 일정표만 제거 — 2단(secPr/colPr) 설정은 유지
    for tbl in list(root.xpath(".//*[local-name()='tbl']")):
        tx = "".join(tbl.xpath(".//hp:t/text()", namespaces=NS))
        if not ("유형" in tx and ("비문학" in tx or "독서론" in tx or "화법" in tx)):
            continue
        # 표를 담은 run 제거 (문단/secPr는 남김)
        run = tbl.getparent()
        while run is not None and not (isinstance(run.tag, str) and run.tag.split("}")[-1] == "run"):
            run = run.getparent()
        if run is not None and run.getparent() is not None:
            run.getparent().remove(run)
        else:
            parent = tbl.getparent()
            if parent is not None:
                parent.remove(tbl)

    # 본문 시작점 재탐색 후 이후 템플릿 내용 삭제
    si = None
    for i, el in enumerate(list(root)):
        t = etxt(el)
        if "[1~3]" in t or "[1～3]" in t:
            si = i
            break
    if si is None:
        si = parts["drop_from"]

    kids = list(root)
    for el in kids[si:]:
        root.remove(el)

    first_group = True
    for g in groups:
        label = f"[{g['a']}~{g['b']}] 다음 글을 읽고 물음에 답하시오."
        instr = copy.deepcopy(parts["instr"])
        set_single_text(instr, label, page_break=not first_group)
        first_group = False
        root.append(instr)

        for para in passage_paras(g["passage"], 3):
            p_el = copy.deepcopy(parts["pass_para"])
            set_single_text(p_el, para)
            root.append(p_el)

        root.append(copy.deepcopy(parts["spacer"]))

        for q in g["questions"]:
            append_question(root, parts, q)

    for seg in root.xpath(".//hp:linesegarray", namespaces=NS):
        parent = seg.getparent()
        if parent is not None:
            parent.remove(seg)

    tree.write(str(sec), xml_declaration=True, encoding="UTF-8", standalone=True)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw_out = out_path.with_name(out_path.stem + "_raw.hwpx")
    zip_hwpx(work, raw_out)

    try:
        from hwpx import HwpxDocument

        doc = HwpxDocument.open(str(raw_out))
        doc.save_to_path(str(out_path))
        doc.close()
        if raw_out.exists() and raw_out != out_path:
            raw_out.unlink(missing_ok=True)
    except Exception:
        # hwpx normalize 실패 시 raw 패키지라도 반환
        if raw_out.exists():
            shutil.move(str(raw_out), str(out_path))

    shutil.rmtree(work, ignore_errors=True)

    return {
        "hoe": hoe,
        "groups": len(groups),
        "questions": sum(len(g["questions"]) for g in groups),
        "out": str(out_path),
        "labels": [f"[{g['a']}~{g['b']}]" for g in groups],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="다상다독 복붙용 → HWPX 변환")
    parser.add_argument("--text", required=True, help="복붙용 .txt 경로")
    parser.add_argument("--hoe", type=int, required=True, help="회차 번호")
    parser.add_argument("--out", required=True, help="출력 .hwpx 경로")
    parser.add_argument("--template", default=str(DEFAULT_TEMPLATE), help="1회 템플릿 .hwpx")
    parser.add_argument("--json", action="store_true", help="결과를 JSON으로 stdout 출력")
    args = parser.parse_args()

    text_path = Path(args.text)
    if not text_path.exists():
        msg = {"error": f"텍스트 파일 없음: {text_path}"}
        print(json.dumps(msg, ensure_ascii=False) if args.json else msg["error"])
        return 1

    template = Path(args.template)
    if not template.exists():
        msg = {"error": f"템플릿 없음: {template}"}
        print(json.dumps(msg, ensure_ascii=False) if args.json else msg["error"])
        return 1

    try:
        raw = text_path.read_text(encoding="utf-8-sig")
        result = rebuild_from_text(raw, args.hoe, Path(args.out), template)
        if args.json:
            print(json.dumps(result, ensure_ascii=False))
        else:
            print("OK", result)
        return 0
    except Exception as e:
        msg = {"error": str(e)}
        print(json.dumps(msg, ensure_ascii=False) if args.json else f"ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
