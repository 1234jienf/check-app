"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentVocabularyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVocabulary = async () => {
      const { data, error } = await supabase
        .from("english_vocabulary")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert("단어장을 불러올 수 없습니다.");
        router.push("/student/materials");
        return;
      }

      setVocabulary(data);
      setLoading(false);
    };

    if (params.id) {
      loadVocabulary();
    }
  }, [params.id, router]);

  // 영어 페이지 접근 시 세션 스토리지에 영어 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedSubject', 'english');
      window.dispatchEvent(new CustomEvent('subjectChanged', { detail: { subject: 'english' } }));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    );
  }

  if (!vocabulary) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/materials"
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
          자료실로 돌아가기
        </Link>

        <div className="rounded-xl p-6 md:p-8 shadow-xl border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#13181B' }}>
              {vocabulary.title}
            </h1>
            <Link
              href={`/student/daily-test/vocab/${params.id}`}
              className="px-6 py-3 rounded-xl font-semibold transition-all shadow-sm"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
              }}
            >
              시험 보기
            </Link>
          </div>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            단어 {vocabulary.word_count}개
          </p>
          <div className="whitespace-pre-wrap text-base leading-relaxed p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF', color: '#13181B' }}>
            {vocabulary.words}
          </div>
        </div>
      </div>
    </div>
  );
}

