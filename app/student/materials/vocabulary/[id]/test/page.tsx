"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VocabularyTestPage() {
  const params = useParams();
  const router = useRouter();
  const [vocabulary, setVocabulary] = useState<any>(null);
  const [words, setWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState<"word-to-meaning" | "meaning-to-word" | "mixed">("word-to-meaning");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

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
          // "word - meaning" 또는 "word meaning" 형식 파싱
          const parts = line.trim().split(/\s*-\s*|\s{2,}/);
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

  const handleSubmit = async () => {
    if (!studentId) return;

    setSubmitting(true);

    // 자동 채점
    let correctCount = 0;
    const totalCount = words.length;

    words.forEach((word, idx) => {
      const currentMode = testMode === "mixed" 
        ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
        : testMode;
      
      const studentAnswer = answers[word.word]?.trim().toLowerCase() || '';
      const correctAnswer = (currentMode === "word-to-meaning" ? word.meaning : word.word).trim().toLowerCase();
      
      // 정확히 일치하거나 공백 차이만 있는 경우 정답으로 처리
      if (studentAnswer === correctAnswer || studentAnswer.replace(/\s+/g, ' ') === correctAnswer.replace(/\s+/g, ' ')) {
        correctCount++;
      }
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    setResults({ correctCount, totalCount, score, words, answers, testMode });
    setSubmitted(true);
    setSubmitting(false);
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
              <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>오답 노트</h2>
              {words.map((word, idx) => {
                const currentMode = results.testMode === "mixed" 
                  ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
                  : results.testMode;
                
                const studentAnswer = results.answers[word.word]?.trim() || '';
                const correctAnswer = currentMode === "word-to-meaning" ? word.meaning : word.word;
                const isCorrect = studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ||
                  studentAnswer.toLowerCase().replace(/\s+/g, ' ').trim() === correctAnswer.toLowerCase().replace(/\s+/g, ' ').trim();

                if (isCorrect) return null;

                return (
                  <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#FD8973', backgroundColor: '#FFF0ED' }}>
                    <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
                      {idx + 1}. {currentMode === "word-to-meaning" ? word.word : word.meaning}
                    </p>
                    <p className="text-sm mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                      내 답: <span style={{ color: '#FD8973' }}>{studentAnswer || "(미입력)"}</span>
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#13181B' }}>
                      정답: {correctAnswer}
                    </p>
                  </div>
                );
              })}
              {words.every((word, idx) => {
                const currentMode = results.testMode === "mixed" 
                  ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
                  : results.testMode;
                const studentAnswer = results.answers[word.word]?.trim().toLowerCase() || '';
                const correctAnswer = (currentMode === "word-to-meaning" ? word.meaning : word.word).trim().toLowerCase();
                return studentAnswer === correctAnswer || studentAnswer.replace(/\s+/g, ' ') === correctAnswer.replace(/\s+/g, ' ');
              }) && (
                <p className="text-center py-8" style={{ color: '#13181B', opacity: 0.7 }}>
                  모든 문제를 맞추셨습니다! 🎉
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setAnswers({});
                setResults(null);
              }}
              className="mt-6 w-full px-6 py-3 rounded-xl font-semibold transition-all"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              다시 시험 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#13181B' }}>
            {vocabulary.title} - 시험
          </h1>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            단어 {vocabulary.word_count}개
          </p>

          {/* 시험 모드 선택 */}
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB' }}>
            <label className="block text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
              시험 모드 선택
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setTestMode("word-to-meaning")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  testMode === "word-to-meaning" ? '' : 'opacity-60'
                }`}
                style={testMode === "word-to-meaning" ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB'
                } : {
                  backgroundColor: '#CCD5DA',
                  color: '#13181B'
                }}
              >
                영어 → 한글
              </button>
              <button
                onClick={() => setTestMode("meaning-to-word")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  testMode === "meaning-to-word" ? '' : 'opacity-60'
                }`}
                style={testMode === "meaning-to-word" ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB'
                } : {
                  backgroundColor: '#CCD5DA',
                  color: '#13181B'
                }}
              >
                한글 → 영어
              </button>
              <button
                onClick={() => setTestMode("mixed")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  testMode === "mixed" ? '' : 'opacity-60'
                }`}
                style={testMode === "mixed" ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB'
                } : {
                  backgroundColor: '#CCD5DA',
                  color: '#13181B'
                }}
              >
                혼합
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {words.map((word, idx) => {
              const currentMode = testMode === "mixed" 
                ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
                : testMode;
              
              return (
                <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                  <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
                    {idx + 1}. {currentMode === "word-to-meaning" ? word.word : word.meaning}
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
            disabled={submitting || Object.keys(answers).length === 0}
            className="mt-6 w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
            style={{ 
              backgroundColor: '#13181B',
              opacity: (submitting || Object.keys(answers).length === 0) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!submitting && Object.keys(answers).length > 0) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {submitting ? "제출 중..." : "제출하기"}
          </button>
        </div>
      </div>
    </div>
  );
}



