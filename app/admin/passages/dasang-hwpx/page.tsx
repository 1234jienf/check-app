"use client";

import { useState } from "react";
import Link from "next/link";
import { uploadDasangPdf } from "@/lib/dasangPdfUpload";

/** "5,6회" / "3~4회" / "5회" → [5,6] */
function detectHoes(filename: string): number[] {
  const range = filename.match(/(\d+)\s*[,~\-]\s*(\d+)\s*회/);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const out: number[] = [];
    for (let i = lo; i <= hi; i++) out.push(i);
    return out;
  }
  const single = filename.match(/(\d+)\s*회/);
  if (single) return [parseInt(single[1], 10)];
  return [3];
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const m = header.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const raw = m?.[1] || m?.[2];
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function DasangHwpxPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [status, setStatus] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setDoneMsg("");
    setLoading(true);
    setStatus("");

    const hoes = detectHoes(file.name);

    try {
      const formData = new FormData();
      formData.append("hoe", hoes.join(","));

      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      const tooLarge = file.size > 3.5 * 1024 * 1024;

      if (isPdf && tooLarge) {
        setStatus("큰 PDF 업로드 중…");
        const uploaded = await uploadDasangPdf(file);
        if (!uploaded.ok) throw new Error(uploaded.error);
        formData.append("storagePath", uploaded.storagePath);
        formData.append("originalName", file.name);
        setStatus("변환 중…");
      } else {
        formData.append("file", file);
        setStatus("변환 중…");
      }

      const res = await fetch("/api/dasang-hwpx", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "변환 실패");
        }
        throw new Error((await res.text()).slice(0, 200) || "변환 실패");
      }

      const blob = await res.blob();
      const fallback =
        hoes.length > 1
          ? `다상다독_${hoes.join("-")}회_클린최종.zip`
          : `다상다독_${hoes[0]}회_클린최종.hwpx`;
      const downloadName = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
        fallback
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDoneMsg(
        hoes.length > 1
          ? `완료: ${hoes.join("·")}회 → ${downloadName}`
          : `완료: ${file.name} → ${downloadName}`
      );
    } catch (err: any) {
      setError(err.message || "변환 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: "#F0EEEB" }}>
      <div className="max-w-xl mx-auto">
        <Link
          href="/admin/passages"
          className="inline-flex items-center mb-6 transition-colors"
          style={{ color: "#13181B" }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          지문 관리로 돌아가기
        </Link>

        <div className="rounded-xl p-8 shadow-sm" style={{ backgroundColor: "#FFFFFF" }}>
          <h1 className="text-xl font-bold mb-6" style={{ color: "#13181B" }}>
            PDF → 한글 변환
          </h1>

          <label
            className="flex flex-col items-center justify-center w-full min-h-[180px] rounded-xl border-2 border-dashed cursor-pointer transition-colors"
            style={{ borderColor: "#CCD5DA", backgroundColor: "#F0EEEB" }}
          >
            <input
              type="file"
              accept=".txt,.pdf,.md"
              onChange={handleFile}
              disabled={loading}
              className="hidden"
            />
            {loading ? (
              <span className="text-sm text-center px-4" style={{ color: "#13181B" }}>
                {status || "변환 중..."}
              </span>
            ) : (
              <>
                <svg
                  className="w-10 h-10 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "#13181B", opacity: 0.5 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-semibold" style={{ color: "#13181B" }}>
                  PDF 또는 복붙용 txt 선택
                </span>
                <span className="text-xs mt-2 text-center px-4" style={{ color: "#13181B", opacity: 0.6 }}>
                  큰 PDF(최대 200MB)도 가능 · 글자가 선택되는 PDF만 자동 변환
                  <br />
                  스캔본은 복붙용 txt · [1~…]이 다시 나오면 회차 분리
                </span>
              </>
            )}
          </label>

          {doneMsg && !loading && !error && (
            <p className="mt-4 text-xs" style={{ color: "#13181B", opacity: 0.7 }}>
              {doneMsg}
            </p>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
