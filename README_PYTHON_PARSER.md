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

