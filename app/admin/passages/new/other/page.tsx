"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewOtherPage() {
  const [year, setYear] = useState(2026);
  const [literaryType, setLiteraryType] = useState("비문학");
  const [subCategory, setSubCategory] = useState("");
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let parsedTitle = urlParams.get("title");
    let parsedSource = urlParams.get("source");
    let parsedContent = urlParams.get("content");

    // URL 파라미터가 없으면 sessionStorage 확인
    if (!parsedContent) {
      const stored = sessionStorage.getItem('parsedPassage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsedTitle = parsed.title || "";
          parsedSource = parsed.source || "";
          parsedContent = parsed.content || "";
          sessionStorage.removeItem('parsedPassage');
        } catch (e) {
          console.error('Failed to parse stored passage:', e);
        }
      }
    }

    if (parsedContent) {
      setContent(decodeURIComponent(parsedContent));
      if (parsedTitle) setTitle(decodeURIComponent(parsedTitle));
      if (parsedSource) setSource(decodeURIComponent(parsedSource));
      setShowPreview(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const nonLiteraryCategories = ["인문", "사회", "과학", "기술", "예술", "복합", "독서"];
  const literaryCategories = ["현대시", "고전시가", "현대소설", "고전소설", "고전수필", "수필", "희곡"];

  const parseText = (text: string) => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    let extractedTitle = title;
    let extractedSource = source;
    
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      if (!extractedTitle && line.length > 2 && line.length < 50 && /^[가-힣\s]+$/.test(line)) {
        extractedTitle = line;
      }
      if (!extractedSource && line.length > 5 && line.length < 100) {
        extractedSource = line;
      }
    }
    
    const yearMatch = text.match(/(\d{4})/);
    if (yearMatch) {
      setYear(parseInt(yearMatch[1]));
    }
    
    if (extractedTitle && !title) setTitle(extractedTitle);
    if (extractedSource && !source) setSource(extractedSource);
  };

  const autoDetectParagraphs = (text: string): string => {
    if (!text) return text;
    let processed = text.replace(/\n{3,}/g, '\n\n');
    processed = processed.replace(/([.!?])\n\s+/g, '$1\n\n');
    return processed;
  };

  const createPassage = async () => {
    if (!content.trim()) {
      alert("지문 내용을 입력해주세요.");
      return;
    }

    const finalSubject = subCategory ? `${subCategory} (${literaryType})` : `기타 (${literaryType})`;

    const { data, error } = await supabase
      .from("passages")
      .insert([
        {
          category: "기타",
          literary_type: literaryType,
          sub_category: subCategory || null,
          year,
          source,
          title,
          content,
          subject: finalSubject,
        },
      ])
      .select();

    if (error) {
      alert("생성 실패: " + error.message);
      return;
    }

    const passageId = data[0].id;
    alert("지문이 생성되었습니다!");
    router.push(`/admin/passages/${passageId}`);
  };

  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin/passages" 
            className="inline-flex items-center text-gray-600 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 관리로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
            기타 지문 등록
          </h1>
          <p className="text-gray-600 mt-2">기타 지문을 등록합니다.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">연도 *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">문학/비문학 *</label>
              <select
                value={literaryType}
                onChange={(e) => {
                  setLiteraryType(e.target.value);
                  setSubCategory("");
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              >
                <option value="비문학">비문학</option>
                <option value="문학">문학</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">세부 카테고리 *</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">출처 *</label>
              <input
                placeholder="출처를 입력하세요"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">지문 제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">지문 내용 *</label>
            
            <div className="mb-3 flex items-center gap-3 flex-wrap">
              <input
                type="file"
                id="txtFile"
                accept=".txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.name.endsWith('.txt')) {
                      const text = await file.text();
                      setContent(text);
                      parseText(text);
                    }
                  } catch (error) {
                    alert('파일 처리 중 오류가 발생했습니다.');
                  }
                }}
              />
              <label
                htmlFor="txtFile"
                className="inline-block px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg cursor-pointer text-sm transition-colors"
              >
                📄 TXT 파일 업로드
              </label>
              <span className="text-xs text-gray-500">
                HWP는 한글에서 텍스트 복사 후 붙여넣기
              </span>
            </div>

            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-3 h-64 text-sm bg-white hover:border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 transition-all shadow-sm resize-none"
              placeholder="지문을 붙여넣으세요. 문장 끝 + 줄바꿈 + 들여쓰기 패턴이 자동으로 문단 구분으로 인식됩니다."
              value={content}
              onChange={(e) => {
                const rawText = e.target.value;
                const processedText = autoDetectParagraphs(rawText);
                setContent(processedText);
                if (processedText.length > 50 && !title && !source) {
                  parseText(processedText);
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              문단 자동 인식: 문장 끝(마침표 등) + 줄바꿈 + 들여쓰기가 있으면 자동으로 문단이 구분됩니다.
            </p>
          </div>

          {showPreview && content && (
            <div data-preview className="border-2 border-gray-500 rounded-xl p-6 bg-gray-50 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-700">✅ 파싱 결과 미리보기</h3>
                  <p className="text-sm text-gray-600 mt-1">파싱이 완료되었습니다.</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">제목:</label>
                  <p className="mt-1">{title || "(자동 추출 실패)"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">출처:</label>
                  <p className="mt-1">{source || "(자동 추출 실패)"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    문단 개수: <span className="font-bold text-gray-600">{paragraphs.length}개</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm transition-colors"
                >
                  수정하기
                </button>
                <button
                  onClick={createPassage}
                  className="px-4 py-2 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  이대로 저장하기
                </button>
              </div>
            </div>
          )}

          {!showPreview && (
            <button
              onClick={createPassage}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              지문 등록하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
