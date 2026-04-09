import { supabase } from "@/lib/supabase";

export type AnnouncementAudioUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

/**
 * Vercel API 본문 제한(약 4.5MB)을 피하기 위해 서명 URL 후 브라우저→Supabase 직접 업로드.
 */
export async function uploadAnnouncementAudio(
  file: File
): Promise<AnnouncementAudioUploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";

  const presignRes = await fetch("/api/announcement-audio-presign", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileSize: file.size, extension: ext }),
  });

  const presignRaw = await presignRes.text();
  let presign: { path?: string; token?: string; signedUrl?: string; error?: string };
  try {
    presign = JSON.parse(presignRaw) as typeof presign;
  } catch {
    return {
      ok: false,
      error: `서명 요청 응답을 읽을 수 없습니다. (${presignRes.status}) 최신 배포가 반영됐는지 확인하세요.`,
    };
  }

  if (!presignRes.ok || presign.error || !presign.path || !presign.token) {
    return {
      ok: false,
      error: presign.error || `업로드 준비 실패 (${presignRes.status})`,
    };
  }

  let upErr: { message: string } | null = null;
  try {
    const r = await supabase.storage
      .from("files")
      .uploadToSignedUrl(presign.path, presign.token, file, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });
    upErr = r.error;
  } catch (e: unknown) {
    upErr = { message: e instanceof Error ? e.message : String(e) };
  }

  const finalizeUrl = (path: string): AnnouncementAudioUploadResult => {
    const { data: urlData } = supabase.storage.from("files").getPublicUrl(path);
    const publicUrl = (urlData.publicUrl || "").trim().replace(/\s+/g, "");
    if (!publicUrl) {
      return { ok: false, error: "공개 URL을 만들 수 없습니다." };
    }
    try {
      const u = new URL(publicUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("protocol");
      }
      return { ok: true, publicUrl };
    } catch {
      return {
        ok: false,
        error:
          "파일 주소 형식이 올바르지 않습니다. NEXT_PUBLIC_SUPABASE_URL 끝에 공백이 없는지 확인하세요.",
      };
    }
  };

  if (!upErr) {
    return finalizeUrl(presign.path);
  }

  if (presign.signedUrl) {
    const putRes = await fetch(presign.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
    if (putRes.ok) {
      return finalizeUrl(presign.path);
    }
    return {
      ok: false,
      error: `${upErr.message} / PUT ${putRes.status}`,
    };
  }

  return { ok: false, error: upErr.message || "Storage 업로드 실패" };
}
