import { supabase } from "@/lib/supabase";

export type DasangPdfUploadResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string };

/**
 * Vercel API 본문 제한(약 4.5MB)을 피하기 위해 서명 URL 후 브라우저→Supabase 직접 업로드.
 */
export async function uploadDasangPdf(file: File): Promise<DasangPdfUploadResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";

  const presignRes = await fetch("/api/dasang-pdf-presign", {
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
      error: `서명 요청 응답을 읽을 수 없습니다. (${presignRes.status})`,
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
        contentType: file.type || "application/pdf",
        upsert: false,
      });
    upErr = r.error;
  } catch (e: unknown) {
    upErr = { message: e instanceof Error ? e.message : String(e) };
  }

  if (!upErr) {
    return { ok: true, storagePath: presign.path };
  }

  if (presign.signedUrl) {
    const putRes = await fetch(presign.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/pdf",
      },
    });
    if (putRes.ok) {
      return { ok: true, storagePath: presign.path };
    }
    return {
      ok: false,
      error: `${upErr.message} / PUT ${putRes.status}`,
    };
  }

  return { ok: false, error: upErr.message || "Storage 업로드 실패" };
}
