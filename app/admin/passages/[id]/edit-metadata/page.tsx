"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPassageMetadata() {
  const { id } = useParams();
  const router = useRouter();
  const [passage, setPassage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState(2025);
  const [category, setCategory] = useState("EBS");
  const [ebsType, setEbsType] = useState("수특");
  const [leetType, setLeetType] = useState("추리논증");
  const [examType, setExamType] = useState("6월");
  const [literaryType, setLiteraryType] = useState("비문학");
  const [subCategory, setSubCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // 비문학 세부 카테고리
  const nonLiteraryCategories = ["인문", "예술", "법", "경제", "과학", "기술", "복합", "국어", "독서"];
  // 문학 세부 카테고리
  const literaryCategories = ["현대시", "고전시가", "현대소설", "고전소설", "고전수필", "수필", "희곡"];

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setPassage(data);
        setTitle(data.title || "");
        setSource(data.source || "");
        setYear(data.year || 2025);
        setCategory(data.category || "EBS");
        setEbsType(data.ebs_type || "수특");
        setLeetType(data.leet_type || "추리논증");
        setExamType(data.exam_type || "6월");
        setLiteraryType(data.literary_type || "비문학");
        setSubCategory(data.sub_category || "");
        setDifficulty(data.difficulty || "");
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const saveMetadata = async () => {
    const updateData: any = {
      title: title || null,
      source: source || null,
      year,
      category,
      literary_type: literaryType,
      sub_category: subCategory || null,
      difficulty: difficulty || null,
    };

    // 카테고리별 특수 필드
    if (category === "EBS") {
      updateData.ebs_type = ebsType;
      updateData.leet_type = null;
      updateData.exam_type = null;
    } else if (category === "LEET") {
      updateData.leet_type = leetType;
      updateData.ebs_type = null;
      updateData.exam_type = null;
    } else if (category === "기출") {
      updateData.exam_type = examType || null;
      updateData.ebs_type = null;
      updateData.leet_type = null;
    } else {
      // 기타
      updateData.ebs_type = null;
      updateData.leet_type = null;
      updateData.exam_type = null;
    }

    const { error } = await supabase
      .from("passages")
      .update(updateData)
      .eq("id", id);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    alert("지문 정보가 저장되었습니다!");
    router.push(`/admin/passages/${id}`);
  };

  if (loading) {
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

  if (!passage) {
    return <div className="p-10">지문을 찾을 수 없습니다.</div>;
  }

  const getCategoryColor = (cat: string) => {
    if (cat === "EBS") return '#003A6C';
    if (cat === "기출") return '#FFBF65';
    if (cat === "LEET") return '#FD8973';
    return '#13181B';
  };

  const categoryColor = getCategoryColor(category);

  return (
    <div className="p-10 max-w-2xl mx-auto" style={{ backgroundColor: '#F0EEEB', minHeight: '100vh' }}>
      <div className="mb-6">
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
          <h1 className="text-2xl font-bold relative inline-block pb-2" style={{ color: categoryColor }}>
            지문 정보 수정
            <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${categoryColor} 0%, ${categoryColor} 50%, transparent 100%)`, borderRadius: '2px' }}></span>
          </h1>
        </div>
        <p style={{ color: '#13181B', opacity: 0.8 }}>지문의 메타데이터를 수정할 수 있습니다.</p>
      </div>

      <div className="rounded-xl p-6 space-y-4 shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>카테고리 *</label>
          <select
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              // 카테고리 변경 시 관련 필드 초기화
              if (e.target.value !== "EBS") setEbsType("수특");
              if (e.target.value !== "LEET") setLeetType("추리논증");
              if (e.target.value !== "기출") setExamType("6월");
            }}
          >
            <option value="EBS">EBS</option>
            <option value="기출">기출</option>
            <option value="LEET">LEET</option>
            <option value="기타">기타</option>
          </select>
        </div>

        {/* EBS 전용 필드 */}
        {category === "EBS" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: '#13181B' }}>EBS 유형 *</label>
            <select
              className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = categoryColor;
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              value={ebsType}
              onChange={(e) => setEbsType(e.target.value)}
            >
              <option value="수특">수능특강 (수특)</option>
              <option value="수완">수능완성 (수완)</option>
            </select>
          </div>
        )}

        {/* LEET 전용 필드 */}
        {category === "LEET" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: '#13181B' }}>LEET 영역 *</label>
            <select
              className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = categoryColor;
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              value={leetType}
              onChange={(e) => setLeetType(e.target.value)}
            >
              <option value="추리논증">추리논증</option>
              <option value="언어이해">언어이해</option>
            </select>
          </div>
        )}

        {/* 기출 전용 필드 */}
        {category === "기출" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: '#13181B' }}>시험 유형 *</label>
            <select
              className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = categoryColor;
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              <option value="">선택하세요</option>
              <option value="3월">3월 모의평가</option>
              <option value="4월">4월 모의평가</option>
              <option value="6월">6월 모의평가</option>
              <option value="7월">7월 모의평가</option>
              <option value="9월">9월 모의평가</option>
              <option value="10월">10월 모의평가</option>
              <option value="수능">수능</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>연도 *</label>
          <input
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>문학/비문학 *</label>
          <select
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            value={literaryType}
            onChange={(e) => {
              setLiteraryType(e.target.value);
              setSubCategory(""); // 문학/비문학 변경 시 세부 카테고리 초기화
            }}
          >
            <option value="비문학">비문학</option>
            <option value="문학">문학</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>세부 카테고리 *</label>
          <select
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
          >
            <option value="">선택하세요</option>
            {literaryType === "비문학"
              ? nonLiteraryCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              : literaryCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>출처</label>
          <input
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            placeholder="예: 수능완성 실전모의고사 1회 [1-3]"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <style jsx>{`
            input::placeholder {
              color: #13181B;
              opacity: 0.7;
            }
          `}</style>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>난이도</label>
          <select
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">선택하세요</option>
            <option value="상">상</option>
            <option value="중">중</option>
            <option value="하">하</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold" style={{ color: '#13181B' }}>지문 제목</label>
          <input
            className="border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = categoryColor;
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={saveMetadata}
            className="px-6 py-2 rounded-xl font-semibold transition-all"
            style={{ backgroundColor: categoryColor, color: '#F0EEEB' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            저장하기
          </button>
          <Link
            href={`/admin/passages/${id}`}
            className="px-6 py-2 rounded-xl text-center transition-all border-2"
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

