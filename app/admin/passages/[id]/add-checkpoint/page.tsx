"use client";

import { useState, useEffect, Suspense } from "react";
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
  const [selectedText, setSelectedText] = useState("");
  const [highlightStart, setHighlightStart] = useState<number | null>(null);
  const [highlightEnd, setHighlightEnd] = useState<number | null>(null);

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

  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      // 선택된 텍스트의 위치 찾기
      const range = selection.getRangeAt(0);
      const paragraph = paragraphs[paragraphNum - 1];
      if (paragraph) {
        const textBefore = paragraph.substring(0, range.startOffset);
        setHighlightStart(textBefore.length);
        setHighlightEnd(textBefore.length + selection.toString().length);
      }
    }
  };

  const handleAddCheckpoint = async () => {
    if (!checkpointText.trim()) {
      alert("체크포인트 내용을 입력해주세요.");
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

    const { error } = await supabase.from("checkpoints").insert({
      passage_id: passageId,
      paragraph: paragraphNum,
      text: checkpointText,
      order_num: nextOrder,
      highlighted_text: selectedText || null,
      highlight_start: highlightStart,
      highlight_end: highlightEnd,
    });

    if (error) {
      alert("체크포인트 추가 실패: " + error.message);
    } else {
      alert("체크포인트가 추가되었습니다.");
      router.push(`/admin/passages/${passageId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/admin/passages/${passageId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 md:mb-6 transition-colors text-sm md:text-base"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          지문 상세로 돌아가기
        </Link>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 md:mb-6">
          체크포인트 추가
        </h1>

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            문단 선택
          </label>
          <select
            value={paragraphNum}
            onChange={(e) => {
              setParagraphNum(Number(e.target.value));
              setSelectedText("");
              setHighlightStart(null);
              setHighlightEnd(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {paragraphs.map((_: string, idx: number) => (
              <option key={idx} value={idx + 1}>
                {idx + 1}문단
              </option>
            ))}
          </select>
        </div>

        {paragraphs[paragraphNum - 1] && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              문단 내용 (텍스트를 선택하면 하이라이트됩니다)
            </label>
            <div
              className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200 min-h-[200px]"
              onMouseUp={handleTextSelect}
              style={{ userSelect: "text" }}
            >
              {paragraphs[paragraphNum - 1].split("\n").map((line: string, idx: number) => (
                <p key={idx} className="mb-2 text-gray-700">
                  {line}
                </p>
              ))}
            </div>
            {selectedText && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold mb-1">선택된 텍스트:</p>
                <p className="text-sm text-gray-800">{selectedText}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            체크포인트 내용
          </label>
          <textarea
            value={checkpointText}
            onChange={(e) => setCheckpointText(e.target.value)}
            placeholder="체크포인트 내용을 입력하세요..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAddCheckpoint}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            체크포인트 추가
          </button>
          <Link
            href={`/admin/passages/${passageId}`}
            className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AddCheckpointPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <AddCheckpointContent />
    </Suspense>
  );
}

