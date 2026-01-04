"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DailyTestGradingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"vocabulary" | "sentence">("vocabulary");
  const [vocabularyTests, setVocabularyTests] = useState<any[]>([]);
  const [sentenceTests, setSentenceTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [editingAnswers, setEditingAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTests();
  }, [activeTab]);

  const loadTests = async () => {
    setLoading(true);
    try {
      if (activeTab === "vocabulary") {
        const { data, error } = await supabase
          .from("daily_vocabulary_test")
          .select(`
            *,
            users(id, name, email),
            teacher_homework(id, homework_date),
            english_vocabulary(id, title, words)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setVocabularyTests(data || []);
      } else if (activeTab === "sentence") {
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
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedTest) return;

    try {
      if (activeTab === "vocabulary") {
        // 단어장 시험: 답안 수정 및 점수 재계산
        const updatedAnswers = Object.keys(editingAnswers).length > 0 
          ? { ...selectedTest.answers, ...editingAnswers }
          : selectedTest.answers;
        
        // 단어장 정보 가져오기
        const { data: vocab } = await supabase
          .from("english_vocabulary")
          .select("words")
          .eq("id", selectedTest.vocabulary_id)
          .single();
        
        if (vocab) {
          // 단어 파싱
          const wordLines = vocab.words.split('\n').filter((line: string) => line.trim());
          const parsedWords = wordLines.map((line: string) => {
            const parts = line.trim().split(/\s*[-―—:]\s*|\s{2,}/);
            if (parts.length >= 2) {
              return { word: parts[0].trim(), meaning: parts.slice(1).join(' ').trim() };
            }
            return { word: line.trim(), meaning: '' };
          }).filter((w: any) => w.word && w.meaning);
          
          // 재채점 (testMode에 따라)
          const testMode = selectedTest.test_mode || "word-to-meaning";
          let correctCount = 0;
          parsedWords.forEach((word: any, idx: number) => {
            const currentMode = testMode === "mixed" 
              ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
              : testMode;
            
            const studentAnswer = (updatedAnswers[word.word] || '').trim();
            const correctAnswerRaw = (currentMode === "word-to-meaning" ? word.meaning : word.word).trim();
            const correctAnswers = correctAnswerRaw.split(',').map((ans: string) => ans.trim());
            
            // 학생 답안이 여러 정답 중 하나라도 일치하면 정답으로 처리
            const studentAnswerLower = studentAnswer.toLowerCase().trim();
            const isCorrect = correctAnswers.some((correctAns: string) => {
              const correctAnsLower = correctAns.toLowerCase().trim();
              const normalizedStudent = studentAnswerLower.replace(/\s+/g, ' ');
              const normalizedCorrect = correctAnsLower.replace(/\s+/g, ' ');
              // 정확히 일치하거나 공백 정규화 후 일치
              return normalizedStudent === normalizedCorrect || 
                     studentAnswerLower === correctAnsLower ||
                     studentAnswer.trim() === correctAns.trim();
            });
            
            if (isCorrect) correctCount++;
          });
          
          const newScore = parsedWords.length > 0 ? Math.round((correctCount / parsedWords.length) * 100) : 0;
          
          const { error } = await supabase
            .from("daily_vocabulary_test")
            .update({
              answers: updatedAnswers,
              correct_count: correctCount,
              total_count: parsedWords.length,
              score: newScore,
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedTest.id);
          
          if (error) throw error;
        }
      } else if (activeTab === "sentence") {
        const { error } = await supabase
          .from("daily_sentence_test")
          .update({
            teacher_score: score,
            teacher_feedback: feedback.trim() || null,
            graded_at: new Date().toISOString(),
          })
          .eq("id", selectedTest.id);

        if (error) throw error;
      }

      alert("채점이 완료되었습니다.");
      setSelectedTest(null);
      setScore(0);
      setFeedback("");
      setEditingAnswers({});
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

  const tests = activeTab === "vocabulary" ? vocabularyTests : sentenceTests;

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
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>학생들이 제출한 단어장 및 구문 해석을 채점하세요.</p>
        </div>

        <div className="rounded-xl p-4 md:p-6 lg:p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setActiveTab("vocabulary");
                setSelectedTest(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "vocabulary" ? 'text-white' : ''
              }`}
              style={activeTab === "vocabulary" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
            >
              단어장 ({vocabularyTests.length})
            </button>
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
                    setEditingAnswers({});
                  }}
                  className="px-4 py-2 rounded-lg font-semibold transition-all"
                  style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                >
                  목록으로
                </button>
              </div>

              {activeTab === "vocabulary" && (() => {
                // 단어장 파싱
                const vocabWords = selectedTest.english_vocabulary?.words || '';
                const wordLines = vocabWords.split('\n').filter((line: string) => line.trim());
                const parsedWords = wordLines.map((line: string) => {
                  const parts = line.trim().split(/\s*[-―—:]\s*|\s{2,}/);
                  if (parts.length >= 2) {
                    return { word: parts[0].trim(), meaning: parts.slice(1).join(' ').trim() };
                  }
                  return { word: line.trim(), meaning: '' };
                }).filter((w: any) => w.word && w.meaning);
                
                // testMode 가져오기 (기본값: word-to-meaning)
                const testMode = selectedTest.test_mode || "word-to-meaning";
                
                // 각 문제별로 정답 여부 확인
                const getQuestionData = (wordObj: any, idx: number) => {
                  const currentMode = testMode === "mixed" 
                    ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
                    : testMode;
                  
                  const question = currentMode === "word-to-meaning" ? wordObj.word : wordObj.meaning;
                  const correctAnswerRaw = currentMode === "word-to-meaning" ? wordObj.meaning : wordObj.word;
                  const studentAnswer = (selectedTest.answers[wordObj.word] || '').trim();
                  
                  // 여러 정답이 쉼표로 구분된 경우 처리
                  const correctAnswers = correctAnswerRaw.split(',').map((ans: string) => ans.trim());
                  
                  // 학생 답안이 여러 정답 중 하나라도 일치하면 정답으로 처리
                  const studentAnswerLower = studentAnswer.toLowerCase().trim();
                  const isCorrect = correctAnswers.some((correctAns: string) => {
                    const correctAnsLower = correctAns.toLowerCase().trim();
                    const normalizedStudent = studentAnswerLower.replace(/\s+/g, ' ');
                    const normalizedCorrect = correctAnsLower.replace(/\s+/g, ' ');
                    // 정확히 일치하거나 공백 정규화 후 일치
                    return normalizedStudent === normalizedCorrect || 
                           studentAnswerLower === correctAnsLower ||
                           studentAnswer.trim() === correctAns.trim();
                  });
                  
                  return {
                    question,
                    correctAnswer: correctAnswerRaw,
                    studentAnswer: selectedTest.answers[wordObj.word] || '',
                    isCorrect,
                    wordKey: wordObj.word,
                  };
                };
                
                return (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2" style={{ color: '#13181B' }}>
                        {selectedTest.english_vocabulary?.title}
                      </h3>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB' }}>
                        <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>단어장 정보</h4>
                        <p className="text-sm" style={{ color: '#13181B', opacity: 0.9 }}>
                          단어 개수: {selectedTest.total_count}개 | 시험 모드: {
                            testMode === "word-to-meaning" ? "영어 → 한글" :
                            testMode === "meaning-to-word" ? "한글 → 영어" : "혼합형"
                          }
                        </p>
                      </div>
                    </div>
                  <div>
                    <h4 className="font-semibold mb-2" style={{ color: '#13181B' }}>학생 답안 (수정 가능)</h4>
                    <div className="p-4 rounded-lg border-2 space-y-3" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                      {parsedWords.map((wordObj: any, idx: number) => {
                        const questionData = getQuestionData(wordObj, idx);
                        return (
                          <div key={wordObj.word} className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-sm" style={{ color: '#13181B' }}>
                                  {idx + 1}. 문제: {questionData.question}
                                </p>
                                {questionData.isCorrect && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F6' }}>
                                    <span className="text-white text-xs font-bold">✓</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                                정답: {questionData.correctAnswer}
                              </p>
                              <input
                                type="text"
                                value={editingAnswers[questionData.wordKey] !== undefined ? editingAnswers[questionData.wordKey] : questionData.studentAnswer || ""}
                                onChange={(e) => setEditingAnswers({ ...editingAnswers, [questionData.wordKey]: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                                style={{ 
                                  borderColor: questionData.isCorrect ? '#3B82F6' : '#CCD5DA', 
                                  color: '#13181B',
                                  borderWidth: questionData.isCorrect ? '2px' : '2px'
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = '#13181B';
                                  e.currentTarget.style.outline = 'none';
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.borderColor = questionData.isCorrect ? '#3B82F6' : '#CCD5DA';
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>
                );
              })()}

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


              <div className="space-y-4">
                {activeTab === "vocabulary" && (
                  <div className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
                    <p className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                      점수: {selectedTest.score}점 ({selectedTest.correct_count} / {selectedTest.total_count})
                    </p>
                    <p className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                      답안을 수정하면 자동으로 재채점됩니다.
                    </p>
                  </div>
                )}
                {activeTab !== "vocabulary" && (
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
                )}
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
                    onClick={() => {
                      setSelectedTest(test);
                      if (activeTab === "vocabulary" && test.answers) {
                        setEditingAnswers(test.answers);
                      }
                      if (activeTab !== "vocabulary") {
                        setScore(test.teacher_score || 0);
                        setFeedback(test.teacher_feedback || "");
                      }
                    }}
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

