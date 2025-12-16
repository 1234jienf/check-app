"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";


interface TeacherHomework {
  id: string;
  homework_date: string;
  subject: "korean" | "english";
  content?: string;
  vocabulary_id?: string;
  sentence_example_id?: string;
  passage_analysis_id?: string;
}

export default function DailyTestPage() {
  const params = useParams();
  const router = useRouter();
  const homeworkId = params.homeworkId as string;
  const [homework, setHomework] = useState<TeacherHomework | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testType, setTestType] = useState<"vocabulary" | "sentence" | "passage" | null>(null);
  const [vocabularyData, setVocabularyData] = useState<any>(null);
  const [sentenceData, setSentenceData] = useState<any>(null);
  const [passageData, setPassageData] = useState<any>(null);

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

        // 숙제 정보 불러오기
        // RLS 정책에 의해 자동으로 필터링됨
        let homeworkData;
        let error;

        try {
          const result = await supabase
            .from("teacher_homework")
            .select("*")
            .eq("id", homeworkId)
            .single();
          
          homeworkData = result.data;
          error = result.error;
        } catch (err: any) {
          error = err;
        }

        if (error) {
          // 400 에러는 RLS 정책 문제일 수 있음
          console.error("teacher_homework 쿼리 오류:", error);
          alert("접근 권한이 없거나 숙제를 찾을 수 없습니다.");
          router.push("/student/daily-homework");
          return;
        }

        if (!homeworkData) {
          alert("숙제를 찾을 수 없습니다.");
          router.push("/student/daily-homework");
          return;
        }

        // 추가 확인: student_ids가 배열이고 현재 학생이 포함되어 있는지 확인
        const currentStudentId = user.id;
        if (homeworkData.student_ids && Array.isArray(homeworkData.student_ids) && homeworkData.student_ids.length > 0 && !homeworkData.student_ids.includes(currentStudentId)) {
          alert("접근 권한이 없습니다.");
          router.push("/student/daily-homework");
          return;
        }

        setHomework(homeworkData);

        // 어떤 시험인지 확인하고 자료 불러오기
        if (homeworkData.vocabulary_id) {
          setTestType("vocabulary");
          const { data: vocab, error: vocabError } = await supabase
            .from("english_vocabulary")
            .select("*")
            .eq("id", homeworkData.vocabulary_id)
            .single();
          if (vocabError || !vocab) {
            alert("단어장을 불러올 수 없습니다.");
            router.push("/student/daily-homework");
            return;
          }
          setVocabularyData(vocab);
        } else if (homeworkData.sentence_example_id) {
          setTestType("sentence");
          const { data: sentence, error: sentenceError } = await supabase
            .from("english_sentence_examples")
            .select("*")
            .eq("id", homeworkData.sentence_example_id)
            .single();
          if (sentenceError || !sentence) {
            alert("문장 예제를 불러올 수 없습니다.");
            router.push("/student/daily-homework");
            return;
          }
          setSentenceData(sentence);
        } else if (homeworkData.passage_analysis_id) {
          setTestType("passage");
          const { data: passage, error: passageError } = await supabase
            .from("english_passage_analysis")
            .select("*")
            .eq("id", homeworkData.passage_analysis_id)
            .single();
          if (passageError || !passage) {
            alert("지문을 불러올 수 없습니다.");
            router.push("/student/daily-homework");
            return;
          }
          setPassageData(passage);
        } else if (homeworkData.subject === "korean" && homeworkData.content) {
          // 국어는 시험이 아니라 그냥 할 일로 표시
          router.push("/student/daily-homework");
          return;
        } else {
          alert("시험 자료를 찾을 수 없습니다.");
          router.push("/student/daily-homework");
          return;
        }

        setLoading(false);
      } catch (err) {
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
        router.push("/student/daily-homework");
      }
    };

    if (homeworkId) {
      loadData();
    }
  }, [homeworkId, router]);

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

  if (!homework || !testType) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <Link
          href="/student/daily-homework"
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
          일별 숙제로 돌아가기
        </Link>

        <div className="rounded-xl p-6 md:p-8 shadow-xl" style={{ backgroundColor: '#FFFFFF' }}>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#13181B' }}>
            Daily 시험
          </h1>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.7 }}>
            {new Date(homework.homework_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {testType === "vocabulary" && vocabularyData && (
            <VocabularyTest
              homeworkId={homeworkId}
              vocabularyId={vocabularyData.id}
              vocabulary={vocabularyData}
              testDate={homework.homework_date}
              studentId={studentId}
            />
          )}

          {testType === "sentence" && sentenceData && (
            <SentenceTest
              homeworkId={homeworkId}
              sentenceId={sentenceData.id}
              sentence={sentenceData}
              testDate={homework.homework_date}
              studentId={studentId}
            />
          )}

          {testType === "passage" && passageData && (
            <PassageTest
              homeworkId={homeworkId}
              passageId={passageData.id}
              passage={passageData}
              testDate={homework.homework_date}
              studentId={studentId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 영단어 시험 컴포넌트
function VocabularyTest({ homeworkId, vocabularyId, vocabulary, testDate, studentId }: any) {
  const router = useRouter();
  const [words, setWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testMode, setTestMode] = useState<"word-to-meaning" | "meaning-to-word">("word-to-meaning");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    // 자동 채점
    let correctCount = 0;
    const totalCount = words.length;

    words.forEach((word) => {
      const studentAnswer = answers[word.word]?.trim().toLowerCase() || '';
      const correctAnswer = (testMode === "word-to-meaning" ? word.meaning : word.word).trim().toLowerCase();
      
      // 정확히 일치하거나 공백 차이만 있는 경우 정답으로 처리
      if (studentAnswer === correctAnswer || studentAnswer.replace(/\s+/g, ' ') === correctAnswer.replace(/\s+/g, ' ')) {
        correctCount++;
      }
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 결과 저장
    const { error } = await supabase
      .from("daily_vocabulary_test")
      .insert({
        student_id: studentId,
        teacher_homework_id: homeworkId,
        vocabulary_id: vocabularyId,
        test_date: testDate,
        answers: answers,
        correct_count: correctCount,
        total_count: totalCount,
        score: score,
      });

    if (error) {
      alert("시험 결과 저장에 실패했습니다.");
    } else {
      setResults({ correctCount, totalCount, score });
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted && results) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#F0EEEB' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>시험 결과</h2>
          <div className="space-y-2">
            <p className="text-lg" style={{ color: '#13181B' }}>
              정답: <span className="font-bold">{results.correctCount}</span> / {results.totalCount}
            </p>
            <p className="text-lg" style={{ color: '#13181B' }}>
              점수: <span className="font-bold">{results.score}점</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>틀린 문제</h3>
          {words.map((word, idx) => {
            const studentAnswer = answers[word.word]?.trim() || '';
            const correctAnswer = testMode === "word-to-meaning" ? word.meaning : word.word;
            const isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();

            if (isCorrect) return null;

            return (
              <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#FD8973', backgroundColor: '#FFF0ED' }}>
                <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
                  {testMode === "word-to-meaning" ? word.word : word.meaning}
                </p>
                <p className="text-sm mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                  내 답: {studentAnswer || "(미작성)"}
                </p>
                <p className="text-sm font-semibold" style={{ color: '#13181B' }}>
                  정답: {correctAnswer}
                </p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push("/student/daily-homework")}
          className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: '#13181B' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{vocabulary.title}</h2>
        <p className="text-sm mb-4" style={{ color: '#13181B', opacity: 0.7 }}>
          단어 {words.length}개
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setTestMode("word-to-meaning");
              setAnswers({});
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${testMode === "word-to-meaning" ? 'text-white' : ''}`}
            style={testMode === "word-to-meaning" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
          >
            단어 → 뜻
          </button>
          <button
            onClick={() => {
              setTestMode("meaning-to-word");
              setAnswers({});
            }}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${testMode === "meaning-to-word" ? 'text-white' : ''}`}
            style={testMode === "meaning-to-word" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
          >
            뜻 → 단어
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {words.map((word, idx) => (
          <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
            <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
              {idx + 1}. {testMode === "word-to-meaning" ? word.word : word.meaning}
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
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(answers).length === 0}
        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
        style={{ 
          backgroundColor: '#13181B',
          opacity: (loading || Object.keys(answers).length === 0) ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading && Object.keys(answers).length > 0) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {loading ? "제출 중..." : "제출하기"}
      </button>
    </div>
  );
}

// 구문 해석 시험 컴포넌트
function SentenceTest({ homeworkId, sentenceId, sentence, testDate, studentId }: any) {
  const router = useRouter();
  const [sentences, setSentences] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sentenceLines = sentence.sentences.split('\n').filter((line: string) => line.trim());
    setSentences(sentenceLines);
  }, [sentence]);

  const handleSubmit = async () => {
    if (!studentId) return;

    setLoading(true);

    const { error } = await supabase
      .from("daily_sentence_test")
      .insert({
        student_id: studentId,
        teacher_homework_id: homeworkId,
        sentence_example_id: sentenceId,
        test_date: testDate,
        answers: answers,
      });

    if (error) {
      alert("시험 결과 저장에 실패했습니다.");
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#F0EEEB' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>제출 완료</h2>
          <p style={{ color: '#13181B' }}>
            선생님이 채점한 후 결과를 확인할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => router.push("/student/daily-homework")}
          className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: '#13181B' }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{sentence.title}</h2>
        <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
          패턴: {sentence.pattern}
        </p>
        <p className="text-sm mb-4" style={{ color: '#13181B', opacity: 0.7 }}>
          문장 {sentences.length}개
        </p>
      </div>

      <div className="space-y-4">
        {sentences.map((sentenceText, idx) => (
          <div key={idx} className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
            <p className="font-semibold mb-2" style={{ color: '#13181B' }}>
              {idx + 1}. {sentenceText}
            </p>
            <textarea
              value={answers[idx] || ""}
              onChange={(e) => setAnswers({ ...answers, [idx]: e.target.value })}
              placeholder="해석을 입력하세요"
              rows={3}
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
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || Object.keys(answers).length === 0}
        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
        style={{ 
          backgroundColor: '#13181B',
          opacity: (loading || Object.keys(answers).length === 0) ? 0.6 : 1
        }}
      >
        {loading ? "제출 중..." : "제출하기"}
      </button>
    </div>
  );
}

// 지문 해석 시험 컴포넌트
function PassageTest({ homeworkId, passageId, passage, testDate, studentId }: any) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!studentId) return;

    setLoading(true);

    const { error } = await supabase
      .from("daily_passage_test")
      .insert({
        student_id: studentId,
        teacher_homework_id: homeworkId,
        passage_analysis_id: passageId,
        test_date: testDate,
        answer: answer,
      });

    if (error) {
      alert("시험 결과 저장에 실패했습니다.");
    } else {
      setSubmitted(true);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl" style={{ backgroundColor: '#F0EEEB' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>제출 완료</h2>
          <p style={{ color: '#13181B' }}>
            선생님이 채점한 후 결과를 확인할 수 있습니다.
          </p>
        </div>
        <button
          onClick={() => router.push("/student/daily-homework")}
          className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
          style={{ backgroundColor: '#13181B' }}
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{passage.title}</h2>
      </div>

      <div className="p-4 rounded-lg" style={{ backgroundColor: '#F0EEEB' }}>
        <h3 className="font-semibold mb-2" style={{ color: '#13181B' }}>지문</h3>
        <div className="whitespace-pre-wrap text-sm" style={{ color: '#13181B', opacity: 0.9 }}>
          {passage.passage_text}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2" style={{ color: '#13181B' }}>
          답변 작성
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="지문에 대한 답변을 작성하세요"
          rows={10}
          className="w-full px-4 py-3 rounded-lg border-2"
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
        onClick={handleSubmit}
        disabled={loading || !answer.trim()}
        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
        style={{ 
          backgroundColor: '#13181B',
          opacity: (loading || !answer.trim()) ? 0.6 : 1
        }}
      >
        {loading ? "제출 중..." : "제출하기"}
      </button>
    </div>
  );
}

