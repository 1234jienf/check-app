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

function extractFilePathFromStorageUrl(url: string): string | null {
  const clean = url.split("?")[0];
  const match = clean.match(/\/storage\/v1\/object\/public\/files\/(.+)$/);
  return match ? match[1] : null;
}

/** 공지 HTML에 포함된 Supabase Storage `files` 경로 (announcements/ 로 시작하는 것만) */
function extractAnnouncementStoragePaths(html: string): string[] {
  const paths = new Set<string>();
  const add = (rawUrl: string) => {
    if (!rawUrl || rawUrl.startsWith("data:")) return;
    const p = extractFilePathFromStorageUrl(rawUrl);
    if (p && p.startsWith("announcements/")) paths.add(p);
  };

  const patterns = [
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<audio[^>]+src=["']([^"']+)["']/gi,
    /<source[^>]+src=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null) add(m[1]);
  }
  return [...paths];
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

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

    const { data: row, error: fetchErr } = await service
      .from("announcements")
      .select("content")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
    }

    const paths = extractAnnouncementStoragePaths(row.content || "");
    if (paths.length > 0) {
      const { error: storageErr } = await service.storage.from("files").remove(paths);
      if (storageErr) {
        console.error("Announcement storage delete:", storageErr);
      }
    }

    const { error: delErr } = await service.from("announcements").delete().eq("id", id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, removedFiles: paths.length });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("DELETE announcement:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
