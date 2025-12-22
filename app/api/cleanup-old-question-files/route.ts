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
    const { daysOld = 365 } = await request.json(); // 기본값: 1년

    // 오래된 질문 가져오기 (지정된 일수 이상 된 질문)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data: oldQuestions, error: fetchError } = await supabase
      .from("questions")
      .select("id, content")
      .lt("created_at", cutoffDate.toISOString());

    if (fetchError) {
      return NextResponse.json(
        { error: "질문 조회 실패: " + fetchError.message },
        { status: 500 }
      );
    }

    if (!oldQuestions || oldQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "정리할 오래된 질문이 없습니다.",
        deletedFiles: 0,
        processedQuestions: 0,
      });
    }

    const allFilesToDelete: string[] = [];

    // 각 질문의 이미지/파일 추출
    for (const question of oldQuestions) {
      if (!question.content) continue;

      // 이미지 URL 추출
      const imageUrls = extractImageUrls(question.content);
      for (const url of imageUrls) {
        const filePath = extractFilePath(url);
        if (filePath && filePath.startsWith('questions/')) {
          allFilesToDelete.push(filePath);
        }
      }

      // 첨부파일 링크 추출
      const fileLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>📎/gi;
      let fileMatch;
      while ((fileMatch = fileLinkRegex.exec(question.content)) !== null) {
        const filePath = extractFilePath(fileMatch[1]);
        if (filePath && filePath.startsWith('questions/files/')) {
          allFilesToDelete.push(filePath);
        }
      }
    }

    // 중복 제거
    const uniqueFiles = Array.from(new Set(allFilesToDelete));

    // Storage에서 파일 삭제
    let deletedCount = 0;
    if (uniqueFiles.length > 0) {
      // 한 번에 너무 많은 파일을 삭제하지 않도록 배치로 나눔
      const batchSize = 100;
      for (let i = 0; i < uniqueFiles.length; i += batchSize) {
        const batch = uniqueFiles.slice(i, i + batchSize);
          const { error } = await supabase.storage
          .from("files")
          .remove(batch);

        if (error) {
          console.error(`파일 삭제 오류 (배치 ${i / batchSize + 1}):`, error);
        } else {
          deletedCount += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${daysOld}일 이상 된 질문의 파일을 정리했습니다.`,
      deletedFiles: deletedCount,
      processedQuestions: oldQuestions.length,
      totalFilesFound: uniqueFiles.length,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
