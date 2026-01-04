import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 빌드 시점에는 환경 변수가 없을 수 있으므로 런타임에만 클라이언트 생성
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// HTML content에서 이미지 URL 추출
function extractImageUrls(htmlContent: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    urls.push(match[1]);
  }
  
  return urls;
}

// URL에서 파일 경로 추출
function extractFilePath(url: string): string | null {
  try {
    // Supabase Storage URL 형식: https://xxx.supabase.co/storage/v1/object/public/files/questions/xxx.jpg
    const match = url.match(/\/storage\/v1\/object\/public\/files\/(.+)$/);
    if (match) {
      return match[1];
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { questionId, content } = await request.json();

    if (!questionId || !content) {
      return NextResponse.json(
        { error: "questionId와 content가 필요합니다." },
        { status: 400 }
      );
    }

    // content에서 이미지 URL 추출
    const imageUrls = extractImageUrls(content);
    const filesToDelete: string[] = [];

    // 각 이미지 URL에서 파일 경로 추출
    for (const url of imageUrls) {
      const filePath = extractFilePath(url);
      if (filePath && filePath.startsWith('questions/')) {
        filesToDelete.push(filePath);
      }
    }

    // 첨부파일도 확인 (questions/files/ 경로)
    const fileLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>📎/gi;
    let fileMatch;
    while ((fileMatch = fileLinkRegex.exec(content)) !== null) {
      const filePath = extractFilePath(fileMatch[1]);
      if (filePath && filePath.startsWith('questions/files/')) {
        filesToDelete.push(filePath);
      }
    }

    // Storage에서 파일 삭제
    if (filesToDelete.length > 0) {
      const { error } = await supabase.storage
        .from("files")
        .remove(filesToDelete);

      if (error) {
        console.error("파일 삭제 오류:", error);
        // 파일 삭제 실패해도 질문 삭제는 진행
      }
    }

    return NextResponse.json({
      success: true,
      deletedFiles: filesToDelete.length,
    });
  } catch (error: any) {
    console.error("Delete files error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}




