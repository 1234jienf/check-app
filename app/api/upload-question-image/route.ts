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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 제한 (2MB) - Storage 절약을 위해 더 작게
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "이미지 크기는 2MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일명 생성 (타임스탬프 + 랜덤 문자열)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExt = file.name.split(".").pop();
    const fileName = `questions/${timestamp}-${randomStr}.${fileExt}`;

    // Supabase Storage에 업로드
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from("files")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      // bucket이 없는 경우 더 명확한 에러 메시지
      if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Storage bucket이 없습니다. Supabase 대시보드 > Storage > Buckets에서 'files' bucket을 생성해주세요. (Public bucket으로 설정)" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "이미지 업로드에 실패했습니다: " + error.message },
        { status: 500 }
      );
    }

    // Public URL 생성
    // 질문 게시판은 로그인한 유저만 접근 가능하므로 간접적으로 보호됨
    const { data: urlData } = supabase.storage
      .from("files")
      .getPublicUrl(fileName);

    // URL이 제대로 생성되었는지 확인
    const publicUrl = urlData.publicUrl;
    if (!publicUrl || !publicUrl.includes('storage/v1/object/public')) {
      console.error("Invalid public URL generated:", publicUrl);
      return NextResponse.json(
        { error: "이미지 URL 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
