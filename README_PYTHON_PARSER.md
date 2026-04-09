# Python PDF 파서 설정 가이드

## 설치 방법

1. Python 3.7 이상이 설치되어 있어야 합니다.
2. PyMuPDF 라이브러리를 설치합니다:

```bash
pip install PyMuPDF
```

또는

```bash
pip3 install PyMuPDF
```

## 사용 방법

Python 파서는 자동으로 사용됩니다. PDF 파일을 업로드하면:

1. 먼저 Python 파서를 시도합니다 (더 정확한 본문/문제 구분)
2. Python 파서가 실패하면 기존 JavaScript 파서로 자동 전환됩니다

## 문제 해결

### Python을 찾을 수 없는 경우

시스템에 `python3` 명령어가 없는 경우, `next.config.ts`에서 Python 경로를 설정하거나 환경 변수를 설정하세요.

### PyMuPDF 설치 오류

```bash
# Windows
pip install PyMuPDF

# macOS/Linux
pip3 install PyMuPDF
```

### 권한 오류

임시 파일 생성 권한이 없는 경우, `tmpdir()` 대신 다른 경로를 사용하도록 수정할 수 있습니다.

### 스캔본 PDF(이미지 PDF) → 한글 텍스트 변환

스캔된 PDF나 이미지로만 된 PDF는 **텍스트 레이어가 없어서** 기본 추출로는 빈 결과가 나옵니다.  
이때는 **OCR**이 필요하며, **Tesseract**와 **한글 언어팩**을 설치하면 스크립트가 페이지별로 OCR을 시도합니다.

**macOS (Homebrew):**

```bash
brew install tesseract tesseract-lang
```

`tesseract-lang`에 한글(kor)이 포함됩니다.

**설치 확인:**

```bash
tesseract --version
tesseract --list-langs   # kor 이 있으면 한글 OCR 가능
```

설치 후 같은 명령으로 PDF를 다시 실행하면, 텍스트가 없는 페이지는 자동으로 OCR로 추출합니다. (처음 실행 시 페이지마다 OCR이라 시간이 걸릴 수 있습니다.)

