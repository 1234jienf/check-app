import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  let tempPdfPath: string | null = null;
  let tempScriptPath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "PDF 파일만 지원합니다." },
        { status: 400 }
      );
    }

    // Python 스크립트 사용 시도
    try {
      // 임시 파일로 PDF 저장
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      tempPdfPath = join(tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
      await writeFile(tempPdfPath, buffer);

      // Python 스크립트 경로
      const scriptPath = join(process.cwd(), "scripts", "extract_exam_questions.py");
      
      // Python 명령어 (Windows는 python, Linux/Mac은 python3)
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      
      // Python 스크립트 실행 (Windows에서 UTF-8 인코딩 설정)
      const env = { ...process.env };
      if (process.platform === "win32") {
        env.PYTHONIOENCODING = "utf-8";
      }
      
      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${scriptPath}" "${tempPdfPath}" --json`,
        { 
          maxBuffer: 10 * 1024 * 1024, // 10MB 버퍼
          env: env
        }
      );

      if (stderr && !stdout) {
        throw new Error(stderr);
      }

      // JSON 결과 파싱
      let pythonResult;
      try {
        pythonResult = JSON.parse(stdout);
      } catch (parseError) {
        console.error("Python JSON 파싱 실패:", stdout.substring(0, 500));
        throw new Error("Python 스크립트 출력을 파싱할 수 없습니다.");
      }
      
      if (pythonResult.error) {
        throw new Error(pythonResult.error);
      }

      console.log("Python 파서 결과:", {
        passagesCount: pythonResult.passages?.length || 0,
        totalPassages: pythonResult.total_passages,
        firstPassageLength: pythonResult.passages?.[0]?.content?.length || 0,
      });

      // Python 파서 결과 반환 (여러 지문 지원)
      if (pythonResult.passages && pythonResult.passages.length > 0) {
        // 여러 지문이 있는 경우 그대로 반환
        return NextResponse.json({
          passages: pythonResult.passages,
          total_passages: pythonResult.total_passages,
        });
      } else {
        console.log("Python 파서가 지문을 찾지 못했습니다. 폴백 파서로 전환합니다.");
        throw new Error("Python 파서가 지문을 찾지 못했습니다.");
      }
    } catch (pythonError: any) {
      console.log("Python 파서 실패, 기본 파서로 전환:", pythonError.message);
      // Python 파서 실패 시 기존 파서로 폴백
    } finally {
      // 임시 파일 정리
      if (tempPdfPath) {
        try {
          await unlink(tempPdfPath);
        } catch (e) {
          console.error("임시 파일 삭제 실패:", e);
        }
      }
    }

    // 기존 pdf-parse 방식 (폴백)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse v2 라이브러리 사용
    const { PDFParse } = require("pdf-parse");
    
    // PDF 파싱 (v2 API)
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    
    const text = result.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "PDF에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF일 수 있습니다." },
        { status: 400 }
      );
    }

    // 텍스트에서 제목, 출처, subject 등을 추출
    const parsed = parseText(text);

    console.log('파싱된 결과:', {
      title: parsed.title,
      source: parsed.source,
      subject: parsed.subject,
      contentLength: parsed.content.length,
      year: parsed.year,
    });

    // 문단 개수 계산
    const paragraphs = parsed.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return NextResponse.json({
      ...parsed,
      paragraphCount: paragraphs.length,
    });
  } catch (error: any) {
    console.error("PDF 파싱 오류:", error);
    return NextResponse.json(
      { error: error.message || "PDF 파싱 실패" },
      { status: 500 }
    );
  }
}

function parseText(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let title = "";
  let source = "";
  let subject = ""; // 독서, 인문, 과학 등
  let content = "";
  let isCoverPage = true; // 첫 페이지는 표지
  let isPassageStarted = false;

  // 출처 패턴 찾기
  const sourcePatterns = [
    /수능완성\s*실전모의고사\s*\d+회/,
    /수능특강/,
    /수능완성/,
    /실전모의고사\s*\d+회/,
  ];

  // 문제 번호 패턴 (예: "3.", "2.", "3번" 등)
  const questionPattern = /^\d+[\.번]\s*[가-힣]?/;
  const questionNumberPattern = /^\d+\.\s*\d+\./; // "3. 2." 같은 패턴

  // subject 패턴 찾기 (예: "[2026학년도 수능완성] - 독서")
  const subjectPattern = /\[.*?\]\s*-\s*([가-힣]+)/;
  const subjectPattern2 = /-\s*([가-힣]+)\s*$/;

  // 표지 페이지에서 제목과 출처 찾기
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    const line = lines[i];

    // subject 찾기 (독서, 인문, 과학 등)
    if (!subject) {
      const subjectMatch = line.match(subjectPattern);
      if (subjectMatch) {
        subject = subjectMatch[1];
      } else {
        const subjectMatch2 = line.match(subjectPattern2);
        if (subjectMatch2) {
          subject = subjectMatch2[1];
        }
      }
    }

    // 출처 찾기
    if (!source) {
      for (const pattern of sourcePatterns) {
        if (pattern.test(line)) {
          // 출처 뒤에 [1-3] 같은 범위가 있으면 포함
          const rangeMatch = line.match(/(\[[\d-]+\])/);
          source = rangeMatch ? line : line.split(/\[/)[0].trim();
          break;
        }
      }
    }

    // 표지에서 제목 찾기 ("주제" 다음에 오는 것)
    if (isCoverPage && line.includes("주제")) {
      // "주제" 다음 줄이 제목
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.length > 3 && nextLine.length < 50 && /^[가-힣\s]+$/.test(nextLine)) {
          title = nextLine;
        }
      }
    }
  }

  // 지문 추출 (문제 제거)
  const passageLines: string[] = [];
  let skipNext = false;
  let foundPassageStart = false;

  // 표지 페이지 끝나는 지점 찾기 (주제, 출처 다음에 오는 긴 텍스트)
  let coverPageEndIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // "주제"나 "출처"를 찾았으면 그 이후에 긴 텍스트가 나오는 지점이 지문 시작
    if ((line.includes("주제") || line.includes("출처")) && i + 2 < lines.length) {
      // 몇 줄 뒤에 긴 텍스트가 있으면 그게 지문 시작
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].length > 30 && !questionPattern.test(lines[j]) && !lines[j].match(/^\d+[\.번]/)) {
          coverPageEndIndex = j;
          foundPassageStart = true;
          break;
        }
      }
      if (foundPassageStart) break;
    }
  }

  // 지문 추출 시작
  for (let i = Math.max(0, coverPageEndIndex); i < lines.length; i++) {
    const line = lines[i];

    // 문제 번호로 시작하는 줄 제거 (예: "3.", "2번" 등)
    if (questionPattern.test(line) || questionNumberPattern.test(line)) {
      skipNext = true;
      continue;
    }

    // "윗글", "보기", "다음", "이 글" 등으로 시작하는 문제 설명 제거
    if (skipNext || /^(윗글|보기|다음|이 글|위 글|아래 글|다음 글)/.test(line)) {
      skipNext = false;
      continue;
    }

    // 선택지 패턴 제거 (①, ②, ③, ④, ⑤ 또는 1), 2), 3) 등)
    if (/^[①②③④⑤]|^\d+\)/.test(line)) {
      continue;
    }

    // "국어 영역", "수능완성" 같은 헤더 제거
    if (line.includes("국어 영역") || line.includes("수능완성") || line.includes("학년도")) {
      continue;
    }

    // 지문 내용 추가 (길이가 충분한 줄만)
    if (line.length > 5) {
      passageLines.push(line);
    }
  }

  // 지문 내용 합치기 및 문단 구분
  if (passageLines.length > 0) {
    // 먼저 줄들을 합치기 (공백으로 연결)
    let combinedText = passageLines.join(" ").trim();
    
    // 문단 구분: 문장 끝 패턴 뒤에 특정 키워드가 오면 문단 구분
    // 예: "~이다." 다음에 "~란", "~는", "~과", "~외에도" 등으로 시작하면 새 문단
    const paragraphBreakPattern = /([.!?])\s+([가-힣]+(?:이란|란|는|과|외에도|가|이|의)\s)/g;
    
    // 문단 구분 위치 찾기
    const breaks: number[] = [0]; // 첫 문단 시작
    let match;
    
    while ((match = paragraphBreakPattern.exec(combinedText)) !== null) {
      // 문장 끝(마침표 등) 뒤의 공백 위치가 문단 구분점
      breaks.push(match.index + match[1].length + 1);
    }
    
    // 문단으로 나누기
    const paragraphs: string[] = [];
    for (let i = 0; i < breaks.length; i++) {
      const start = breaks[i];
      const end = i < breaks.length - 1 ? breaks[i + 1] : combinedText.length;
      const paragraph = combinedText.substring(start, end).trim();
      if (paragraph.length > 10) { // 최소 길이 체크
        paragraphs.push(paragraph);
      }
    }
    
    // 문단이 하나도 없거나 너무 적으면, 문장 단위로 나누기
    if (paragraphs.length <= 1) {
      // 문장 단위로 나누기 (마침표, 느낌표, 물음표 기준)
      const sentences = combinedText.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
      
      // 문장들을 합쳐서 문단 만들기 (약 3-5문장씩)
      const newParagraphs: string[] = [];
      let currentParagraph = "";
      let sentenceCount = 0;
      
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = (sentences[i] || "") + (sentences[i + 1] || "");
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        
        currentParagraph += (currentParagraph ? " " : "") + trimmed;
        sentenceCount++;
        
        // 3-5문장마다 또는 특정 패턴이 있으면 문단 구분
        const hasParagraphBreak = /(이다|수 있다|수 있다고|할 수 있다)\.\s+[가-힣]+(?:이란|란|는|과|외에도)/.test(currentParagraph);
        
        if (sentenceCount >= 4 || hasParagraphBreak) {
          if (currentParagraph.trim().length > 10) {
            newParagraphs.push(currentParagraph.trim());
          }
          currentParagraph = "";
          sentenceCount = 0;
        }
      }
      
      // 마지막 문단 추가
      if (currentParagraph.trim().length > 10) {
        newParagraphs.push(currentParagraph.trim());
      }
      
      if (newParagraphs.length > 0) {
        content = newParagraphs.join("\n\n");
      } else {
        content = combinedText;
      }
    } else {
      content = paragraphs.join("\n\n");
    }
  } else {
    // 파싱 실패 시 원본 텍스트 사용 (디버깅용)
    content = text;
  }

  // 출처에서 연도 추출
  const yearMatch = text.match(/(\d{4})학년도/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  return {
    title,
    source,
    subject,
    content,
    year,
  };
}

