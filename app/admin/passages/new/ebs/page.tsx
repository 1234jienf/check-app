"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEBSPage() {
  const [ebsType, setEbsType] = useState("수특"); // 수특 or 수완
  const [literaryType, setLiteraryType] = useState("비문학"); // 문학 or 비문학
  const [subCategory, setSubCategory] = useState(""); // 비문학: 단일 선택
  const [subCategories, setSubCategories] = useState<string[]>([]); // 문학: 복수 선택 가능
  const [year, setYear] = useState(2025);
  const [source, setSource] = useState(""); // 출처 (예: "수능완성 실전모의고사 1회")
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState(""); // 상, 중, 하
  const [showPreview, setShowPreview] = useState(false);
  const [isEnglish, setIsEnglish] = useState(false);
  const router = useRouter();

  // URL 파라미터 또는 sessionStorage에서 파싱된 지문 정보 가져오기
  useEffect(() => {
    // 영어 과목 확인
    const selectedSubject = typeof window !== 'undefined' ? sessionStorage.getItem('adminSelectedSubject') : null;
    setIsEnglish(selectedSubject === 'english');

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
          // 사용 후 삭제
          sessionStorage.removeItem('parsedPassage');
        } catch (e) {
        }
      }
    }

    if (parsedContent) {
      setContent(decodeURIComponent(parsedContent));
      if (parsedTitle) setTitle(decodeURIComponent(parsedTitle));
      if (parsedSource) setSource(decodeURIComponent(parsedSource));
      setShowPreview(true);
      
      // URL 정리
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // 비문학 세부 카테고리 (정정 페이지와 동일 목록)
  const nonLiteraryCategories = ["인문", "예술", "법", "경제", "과학", "기술", "복합", "국어", "독서","사회"];
  // 문학 세부 카테고리
  const literaryCategories = ["현대시", "고전시가", "현대소설", "고전소설", "고전수필", "수필", "희곡","극"];

  // 텍스트에서 자동으로 제목, 출처 추출
  const parseText = (text: string) => {
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    
    let extractedTitle = title;
    let extractedSource = source;
    
    // 출처 패턴 찾기
    const sourcePatterns = [
      /수능완성\s*실전모의고사\s*\d+회\s*\[[\d-]+\]/,
      /수능특강\s*.*?\[[\d-]+\]/,
      /수능완성\s*.*?\[[\d-]+\]/,
      /실전모의고사\s*\d+회/,
      /\[202\d+학년도.*?\]/,
    ];
    
    // 첫 몇 줄에서 제목과 출처 찾기
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const line = lines[i];
      
      // 출처 찾기
      if (!extractedSource) {
        for (const pattern of sourcePatterns) {
          const match = line.match(pattern);
          if (match) {
            extractedSource = match[0];
            break;
          }
        }
      }
      
      // 제목 찾기 (출처가 아닌 첫 번째 의미있는 줄)
      if (!extractedTitle && line.length > 2 && line.length < 50) {
        const isSource = sourcePatterns.some((p) => p.test(line));
        if (!isSource && /^[가-힣\s]+$/.test(line) && !line.includes("학년도") && !line.includes("모의고사")) {
          extractedTitle = line;
        }
      }
    }
    
    // 본문에서 제목 추출 (예: "텍스트의 특성", "묵자의 사상" 등)
    if (!extractedTitle) {
      for (const line of lines) {
        if (line.length > 3 && line.length < 30 && /^[가-힣\s]+$/.test(line)) {
          const isSource = sourcePatterns.some((p) => p.test(line));
          if (!isSource && !line.includes("학년도") && !line.includes("모의고사") && !line.includes("주차")) {
            extractedTitle = line;
            break;
          }
        }
      }
    }
    
    // 출처에서 연도 추출
    const yearMatch = text.match(/(\d{4})학년도/);
    if (yearMatch) {
      setYear(parseInt(yearMatch[1]));
    }
    
    if (extractedTitle) setTitle(extractedTitle);
    if (extractedSource) setSource(extractedSource);
  };

  // 문단 자동 구분: 문장 끝 + 줄바꿈 + 들여쓰기 패턴 인식 + 빈 줄 2개 이상 인식
  const autoDetectParagraphs = (text: string): string => {
    if (!text) return text;
    
    // 1. 빈 줄 2개 이상이 이미 있으면 그대로 유지 (이미 문단 구분됨)
    if (/\n\s*\n\s*\n/.test(text)) {
      // 빈 줄 3개 이상을 2개로 정규화
      return text.replace(/\n{3,}/g, '\n\n');
    }
    
    const lines = text.split('\n');
    const result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      const prevLine = i > 0 ? lines[i - 1] : null;
      const prevPrevLine = i > 1 ? lines[i - 2] : null;
      
      // 현재 줄이 비어있으면 그대로 추가
      if (!currentLine.trim()) {
        result.push(currentLine);
        continue;
      }
      
      // 빈 줄 2개 이상 후 시작하는 줄 = 문단 시작 (이미 구분됨)
      if (prevLine && !prevLine.trim() && prevPrevLine && !prevPrevLine.trim()) {
        // 이미 빈 줄 2개가 있으므로 그대로 추가
        result.push(currentLine);
        continue;
      }
      
      result.push(currentLine);
      
      // 패턴: 문장 끝(마침표, 느낌표, 물음표) + 줄바꿈 + 들여쓰기(공백으로 시작)
      if (nextLine && 
          /[.!?。]$/.test(currentLine.trim()) && // 문장 끝
          /^\s+/.test(nextLine) && // 다음 줄이 공백으로 시작 (들여쓰기)
          nextLine.trim().length > 0) { // 다음 줄에 내용이 있음
        // 문단 구분을 위해 빈 줄 추가
        result.push('');
      }
    }
    
    return result.join('\n');
  };

  const createPassage = async () => {
    if (!content.trim()) {
      alert("지문 내용을 입력해주세요.");
      return;
    }

    // subject 필드는 sub_category/sub_categories로 대체
    const subCategoryStr = literaryType === "비문학" 
      ? (subCategory || null)
      : (subCategories.length > 0 ? subCategories.join(",") : null);
    
    // 세션에서 선택한 과목 확인
    const selectedSubject = typeof window !== 'undefined' ? sessionStorage.getItem('adminSelectedSubject') : 'korean';
    const subject = selectedSubject || 'korean';

    const { data, error } = await supabase
      .from("passages")
      .insert([
        {
          category: "EBS",
          ebs_type: ebsType,
          literary_type: isEnglish ? null : literaryType,
          sub_category: isEnglish ? null : subCategoryStr, // 비문학: 단일 값, 문학: 쉼표로 구분된 문자열 (예: "고전시가,고전수필")
          year,
          subject: subject, // korean 또는 english
          source,
          title,
          content,
          difficulty: difficulty || null,
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

  // 문단별로 나누기
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

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
            EBS 지문 등록
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p style={{ color: '#13181B', opacity: 0.8 }}>수능특강/수능완성 지문을 등록합니다.</p>
        </div>

        <div className="rounded-xl p-8 space-y-6 shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>EBS 유형 *</label>
              <select
                value={ebsType}
                onChange={(e) => setEbsType(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#003A6C';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              >
                <option value="수특">수능특강 (수특)</option>
                <option value="수완">수능완성 (수완)</option>
              </select>
            </div>

            {!isEnglish && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>문학/비문학 *</label>
                  <select
                    value={literaryType}
                    onChange={(e) => {
                      setLiteraryType(e.target.value);
                      setSubCategory("");
                      setSubCategories([]);
                    }}
                    className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                    style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#003A6C';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                  >
                    <option value="비문학">비문학</option>
                    <option value="문학">문학</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                    세부 카테고리 * {literaryType === "문학" && "(복수 선택 가능)"}
                  </label>
                  {literaryType === "비문학" ? (
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                      style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#003A6C';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                    >
                      <option value="">선택하세요</option>
                      {nonLiteraryCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="border-2 rounded-xl p-4 max-h-48 overflow-y-auto" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                        {literaryCategories.map((cat) => (
                          <label key={cat} className="flex items-center gap-2 py-2 cursor-pointer rounded px-2 transition-colors"
                                 style={{ color: '#13181B' }}
                                 onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)'}
                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <input
                              type="checkbox"
                              checked={subCategories.includes(cat)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSubCategories([...subCategories, cat]);
                                } else {
                                  setSubCategories(subCategories.filter((c) => c !== cat));
                                }
                              }}
                              className="cursor-pointer w-4 h-4 rounded"
                              style={{ accentColor: '#003A6C' }}
                            />
                            <span className="text-sm">{cat}</span>
                          </label>
                        ))}
                      </div>
                      {subCategories.length > 0 && (
                        <p className="text-xs mt-2" style={{ color: '#13181B', opacity: 0.7 }}>선택됨: {subCategories.join(", ")}</p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>연도 *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#003A6C';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>출처 *</label>
              <input
                placeholder="예: 수능완성 실전모의고사 1회 [1-3]"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#003A6C';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              />
              <style jsx>{`
                input::placeholder {
                  color: #13181B;
                  opacity: 0.7;
                }
              `}              </style>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>난이도</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#003A6C';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
              >
                <option value="">선택하세요</option>
                <option value="상">상</option>
                <option value="중">중</option>
                <option value="하">하</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>지문 제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#003A6C';
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
                  e.currentTarget.style.borderColor = '#13181B';
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
                e.currentTarget.style.borderColor = '#13181B';
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
              <br />
              또는 빈 줄로 직접 문단을 구분할 수도 있습니다.
            </p>
          </div>

          {showPreview && content && (
            <div data-preview className="border-2 rounded-xl p-6" style={{ backgroundColor: '#CCD5DA', borderColor: '#003A6C' }}>
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
                  <label className="text-sm font-medium" style={{ color: '#13181B' }}>세부 카테고리:</label>
                  <p className="mt-1" style={{ color: '#13181B', opacity: 0.8 }}>
                    {literaryType === "비문학" 
                      ? (subCategory || "(선택 안 됨)")
                      : (subCategories.length > 0 ? subCategories.join(", ") : "(선택 안 됨)")
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#13181B' }}>
                    문단 개수: <span className="font-bold" style={{ color: '#003A6C' }}>{paragraphs.length}개</span>
                  </label>
                  <div className="mt-2 max-h-96 overflow-y-auto border-2 rounded-xl p-4" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                    {paragraphs.length > 0 ? (
                      <div className="space-y-4">
                        {paragraphs.map((para, idx) => (
                          <div key={idx} className="p-3 border-l-4 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderLeftColor: '#003A6C' }}>
                            <div className="text-xs font-semibold mb-2" style={{ color: '#003A6C' }}>{idx + 1}문단</div>
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
                  style={{ backgroundColor: '#003A6C', color: '#F0EEEB' }}
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

