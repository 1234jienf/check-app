import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // HWP 파일은 바이너리 포맷이라 브라우저에서 직접 파싱이 어렵습니다.
    // 대신 텍스트 파일이나 사용자가 복사한 텍스트를 처리합니다.
    
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      
      // 텍스트에서 제목, 출처 등을 추출
      const parsed = parseText(text);
      
      return NextResponse.json(parsed);
    } else {
      return NextResponse.json(
        { error: "HWP 파일은 직접 파싱이 어렵습니다. 텍스트를 복사해서 붙여넣어주세요." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "파싱 실패" },
      { status: 500 }
    );
  }
}

function parseText(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  
  let title = "";
  let source = "";
  let content = text;
  
  // 출처 패턴 찾기 (예: "수능완성 실전모의고사 1회 [1-3]")
  const sourcePatterns = [
    /수능완성\s*실전모의고사\s*\d+회\s*\[[\d-]+\]/,
    /수능특강\s*.*?\[[\d-]+\]/,
    /수능완성\s*.*?\[[\d-]+\]/,
    /실전모의고사\s*\d+회/,
    /\[202\d+학년도.*?\]/,
  ];
  
  // 제목 패턴 찾기 (첫 번째 줄이나 특정 패턴)
  const titlePatterns = [
    /^[가-힣\s]+$/, // 한글만 있는 줄
  ];
  
  // 첫 몇 줄에서 제목과 출처 찾기
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    // 출처 찾기
    if (!source) {
      for (const pattern of sourcePatterns) {
        const match = line.match(pattern);
        if (match) {
          source = match[0];
          break;
        }
      }
    }
    
    // 제목 찾기 (출처가 아닌 첫 번째 의미있는 줄)
    if (!title && line.length > 2 && line.length < 50) {
      const isSource = sourcePatterns.some((p) => p.test(line));
      if (!isSource && titlePatterns.some((p) => p.test(line))) {
        title = line;
      }
    }
  }
  
  // 본문에서 제목 추출 (예: "텍스트의 특성", "묵자의 사상" 등)
  if (!title) {
    for (const line of lines) {
      if (line.length > 3 && line.length < 30 && /^[가-힣\s]+$/.test(line)) {
        const isSource = sourcePatterns.some((p) => p.test(line));
        if (!isSource && !line.includes("학년도") && !line.includes("모의고사")) {
          title = line;
          break;
        }
      }
    }
  }
  
  // 출처에서 연도 추출
  const yearMatch = text.match(/(\d{4})학년도/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  
  return {
    title,
    source,
    content: text,
    year,
  };
}

