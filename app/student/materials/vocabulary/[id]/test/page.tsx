"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VocabularyTestPage() {
  const params = useParams();
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState<any>(null);
  const [allWords, setAllWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [words, setWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 항상 영어 → 한글 모드로 고정
  const [testMode] = useState<"word-to-meaning">("word-to-meaning");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [testCount, setTestCount] = useState<number | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedSubject', 'english');
      window.dispatchEvent(new CustomEvent('subjectChanged', { detail: { subject: 'english' } }));
    }

    const getStudentId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
      }
    };
    getStudentId();
  }, []);

  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        const { data, error } = await supabase
          .from("english_vocabulary")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) {
          alert("단어장을 불러올 수 없습니다.");
          router.push("/student/materials");
          return;
        }

        if (!data) {
          alert("단어장을 찾을 수 없습니다.");
          router.push("/student/materials");
          return;
        }

        setVocabulary(data);

        // 단어 목록 파싱 (줄바꿈으로 구분)
        const wordLines = data.words.split('\n').filter((line: string) => line.trim());
        const parsedWords = wordLines.map((line: string) => {
          // 다양한 구분자 지원: "-", "―", "—", ":", " : " 또는 공백 2개 이상
          // 정규식: \s*[-―—:]\s*|\s{2,}
          const parts = line.trim().split(/\s*[-―—:]\s*|\s{2,}/);
          if (parts.length >= 2) {
            return { word: parts[0].trim(), meaning: parts.slice(1).join(' ').trim() };
          }
          return { word: line.trim(), meaning: '' };
        }).filter((w: any) => w.word && w.meaning);

        if (parsedWords.length === 0) {
          alert("단어가 없습니다.");
          router.push("/student/materials");
          return;
        }

        setAllWords(parsedWords);
        // 초기에는 모든 단어를 표시
        setWords(parsedWords);
        setLoading(false);
      } catch (err) {
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        router.push("/student/materials");
      }
    };

    if (params.id) {
      loadVocabulary();
    }
  }, [params.id, router]);

  // 5분 타이머
  useEffect(() => {
    if (!timerActive || submitted || loading) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, submitted, loading]);

  // 시간 종료 시 자동 제출
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !submitting && words.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, submitted, submitting]);

  // 뒤로 가기 방지
  useEffect(() => {
    if (submitted || loading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [submitted, loading]);

  // 시험 문제 생성 함수
  const generateTestWords = (count: number, shuffle: boolean) => {
    let selectedWords = [...allWords];
    
    // 섞기
    if (shuffle) {
      for (let i = selectedWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedWords[i], selectedWords[j]] = [selectedWords[j], selectedWords[i]];
      }
    }
    
    // 개수 제한
    if (count < allWords.length) {
      selectedWords = selectedWords.slice(0, count);
    }
    
    setWords(selectedWords);
  };

  const handleSubmit = async () => {
    if (!studentId) return;

    setSubmitting(true);

    // 자동 채점
    let correctCount = 0;
    const totalCount = words.length;

    words.forEach((word) => {
      const studentAnswer = answers[word.word]?.trim().toLowerCase() || '';
      const correctAnswerRaw = word.meaning.trim();
      
      // 여러 정답이 쉼표로 구분된 경우 처리
      const correctAnswers = correctAnswerRaw.split(',').map(ans => ans.trim().toLowerCase());
      
      // 학생 답안이 여러 정답 중 하나라도 일치하면 정답으로 처리
      const isCorrect = correctAnswers.some(correctAns => {
        const normalizedStudent = studentAnswer.replace(/\s+/g, ' ');
        const normalizedCorrect = correctAns.replace(/\s+/g, ' ');
        return normalizedStudent === normalizedCorrect || studentAnswer === correctAns;
      });
      
      if (isCorrect) {
        correctCount++;
      }
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    setResults({ correctCount, totalCount, score, words, answers, testMode });
    setSubmitted(true);
    setSubmitting(false);
    setTimerActive(false);
  };

  if (loading || !vocabulary || words.length === 0) {
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
    );
  }

  if (submitted && results) {
    return (
      <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="max-w-4xl mx-auto">
          <Link
            href={`/student/materials/vocabulary/${params.id}`}
            className="inline-flex items-center mb-6 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            단어장으로 돌아가기
          </Link>

          <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
            <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#13181B' }}>
              시험 결과
            </h1>
            <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: '#F0EEEB' }}>
              <p className="text-2xl font-bold mb-2" style={{ color: '#13181B' }}>
                {results.score}점
              </p>
              <p className="text-lg" style={{ color: '#13181B' }}>
                정답: <span className="font-bold">{results.correctCount}</span> / {results.totalCount}
              </p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>전체 문제 및 답안</h2>
              <div className="space-y-3">
                {words.map((word, idx) => {
                  const question = word.word;
                  const correctAnswerRaw = word.meaning;
                  const studentAnswer = results.answers[word.word]?.trim() || '';
                  
                  // 여러 정답이 쉼표로 구분된 경우 처리
                  const correctAnswers = correctAnswerRaw.split(',').map(ans => ans.trim());
                  
                  // 학생 답안이 여러 정답 중 하나라도 일치하면 정답으로 처리
                  const studentAnswerLower = studentAnswer.toLowerCase().trim();
                  const isCorrect = correctAnswers.some(correctAns => {
                    const correctAnsLower = correctAns.toLowerCase().trim();
                    const normalizedStudent = studentAnswerLower.replace(/\s+/g, ' ');
                    const normalizedCorrect = correctAnsLower.replace(/\s+/g, ' ');
                    // 정확히 일치하거나 공백 정규화 후 일치
                    return normalizedStudent === normalizedCorrect || 
                           studentAnswerLower === correctAnsLower ||
                           studentAnswer.trim() === correctAns.trim();
                  });

                  return (
                    <div 
                      key={idx} 
                      className="p-4 rounded-lg border-2" 
                      style={{ 
                        borderColor: isCorrect ? '#3B82F6' : '#FD8973', 
                        backgroundColor: isCorrect ? '#EFF6FF' : '#FFF0ED' 
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-sm" style={{ color: '#13181B' }}>
                          {idx + 1}. 문제: {question}
                        </p>
                        {isCorrect && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                        정답: {correctAnswerRaw}
                      </p>
                      <div className="px-3 py-2 rounded-lg border-2 text-sm" style={{ 
                        borderColor: isCorrect ? '#3B82F6' : '#CCD5DA',
                        backgroundColor: '#FFFFFF',
                        color: '#13181B'
                      }}>
                        내 답: {studentAnswer || "(미작성)"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href={`/student/materials/vocabulary/${params.id}`}
              className="mt-6 w-full px-6 py-3 rounded-xl font-semibold text-center transition-all block"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              자료실로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 모드 표시 텍스트
  const getModeText = () => {
    if (testMode === "word-to-meaning") return "영어 → 한글";
    if (testMode === "meaning-to-word") return "한글 → 영어";
    return "혼합";
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        {/* 뒤로 가기 제거 - 시험 중에는 뒤로 갈 수 없음 */}

        <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#13181B' }}>
                {vocabulary.title} - 시험
              </h1>
              <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
                전체 단어 {vocabulary.word_count}개 | 시험 문제 {words.length}개 | 모드: {getModeText()}
              </p>
            </div>
            {/* 타이머 */}
            <div className="px-4 py-2 rounded-lg font-bold text-lg" style={{ 
              backgroundColor: timeLeft <= 60 ? '#FD8973' : '#13181B',
              color: '#F0EEEB'
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* 시험 설정 */}
          <div className="mb-6 p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
              시험 설정
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm" style={{ color: '#13181B' }}>
                  문제 개수:
                </label>
                <input
                  type="number"
                  min="1"
                  max={allWords.length}
                  value={testCount || allWords.length}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || allWords.length;
                    setTestCount(count);
                    generateTestWords(count, isShuffled);
                  }}
                  className="w-20 px-3 py-1 rounded-lg border-2 text-sm"
                  style={{ borderColor: '#CCD5DA', color: '#13181B' }}
                />
                <span className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
                  / {allWords.length}개
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newShuffled = !isShuffled;
                    setIsShuffled(newShuffled);
                    generateTestWords(testCount || allWords.length, newShuffled);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isShuffled ? '' : 'opacity-60'
                  }`}
                  style={isShuffled ? {
                    backgroundColor: '#13181B',
                    color: '#F0EEEB'
                  } : {
                    backgroundColor: '#CCD5DA',
                    color: '#13181B'
                  }}
                >
                  {isShuffled ? '✓ 순서 섞기' : '순서 섞기'}
                </button>
                <button
                  onClick={() => {
                    generateTestWords(testCount || allWords.length, isShuffled);
                    setAnswers({});
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                >
                  문제 새로고침
                </button>
              </div>
            </div>
          </div>

          {/* 시험 모드 선택 제거 - 랜덤으로 자동 선택됨 */}

          <div className="space-y-4">
            {words.map((word, idx) => {
              return (
                <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                  <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
                    {idx + 1}. {word.word}
                  </p>
                  <input
                    type="text"
                    value={answers[word.word] || ""}
                    onChange={(e) => setAnswers({ ...answers, [word.word]: e.target.value })}
                    placeholder="답을 입력하세요"
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
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || submitted || Object.keys(answers).length === 0 || timeLeft === 0}
            className="mt-6 w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
            style={{ 
              backgroundColor: '#13181B',
              opacity: (submitting || submitted || Object.keys(answers).length === 0 || timeLeft === 0) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!submitting && !submitted && Object.keys(answers).length > 0 && timeLeft > 0) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {submitting ? "제출 중..." : timeLeft === 0 ? "시간 종료" : "제출하기"}
          </button>
        </div>
      </div>
    </div>
  );
}




