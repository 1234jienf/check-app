import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const AUDIO_MIME_PREFIX = "audio/";
const AUDIO_EXT = new Set(["mp3", "m4a", "wav", "webm", "ogg", "aac", "flac"]);

function isAllowedAudio(file: File): boolean {
  if (file.type.startsWith(AUDIO_MIME_PREFIX)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? AUDIO_EXT.has(ext) : false;
}

/** 최대 50MB (음성 녹음·강의 파일) */
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (!isAllowedAudio(file)) {
      return NextResponse.json(
        { error: "음성 파일만 업로드 가능합니다. (mp3, m4a, wav, webm, ogg 등)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "파일 크기는 50MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const rawExt = file.name.split(".").pop();
    const safeExt = rawExt && /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt : "mp3";
    const fileName = `announcements/audio/${timestamp}-${randomStr}.${safeExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType =
      file.type && file.type.startsWith(AUDIO_MIME_PREFIX)
        ? file.type
        : "audio/mpeg";

    const { error } = await supabase.storage.from("files").upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("Upload error:", error);
      if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
        return NextResponse.json(
          {
            error:
              "Storage bucket이 없습니다. Supabase 대시보드 > Storage > Buckets에서 'files' bucket을 생성해주세요. (Public bucket으로 설정)",
          },
          { status: 500 }
        );
      }
      const msg = error.message || "";
      if (
        /exceeded the maximum|maximum allowed size|Payload too large|413/i.test(msg)
      ) {
        return NextResponse.json(
          {
            error:
              "Supabase Storage의 파일 크기 제한을 넘었습니다. 대시보드에서 Storage → files 버킷 → 설정(연필) → 최대 파일 크기를 50MB 이상으로 올려주세요.",
          },
          { status: 413 }
        );
      }
      return NextResponse.json({ error: msg || "업로드에 실패했습니다." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("files").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    if (!publicUrl || !publicUrl.includes("storage/v1/object/public")) {
      console.error("Invalid public URL generated:", publicUrl);
      return NextResponse.json({ error: "파일 URL 생성에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다: " + message }, { status: 500 });
  }
}
