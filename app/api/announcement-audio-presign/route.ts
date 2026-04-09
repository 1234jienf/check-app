import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = new Set(["mp3", "m4a", "wav", "webm", "ogg", "aac", "flac"]);

/**
 * 선생님만 호출. 본문은 작고, 실제 파일은 클라이언트가 Supabase Storage에 직접 업로드 (Vercel 4.5MB 제한 회피).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "teacher") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const fileSize = Number(body.fileSize);
    const rawExt =
      typeof body.extension === "string" ? body.extension.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    const safeExt = ALLOWED_EXT.has(rawExt) ? rawExt : "mp3";

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_BYTES) {
      return NextResponse.json(
        { error: "파일 크기는 50MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const objectPath = `announcements/audio/${timestamp}-${randomStr}.${safeExt}`;

    const { data: signData, error: signErr } = await service.storage
      .from("files")
      .createSignedUploadUrl(objectPath, { upsert: false });

    if (signErr || !signData) {
      console.error("createSignedUploadUrl:", signErr);
      return NextResponse.json(
        {
          error:
            signErr?.message ||
            "서명 URL 생성에 실패했습니다. Supabase Storage 설정을 확인하세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        path: signData.path,
        token: signData.token,
        signedUrl: signData.signedUrl,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("announcement-audio-presign:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
