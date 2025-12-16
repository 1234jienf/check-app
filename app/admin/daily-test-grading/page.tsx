"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DailyTestGradingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sentence" | "passage">("sentence");
  const [sentenceTests, setSentenceTests] = useState<any[]>([]);
  const [passageTests, setPassageTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    loadTests();
  }, [activeTab]);

  const loadTests = async () => {
    setLoading(true);
    try {
      if (activeTab === "sentence") {
        const { data, error } = await supabase
          .from("daily_sentence_test")
          .select(`
            *,
            users(id, name, email),
            teacher_homework(id, homework_date),
            english_sentence_examples(id, title, pattern, sentences)
          `)
          .is("teacher_score", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSentenceTests(data || []);
      } else {
        const { data, error } = await supabase
          .from("daily_passage_test")
          .select(`
            *,
            users(id, name, email),
            teacher_homework(id, homework_date),
            english_passage_analysis(id, title, passage_text)
          `)
          .is("teacher_score", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPassageTests(data || []);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedTest) return;

    try {
      const tableName = activeTab === "sentence" ? "daily_sentence_test" : "daily_passage_test";
      const { error } = await supabase
        .from(tableName)
        .update({
          teacher_score: score,
          teacher_feedback: feedback.trim() || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", selectedTest.id);

      if (error) throw error;

      alert("채점이 완료되었습니다.");
      setSelectedTest(null);
      setScore(0);
      setFeedback("");
      loadTests();
    } catch (err) {
      alert("채점 저장에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    );
  }

  const tests = activeTab === "sentence" ? sentenceTests : passageTests;

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              Daily 시험 채점
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>학생들이 제출한 구문 해석 및 지문 해석을 채점하세요.</p>
        </div>

        <div className="rounded-xl p-4 md:p-6 lg:p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setActiveTab("sentence");
                setSelectedTest(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "sentence" ? 'text-white' : ''
              }`}
              style={activeTab === "sentence" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
            >
              구문 해석 ({sentenceTests.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("passage");
                setSelectedTest(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "passage" ? 'text-white' : ''
              }`}
              style={activeTab === "passage" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
            >
              지문 해석 ({passageTests.length})
            </button>
          </div>

          {selectedTest ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>
                    {selectedTest.users?.name || selectedTest.users?.email}
                  </h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
                    {new Date(selectedTest.test_date).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTest(null);
                    setScore(0);
                    setFeedback("");
                  }}
                  className="px-4 py-2 rounded-lg font-semibold transition-all"
                  style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                >
                  목록으로
                </button>
              </div>

              {activeTab === "sentence" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: '#13181B' }}>
                      {selectedTest.english_sentence_examples?.title} ({selectedTest.english_sentence_examples?.pattern})
                    </h3>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB' }}>
                      <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>원문</h4>
                      <div className="whitespace-pre-wrap text-sm" style={{ color: '#13181B', opacity: 0.9 }}>
                        {selectedTest.english_sentence_examples?.sentences}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>학생 답안</h4>
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                      {Object.entries(selectedTest.answers || {}).map(([idx, answer]: [string, any]) => (
                        <div key={idx} className="mb-4 last:mb-0">
                          <p className="font-semibold mb-1" style={{ color: '#13181B' }}>{parseInt(idx) + 1}번 문장</p>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: '#13181B', opacity: 0.9 }}>
                            {answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "passage" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: '#13181B' }}>
                      {selectedTest.english_passage_analysis?.title}
                    </h3>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB' }}>
                      <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>지문</h4>
                      <div className="whitespace-pre-wrap text-sm" style={{ color: '#13181B', opacity: 0.9 }}>
                        {selectedTest.english_passage_analysis?.passage_text}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>학생 답안</h4>
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: '#13181B', opacity: 0.9 }}>
                        {selectedTest.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
                    점수 (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#CCD5DA', color: '#13181B' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
                    피드백 (선택사항)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border-2"
                    style={{ borderColor: '#CCD5DA', color: '#13181B' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }}
                  />
                </div>
                <button
                  onClick={handleGrade}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
                  style={{ backgroundColor: '#13181B' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  채점 완료
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.length === 0 ? (
                <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                  <p style={{ color: '#13181B', opacity: 0.7 }}>채점할 시험이 없습니다.</p>
                </div>
              ) : (
                tests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 rounded-xl border-2 cursor-pointer transition-all"
                    style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}
                    onClick={() => setSelectedTest(test)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold" style={{ color: '#13181B' }}>
                          {test.users?.name || test.users?.email}
                        </p>
                        <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
                          {new Date(test.test_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

