"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PassageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [passageAnalysis, setPassageAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPassageAnalysis = async () => {
      const { data, error } = await supabase
        .from("english_passage_analysis")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        alert("지문 해체를 불러올 수 없습니다.");
        router.push("/admin/materials");
        return;
      }

      setPassageAnalysis(data);
      setLoading(false);
    };

    if (params.id) {
      loadPassageAnalysis();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    );
  }

  if (!passageAnalysis) {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#13181B' }}>
            {passageAnalysis.title}
          </h1>
          <div className="whitespace-pre-wrap text-base leading-relaxed p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
            {passageAnalysis.passage_text}
          </div>
        </div>
      </div>
    </div>
  );
}

