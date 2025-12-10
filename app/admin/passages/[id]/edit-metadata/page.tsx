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

  // 비문학 세부 카테고리
  const nonLiteraryCategories = ["인문", "사회", "과학", "기술", "예술", "복합", "독서"];
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
    return <div className="p-10">로딩 중...</div>;
  }

  if (!passage) {
    return <div className="p-10">지문을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/passages/${id}`}
          className="text-blue-600 underline mb-4 inline-block"
        >
          ← 지문 상세로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold mb-2">지문 정보 수정</h1>
        <p className="text-gray-600">지문의 메타데이터를 수정할 수 있습니다.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label>카테고리 *</label>
          <select
            className="border p-2"
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
            <option value="기출">평가원 기출</option>
            <option value="LEET">LEET</option>
            <option value="기타">기타</option>
          </select>
        </div>

        {/* EBS 전용 필드 */}
        {category === "EBS" && (
          <div className="flex flex-col gap-2">
            <label>EBS 유형 *</label>
            <select
              className="border p-2"
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
            <label>LEET 영역 *</label>
            <select
              className="border p-2"
              value={leetType}
              onChange={(e) => setLeetType(e.target.value)}
            >
              <option value="추리논증">추리논증</option>
              <option value="언어이해">언어이해</option>
            </select>
          </div>
        )}

        {/* 평가원 기출 전용 필드 */}
        {category === "기출" && (
          <div className="flex flex-col gap-2">
            <label>시험 유형 *</label>
            <select
              className="border p-2"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            >
              <option value="">선택하세요</option>
              <option value="6월">6월 모의평가</option>
              <option value="9월">9월 모의평가</option>
              <option value="수능">수능</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label>연도 *</label>
          <input
            className="border p-2"
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label>문학/비문학 *</label>
          <select
            className="border p-2"
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
          <label>세부 카테고리 *</label>
          <select
            className="border p-2"
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
          <label>출처</label>
          <input
            className="border p-2"
            placeholder="예: 수능완성 실전모의고사 1회 [1-3]"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label>지문 제목</label>
          <input
            className="border p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={saveMetadata}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
          >
            저장하기
          </button>
          <Link
            href={`/admin/passages/${id}`}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded text-center"
          >
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}

