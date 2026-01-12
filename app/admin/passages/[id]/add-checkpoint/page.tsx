"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AddCheckpointContent() {
  const { id: passageId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passage, setPassage] = useState<any>(null);
  const [paragraphNum, setParagraphNum] = useState<number>(
    Number(searchParams.get("paragraph")) || 1
  );
  const [checkpointText, setCheckpointText] = useState("");
  const [category, setCategory] = useState<string>("미시");
  const [highlightedText, setHighlightedText] = useState<string>("");
  const [highlightStart, setHighlightStart] = useState<number | null>(null);
  const [highlightEnd, setHighlightEnd] = useState<number | null>(null);
  const paragraphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("id", passageId)
        .single();
      setPassage(data);
    };
    if (passageId) load();
  }, [passageId]);

  const paragraphs = passage?.content
    ? passage.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
    : [];

  const handleAddCheckpoint = async () => {
    if (!checkpointText.trim()) {
      alert("체크포인트 내용을 입력해주세요.");
      return;
    }

    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    // 기존 체크포인트 개수 확인
    const { data: existing } = await supabase
      .from("checkpoints")
      .select("order_num")
      .eq("passage_id", passageId)
      .order("order_num", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].order_num + 1 : 1;

    // 영어 지문일 때는 category를 null로 설정
    const isEnglish = passage?.subject === "english";
    const checkpointCategory = isEnglish ? null : category;

    const { error } = await supabase.from("checkpoints").insert({
      passage_id: passageId,
      paragraph: paragraphNum,
      text: checkpointText,
      order_num: nextOrder,
      highlighted_text: highlightedText || null,
      highlight_start: highlightStart !== null ? highlightStart : null,
      highlight_end: highlightEnd !== null ? highlightEnd : null,
      teacher_id: user.id,
      category: checkpointCategory,
    });

    if (error) {
      alert("체크포인트 추가 실패: " + error.message);
    } else {
      alert("체크포인트가 추가되었습니다.");
      // 폼 초기화하여 같은 문단에서 여러 체크포인트 추가 가능하게 함
      setCheckpointText("");
      setHighlightedText("");
      setHighlightStart(null);
      setHighlightEnd(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/admin/passages/${passageId}`}
          className="inline-flex items-center mb-4 md:mb-6 transition-colors text-sm md:text-base"
          style={{ color: '#13181B' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          지문 상세로 돌아가기
        </Link>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6" style={{ color: '#13181B' }}>
          체크포인트 추가
        </h1>

        <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: '#FFFFFF' }}>
          <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
            문단 선택
          </label>
          <select
            value={paragraphNum}
            onChange={(e) => {
              setParagraphNum(Number(e.target.value));
              setCheckpointText("");
              setHighlightedText("");
              setHighlightStart(null);
              setHighlightEnd(null);
            }}
            className="w-full px-4 py-2 rounded-xl text-sm"
            style={{ 
              backgroundColor: '#F0EEEB', 
              border: '1px solid #CCD5DA',
              color: '#13181B'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
          >
            {paragraphs.map((_: string, idx: number) => (
              <option key={idx} value={idx + 1}>
                {idx + 1}문단
              </option>
            ))}
          </select>
        </div>

        {paragraphs[paragraphNum - 1] && (
          <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: '#FFFFFF' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
              문단 내용 (텍스트를 드래그하여 선택하면 체크포인트 내용에 자동으로 입력됩니다)
            </label>
            <div
              ref={paragraphRef}
              className="p-4 rounded-xl min-h-[200px] select-text"
              style={{ 
                backgroundColor: '#F0EEEB',
                border: '1px solid #CCD5DA',
                color: '#13181B',
                lineHeight: '1.6',
                userSelect: 'text',
                cursor: 'text'
              }}
              onMouseUp={(e) => {
                // 약간의 지연을 두어 선택이 완료된 후 처리
                setTimeout(() => {
                  const selection = window.getSelection();
                  const selectedText = selection?.toString().trim() || "";
                  
                  if (selectedText.length > 0) {
                    const paragraphText = paragraphs[paragraphNum - 1].trim().replace(/\n/g, " ");
                    
                    // 선택된 텍스트의 시작 위치 찾기
                    try {
                      if (paragraphRef.current && selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const preSelectionRange = range.cloneRange();
                        preSelectionRange.selectNodeContents(paragraphRef.current);
                        preSelectionRange.setEnd(range.startContainer, range.startOffset);
                        const start = preSelectionRange.toString().length;
                        const end = start + selectedText.length;
                        
                        setHighlightedText(selectedText);
                        setHighlightStart(start);
                        setHighlightEnd(end);
                      } else {
                        setHighlightedText(selectedText);
                      }
                    } catch (err) {
                      // 범위 계산 실패 시에도 텍스트는 설정
                      setHighlightedText(selectedText);
                    }
                    
                    // 선택 해제 (상태 업데이트 후)
                    if (selection) {
                      selection.removeAllRanges();
                    }
                  }
                }, 100);
              }}
            >
              {paragraphs[paragraphNum - 1].split("\n").map((line: string, idx: number) => (
                <p key={idx} className="mb-2" style={{ color: '#13181B' }}>
                  {line}
                </p>
              ))}
            </div>
            {highlightedText && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#E8F0F8', border: '1px solid #D4E4F4' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#13181B' }}>
                  선택된 텍스트:
                </div>
                <div className="text-sm" style={{ color: '#13181B' }}>
                  "{highlightedText}"
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: '#FFFFFF' }}>
          {/* 영어 지문이 아닐 때만 카테고리 선택 표시 */}
          {passage?.subject !== "english" && (
            <>
              <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
                카테고리 선택
              </label>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setCategory("거시")}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: category === "거시" ? '#E8F0F8' : '#F0EEEB',
                    border: `2px solid ${category === "거시" ? '#13181B' : '#CCD5DA'}`,
                    color: '#13181B'
                  }}
                  onMouseEnter={(e) => {
                    if (category !== "거시") {
                      e.currentTarget.style.backgroundColor = '#E8F0F8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (category !== "거시") {
                      e.currentTarget.style.backgroundColor = '#F0EEEB';
                    }
                  }}
                >
                  거시
                </button>
                <button
                  onClick={() => setCategory("미시")}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all"
                  style={{
                    backgroundColor: category === "미시" ? '#FFF5E8' : '#F0EEEB',
                    border: `2px solid ${category === "미시" ? '#13181B' : '#CCD5DA'}`,
                    color: '#13181B'
                  }}
                  onMouseEnter={(e) => {
                    if (category !== "미시") {
                      e.currentTarget.style.backgroundColor = '#FFF5E8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (category !== "미시") {
                      e.currentTarget.style.backgroundColor = '#F0EEEB';
                    }
                  }}
                >
                  미시
                </button>
              </div>
            </>
          )}
          <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
            체크포인트 내용
          </label>
          <textarea
            value={checkpointText}
            onChange={(e) => setCheckpointText(e.target.value)}
            placeholder="체크포인트 내용을 입력하세요..."
            className="w-full px-4 py-3 rounded-xl min-h-[150px] text-sm"
            style={{ 
              backgroundColor: '#F0EEEB',
              border: '1px solid #CCD5DA',
              color: '#13181B'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
          />
          <style jsx>{`
            textarea::placeholder {
              color: #13181B;
              opacity: 0.5;
            }
          `}</style>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAddCheckpoint}
            className="px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ 
              backgroundColor: '#13181B',
              color: '#F0EEEB'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            체크포인트 추가
          </button>
          <Link
            href={`/admin/passages/${passageId}`}
            className="px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ 
              backgroundColor: '#CCD5DA',
              color: '#13181B'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#A8B2B8';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#CCD5DA';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            완료
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AddCheckpointPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-6 md:p-10 flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
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
          <p className="text-[#13181B]">로딩 중...</p>
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
    }>
      <AddCheckpointContent />
    </Suspense>
  );
}

