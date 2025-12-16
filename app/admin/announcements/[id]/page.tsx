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

export default function AnnouncementDetailPage() {
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
        router.push("/admin/announcements");
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
        <p style={{ color: '#13181B' }}>로딩 중...</p>
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
          href="/admin/announcements"
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
          <div className="whitespace-pre-wrap text-base leading-relaxed" style={{ color: '#13181B' }}>
            {announcement.content}
          </div>
        </div>
      </div>
    </div>
  );
}

