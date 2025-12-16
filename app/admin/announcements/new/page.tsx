"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  // 세션에서 선택한 과목 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

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

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    // subject 컬럼이 있는지 확인하고 추가
    let insertData: any = {
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
      is_pinned: isPinned,
    };

    // subject 컬럼이 있는지 확인
    try {
      const { data: testData, error: testError } = await supabase
        .from("announcements")
        .select("subject")
        .limit(1)
        .maybeSingle();

      if (!testError && testData && testData.subject !== undefined) {
        insertData.subject = selectedSubject;
      }
    } catch (testErr: any) {
      // subject 컬럼이 없으면 무시
    }

    const { error } = await supabase
      .from("announcements")
      .insert(insertData);

    if (error) {
      alert("공지사항 작성에 실패했습니다.");
      setLoading(false);
    } else {
      router.push("/admin/announcements");
    }
  };

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
              새 공지 작성
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
                borderColor: '#CCD5DA',
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="공지사항 제목을 입력하세요"
              disabled={loading}
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
                borderColor: '#CCD5DA',
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="공지사항 내용을 입력하세요"
              disabled={loading}
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
              disabled={loading}
            />
            <label htmlFor="isPinned" className="text-sm font-medium" style={{ color: '#13181B' }}>
              중요 공지로 고정하기
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {loading ? "작성 중..." : "작성하기"}
            </button>
            <Link
              href="/admin/announcements"
              className="px-8 py-3 rounded-xl font-semibold transition-all shadow-sm"
              style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F0EEEB';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
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
