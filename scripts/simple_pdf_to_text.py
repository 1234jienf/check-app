#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
일반 PDF 문서 → 한글 텍스트 변환 (페이지 순서대로 전부)
스캔본은 페이지를 이미지로 뽑아서 Tesseract OCR로 한글 추출.

필요: PyMuPDF, Tesseract + 한글팩, pytesseract, Pillow
  brew install tesseract tesseract-lang
  pip3 install PyMuPDF pytesseract Pillow

사용법:
  python3 simple_pdf_to_text.py "문서.pdf"
  python3 simple_pdf_to_text.py "문서.pdf" "출력.txt"
"""

import io
import os
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("❌ PyMuPDF 없음. 설치: pip3 install PyMuPDF")
    sys.exit(1)

# OCR용 (스캔본일 때만 사용)
try:
    import pytesseract
    from PIL import Image
    HAS_OCR = True
    # Tesseract 경로: 환경변수 TESSERACT_CMD → Homebrew 기본 경로
    tesseract_cmd = os.environ.get("TESSERACT_CMD")
    if tesseract_cmd and Path(tesseract_cmd).exists():
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    else:
        for path in ("/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"):
            if Path(path).exists():
                pytesseract.pytesseract.tesseract_cmd = path
                break
except ImportError:
    HAS_OCR = False

# OCR 해상도 (스캔본 인식 품질)
OCR_DPI = 300


def _ocr_page(page) -> str:
    """한 페이지를 이미지로 렌더링 후 Tesseract OCR (한글+영문)."""
    mat = fitz.Matrix(OCR_DPI / 72, OCR_DPI / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img, lang="kor+eng").strip()


def get_page_text(page, ocr_failed_once: list) -> str:
    """한 페이지에서 텍스트 추출. 없으면 페이지를 이미지로 뽑아 OCR."""
    text = page.get_text().strip()
    if text:
        return text
    if not HAS_OCR:
        return ""
    try:
        return _ocr_page(page)
    except Exception as e:
        if not ocr_failed_once:
            ocr_failed_once.append(e)
        return ""


def extract_text_from_pdf(pdf_path: Path, output_path: Path) -> None:
    """PDF 전체를 페이지 순서대로 한글로 추출."""
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    parts = []

    print(f"📖 PDF: {pdf_path.name} ({total_pages}페이지)")

    ocr_error = []  # OCR 실패 시 한 번만 메시지
    first_page_empty = False
    for page_num in range(total_pages):
        page = doc[page_num]
        if page_num == 0:
            first_page_empty = not page.get_text().strip()
        text = get_page_text(page, ocr_error)
        parts.append(f"\n{'='*60}\n페이지 {page_num + 1}\n{'='*60}\n")
        parts.append(text if text else "(이 페이지에서 텍스트를 추출하지 못했습니다)")

        if (page_num + 1) % 5 == 0 or page_num == total_pages - 1:
            print(f"   처리 중: {page_num + 1}/{total_pages}")

    doc.close()

    if ocr_error:
        print()
        print("❌ 스캔본인데 OCR이 동작하지 않습니다. (Tesseract 없음)")
        print("   터미널에서 직접 실행해서 설치 후, 같은 명령 다시 실행:")
        print("   brew install tesseract tesseract-lang")
        print("   (경로 지정: TESSERACT_CMD=/opt/homebrew/bin/tesseract python3 ...)")
        print()
    elif first_page_empty and not HAS_OCR:
        print()
        print("❌ 이 PDF는 스캔본입니다. OCR 라이브러리 설치 후 다시 실행하세요:")
        print("   brew install tesseract tesseract-lang")
        print("   pip3 install pytesseract Pillow")
        print()

    output_path.write_text("\n".join(parts), encoding="utf-8")
    print(f"✅ 저장: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python3 simple_pdf_to_text.py <PDF경로> [출력.txt]")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"❌ 파일 없음: {pdf_path}")
        sys.exit(1)

    out = Path(sys.argv[2]) if len(sys.argv) >= 3 else pdf_path.with_suffix(".txt")
    try:
        extract_text_from_pdf(pdf_path, out)
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
