"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VocabularyTestFromMaterialsPage() {
  const params = useParams();
  const router = useRouter();
  const vocabId = params.vocabId as string;
  const [vocabulary, setVocabulary] = useState<any>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedSubject', 'english');
      window.dispatchEvent(new CustomEvent('subjectChanged', { detail: { subject: 'english' } }));
    }

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setStudentId(user.id);

        // 단어장 정보 불러오기
        const { data: vocabData, error } = await supabase
          .from("english_vocabulary")
          .select("*")
          .eq("id", vocabId)
          .single();

        if (error || !vocabData) {
          alert("단어장을 불러올 수 없습니다.");
          router.push("/student/materials");
          return;
        }

        setVocabulary(vocabData);
        setLoading(false);
      } catch (err) {
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        router.push("/student/materials");
      }
    };

    if (vocabId) {
      loadData();
    }
  }, [vocabId, router]);

  if (loading) {
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

  if (!vocabulary || !studentId) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/materials"
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
          자료실로 돌아가기
        </Link>

        <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#13181B' }}>
            단어 시험
          </h1>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            {vocabulary.title}
          </p>

          <VocabularyTest
            vocabularyId={vocabId}
            vocabulary={vocabulary}
            studentId={studentId}
          />
        </div>
      </div>
    </div>
  );
}

// 영단어 시험 컴포넌트 (자료실용 - 결과 저장 안 함)
function VocabularyTest({ vocabularyId, vocabulary, studentId }: any) {
  const router = useRouter();
  const [words, setWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState<"word-to-meaning" | "meaning-to-word" | "mixed">("word-to-meaning");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 단어 목록 파싱 (줄바꿈으로 구분)
    const wordLines = vocabulary.words.split('\n').filter((line: string) => line.trim());
    const parsedWords = wordLines.map((line: string) => {
      // "word - meaning" 또는 "word meaning" 형식 파싱
      const parts = line.trim().split(/\s*-\s*|\s{2,}/);
      if (parts.length >= 2) {
        return { word: parts[0].trim(), meaning: parts.slice(1).join(' ').trim() };
      }
      return { word: line.trim(), meaning: '' };
    }).filter((w: any) => w.word && w.meaning);

    setWords(parsedWords);
  }, [vocabulary]);

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

    // 자료실에서 직접 시험 보는 경우 결과 저장 안 함 (요청사항에 따라)
    setResults({ correctCount, totalCount, score, words, answers, testMode });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted && results) {
    const incorrectAnswers = words.filter((word, idx) => {
      const currentMode = results.testMode === "mixed" 
        ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
        : results.testMode;
      const studentAnswer = results.answers[word.word]?.trim().toLowerCase() || '';
      const correctAnswer = (currentMode === "word-to-meaning" ? word.meaning : word.word).trim().toLowerCase();
      return studentAnswer !== correctAnswer && studentAnswer.replace(/\s+/g, ' ') !== correctAnswer.replace(/\s+/g, ' ');
    });

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#F0EEEB' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>시험 결과</h2>
          <div className="space-y-2">
            <p className="text-lg" style={{ color: '#13181B' }}>
              정답: {results.correctCount} / {results.totalCount}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#13181B' }}>
              점수: {results.score}점
            </p>
          </div>
        </div>

        {incorrectAnswers.length > 0 && (
          <div className="p-6 rounded-xl border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#13181B' }}>오답 노트</h3>
            <div className="space-y-3">
              {incorrectAnswers.map((word, idx) => {
                const currentMode = results.testMode === "mixed" 
                  ? (idx % 2 === 0 ? "word-to-meaning" : "meaning-to-word")
                  : results.testMode;
                const studentAnswer = results.answers[word.word] || "(미입력)";
                const correctAnswer = currentMode === "word-to-meaning" ? word.meaning : word.word;
                const question = currentMode === "word-to-meaning" ? word.word : word.meaning;

                return (
                  <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                    <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
                      {question}
                    </p>
                    <p className="text-sm mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                      내 답: {studentAnswer}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#13181B' }}>
                      정답: {correctAnswer}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setSubmitted(false);
            setResults(null);
            setAnswers({});
          }}
          className="w-full px-6 py-3 rounded-xl font-semibold transition-all"
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
        <p className="text-sm mb-3 font-semibold" style={{ color: '#13181B' }}>시험 모드 선택</p>
        <div className="flex gap-3">
          <button
            onClick={() => setTestMode("word-to-meaning")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ 
              backgroundColor: testMode === "word-to-meaning" ? '#13181B' : '#CCD5DA',
              color: testMode === "word-to-meaning" ? '#F0EEEB' : '#13181B'
            }}
          >
            영어 → 한글
          </button>
          <button
            onClick={() => setTestMode("meaning-to-word")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ 
              backgroundColor: testMode === "meaning-to-word" ? '#13181B' : '#CCD5DA',
              color: testMode === "meaning-to-word" ? '#F0EEEB' : '#13181B'
            }}
          >
            한글 → 영어
          </button>
          <button
            onClick={() => setTestMode("mixed")}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ 
              backgroundColor: testMode === "mixed" ? '#13181B' : '#CCD5DA',
              color: testMode === "mixed" ? '#F0EEEB' : '#13181B'
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
        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
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
  );
}



