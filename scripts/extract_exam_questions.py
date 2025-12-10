#!/usr/bin/env python3

"""

수능 문제 PDF에서 본문과 문제를 추출하여 텍스트 파일로 저장하는 스크립트

사용법:

    python extract_exam_questions.py "파일.pdf"

    python extract_exam_questions.py "파일.pdf" --html

    python extract_exam_questions.py "파일.pdf" --rtf

    python extract_exam_questions.py "파일.pdf" -o "출력.txt" --encoding utf-8

    python extract_exam_questions.py "파일.pdf" --json

"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF가 설치되지 않았습니다. pip install PyMuPDF"}))
    sys.exit(1)

def extract_text_with_formatting(pdf_path: Path) -> List[Dict]:
    """
    PDF에서 텍스트를 추출하고 서식 정보를 포함합니다.
    
    Returns:
        List[Dict]: 각 페이지의 텍스트와 서식 정보를 담은 딕셔너리 리스트
    """
    doc = fitz.open(pdf_path)
    pages_data = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # 텍스트 블록 추출 (좌표 정보 포함)
        blocks = page.get_text("dict")
        
        # 모든 텍스트 스팬을 수집하고 좌표로 정렬
        all_spans = []
        for block in blocks.get("blocks", []):
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    
                    # 좌표 정보
                    bbox = span.get("bbox", [0, 0, 0, 0])
                    x0, y0, x1, y1 = bbox
                    
                    # 서식 정보
                    flags = span.get("flags", 0)
                    is_bold = bool(flags & 16)  # 16 = bold
                    is_italic = bool(flags & 2)  # 2 = italic
                    is_underline = bool(flags & 4)  # 4 = underline
                    
                    all_spans.append({
                        "text": text,
                        "x0": x0,
                        "y0": y0,
                        "x1": x1,
                        "y1": y1,
                        "bold": is_bold,
                        "italic": is_italic,
                        "underline": is_underline,
                    })
        
        # 좌표로 정렬 (위에서 아래로, 왼쪽에서 오른쪽으로)
        all_spans.sort(key=lambda s: (s['y0'], s['x0']))
        
        # 하이라이트(박스) 텍스트 찾기 및 좌표 저장
        highlights = {}
        highlight_spans = []  # 하이라이트된 스팬의 좌표 저장
        for annot in page.annots():
            if annot.type[0] == 8:  # 하이라이트
                rect = annot.rect
                # 해당 영역의 텍스트 찾기
                for span in all_spans:
                    # 스팬이 하이라이트 영역과 겹치는지 확인 (더 관대한 조건)
                    span_center_x = (span['x0'] + span['x1']) / 2
                    span_center_y = (span['y0'] + span['y1']) / 2
                    if (rect.x0 <= span_center_x <= rect.x1 and
                        rect.y0 <= span_center_y <= rect.y1):
                        if span['text'] not in highlights:
                            highlights[span['text']] = True
                            highlight_spans.append({
                                'text': span['text'],
                                'y0': span['y0'],
                                'y1': span['y1']
                            })
        
        # 텍스트를 서식 태그와 함께 조합
        formatted_text = ""
        for span in all_spans:
            text = span['text']
            
            # 하이라이트된 텍스트는 대괄호로 감싸기
            if text in highlights:
                text = f"[{text}]"
            
            # 서식 태그 적용
            if span['bold']:
                text = f"<b>{text}</b>"
            if span['italic']:
                text = f"<i>{text}</i>"
            if span['underline']:
                text = f"<u>{text}</u>"
            
            formatted_text += text + " "
        
        pages_data.append({
            "page_num": page_num + 1,
            "text": formatted_text.strip(),
            "highlights": highlight_spans,  # 하이라이트 정보 저장
        })
    
    doc.close()
    return pages_data

def split_into_sections(pages_data: List[Dict]) -> List[Dict]:
    """
    추출된 텍스트를 본문(passage)과 문제(question)로 구분합니다.
    
    Returns:
        List[Dict]: 본문과 문제 정보를 담은 딕셔너리 리스트
    """
    # 전체 텍스트 합치기
    full_text = "\n".join([page["text"] for page in pages_data])
    
    # 서식 태그 제거한 버전 (패턴 매칭용)
    clean_text = re.sub(r'</?[ibu]>', '', full_text)
    
    sections = []
    
    # 본문 시작 패턴: "[숫자~숫자]" 또는 "[숫자~숫자] 다음 글을 읽고 물음에 답하시오"
    # 여러 변형 시도 (더 유연하게)
    passage_patterns = [
        r'\[(\d+)\s*[~～-]\s*(\d+)\]\s*다음\s*글을\s*읽고\s*물음에\s*답하시오\.?',  # "[1~3] 다음 글을 읽고 물음에 답하시오."
        r'\[(\d+)\s*[~～-]\s*(\d+)\]\s*다음\s*글을\s*읽고',  # "[1~3] 다음 글을 읽고"
        r'\[(\d+)\s*[~～-]\s*(\d+)\]\s*다음\s*글',  # "[1~3] 다음 글"
        r'\[(\d+)\s*[~～-]\s*(\d+)\]',  # "[1~3]" 또는 "[1-3]" 또는 "[1～3]"
    ]
    
    # 본문 시작 위치 찾기 (full_text 기준)
    passage_starts = []
    found_positions = set()  # 중복 제거용
    
    for pattern in passage_patterns:
        for match in re.finditer(pattern, full_text, re.MULTILINE | re.IGNORECASE):
            start_num = int(match.group(1))
            end_num = int(match.group(2))
            start_pos = match.start()
            
            # 이미 찾은 위치가 아니면 추가
            if start_pos not in found_positions:
                found_positions.add(start_pos)
                passage_starts.append({
                    'start_pos': start_pos,
                    'start_num': start_num,
                    'end_num': end_num,
                    'match': match
                })
    
    # 위치 순으로 정렬
    passage_starts.sort(key=lambda x: x['start_pos'])
    
    # 디버깅: 찾은 본문 시작 위치 출력
    if len(passage_starts) == 0:
        # 패턴을 찾지 못했으면 더 간단한 패턴 시도: "[숫자~숫자]"만 찾기 (공백 무시)
        simple_pattern = r'\[(\d+)\s*[~～-]\s*(\d+)\]'
        for match in re.finditer(simple_pattern, full_text, re.MULTILINE):
            start_num = int(match.group(1))
            end_num = int(match.group(2))
            start_pos = match.start()
            
            if start_pos not in found_positions:
                found_positions.add(start_pos)
                passage_starts.append({
                    'start_pos': start_pos,
                    'start_num': start_num,
                    'end_num': end_num,
                    'match': match
                })
        
        passage_starts.sort(key=lambda x: x['start_pos'])
    
    # 문제 번호 패턴 찾기 (예: "1.", "2.", "3번" 등) - full_text 기준
    question_pattern = r'^\s*(\d+)\s*[\.번]\s+'
    lines = full_text.split('\n')
    question_positions = []
    char_pos = 0
    
    for line_idx, line in enumerate(lines):
        match = re.match(question_pattern, line)
        if match:
            question_num = int(match.group(1))
            question_positions.append({
                'num': question_num,
                'pos': char_pos,
                'line_idx': line_idx
            })
        char_pos += len(line) + 1  # +1 for newline
    
    # 본문 시작이 있으면 각 본문 추출
    # 본문 시작 패턴을 찾지 못했으면 문제 번호 앞의 텍스트를 본문으로 추론
    if not passage_starts and question_positions:
        # 문제 번호가 있으면, 첫 문제 번호 앞의 모든 텍스트를 본문으로 추출
        first_question_pos = question_positions[0]['pos']
        if first_question_pos > 100:  # 충분한 텍스트가 있는 경우만
            # 첫 문제 앞의 텍스트를 본문으로
            passage_text = full_text[:first_question_pos].strip()
            
            # 페이지 번호 찾기
            pages = []
            char_count = 0
            for page in pages_data:
                page_start = char_count
                page_end = char_count + len(page["text"])
                if 0 >= page_start and 0 < page_end:
                    pages.append(page["page_num"])
                if first_question_pos > page_start and first_question_pos <= page_end:
                    if page["page_num"] not in pages:
                        pages.append(page["page_num"])
                char_count = page_end + 1
            
            if len(passage_text) > 100:
                sections.append({
                    "type": "passage",
                    "number": f"1~{question_positions[0]['num'] - 1}",
                    "text": passage_text,
                    "pages": pages if pages else [1],
                })
    
    if passage_starts:
        for i, passage_info in enumerate(passage_starts):
            start_pos = passage_info['start_pos']
            match_end = passage_info['match'].end()
            
            # 본문 끝 위치 찾기
            end_pos = len(full_text)
            
            # 해당 본문의 첫 문제 번호 찾기 (예: "[1~3]"이면 문제 1번)
            first_question_num = passage_info['start_num']
            found_question = False
            
            for q in question_positions:
                if q['num'] == first_question_num and q['pos'] > match_end:
                    # 문제 번호 앞의 텍스트가 본문
                    end_pos = q['pos']
                    found_question = True
                    break
            
            # 문제 번호를 못 찾았으면 다음 본문 시작 전까지
            if not found_question and i + 1 < len(passage_starts):
                end_pos = passage_starts[i + 1]['start_pos']
            
            # 본문 텍스트 추출 (지시문 제외)
            # "[1~3] 다음 글을 읽고 물음에 답하시오." 같은 지시문은 제외하고 본문만 추출
            passage_text = full_text[match_end:end_pos].strip()
            
            # 페이지 번호 찾기
            pages = []
            char_count = 0
            for page in pages_data:
                page_start = char_count
                page_end = char_count + len(page["text"])
                if match_end >= page_start and match_end < page_end:
                    pages.append(page["page_num"])
                if end_pos > page_start and end_pos <= page_end:
                    if page["page_num"] not in pages:
                        pages.append(page["page_num"])
                char_count = page_end + 1
            
            passage_num = f"{passage_info['start_num']}~{passage_info['end_num']}"
            
            # 본문이 충분히 긴 경우만 추가 (최소 50자)
            # 문제 제거 전에 길이 체크
            if len(passage_text) > 50:
                sections.append({
                    "type": "passage",
                    "number": passage_num,
                    "text": passage_text,
                    "pages": pages if pages else [1],
                })
    
    # 본문 시작 패턴이 없으면 문제 번호 앞의 텍스트를 본문으로 추론
    elif question_positions:
        # 문제 번호들을 그룹화 (연속된 번호)
        question_groups = []
        current_group = [question_positions[0]]
        
        for i in range(1, len(question_positions)):
            if question_positions[i]['num'] == question_positions[i-1]['num'] + 1:
                current_group.append(question_positions[i])
            else:
                question_groups.append(current_group)
                current_group = [question_positions[i]]
        question_groups.append(current_group)
        
        # 각 그룹 앞의 텍스트를 본문으로 추출
        new_sections = []
        prev_end = 0
        
        for group in question_groups:
            first_question_pos = group[0]['pos']
            
            # 첫 문제 앞의 텍스트가 본문
            passage_text = full_text[prev_end:first_question_pos].strip()
            
            # 본문이 충분히 긴 경우만 추가 (최소 100자)
            if len(passage_text) > 100:
                # 문제 번호 범위
                question_nums = [q['num'] for q in group]
                passage_num = f"{question_nums[0]}~{question_nums[-1]}" if len(question_nums) > 1 else str(question_nums[0])
                
                # 페이지 찾기
                pages = []
                char_count = 0
                for page in pages_data:
                    page_start = char_count
                    page_end = char_count + len(page["text"])
                    if prev_end >= page_start and prev_end < page_end:
                        pages.append(page["page_num"])
                    if first_question_pos > page_start and first_question_pos <= page_end:
                        if page["page_num"] not in pages:
                            pages.append(page["page_num"])
                    char_count = page_end + 1
                
                new_sections.append({
                    "type": "passage",
                    "number": passage_num,
                    "text": passage_text,
                    "pages": pages if pages else [1],
                })
            
            # 문제들 추가
            for q in group:
                # 문제 텍스트 추출 (다음 문제까지 또는 끝까지)
                q_start = q['pos']
                q_end = len(full_text)
                if group.index(q) < len(group) - 1:
                    next_q = group[group.index(q) + 1]
                    q_end = next_q['pos']
                elif question_positions.index(q) < len(question_positions) - 1:
                    next_q = question_positions[question_positions.index(q) + 1]
                    q_end = next_q['pos']
                
                q_text = full_text[q_start:q_end].strip()
                
                # 페이지 찾기
                pages = []
                char_count = 0
                for page in pages_data:
                    page_start = char_count
                    page_end = char_count + len(page["text"])
                    if q_start >= page_start and q_start < page_end:
                        pages.append(page["page_num"])
                    if q_end > page_start and q_end <= page_end:
                        if page["page_num"] not in pages:
                            pages.append(page["page_num"])
                    char_count = page_end + 1
                
                new_sections.append({
                    "type": "question",
                    "number": q['num'],
                    "text": q_text,
                    "pages": pages if pages else [1],
                })
            
            prev_end = group[-1]['pos']
        
        sections = new_sections
    
    return sections

def remove_questions_from_text(text: str) -> str:
    """텍스트에서 문제 부분을 제거하고 본문만 남김"""
    # 먼저 문제 시작 패턴 제거
    # "다음 글을 읽고 물음에 답하시오" 같은 패턴
    text = re.sub(r'다음\s*글을\s*읽고\s*물음에\s*답하시오\.?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'다음\s*글을\s*읽고\s*물음에\s*답하시오\.?\s*', '', text, flags=re.IGNORECASE)
    
    # 문제 번호 범위 패턴 제거 (예: "1~32", "1 ～ 32", "1-32")
    text = re.sub(r'\d+\s*[~～-]\s*\d+\s*\.?\s*', '', text)
    
    lines = text.split('\n')
    result_lines = []
    skip_mode = False
    question_started = False
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        
        # 문제 번호 패턴 (예: "1.", "2.", "3번", "1~32" 등)
        if re.match(r'^\s*\d+[\.번]\s*', line_stripped) or re.match(r'^\s*\d+\s*[~～-]\s*\d+\s*', line_stripped):
            skip_mode = True
            question_started = True
            continue
        
        # 선택지 패턴 (①, ②, ③, ④, ⑤ 또는 1), 2), 3) 등)
        if re.match(r'^[①②③④⑤⑥⑦⑧⑨⑩]', line_stripped) or re.match(r'^\d+\)', line_stripped):
            skip_mode = True
            continue
        
        # "물음에 답하시오", "에 해당하는", "가장 적절한 것은" 같은 문제 설명 패턴
        if re.search(r'물음에\s*답하시오|에\s*해당하는|가장\s*적절한|옳은\s*것|틀린\s*것|알맞은\s*것', line_stripped):
            skip_mode = True
            continue
        
        # "윗글", "보기", "다음", "이 글" 등으로 시작하는 문제 설명
        if re.match(r'^(윗글|보기|다음|이 글|위 글|아래 글|다음 글|글을|글의)', line_stripped):
            skip_mode = True
            continue
        
        # "?" 로 끝나는 줄은 문제일 가능성이 높음
        if line_stripped.endswith('?') and len(line_stripped) < 100:
            skip_mode = True
            continue
        
        # 문제가 시작된 후, 선택지나 문제 설명이 나오면 계속 스킵
        if question_started:
            # 선택지나 문제 설명 패턴이 계속 나오면 스킵
            if re.match(r'^[①②③④⑤⑥⑦⑧⑨⑩]|^\d+\)', line_stripped) or \
               re.search(r'물음에|에\s*해당하는|가장\s*적절한', line_stripped):
                skip_mode = True
                continue
        
        # 문제가 끝나는 지점 찾기 (본문이 다시 시작하는 패턴)
        if skip_mode:
            # 긴 텍스트가 나오고 문제 패턴이 없으면 본문 재시작으로 간주
            if len(line_stripped) > 50 and \
               not re.match(r'^\d+[\.번]', line_stripped) and \
               not re.match(r'^[①②③④⑤⑥⑦⑧⑨⑩]', line_stripped) and \
               not re.search(r'물음에|에\s*해당하는|가장\s*적절한', line_stripped) and \
               not line_stripped.endswith('?'):
                skip_mode = False
                question_started = False
        
        if not skip_mode:
            result_lines.append(line)
    
    result = '\n'.join(result_lines)
    
    # 추가 정리: 남아있는 문제 패턴 제거
    # "1~32" 같은 패턴이 남아있으면 제거
    result = re.sub(r'\d+\s*[~～-]\s*\d+\s*\.?\s*', '', result)
    # "①", "②" 같은 선택지 제거
    result = re.sub(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*', '', result)
    # "1)", "2)" 같은 선택지 제거
    result = re.sub(r'\d+\)\s*', '', result)
    
    return result

def clean_formatting_tags(text: str) -> str:
    """서식 태그를 제거하고 깔끔한 텍스트로 변환 (대괄호는 유지)"""
    # 서식 태그 제거
    text = re.sub(r'</?[ibu]>', '', text)  # <i>, </i>, <b>, </b>, <u>, </u> 제거
    
    # [B], [C] 같은 단일 문자 마커만 제거 (본문/문제 구분용 대괄호는 유지)
    text = re.sub(r'\[[A-Z]\]', '', text)  # [B], [C] 같은 마커만 제거
    
    # 불필요한 텍스트 제거
    # "실전 모의고사 1회" 등 (숫자 포함)
    text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', text, flags=re.IGNORECASE)
    # "실전 모의고사" 단독
    text = re.sub(r'실전\s*모의고사', '', text, flags=re.IGNORECASE)
    # "1회", "2회" 등 (줄 중간에 있는 것도)
    text = re.sub(r'\d+\s*회', '', text)
    # "25051-0084" 같은 코드
    text = re.sub(r'\d{5}-\d{4}', '', text)
    # "정답과 해설"
    text = re.sub(r'정답과\s*해설\s*\d+쪽', '', text, flags=re.IGNORECASE)
    text = re.sub(r'정답과\s*해설', '', text, flags=re.IGNORECASE)
    # "www.ebsi.co.kr" 같은 URL
    text = re.sub(r'www\.\w+\.\w+', '', text, flags=re.IGNORECASE)
    
    return text

def format_for_json(sections: List[Dict]) -> Dict:
    """JSON 형식으로 포맷팅 (본문만 추출, 문제 완전 제거)"""
    passages = []
    
    for section in sections:
        if section['type'] == 'passage':
            passage_text = section['text']
            
            # 원본 텍스트 길이 저장 (디버깅용)
            original_length = len(passage_text)
            
            # 문제 부분 제거 (먼저 실행)
            passage_text = remove_questions_from_text(passage_text)
            
            # 추가 문제 패턴 제거 (더 신중하게)
            # "다음 글을 읽고 물음에 답하시오" 제거 (줄 시작에만)
            passage_text = re.sub(r'^다음\s*글을\s*읽고\s*물음에\s*답하시오\.?\s*', '', passage_text, flags=re.IGNORECASE | re.MULTILINE)
            # 문제 번호 범위 제거 (줄 시작에만)
            passage_text = re.sub(r'^\d+\s*[~～-]\s*\d+\s*\.?\s*', '', passage_text, flags=re.MULTILINE)
            # "에 해당하는 내용으로 가장 적절한 것은?" 같은 패턴 제거 (줄 시작에만)
            passage_text = re.sub(r'^에\s*해당하는\s*내용으로\s*가장\s*적절한\s*것은\s*\?', '', passage_text, flags=re.MULTILINE)
            passage_text = re.sub(r'^에\s*해당하는\s*내용으로\s*가장\s*적절한\s*것은', '', passage_text, flags=re.MULTILINE)
            # 선택지 제거 (줄 시작에만)
            passage_text = re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩]\s*', '', passage_text, flags=re.MULTILINE)
            passage_text = re.sub(r'^\d+\)\s*', '', passage_text, flags=re.MULTILINE)
            
            # 서식 태그 제거
            passage_text = clean_formatting_tags(passage_text)
            
            # 불필요한 텍스트 제거
            passage_text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'실전\s*모의고사', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d+\s*회', '', passage_text)
            passage_text = re.sub(r'정답과\s*해설\s*\d+쪽', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d{2}\s+\d{5}-\d{4}', '', passage_text)
            passage_text = re.sub(r'\d{5}-\d{4}', '', passage_text)
            passage_text = re.sub(r'[ \t]+', ' ', passage_text)
            passage_text = re.sub(r'\n{3,}', '\n\n', passage_text)
            
            # 빈 줄 정리
            passage_text = re.sub(r'\n\s*\n\s*\n+', '\n\n', passage_text)
            
            # 디버깅: 너무 많이 제거되었는지 확인
            if original_length > 100 and len(passage_text) < 50:
                # 문제 제거가 너무 강했을 수 있음, 원본 사용
                passage_text = section['text']
                # 최소한의 정리만
                passage_text = clean_formatting_tags(passage_text)
                passage_text = re.sub(r'실전\s*모의고사\s*\d+회', '', passage_text, flags=re.IGNORECASE)
                passage_text = re.sub(r'정답과\s*해설', '', passage_text, flags=re.IGNORECASE)
            
            # 출처 추출
            source_match = re.search(r'수능완성\s*실전모의고사\s*\d+회\s*\[[\d-]+\]', passage_text)
            if not source_match:
                source_match = re.search(r'수능특강.*?\[[\d-]+\]', passage_text)
            if not source_match:
                source_match = re.search(r'\[\d+~\d+\]', passage_text)
            source = source_match.group(0) if source_match else ""
            
            # 제목 추출 (첫 몇 줄에서)
            lines = passage_text.split('\n')[:15]
            title = ""
            for line in lines:
                line_clean = line.strip()
                if len(line_clean) > 3 and len(line_clean) < 50 and re.match(r'^[가-힣\s]+$', line_clean):
                    if '수능' not in line_clean and '모의고사' not in line_clean and '학년도' not in line_clean:
                        title = line_clean
                        break
            
            # 본문이 비어있지 않은 경우만 추가
            if passage_text.strip():
                passages.append({
                    "number": section['number'],
                    "title": title,
                    "source": source,
                    "content": passage_text.strip(),
                    "pages": section['pages'],
                })
    
    return {
        "passages": passages,
        "total_passages": len(passages),
    }

def format_for_hwp(sections: List[Dict]) -> str:
    """한글 파일에 복사하기 위한 형식으로 포맷팅"""
    output_lines = []
    
    for section in sections:
        if section['type'] == 'passage':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            output_lines.append("")
            output_lines.append("=" * 40)
            output_lines.append(f"【본문 {section['number']} - 페이지 {pages_str}】")
            output_lines.append("=" * 40)
            output_lines.append("")
            
            # 본문 텍스트 정리
            passage_text = section['text']
            # 서식 태그 제거 (대괄호는 유지)
            passage_text = clean_formatting_tags(passage_text)
            # 불필요한 텍스트 추가 제거
            passage_text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'실전\s*모의고사', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d+\s*회', '', passage_text)  # "1회", "2회" 등
            passage_text = re.sub(r'정답과\s*해설\s*\d+쪽', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d{2}\s+\d{5}-\d{4}', '', passage_text)  # "27 25051-0087" 같은 패턴
            passage_text = re.sub(r'\d{5}-\d{4}', '', passage_text)  # 남은 코드
            # 여러 공백을 하나로 (단, 줄바꿈은 유지)
            passage_text = re.sub(r'[ \t]+', ' ', passage_text)
            # 연속된 줄바꿈을 최대 2개로
            passage_text = re.sub(r'\n{3,}', '\n\n', passage_text)
            # 빈칸 채우기 패턴은 유지 (___ 그대로)
            
            output_lines.append(passage_text.strip())
            output_lines.append("")
            output_lines.append("")
        
        elif section['type'] == 'question':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            output_lines.append("")
            output_lines.append("─" * 40)
            output_lines.append(f"【문제 {section['number']} - 페이지 {pages_str}】")
            output_lines.append("─" * 40)
            output_lines.append("")
            
            # 문제 텍스트 정리
            question_text = section['text']
            
            # 서식 태그 제거 (대괄호는 유지)
            question_text = clean_formatting_tags(question_text)
            
            # 불필요한 텍스트 추가 제거
            question_text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'실전\s*모의고사', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'\d+\s*회', '', question_text)
            question_text = re.sub(r'정답과\s*해설\s*\d+쪽', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'\d{2}\s+\d{5}-\d{4}', '', question_text)
            question_text = re.sub(r'\d{5}-\d{4}', '', question_text)
            # 여러 공백을 하나로
            question_text = re.sub(r'[ \t]+', ' ', question_text)
            # 연속된 줄바꿈을 최대 2개로
            question_text = re.sub(r'\n{3,}', '\n\n', question_text)
            
            output_lines.append(question_text.strip())
            output_lines.append("")
    
    return "\n".join(output_lines)

def format_for_html(sections: List[Dict]) -> str:
    """HTML 형식으로 포맷팅 (밑줄 등 서식 유지)"""
    html_lines = ['<!DOCTYPE html>', '<html>', '<head>', '<meta charset="UTF-8">', 
                  '<title>수능 문제</title>', '</head>', '<body>']
    
    for section in sections:
        if section['type'] == 'passage':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            html_lines.append(f'<h2>본문 {section["number"]} - 페이지 {pages_str}</h2>')
            
            # 본문 텍스트 (밑줄 유지)
            passage_text = section['text']
            # <i>, <b> 태그는 제거하되 <u>는 유지
            passage_text = re.sub(r'</?[ib]>', '', passage_text)
            # 불필요한 텍스트 제거
            passage_text = clean_formatting_tags(passage_text)
            passage_text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'실전\s*모의고사', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d+\s*회', '', passage_text)
            passage_text = re.sub(r'정답과\s*해설\s*\d+쪽', '', passage_text, flags=re.IGNORECASE)
            passage_text = re.sub(r'\d{2}\s+\d{5}-\d{4}', '', passage_text)
            passage_text = re.sub(r'\d{5}-\d{4}', '', passage_text)
            passage_text = re.sub(r'[ \t]+', ' ', passage_text)
            passage_text = re.sub(r'\n{3,}', '\n\n', passage_text)
            
            # 줄바꿈을 <br>로 변환
            passage_text = passage_text.replace('\n', '<br>')
            html_lines.append(f'<p>{passage_text}</p>')
        
        elif section['type'] == 'question':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            html_lines.append(f'<h3>문제 {section["number"]} - 페이지 {pages_str}</h3>')
            
            # 문제 텍스트 (밑줄 유지)
            question_text = section['text']
            question_text = re.sub(r'</?[ib]>', '', question_text)
            question_text = clean_formatting_tags(question_text)
            question_text = re.sub(r'실전\s*모의고사\s*\d+회\s*\d*', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'실전\s*모의고사', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'\d+\s*회', '', question_text)
            question_text = re.sub(r'정답과\s*해설\s*\d+쪽', '', question_text, flags=re.IGNORECASE)
            question_text = re.sub(r'\d{2}\s+\d{5}-\d{4}', '', question_text)
            question_text = re.sub(r'\d{5}-\d{4}', '', question_text)
            question_text = re.sub(r'[ \t]+', ' ', question_text)
            question_text = re.sub(r'\n{3,}', '\n\n', question_text)
            
            question_text = question_text.replace('\n', '<br>')
            html_lines.append(f'<p>{question_text}</p>')
    
    html_lines.append('</body>')
    html_lines.append('</html>')
    return '\n'.join(html_lines)

def format_for_rtf(sections: List[Dict]) -> bytes:
    """RTF 형식으로 포맷팅"""
    rtf_lines = [
        r'{\rtf1\ansi\ansicpg949\deff0\nouicompat\deflang1033',
        r'{\fonttbl{\f0\fnil\fcharset129 \uc0\u47569 \u47548 \u47548 ;}}',
        r'{\*\generator 수능 문제 추출기}',
        r'\viewkind4\uc1',
        r'\pard\sa200\sl276\slmult1\f0\fs22\lang18',
    ]
    
    for section in sections:
        if section['type'] == 'passage':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            rtf_lines.append(r'\b 본문 ' + str(section['number']) + f' - 페이지 {pages_str}\\b0\\par')
            rtf_lines.append(r'\par')
            
            passage_text = section['text']
            passage_text = clean_formatting_tags(passage_text)
            # RTF 이스케이프
            passage_text = passage_text.replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
            passage_text = passage_text.replace('\n', r'\par ')
            rtf_lines.append(passage_text)
            rtf_lines.append(r'\par\par')
        
        elif section['type'] == 'question':
            pages_str = f"{section['pages'][0]}" if section['pages'] else "?"
            if len(section['pages']) > 1:
                pages_str = f"{section['pages'][0]}~{section['pages'][-1]}"
            
            rtf_lines.append(r'\b 문제 ' + str(section['number']) + f' - 페이지 {pages_str}\\b0\\par')
            rtf_lines.append(r'\par')
            
            question_text = section['text']
            question_text = clean_formatting_tags(question_text)
            question_text = question_text.replace('\\', '\\\\').replace('{', '\\{').replace('}', '\\}')
            question_text = question_text.replace('\n', r'\par ')
            rtf_lines.append(question_text)
            rtf_lines.append(r'\par')
    
    rtf_lines.append('}')
    return '\n'.join(rtf_lines).encode('utf-8')

def main():
    # Windows에서 UTF-8 인코딩 문제 해결
    if sys.platform == "win32":
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    parser = argparse.ArgumentParser(
        description="수능 문제 PDF에서 본문과 문제를 추출합니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "pdf_file",
        type=str,
        help="추출할 PDF 파일 경로",
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="출력 파일 경로 (JSON 모드에서는 무시됨)",
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="HTML 형식으로 출력",
    )
    parser.add_argument(
        "--rtf",
        action="store_true",
        help="RTF 형식으로 출력",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="JSON 형식으로 출력 (본문만)",
    )
    parser.add_argument(
        "--encoding",
        type=str,
        default="utf-8",
        help="텍스트 파일 인코딩 (기본값: utf-8)",
    )
    
    args = parser.parse_args()
    
    pdf_path = Path(args.pdf_file)
    if not pdf_path.exists():
        if args.json:
            print(json.dumps({"error": f"파일을 찾을 수 없습니다: {pdf_path}"}))
        else:
            print(f"❌ 파일을 찾을 수 없습니다: {pdf_path}")
        sys.exit(1)
    
    # JSON 모드
    if args.json:
        try:
            pages_data = extract_text_with_formatting(pdf_path)
            sections = split_into_sections(pages_data)
            result = format_for_json(sections)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            import traceback
            traceback.print_exc()
            sys.exit(1)
        return
    
    # 출력 파일 경로
    if args.output:
        output_path = Path(args.output)
    else:
        if args.html:
            output_path = pdf_path.with_suffix('.html')
        elif args.rtf:
            output_path = pdf_path.with_suffix('.rtf')
        else:
            # 기본값은 텍스트
            output_path = pdf_path.with_suffix('.txt')
    
    print(f"\n{'='*80}")
    print(f"📚 수능 문제 추출기")
    print(f"{'='*80}\n")
    
    # PDF에서 텍스트 추출
    print(f"📖 PDF 파일 읽는 중: {pdf_path.name}")
    try:
        pages_data = extract_text_with_formatting(pdf_path)
        print(f"✅ {len(pages_data)}개 페이지 읽기 완료")
    except Exception as e:
        print(f"❌ PDF 읽기 실패: {e}")
        sys.exit(1)
    
    # 본문과 문제로 구분
    print("🔍 본문과 문제 구분 중...")
    try:
        sections = split_into_sections(pages_data)
        passage_count = len([s for s in sections if s['type'] == 'passage'])
        question_count = len([s for s in sections if s['type'] == 'question'])
        print(f"✅ 본문 {passage_count}개, 문제 {question_count}개 발견")
    except Exception as e:
        print(f"❌ 구분 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # 포맷팅
    if args.html:
        print("📄 HTML 형식으로 포맷팅 중... (밑줄 등 서식 유지)")
        formatted_text = format_for_html(sections)
        file_mode = 'w'
        encoding = args.encoding
    elif args.rtf:
        print("📄 RTF 형식으로 포맷팅 중... (한글에서 서식 유지)")
        formatted_text = format_for_rtf(sections)
        file_mode = 'wb'  # RTF는 바이너리로 저장
        encoding = None
    else:
        # 기본값은 텍스트
        print("📄 텍스트 형식으로 포맷팅 중...")
        formatted_text = format_for_hwp(sections)
        file_mode = 'w'
        encoding = args.encoding
    
    # 파일 저장
    print(f"💾 파일 저장 중: {output_path}")
    try:
        with open(output_path, file_mode, encoding=encoding) as f:
            if isinstance(formatted_text, bytes):
                f.write(formatted_text)
            else:
                f.write(formatted_text)
        print(f"✅ 저장 완료: {output_path}")
    except Exception as e:
        print(f"❌ 저장 실패: {e}")
        sys.exit(1)
    
    print(f"\n{'='*80}")
    print("✨ 완료!")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()
