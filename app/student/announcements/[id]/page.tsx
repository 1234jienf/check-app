"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  author_name?: string;
}

export default function StudentAnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncement = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert("공지사항을 불러올 수 없습니다.");
        router.push("/student/announcements");
        return;
      }

      // 작성자 이름 가져오기
      if (data.author_id) {
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.author_id)
          .single();

        setAnnouncement({
          ...data,
          author_name: userData?.name || "선생님"
        });
      } else {
        setAnnouncement({
          ...data,
          author_name: "선생님"
        });
      }

      setLoading(false);
    };

    if (params.id) {
      loadAnnouncement();
    }
  }, [params.id, router]);

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

  if (!announcement) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/announcements"
          className="inline-flex items-center mb-6 transition-colors"
          style={{ color: '#13181B' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          공지사항으로 돌아가기
        </Link>

        <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center gap-3 mb-4">
            {announcement.is_pinned && (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#13181B' }}>
              {announcement.title}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            <span>{announcement.author_name}</span>
            <span>{new Date(announcement.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {announcement.updated_at !== announcement.created_at && (
              <span>(수정됨)</span>
            )}
          </div>
          <div 
            className="text-base leading-relaxed quill-content"
            style={{ color: '#13181B', lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: announcement.content || '' }}
          />
          <style jsx global>{`
            .ql-editor,
            .quill-content {
              padding: 0;
            }
            .ql-editor p,
            .quill-content p {
              margin: 1em 0;
              white-space: pre-wrap;
            }
            .ql-editor ol,
            .ql-editor ul,
            .quill-content ol,
            .quill-content ul {
              margin: 1em 0;
              padding-left: 1.5em;
            }
            .ql-editor li,
            .quill-content li {
              margin: 0.5em 0;
              white-space: pre-wrap;
              line-height: 1.8;
            }
            .ql-editor li p,
            .quill-content li p {
              margin: 0;
              white-space: pre-wrap;
            }
            .ql-editor ol li,
            .ql-editor ul li,
            .quill-content ol li,
            .quill-content ul li {
              display: list-item;
              white-space: pre-wrap;
            }
            .ql-editor pre,
            .ql-editor blockquote,
            .ql-editor h1,
            .ql-editor h2,
            .ql-editor h3,
            .ql-editor h4,
            .ql-editor h5,
            .ql-editor h6,
            .quill-content pre,
            .quill-content blockquote,
            .quill-content h1,
            .quill-content h2,
            .quill-content h3,
            .quill-content h4,
            .quill-content h5,
            .quill-content h6 {
              margin: 1em 0;
            }
            .ql-editor img,
            .quill-content img {
              max-width: 100%;
              height: auto;
            }
            .ql-editor hr,
            .quill-content hr {
              border-top: 2px solid #CCD5DA;
              margin: 20px 0;
            }
            /* 들여쓰기 스타일 - Quill은 클래스 기반으로 작동 (ql-indent-1, ql-indent-2 등) */
            .ql-editor .ql-indent-1,
            .quill-content .ql-indent-1,
            .ql-editor p.ql-indent-1,
            .quill-content p.ql-indent-1,
            .ql-editor div.ql-indent-1,
            .quill-content div.ql-indent-1 {
              padding-left: 3em !important;
            }
            .ql-editor .ql-indent-2,
            .quill-content .ql-indent-2,
            .ql-editor p.ql-indent-2,
            .quill-content p.ql-indent-2,
            .ql-editor div.ql-indent-2,
            .quill-content div.ql-indent-2 {
              padding-left: 6em !important;
            }
            .ql-editor .ql-indent-3,
            .quill-content .ql-indent-3,
            .ql-editor p.ql-indent-3,
            .quill-content p.ql-indent-3,
            .ql-editor div.ql-indent-3,
            .quill-content div.ql-indent-3 {
              padding-left: 9em !important;
            }
            .ql-editor .ql-indent-4,
            .quill-content .ql-indent-4,
            .ql-editor p.ql-indent-4,
            .quill-content p.ql-indent-4,
            .ql-editor div.ql-indent-4,
            .quill-content div.ql-indent-4 {
              padding-left: 12em !important;
            }
            .ql-editor .ql-indent-5,
            .quill-content .ql-indent-5,
            .ql-editor p.ql-indent-5,
            .quill-content p.ql-indent-5,
            .ql-editor div.ql-indent-5,
            .quill-content div.ql-indent-5 {
              padding-left: 15em !important;
            }
            .ql-editor .ql-indent-6,
            .quill-content .ql-indent-6,
            .ql-editor p.ql-indent-6,
            .quill-content p.ql-indent-6,
            .ql-editor div.ql-indent-6,
            .quill-content div.ql-indent-6 {
              padding-left: 18em !important;
            }
            .ql-editor .ql-indent-7,
            .quill-content .ql-indent-7,
            .ql-editor p.ql-indent-7,
            .quill-content p.ql-indent-7,
            .ql-editor div.ql-indent-7,
            .quill-content div.ql-indent-7 {
              padding-left: 21em !important;
            }
            .ql-editor .ql-indent-8,
            .quill-content .ql-indent-8,
            .ql-editor p.ql-indent-8,
            .quill-content p.ql-indent-8,
            .ql-editor div.ql-indent-8,
            .quill-content div.ql-indent-8 {
              padding-left: 24em !important;
            }
            /* inline style로 적용된 경우도 처리 */
            .ql-editor [style*="padding-left"],
            .quill-content [style*="padding-left"] {
              /* inline style이 우선순위가 높으므로 그대로 적용됨 */
            }
            /* 리스트 들여쓰기 */
            .ql-editor ol,
            .ql-editor ul,
            .quill-content ol,
            .quill-content ul {
              padding-left: 1.5em;
            }
            .ql-editor li,
            .quill-content li {
              padding-left: 0.5em;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}



