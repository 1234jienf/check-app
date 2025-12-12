"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAnnouncement = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("공지사항 로드 오류:", error);
        alert("공지사항을 불러올 수 없습니다.");
        router.push("/admin/announcements");
        return;
      }

      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setIsPinned(data.is_pinned || false);
      }

      setLoading(false);
    };

    if (id) {
      loadAnnouncement();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("announcements")
      .update({
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
      })
      .eq("id", id);

    if (error) {
      console.error("공지사항 수정 오류:", error);
      alert("공지사항 수정에 실패했습니다.");
      setSaving(false);
    } else {
      router.push("/admin/announcements");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="text-center">
          <div className="mx-auto mb-4" style={{ 
            animation: 'spin 2s linear infinite, pulse 2s ease-in-out infinite',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src="/bishop-logo.png" 
              alt="Loading" 
              className="w-full h-full"
              style={{ filter: 'grayscale(100%) brightness(0.8)' }}
            />
          </div>
          <p style={{ color: '#13181B' }}>로딩 중...</p>
          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/announcements"
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            공지사항 목록으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              공지 수정
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all"
              style={{
                backgroundColor: '#F0EEEB',
                borderColor: '#13181B',
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="공지사항 제목을 입력하세요"
              disabled={saving}
            />
            <style jsx>{`
              input::placeholder {
                color: #13181B;
                opacity: 0.5;
              }
            `}</style>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full px-4 py-3 border-2 rounded-xl transition-all resize-none"
              style={{
                backgroundColor: '#F0EEEB',
                borderColor: '#13181B',
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="공지사항 내용을 입력하세요"
              disabled={saving}
            />
            <style jsx>{`
              textarea::placeholder {
                color: #13181B;
                opacity: 0.5;
              }
            `}</style>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: '#13181B' }}
              disabled={saving}
            />
            <label htmlFor="isPinned" className="text-sm font-medium" style={{ color: '#13181B' }}>
              중요 공지로 고정하기
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {saving ? "수정 중..." : "수정하기"}
            </button>
            <Link
              href="/admin/announcements"
              className="px-8 py-3 rounded-xl font-semibold transition-all border-2"
              style={{ backgroundColor: 'transparent', borderColor: '#13181B', color: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
