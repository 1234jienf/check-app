"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VocabularyDetailPage() {
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
        router.push("/admin/materials");
        return;
      }

      setVocabulary(data);
      setLoading(false);
    };

    if (params.id) {
      loadVocabulary();
    }
  }, [params.id, router]);

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
          href="/admin/materials"
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

        <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#13181B' }}>
            {vocabulary.title}
          </h1>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            단어 {vocabulary.word_count}개
          </p>
          <div className="whitespace-pre-wrap text-base leading-relaxed p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
            {vocabulary.words}
          </div>
        </div>
      </div>
    </div>
  );
}

