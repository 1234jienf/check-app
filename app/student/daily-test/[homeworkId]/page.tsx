"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [testStarted, setTestStarted] = useState(false);

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
        {/* 뒤로 가기 제거 - 시험 중에는 뒤로 갈 수 없음 */}

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
              testStarted={testStarted}
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
function VocabularyTest({ homeworkId, vocabularyId, vocabulary, testDate, studentId, testStarted: parentTestStarted }: any) {
  const router = useRouter();
  const [words, setWords] = useState<Array<{ word: string; meaning: string }>>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 항상 영어 → 한글 모드로 고정
  const [testMode] = useState<"word-to-meaning">("word-to-meaning");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5분 = 300초
  const [timerActive, setTimerActive] = useState(true);
  const [testStarted, setTestStarted] = useState(parentTestStarted || false);
  const [hasExistingResult, setHasExistingResult] = useState(false);

  useEffect(() => {
    if (!vocabulary || !vocabulary.words) {
      console.error("Vocabulary data is missing:", vocabulary);
      return;
    }

    // 단어 목록 파싱 (줄바꿈으로 구분)
    const wordLines = vocabulary.words.split('\n').filter((line: string) => line.trim());
    const parsedWords = wordLines.map((line: string) => {
      // 다양한 구분자 지원: "-", "―", "—", ":", " : " 또는 공백 2개 이상
      // 정규식: \s*[-―—:]\s*|\s{2,}
      const parts = line.trim().split(/\s*[-―—:]\s*|\s{2,}/);
      if (parts.length >= 2) {
        return { word: parts[0].trim(), meaning: parts.slice(1).join(' ').trim() };
      }
      return { word: line.trim(), meaning: '' };
    }).filter((w: any) => w.word && w.meaning);

    console.log("Parsed words:", parsedWords.length, parsedWords);
    setWords(parsedWords);
  }, [vocabulary]);

  // 기존 시험 결과 확인
  useEffect(() => {
    if (!studentId || !homeworkId || !vocabularyId) return;

    const checkExistingResult = async () => {
      const { data } = await supabase
        .from("daily_vocabulary_test")
        .select("*")
        .eq("student_id", studentId)
        .eq("teacher_homework_id", homeworkId)
        .eq("vocabulary_id", vocabularyId)
        .maybeSingle();

      if (data) {
        setHasExistingResult(true);
        // 기존 결과가 있으면 결과 화면으로
        setResults({ 
          correctCount: data.correct_count, 
          totalCount: data.total_count, 
          score: data.score,
          testMode: data.test_mode || "word-to-meaning" // 저장된 test_mode 사용
        });
        setSubmitted(true);
        setAnswers(data.answers || {});
        setTimerActive(false);
      } else if (parentTestStarted) {
        // 부모에서 시험 시작이 기록되었으면 그대로 사용
        setTestStarted(true);
      } else {
        // 시험 시작 기록 (페이지 진입 시점)
        setTestStarted(true);
        // sessionStorage에 시험 시작 기록
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`test_started_${homeworkId}`, 'true');
        }
      }
    };

    checkExistingResult();
  }, [studentId, homeworkId, vocabularyId]);

  // 5분 타이머
  useEffect(() => {
    if (!timerActive || submitted) return;

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
  }, [timerActive, submitted]);

  // 시간 종료 시 자동 제출
  useEffect(() => {
    if (timeLeft === 0 && !submitted && !loading && words.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, submitted, loading]);

  // 빵점 자동 제출 함수
  const submitZeroScore = useCallback(async () => {
    if (!studentId || submitted) return;

    try {
      // 기존 결과 확인
      const { data: existingResult } = await supabase
        .from("daily_vocabulary_test")
        .select("id")
        .eq("student_id", studentId)
        .eq("teacher_homework_id", homeworkId)
        .eq("vocabulary_id", vocabularyId)
        .maybeSingle();

      let error = null;
      
      // 업데이트/삽입할 데이터 준비 (test_mode는 선택적)
      const zeroScoreData: any = {
        test_date: testDate,
        answers: {},
        correct_count: 0,
        total_count: words.length,
        score: 0,
      };
      
      // test_mode 컬럼이 있으면 추가 (없어도 에러가 나지 않도록)
      try {
        zeroScoreData.test_mode = testMode;
      } catch (e) {
        // test_mode 컬럼이 없으면 무시
      }
      
      if (existingResult) {
        // 기존 결과가 있으면 업데이트
        zeroScoreData.updated_at = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("daily_vocabulary_test")
          .update(zeroScoreData)
          .eq("id", existingResult.id);
        
        error = updateError;
      } else {
        // 기존 결과가 없으면 새로 생성
        zeroScoreData.student_id = studentId;
        zeroScoreData.teacher_homework_id = homeworkId;
        zeroScoreData.vocabulary_id = vocabularyId;
        const { error: insertError } = await supabase
          .from("daily_vocabulary_test")
          .insert(zeroScoreData);
        
        error = insertError;
      }
      
      // test_mode 컬럼이 없어서 발생한 에러인 경우, test_mode 없이 재시도
      if (error && error.message && error.message.includes("test_mode")) {
        console.warn("test_mode 컬럼이 없어서 제거하고 재시도합니다.");
        delete zeroScoreData.test_mode;
        
        if (existingResult) {
          const { error: retryError } = await supabase
            .from("daily_vocabulary_test")
            .update(zeroScoreData)
            .eq("id", existingResult.id);
          error = retryError;
        } else {
          const { error: retryError } = await supabase
            .from("daily_vocabulary_test")
            .insert(zeroScoreData);
          error = retryError;
        }
      }

      if (!error) {
        setSubmitted(true);
        setResults({ correctCount: 0, totalCount: words.length, score: 0, testMode });
        setTimerActive(false);
      } else {
        console.error("자동 제출 실패:", error);
      }
    } catch (err) {
      console.error("자동 제출 실패:", err);
    }
  }, [studentId, submitted, homeworkId, vocabularyId, testDate, words.length, testMode]);

  // 뒤로 가기 방지 및 페이지 이탈 시 자동 제출 (빵점)
  useEffect(() => {
    if (submitted || !testStarted || hasExistingResult) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 시험이 시작되었고 제출되지 않았으면 빵점으로 자동 제출
      if (testStarted && !submitted && studentId && words.length > 0) {
        // 빵점 자동 제출 (동기적으로 처리)
        const submitData = {
          student_id: studentId,
          teacher_homework_id: homeworkId,
          vocabulary_id: vocabularyId,
          test_date: testDate,
          answers: {},
          correct_count: 0,
          total_count: words.length,
          score: 0,
          test_mode: testMode,
        };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pending_zero_submit_${homeworkId}`, JSON.stringify(submitData));
        }
      }
      e.preventDefault();
      e.returnValue = '';
    };

    const handleVisibilityChange = async () => {
      // 페이지가 숨겨질 때 (다른 탭으로 이동, 앱 전환 등)
      if (document.hidden && testStarted && !submitted && studentId && words.length > 0) {
        // 빵점으로 자동 제출
        await submitZeroScore();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Next.js router 이벤트 리스너는 useEffect cleanup에서 처리

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // 컴포넌트 언마운트 시에도 자동 제출
      if (testStarted && !submitted && studentId && words.length > 0) {
        const submitData = {
          student_id: studentId,
          teacher_homework_id: homeworkId,
          vocabulary_id: vocabularyId,
          test_date: testDate,
          answers: {},
          correct_count: 0,
          total_count: words.length,
          score: 0,
          test_mode: testMode,
        };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pending_zero_submit_${homeworkId}`, JSON.stringify(submitData));
        }
      }
    };
  }, [submitted, testStarted, hasExistingResult, studentId, homeworkId, vocabularyId, testDate, words.length, testMode, submitZeroScore]);

  const handleSubmit = async () => {
    if (!studentId) return;

    setLoading(true);

    // 자동 채점
    let correctCount = 0;
    const totalCount = words.length;

    words.forEach((word) => {
      const studentAnswer = answers[word.word]?.trim() || '';
      const correctAnswerRaw = word.meaning.trim();
      
      // 여러 정답이 쉼표로 구분된 경우 처리
      const correctAnswers = correctAnswerRaw.split(',').map(ans => ans.trim());
      
      // 학생 답안이 여러 정답 중 하나라도 일치하면 정답으로 처리
      // 대소문자 구분 없이 비교하되, 원본도 비교
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
      
      if (isCorrect) {
        correctCount++;
      }
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 기존 결과 확인
    const { data: existingResult } = await supabase
      .from("daily_vocabulary_test")
      .select("id")
      .eq("student_id", studentId)
      .eq("teacher_homework_id", homeworkId)
      .eq("vocabulary_id", vocabularyId)
      .maybeSingle();

    let error = null;
    
    // 업데이트/삽입할 데이터 준비 (test_mode는 선택적)
    const resultData: any = {
      test_date: testDate,
      answers: answers,
      correct_count: correctCount,
      total_count: totalCount,
      score: score,
    };
    
    // test_mode 컬럼이 있으면 추가 (없어도 에러가 나지 않도록)
    try {
      resultData.test_mode = testMode;
    } catch (e) {
      // test_mode 컬럼이 없으면 무시
    }
    
    if (existingResult) {
      // 기존 결과가 있으면 업데이트
      resultData.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("daily_vocabulary_test")
        .update(resultData)
        .eq("id", existingResult.id);
      
      error = updateError;
    } else {
      // 기존 결과가 없으면 새로 생성
      resultData.student_id = studentId;
      resultData.teacher_homework_id = homeworkId;
      resultData.vocabulary_id = vocabularyId;
      const { error: insertError } = await supabase
        .from("daily_vocabulary_test")
        .insert(resultData);
      
      error = insertError;
    }
    
    // test_mode 컬럼이 없어서 발생한 에러인 경우, test_mode 없이 재시도
    if (error && error.message && error.message.includes("test_mode")) {
      console.warn("test_mode 컬럼이 없어서 제거하고 재시도합니다.");
      delete resultData.test_mode;
      
      if (existingResult) {
        const { error: retryError } = await supabase
          .from("daily_vocabulary_test")
          .update(resultData)
          .eq("id", existingResult.id);
        error = retryError;
      } else {
        const { error: retryError } = await supabase
          .from("daily_vocabulary_test")
          .insert(resultData);
        error = retryError;
      }
    }

    if (error) {
      console.error("시험 결과 저장 오류:", error);
      alert(`시험 결과 저장에 실패했습니다.\n오류: ${error.message || JSON.stringify(error)}`);
    } else {
      setResults({ correctCount, totalCount, score, testMode });
      setSubmitted(true);
      setTimerActive(false);
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
          <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>전체 문제 및 답안</h3>
          <div className="space-y-3">
            {words.map((word, idx) => {
              const question = word.word;
              const correctAnswerRaw = word.meaning;
              const studentAnswer = answers[word.word]?.trim() || '';
              
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
          href="/student/daily-homework"
          className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all text-center block"
          style={{ backgroundColor: '#13181B' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          일별 숙제로 돌아가기
        </Link>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{vocabulary?.title || '영단어 시험'}</h2>
          <div className="p-6 rounded-xl border-2" style={{ borderColor: '#FD8973', backgroundColor: '#FFF0ED' }}>
            <p className="text-center" style={{ color: '#13181B' }}>
              단어가 없습니다. 단어장에 단어가 제대로 입력되어 있는지 확인해주세요.
            </p>
            <p className="text-center text-sm mt-2" style={{ color: '#13181B', opacity: 0.7 }}>
              단어 형식: "word - meaning", "word ― meaning", "word: meaning" 또는 "word  meaning" (줄바꿈으로 구분)
            </p>
          </div>
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

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 모드 표시 텍스트
  const getModeText = () => {
    return "영어 → 한글";
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{vocabulary?.title || '영단어 시험'}</h2>
            <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>
              단어 {words.length}개 | 모드: {getModeText()}
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
      </div>

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
        disabled={loading || submitted || timeLeft === 0}
        className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all"
        style={{ 
          backgroundColor: '#13181B',
          opacity: (loading || submitted || timeLeft === 0) ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!loading && !submitted && timeLeft > 0) {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {loading ? "제출 중..." : timeLeft === 0 ? "시간 종료" : "제출하기"}
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

