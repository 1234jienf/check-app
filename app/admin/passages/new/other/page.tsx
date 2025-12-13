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

  const categoryColor = '#13181B';

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin/passages" 
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 관리로 돌아가기
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            기타 지문 등록
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p style={{ color: '#13181B', opacity: 0.8 }}>기타 지문을 등록합니다.</p>
        </div>

        <div className="rounded-xl p-8 space-y-6 shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>연도 *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>문학/비문학 *</label>
              <select
                value={literaryType}
                onChange={(e) => {
                  setLiteraryType(e.target.value);
                  setSubCategory("");
                }}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              >
                <option value="비문학">비문학</option>
                <option value="문학">문학</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>세부 카테고리 *</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
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
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>출처 *</label>
              <input
                placeholder="출처를 입력하세요"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              />
              <style jsx>{`
                input::placeholder {
                  color: #13181B;
                  opacity: 0.7;
                }
              `}</style>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>지문 제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>지문 내용 *</label>
            
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
                className="inline-block px-4 py-2 border-2 rounded-lg cursor-pointer text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = categoryColor;
                  e.currentTarget.style.backgroundColor = '#CCD5DA';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CCD5DA';
                  e.currentTarget.style.backgroundColor = '#F0EEEB';
                }}
              >
                📄 TXT 파일 업로드
              </label>
              <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                HWP는 한글에서 텍스트 복사 후 붙여넣기
              </span>
            </div>

            <textarea
              className="w-full border-2 rounded-xl px-4 py-3 h-64 text-sm transition-all resize-none"
              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = categoryColor;
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
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
            <style jsx>{`
              textarea::placeholder {
                color: #13181B;
                opacity: 0.7;
              }
            `}</style>
            <p className="text-xs mt-2" style={{ color: '#13181B', opacity: 0.7 }}>
              문단 자동 인식: 문장 끝(마침표 등) + 줄바꿈 + 들여쓰기가 있으면 자동으로 문단이 구분됩니다.
            </p>
          </div>

          {showPreview && content && (
            <div data-preview className="border-2 rounded-xl p-6" style={{ backgroundColor: '#CCD5DA', borderColor: categoryColor }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: '#13181B' }}>✅ 파싱 결과 미리보기</h3>
                  <p className="text-sm mt-1" style={{ color: '#13181B', opacity: 0.8 }}>파싱이 완료되었습니다. 아래 내용을 확인하세요.</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-xl transition-colors"
                  style={{ color: '#13181B', opacity: 0.7 }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium" style={{ color: '#13181B' }}>제목:</label>
                  <p className="mt-1" style={{ color: '#13181B', opacity: 0.8 }}>{title || "(자동 추출 실패)"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#13181B' }}>출처:</label>
                  <p className="mt-1" style={{ color: '#13181B', opacity: 0.8 }}>{source || "(자동 추출 실패)"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#13181B' }}>
                    문단 개수: <span className="font-bold" style={{ color: categoryColor }}>{paragraphs.length}개</span>
                  </label>
                  <div className="mt-2 max-h-96 overflow-y-auto border-2 rounded-xl p-4" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                    {paragraphs.length > 0 ? (
                      <div className="space-y-4">
                        {paragraphs.map((para, idx) => (
                          <div key={idx} className="p-3 border-l-4 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderLeftColor: categoryColor }}>
                            <div className="text-xs font-semibold mb-2" style={{ color: categoryColor }}>{idx + 1}문단</div>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#13181B' }}>{para}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>문단이 자동으로 구분되지 않았습니다.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border-2 rounded-lg text-sm transition-all"
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
                  수정하기
                </button>
                <button
                  onClick={createPassage}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: categoryColor, color: '#F0EEEB' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  이대로 저장하기
                </button>
              </div>
            </div>
          )}

          {!showPreview && (
            <button
              onClick={createPassage}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              지문 등록하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
