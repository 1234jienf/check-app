"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPassageContent() {
  const { id } = useParams();
  const router = useRouter();
  const [passage, setPassage] = useState<any>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setPassage(data);
        setContent(data.content || "");
      }
    };

    if (id) load();
  }, [id]);

  const saveContent = async () => {
    const { error } = await supabase
      .from("passages")
      .update({ content })
      .eq("id", id);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    alert("지문이 저장되었습니다!");
    router.push(`/admin/passages/${id}`);
  };

  if (!passage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
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

  const getCategoryColor = (cat: string) => {
    if (cat === "EBS") return '#003A6C';
    if (cat === "기출" || cat === "평가원") return '#FFBF65';
    if (cat === "LEET") return '#FD8973';
    return '#13181B';
  };

  const categoryColor = getCategoryColor(passage?.category || '기타');

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-4xl mx-auto" style={{ backgroundColor: '#F0EEEB', minHeight: '100vh' }}>
      <div className="mb-4 md:mb-6">
        <Link
          href={`/admin/passages/${id}`}
          className="mb-4 inline-block transition-colors"
          style={{ color: categoryColor }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ← 지문 상세로 돌아가기
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: categoryColor }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h1 className="text-xl md:text-2xl font-bold relative inline-block pb-2" style={{ color: categoryColor }}>
            지문 내용 수정
            <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${categoryColor} 0%, ${categoryColor} 50%, transparent 100%)`, borderRadius: '2px' }}></span>
          </h1>
        </div>
        <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>{passage.title}</p>
      </div>

      <div className="border-2 rounded-2xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>지문 내용</label>
          <textarea
            className="border-2 rounded-xl p-3 w-full h-64 md:h-96 text-sm md:text-base transition-all resize-none"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            placeholder="지문을 붙여넣으세요. 빈 줄로 문단이 자동으로 구분됩니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <style jsx>{`
            textarea::placeholder {
              color: #13181B;
              opacity: 0.7;
            }
          `}</style>
          <p className="text-xs mt-2" style={{ color: '#13181B', opacity: 0.7 }}>
            지문을 붙여넣으면 자동으로 문단이 나뉩니다. 문단 구분을 위해 빈 줄을 사용하세요.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={saveContent}
            className="px-4 md:px-6 py-2 rounded-xl font-semibold transition-all text-sm md:text-base"
            style={{ backgroundColor: categoryColor, color: '#F0EEEB' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            저장하기
          </button>
          <Link
            href={`/admin/passages/${id}`}
            className="px-4 md:px-6 py-2 rounded-xl text-center transition-all border-2 text-sm md:text-base"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#CCD5DA';
              e.currentTarget.style.borderColor = '#13181B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0EEEB';
              e.currentTarget.style.borderColor = '#CCD5DA';
            }}
          >
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}

