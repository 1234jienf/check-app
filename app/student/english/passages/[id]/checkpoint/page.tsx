"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import React from "react";

// 영어 페이지 접근 시 세션 스토리지에 영어 저장
if (typeof window !== 'undefined') {
  sessionStorage.setItem('selectedSubject', 'english');
  window.dispatchEvent(new CustomEvent('subjectChanged', { detail: { subject: 'english' } }));
}

export default function StudentCheckpointPage() {
  const { id: passageId } = useParams();
  const [passage, setPassage] = useState<any>(null);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [studentCheckpoints, setStudentCheckpoints] = useState<
    Record<number, { checkpoint: string; hasCheckpoint: boolean; dontKnow: boolean; reason: string }>
  >({});
  const [teacherCheckpoints, setTeacherCheckpoints] = useState<Record<number, any[]>>({});
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any | null>(null);
  const [teacherComments, setTeacherComments] = useState<Record<string, any[]>>({});
  const [existingCheckpoints, setExistingCheckpoints] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<number>(1); // 1차, 2차, 3차 선택
  const [attemptStatus, setAttemptStatus] = useState<Record<number, number[]>>({}); // 각 문단별 완료된 attempt_number 목록
  const [studentFeedbacks, setStudentFeedbacks] = useState<Record<string, { text: string; id?: string }>>({}); // 학생 자기 피드백
  const [expandedTeacherCheckpoints, setExpandedTeacherCheckpoints] = useState<Record<number, boolean>>({}); // 선생 체크포인트 확장 상태
  const [commentReplies, setCommentReplies] = useState<Record<string, any[]>>({}); // 댓글 답글
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({}); // 답글 입력 텍스트
  const [showReplyInput, setShowReplyInput] = useState<Record<string, boolean>>({}); // 답글 입력 표시 여부

  // 1) 현재 로그인한 사용자 ID 가져오기
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    };

    getUser();
  }, []);

  // 2) 지문과 기존 체크포인트 로드
  useEffect(() => {
    const loadData = async () => {
      // 지문 로드 (영어 지문만)
      const { data: passageData, error: passageError } = await supabase
        .from("passages")
        .select("*")
        .eq("id", passageId)
        .eq("subject", "english")
        .single();

      if (passageError || !passageData) {
        alert("영어 지문을 불러올 수 없습니다.");
        window.history.back();
        return;
      }

      setPassage(passageData);

      // 지문을 문단별로 나누기
      if (passageData?.content) {
        const content = passageData.content;
        let paragraphs: string[] = [];

        // 1차: 빈 줄(2개 이상의 연속된 줄바꿈)로 문단 구분
        const splitByBlankLines = content.split(/\n\s*\n/);
        
        if (splitByBlankLines.length > 1) {
          // 빈 줄로 구분된 경우
          paragraphs = splitByBlankLines
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0);
        } else {
          // 빈 줄이 없는 경우: 문장 단위로 나누기
          // 마침표(., !, ?) + 공백/줄바꿈으로 문장 구분
          const sentences = content
            .split(/([.!?]\s+|[.!?]\n+)/)
            .filter((s: string) => s.trim().length > 0);
          
          // 문장들을 합쳐서 문단 만들기 (약 3-5문장씩)
          let currentParagraph = "";
          let sentenceCount = 0;
          
          sentences.forEach((sentence: string) => {
            const trimmed = sentence.trim();
            if (!trimmed) return;
            
            currentParagraph += (currentParagraph ? " " : "") + trimmed;
            sentenceCount++;
            
            // 4문장마다 또는 문장이 길면 문단 구분
            if (sentenceCount >= 4 || trimmed.length > 200) {
              if (currentParagraph.trim()) {
                paragraphs.push(currentParagraph.trim());
              }
              currentParagraph = "";
              sentenceCount = 0;
            }
          });
          
          // 마지막 문단 추가
          if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
          }
          
          // 문단이 하나도 없으면 전체를 하나의 문단으로
          if (paragraphs.length === 0) {
            paragraphs = [content.trim()];
          }
        }
        
        setParagraphs(paragraphs);
      }

      // 기존 학생 체크포인트 로드
      if (userId && passageId) {
        const { data: existingCheckpointsData } = await supabase
          .from("student_checkpoint_record")
          .select("*")
          .eq("user_id", userId)
          .eq("passage_id", passageId)
          .order("attempt_number", { ascending: true });

        if (existingCheckpointsData) {
          setExistingCheckpoints(existingCheckpointsData);
          
          // 각 문단별 완료된 attempt_number 추적
          const attemptMap: Record<number, number[]> = {};
          const submittedParagraphs = new Set<number>();
          existingCheckpointsData.forEach((cp: any) => {
            const paraNum = cp.paragraph || cp.paragraph_index;
            if (!attemptMap[paraNum]) {
              attemptMap[paraNum] = [];
            }
            if (cp.attempt_number) {
              attemptMap[paraNum].push(cp.attempt_number);
            }
            // 제출한 문단 번호 수집
            submittedParagraphs.add(paraNum);
          });
          setAttemptStatus(attemptMap);

          // 학생이 제출한 문단에 대해서만 선생님 체크포인트 로드
          if (submittedParagraphs.size > 0 && passageId) {
            const submittedParaArray = Array.from(submittedParagraphs);
            const { data: teacherCheckpointsData } = await supabase
              .from("checkpoints")
              .select("*")
              .eq("passage_id", passageId)
              .in("paragraph", submittedParaArray)
              .order("order_num", { ascending: true });

            if (teacherCheckpointsData) {
              const checkpointMap: Record<number, any[]> = {};
              teacherCheckpointsData.forEach((cp: any) => {
                const paraNum = cp.paragraph || 1;
                if (!checkpointMap[paraNum]) {
                  checkpointMap[paraNum] = [];
                }
                checkpointMap[paraNum].push(cp);
              });
              setTeacherCheckpoints(checkpointMap);
            }
          }
          
          // 선택된 attempt_number에 해당하는 체크포인트만 로드
          const checkpointMap: Record<
            number,
            { checkpoint: string; hasCheckpoint: boolean; dontKnow: boolean; reason: string }
          > = {};
          existingCheckpointsData
            .filter((cp: any) => (cp.attempt_number || 1) === selectedAttempt)
            .forEach((cp: any) => {
              const hasCheckpoint = cp.checkpoint_text && cp.checkpoint_text.trim().length > 0;
              const paraNum = cp.paragraph || cp.paragraph_index;
              checkpointMap[paraNum] = {
                checkpoint: cp.checkpoint_text || "",
                hasCheckpoint: hasCheckpoint,
                dontKnow: cp.reason ? true : false,
                reason: cp.reason || "",
              };
            });
          setStudentCheckpoints(checkpointMap);

          // 선생 댓글 및 답글 로드
          const submissionIds = existingCheckpointsData.map((c: any) => c.id);
          if (submissionIds.length > 0) {
            const { data: commentsData } = await supabase
              .from("teacher_comments")
              .select("*")
              .in("student_submission_id", submissionIds)
              .order("created_at", { ascending: false });

            if (commentsData) {
              // 원댓글과 답글 분리
              const commentsMap: Record<string, any[]> = {};
              const repliesMap: Record<string, any[]> = {};
              
              commentsData.forEach((comment: any) => {
                if (comment.parent_comment_id) {
                  // 답글인 경우
                  if (!repliesMap[comment.parent_comment_id]) {
                    repliesMap[comment.parent_comment_id] = [];
                  }
                  repliesMap[comment.parent_comment_id].push(comment);
                } else {
                  // 원댓글인 경우
                  if (!commentsMap[comment.student_submission_id]) {
                    commentsMap[comment.student_submission_id] = [];
                  }
                  commentsMap[comment.student_submission_id].push(comment);
                }
              });
              
              setTeacherComments(commentsMap);
              setCommentReplies(repliesMap);
            }

            // 학생 자기 피드백 로드
            const { data: feedbackData } = await supabase
              .from("student_feedback")
              .select("*")
              .in("student_submission_id", submissionIds);

            if (feedbackData) {
              const feedbackMap: Record<string, { text: string; id?: string }> = {};
              feedbackData.forEach((feedback: any) => {
                feedbackMap[feedback.student_submission_id] = {
                  text: feedback.feedback_text,
                  id: feedback.id,
                };
              });
              setStudentFeedbacks(feedbackMap);
            }
          }
        }
      }
    };

    if (passageId) loadData();
  }, [passageId, userId, selectedAttempt]);

  // 3) 입력값 저장 (로컬 상태)
  const updateField = (
    paragraph: number,
    field: "checkpoint" | "hasCheckpoint" | "dontKnow" | "reason",
    value: string | boolean
  ) => {
    setStudentCheckpoints((prev) => ({
      ...prev,
      [paragraph]: {
        ...prev[paragraph] || {
          checkpoint: "",
          hasCheckpoint: true,
          dontKnow: false,
          reason: "",
        },
        [field]: value,
        // 체크포인트 없음으로 변경하면 모름과 이유 초기화
        ...(field === "hasCheckpoint" && value === false ? { dontKnow: false, reason: "" } : {}),
      },
    }));
  };

  // 4) 제출 버튼 → student_checkpoints 테이블에 저장
  const submitAll = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!passageId) {
      alert("지문 정보를 불러올 수 없습니다.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = i + 1;
      const data = studentCheckpoints[paragraph] || {
        checkpoint: "",
        hasCheckpoint: true,
        dontKnow: false,
        reason: "",
      };

      // attempt_number 확인 및 검증
      const completedAttempts = attemptStatus[paragraph] || [];
      if (completedAttempts.includes(selectedAttempt)) {
        // 이미 해당 attempt_number로 제출한 경우 업데이트
      } else if (completedAttempts.length >= 3) {
        alert(`${paragraph}문단: 이미 3차까지 모두 제출하셨습니다.`);
        errorCount++;
        continue;
      } else if (selectedAttempt > completedAttempts.length + 1) {
        alert(`${paragraph}문단: ${completedAttempts.length + 1}차를 먼저 제출해주세요.`);
        errorCount++;
        continue;
      }

      // 체크포인트 없음이면 빈 값으로 저장
      if (!data.hasCheckpoint) {
        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          paragraph: paragraph,
          attempt_number: selectedAttempt,
          checkpoint_text: "", // 빈 값
        };
        
        const { error } = await supabase.from("student_checkpoint_record").upsert(
          upsertData,
          { onConflict: "passage_id,user_id,paragraph,attempt_number" }
        );
        
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
        continue;
      }

      // 모름이면 이유 필수 (체크포인트가 비어있어도 저장 가능)
      if (data.dontKnow) {
        if (!data.reason.trim()) {
          alert(`${paragraph}문단: 모름을 선택했으면 이유를 작성해주세요.`);
          errorCount++;
          continue;
        }
        
        // 모름이면 체크포인트가 비어있어도 저장
        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          paragraph: paragraph,
          attempt_number: selectedAttempt,
          checkpoint_text: data.checkpoint.trim() || "", // 체크포인트가 비어있어도 저장
          reason: data.reason.trim(),
        };

        const { error } = await supabase.from("student_checkpoint_record").upsert(
          upsertData,
          { onConflict: "passage_id,user_id,paragraph,attempt_number" }
        );

        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
        continue;
      }

      // 체크포인트가 비어있으면 스킵 (모름이 아닌 경우만)
      if (!data.checkpoint.trim()) continue;

      // 일반 체크포인트 저장 (모름이 아닌 경우)
      const upsertData: any = {
        passage_id: passageId,
        user_id: userId,
        paragraph: paragraph,
        attempt_number: selectedAttempt,
        checkpoint_text: data.checkpoint,
      };

      const { error } = await supabase.from("student_checkpoint_record").upsert(
        upsertData,
        { onConflict: "passage_id,user_id,paragraph,attempt_number" }
      );

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      alert(`제출 중 오류가 발생했습니다. 성공: ${successCount}개, 실패: ${errorCount}개`);
    } else if (successCount > 0) {
      alert(`${selectedAttempt}차 제출이 완료되었습니다! (${successCount}개 문단)`);
      // attemptStatus 업데이트
      const updatedAttemptStatus: Record<number, number[]> = { ...attemptStatus };
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = i + 1;
        const data = studentCheckpoints[paragraph];
        if (data && (data.checkpoint.trim() || data.reason.trim() || !data.hasCheckpoint)) {
          if (!updatedAttemptStatus[paragraph]) {
            updatedAttemptStatus[paragraph] = [];
          }
          if (!updatedAttemptStatus[paragraph].includes(selectedAttempt)) {
            updatedAttemptStatus[paragraph].push(selectedAttempt);
          }
        }
      }
      setAttemptStatus(updatedAttemptStatus);
      // 데이터 다시 로드
      const { data: existingCheckpointsData } = await supabase
        .from("student_checkpoint_record")
        .select("*")
        .eq("user_id", userId)
        .eq("passage_id", passageId)
        .order("attempt_number", { ascending: true });
      if (existingCheckpointsData) {
        setExistingCheckpoints(existingCheckpointsData);
      }
    } else {
      alert("제출할 내용이 없습니다. 체크포인트를 작성해주세요.");
    }
  };

  if (!passage) {
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
          <p className="text-[#13181B]">지문을 불러오는 중...</p>
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

  // 카테고리에 따라 올바른 목록 페이지로 이동
  const getCategoryPath = (category: string) => {
    if (category === "EBS") return "/student/passages/ebs";
    if (category === "기출" || category === "평가원") return "/student/passages/gichul";
    if (category === "LEET") return "/student/passages/leet";
    if (category === "기타") return "/student/passages/other";
    return "/student";
  };

  const getCategoryColor = (category: string) => {
    return '#13181B';
  };

  const categoryColor = getCategoryColor(passage?.category || "");

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={getCategoryPath(passage.category)}
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 목록으로 돌아가기
          </Link>
              <div className="flex items-center gap-3 mb-2">
                <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            {passage.title}
                  <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
              </div>
        </div>

        {/* attempt_number 선택 UI */}
        <div className="mb-6 border-2 p-4 rounded-xl" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold" style={{ color: '#13181B' }}>차수 선택</h3>
            <div className="flex gap-2">
              {[1, 2, 3].map((attempt) => {
                const isCompleted = Object.values(attemptStatus).some((attempts) => 
                  attempts.includes(attempt)
                );
                const isSelected = selectedAttempt === attempt;
                const canSelect = attempt === 1 || 
                  Object.values(attemptStatus).some((attempts) => 
                    attempts.includes(attempt - 1)
                  );
                
                return (
                  <button
                    key={attempt}
                    onClick={() => {
                      if (!canSelect && attempt > 1) {
                        alert(`${attempt - 1}차를 먼저 제출해주세요.`);
                        return;
                      }
                      setSelectedAttempt(attempt);
                      // 선택된 attempt에 맞는 체크포인트 로드
                      const checkpointMap: Record<
                        number,
                        { checkpoint: string; hasCheckpoint: boolean; dontKnow: boolean; reason: string }
                      > = {};
                      existingCheckpoints
                        .filter((cp: any) => (cp.attempt_number || 1) === attempt)
                        .forEach((cp: any) => {
                          const hasCheckpoint = cp.checkpoint_text && cp.checkpoint_text.trim().length > 0;
                          const paraNum = cp.paragraph || cp.paragraph_index;
                          checkpointMap[paraNum] = {
                            checkpoint: cp.checkpoint_text || "",
                            hasCheckpoint: hasCheckpoint,
                            dontKnow: cp.reason ? true : false,
                            reason: cp.reason || "",
                          };
                        });
                      setStudentCheckpoints(checkpointMap);
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all"
                    style={isSelected ? {
                      backgroundColor: '#13181B',
                      color: '#F0EEEB'
                    } : isCompleted ? {
                      backgroundColor: '#CCD5DA',
                      color: '#13181B'
                    } : canSelect ? {
                      backgroundColor: '#CCD5DA',
                      color: '#13181B',
                      opacity: 0.7
                    } : {
                      backgroundColor: '#CCD5DA',
                      color: '#13181B',
                      opacity: 0.4,
                      cursor: 'not-allowed'
                    }}
                    disabled={!canSelect && attempt > 1}
                  >
                    {attempt}차 {isCompleted && !isSelected && "✓"}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs" style={{ color: '#13181B', opacity: 0.8 }}>
            각 지문당 최대 3차까지 제출할 수 있습니다. {selectedAttempt}차를 선택하셨습니다.
          </p>
        </div>

        {/* 문단별 체크포인트 작성 */}
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#13181B' }}>문단별 Checkpoint</h2>
          <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.8 }}>
            각 문단을 읽고, 해당 문단에서 확인해야 할 체크포인트를 작성해주세요.
          </p>

        {paragraphs.length === 0 ? (
          <p style={{ color: '#13181B', opacity: 0.7 }}>지문이 등록되지 않았습니다.</p>
        ) : (
          <>
            {paragraphs.map((paragraph, index) => {
              const paragraphNum = index + 1;
              const checkpointData = studentCheckpoints[paragraphNum] || {
                checkpoint: "",
                hasCheckpoint: true,
                dontKnow: false,
                reason: "",
              };

              const submission = userId ? existingCheckpoints?.find((c: any) => {
                const paraNum = c.paragraph || c.paragraph_index;
                return paraNum === paragraphNum && (c.attempt_number || 1) === selectedAttempt;
              }) : null;
              const comments = submission ? teacherComments[submission.id] || [] : [];
              const completedAttemptsForPara = attemptStatus[paragraphNum] || [];
              const hasSubmitted = submission !== null;
              const studentFeedback = submission ? (studentFeedbacks[submission.id]?.id ? studentFeedbacks[submission.id] : null) : null;
              const hasSavedFeedback = studentFeedback !== null;
              const canEdit = !hasSubmitted || selectedAttempt > completedAttemptsForPara.length;
              
              return (
                <div key={index} className="mb-8 border-2 p-4 md:p-6 rounded-xl" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderBottomColor: '#CCD5DA' }}>
                    <h3 className="text-lg font-semibold" style={{ color: '#13181B' }}>
                      {paragraphNum}문단
                    </h3>
                    {completedAttemptsForPara.length > 0 && (
                      <div className="flex gap-1">
                        {completedAttemptsForPara.map((attempt) => (
                          <span
                            key={attempt}
                            className="px-2 py-1 text-xs rounded font-semibold"
                            style={attempt === selectedAttempt ? {
                              backgroundColor: '#13181B',
                              color: '#F0EEEB'
                            } : {
                              backgroundColor: '#CCD5DA',
                              color: '#13181B'
                            }}
                          >
                            {attempt}차
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 문단 내용 */}
                  <div className="mb-6 p-4 rounded-xl border-l-4 relative" style={{ backgroundColor: '#CCD5DA', borderLeftColor: '#CCD5DA' }}>
                    <div className="flex-1 w-full">
                      <ParagraphWithHighlights
                        paragraph={paragraph}
                        checkpoints={hasSubmitted ? (teacherCheckpoints[paragraphNum] || []) : []}
                        onCheckpointClick={(cp) => setSelectedCheckpoint(cp)}
                      />
                    </div>
                  </div>

                  {/* 선생 체크포인트 표시 (제출 후에만) */}
                  {hasSubmitted && teacherCheckpoints[paragraphNum] && teacherCheckpoints[paragraphNum].length > 0 && (
                    <div className="mb-6 border-2 rounded-xl p-4" style={{ backgroundColor: '#CCD5DA', borderColor: '#CCD5DA' }}>
                      <button
                        onClick={() => setExpandedTeacherCheckpoints(prev => ({
                          ...prev,
                          [paragraphNum]: !prev[paragraphNum]
                        }))}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <h4 className="text-sm font-semibold" style={{ color: '#13181B' }}>
                          선생님 체크포인트 ({teacherCheckpoints[paragraphNum].length}개)
                        </h4>
                        <svg
                          className={`w-5 h-5 transition-transform ${expandedTeacherCheckpoints[paragraphNum] ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedTeacherCheckpoints[paragraphNum] && (
                        <div className="mt-3 space-y-3">
                          {teacherCheckpoints[paragraphNum].map((cp: any, idx: number) => {
                            // 영어는 거시/미시 없이 하이라이트만 표시
                            return (
                              <div key={cp.id} className="p-3 border-2 rounded-lg" style={{ 
                                backgroundColor: '#F0EEEB', 
                                borderColor: '#CCD5DA',
                                borderLeft: '4px solid transparent'
                              }}>
                                {cp.highlighted_text && (
                                  <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FFFFFF', color: '#13181B', opacity: 0.9 }}>
                                    <span className="font-semibold">하이라이트:</span> {cp.highlighted_text}
                                  </div>
                                )}
                                <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                  <span className="font-semibold">체크포인트:</span> {cp.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 선생 댓글 표시 */}
                  {comments.length > 0 && (
                    <div className="mb-6 border-2 rounded-xl p-4" style={{ backgroundColor: '#CCD5DA', borderColor: '#CCD5DA' }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>선생님 댓글 ({comments.length}개)</div>
                      <div className="space-y-3">
                        {comments.map((comment: any) => {
                          const replies = commentReplies[comment.id] || [];
                          return (
                            <div key={comment.id} className="p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                  선생님 · {new Date(comment.created_at).toLocaleDateString("ko-KR")}
                                </div>
                                <button
                                  onClick={() => setShowReplyInput(prev => ({
                                    ...prev,
                                    [comment.id]: !prev[comment.id]
                                  }))}
                                  className="text-xs transition-colors"
                                  style={{ color: '#13181B' }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  {showReplyInput[comment.id] ? "취소" : "답글 달기"}
                                </button>
                              </div>
                              <div className="text-sm whitespace-pre-wrap mb-2" style={{ color: '#13181B' }}>{comment.comment_text}</div>
                              
                              {/* 답글 입력 */}
                              {showReplyInput[comment.id] && (
                                <div className="mt-3 pt-3 border-t-2" style={{ borderTopColor: '#CCD5DA' }}>
                                  <textarea
                                    value={replyTexts[comment.id] || ""}
                                    onChange={(e) => {
                                      setReplyTexts(prev => ({
                                        ...prev,
                                        [comment.id]: e.target.value
                                      }));
                                    }}
                                    placeholder="답글을 입력하세요..."
                                    className="w-full text-sm p-2 border-2 rounded mb-2 transition-all"
                                    style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.borderColor = '#13181B';
                                      e.currentTarget.style.outline = 'none';
                                    }}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                                    rows={2}
                                  />
                                  <style jsx>{`
                                    textarea::placeholder {
                                      color: #13181B;
                                      opacity: 0.5;
                                    }
                                  `}</style>
                                  <button
                                    onClick={async () => {
                                      if (!userId || !submission) return;
                                      const replyText = replyTexts[comment.id];
                                      if (!replyText || !replyText.trim()) {
                                        alert("답글을 입력해주세요.");
                                        return;
                                      }

                                      const { error } = await supabase
                                        .from("teacher_comments")
                                        .insert({
                                          student_submission_id: submission.id,
                                          parent_comment_id: comment.id,
                                          student_id: userId,
                                          comment_text: replyText.trim(),
                                        });

                                      if (error) {
                                        alert("답글 작성에 실패했습니다: " + error.message);
                                      } else {
                                        alert("답글이 작성되었습니다.");
                                        setReplyTexts(prev => ({
                                          ...prev,
                                          [comment.id]: ""
                                        }));
                                        setShowReplyInput(prev => ({
                                          ...prev,
                                          [comment.id]: false
                                        }));
                                        
                                        // 답글 다시 로드
                                        const { data: repliesData } = await supabase
                                          .from("teacher_comments")
                                          .select("*")
                                          .eq("parent_comment_id", comment.id)
                                          .order("created_at", { ascending: true });
                                        
                                        if (repliesData) {
                                          setCommentReplies(prev => ({
                                            ...prev,
                                            [comment.id]: repliesData
                                          }));
                                        }
                                      }
                                    }}
                                    className="px-3 py-1.5 text-sm rounded transition-all"
                                    style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                  >
                                    답글 작성
                                  </button>
                                </div>
                              )}

                              {/* 답글 목록 */}
                              {replies.length > 0 && (
                                <div className="mt-3 pt-3 border-t-2 space-y-2" style={{ borderTopColor: '#CCD5DA' }}>
                                  {replies.map((reply: any) => (
                                    <div key={reply.id} className="pl-3 border-l-4 rounded p-2" style={{ borderLeftColor: '#CCD5DA', backgroundColor: '#CCD5DA' }}>
                                      <div className="text-xs mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                                        학생 · {new Date(reply.created_at).toLocaleDateString("ko-KR")}
                                      </div>
                                      <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>{reply.comment_text}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 체크포인트 작성 (제출 전에만 수정 가능) */}
                  {canEdit ? (
                    <div className="flex flex-col gap-4">
                      {/* 체크포인트 없음 옵션 */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id={`no-checkpoint-${paragraphNum}`}
                          checked={!checkpointData.hasCheckpoint}
                          onChange={(e) =>
                            updateField(paragraphNum, "hasCheckpoint", !e.target.checked)
                          }
                          className="w-4 h-4"
                          style={{ accentColor: '#13181B' }}
                        />
                        <label htmlFor={`no-checkpoint-${paragraphNum}`} className="text-sm" style={{ color: '#13181B' }}>
                          체크포인트 없음
                        </label>
                      </div>

                      {checkpointData.hasCheckpoint && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                              이 문단의 체크포인트 *
                            </label>
                            <textarea
                              className="w-full px-4 py-3 border-2 rounded-xl transition-all min-h-[100px]"
                              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = categoryColor;
                                e.currentTarget.style.outline = 'none';
                              }}
                              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                              placeholder="이 문단에서 확인해야 할 포인트를 작성하세요"
                              value={checkpointData.checkpoint}
                              onChange={(e) =>
                                updateField(paragraphNum, "checkpoint", e.target.value)
                              }
                            />
                            <style jsx>{`
                              textarea::placeholder {
                                color: #13181B;
                                opacity: 0.5;
                              }
                            `}</style>
                          </div>

                          {/* 모름 체크박스 */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`dont-know-${paragraphNum}`}
                              checked={checkpointData.dontKnow}
                              onChange={(e) =>
                                updateField(paragraphNum, "dontKnow", e.target.checked)
                              }
                              className="w-4 h-4"
                              style={{ accentColor: '#13181B' }}
                            />
                            <label htmlFor={`dont-know-${paragraphNum}`} className="text-sm font-medium" style={{ color: '#13181B' }}>
                              모름
                            </label>
                          </div>

                          {/* 모름일 때만 이유 입력 */}
                          {checkpointData.dontKnow && (
                            <div>
                              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                                이유 * <span style={{ color: '#13181B' }}>(필수)</span>
                              </label>
                              <textarea
                                className="w-full px-4 py-3 border-2 rounded-xl transition-all min-h-[100px]"
                                style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = categoryColor;
                                  e.currentTarget.style.outline = 'none';
                                }}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                                placeholder="모른 이유를 작성하세요"
                                value={checkpointData.reason}
                                onChange={(e) =>
                                  updateField(paragraphNum, "reason", e.target.value)
                                }
                                required
                              />
                              <style jsx>{`
                                textarea::placeholder {
                                  color: #13181B;
                                  opacity: 0.5;
                                }
                              `}</style>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border-2 rounded-xl" style={{ backgroundColor: '#CCD5DA', borderColor: '#CCD5DA' }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>내가 작성한 체크포인트:</div>
                      <div className="whitespace-pre-wrap p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}>
                        {checkpointData.checkpoint || checkpointData.reason || "(체크포인트 없음)"}
                      </div>
                    </div>
                  )}

                  {/* 학생 자기 피드백 (제출 후 + 선생님이 체크포인트를 남긴 경우에만 표시) */}
                  {hasSubmitted && teacherCheckpoints[paragraphNum] && teacherCheckpoints[paragraphNum].length > 0 && (
                    <div className="mt-6 border-2 rounded-xl p-4" style={{ backgroundColor: '#CCD5DA', borderColor: '#CCD5DA' }}>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
                        선생님 체크포인트를 보고 본인 답에 대한 피드백 작성
                      </h4>
                      {hasSavedFeedback ? (
                        <div className="p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>{studentFeedback.text}</div>
                        </div>
                      ) : (
                        <>
                          <textarea
                            className="w-full px-4 py-3 border-2 rounded-xl transition-all min-h-[120px]"
                            style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = categoryColor;
                              e.currentTarget.style.outline = 'none';
                            }}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                            placeholder="선생님 체크포인트를 확인하고, 본인이 놓친 부분이나 개선할 점을 작성해주세요."
                            value={studentFeedbacks[submission?.id || '']?.text || ''}
                            onChange={(e) => {
                              if (submission) {
                                setStudentFeedbacks(prev => ({
                                  ...prev,
                                  [submission.id]: { text: e.target.value }
                                }));
                              }
                            }}
                          />
                          <style jsx>{`
                            textarea::placeholder {
                              color: #13181B;
                              opacity: 0.5;
                            }
                          `}</style>
                          {submission && (
                            <button
                              onClick={async () => {
                                if (!userId || !submission) return;
                                const feedbackText = studentFeedbacks[submission.id]?.text;
                                if (!feedbackText || !feedbackText.trim()) {
                                  alert("피드백을 입력해주세요.");
                                  return;
                                }

                                const { error } = await supabase
                                  .from("student_feedback")
                                  .upsert({
                                    student_submission_id: submission.id,
                                    student_id: userId,
                                    feedback_text: feedbackText.trim(),
                                  }, {
                                    onConflict: "student_submission_id"
                                  });

                                if (error) {
                                  alert("피드백 저장에 실패했습니다.");
                                } else {
                                  alert("피드백이 저장되었습니다.");
                                  // 피드백 다시 로드
                                  const { data: feedbackData } = await supabase
                                    .from("student_feedback")
                                    .select("*")
                                    .eq("student_submission_id", submission.id)
                                    .single();
                                  
                                  if (feedbackData) {
                                    setStudentFeedbacks(prev => ({
                                      ...prev,
                                      [submission.id]: {
                                        text: feedbackData.feedback_text,
                                        id: feedbackData.id,
                                      }
                                    }));
                                  }
                                }
                              }}
                              className="mt-3 px-4 py-2 text-sm rounded transition-all"
                              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              피드백 저장
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {(() => {
              // 모든 문단에 대해 selectedAttempt가 이미 제출되었는지 확인
              const allParagraphsSubmitted = paragraphs.length > 0 && paragraphs.every((_, index) => {
                const paragraphNum = index + 1;
                const completedAttemptsForPara = attemptStatus[paragraphNum] || [];
                return completedAttemptsForPara.includes(selectedAttempt);
              });
              
              // 제출할 수 있는 문단이 있는지 확인
              const hasSubmittableParagraphs = paragraphs.some((_, index) => {
                const paragraphNum = index + 1;
                const completedAttemptsForPara = attemptStatus[paragraphNum] || [];
                return !completedAttemptsForPara.includes(selectedAttempt);
              });
              
              const isDisabled = allParagraphsSubmitted || !hasSubmittableParagraphs;
              
              return (
            <button
                  className="w-full px-6 py-3 rounded-xl font-semibold shadow-lg transform transition-all duration-200 mt-4"
                  style={isDisabled ? {
                    backgroundColor: '#CCD5DA',
                    color: '#13181B',
                    opacity: 0.5,
                    cursor: 'not-allowed'
                  } : {
                    backgroundColor: '#13181B',
                    color: '#F0EEEB'
                  }}
                  onClick={isDisabled ? undefined : submitAll}
                  disabled={isDisabled}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {allParagraphsSubmitted ? `${selectedAttempt}차 이미 제출 완료` : '제출하기'}
            </button>
              );
            })()}
          </>
        )}
      </div>

      </div>
    </div>
  );
}

// 문단에 하이라이트를 적용하는 컴포넌트
function ParagraphWithHighlights({
  paragraph,
  checkpoints,
  onCheckpointClick,
}: {
  paragraph: string;
  checkpoints: any[];
  onCheckpointClick: (cp: any) => void;
}) {
  // 선생님 페이지처럼 줄바꿈을 공백으로 바꿔서 한 줄로 표시
  const normalizedParagraph = paragraph.trim().replace(/\n/g, " ");

  if (checkpoints.length === 0) {
    return <div className="text-sm" style={{ color: '#13181B' }}>{normalizedParagraph}</div>;
  }

  // 하이라이트 정보를 정렬 (start 위치 기준)
  const sortedCheckpoints = [...checkpoints].sort((a, b) => {
    const aStart = a.highlight_start ?? 0;
    const bStart = b.highlight_start ?? 0;
    return aStart - bStart;
  });

  // 텍스트를 하이라이트와 함께 렌더링
  let lastIndex = 0;
  const elements: React.ReactElement[] = [];

  sortedCheckpoints.forEach((cp, idx) => {
    const start = cp.highlight_start ?? 0;
    const end = cp.highlight_end ?? start + (cp.highlighted_text?.length || 0);

    // 하이라이트 전 텍스트
    if (start > lastIndex) {
      elements.push(
        <span key={`text-${idx}-before`} className="text-sm" style={{ color: '#13181B' }}>
          {normalizedParagraph.substring(lastIndex, start)}
        </span>
      );
    }

    // 하이라이트된 텍스트
    const highlightedText = normalizedParagraph.substring(start, end);
    if (highlightedText) {
      // 영어는 거시/미시 없이 단순 하이라이트만
      elements.push(
        <span
          key={`highlight-${idx}`}
          className="cursor-pointer transition-colors px-0.5 rounded text-sm"
          style={{ 
            backgroundColor: '#FFFBE6', 
            color: '#13181B',
            borderBottom: '2px solid #FFFBE6'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={() => onCheckpointClick(cp)}
          title="체크포인트 - 클릭하여 보기"
        >
          {highlightedText}
        </span>
      );
    }

    lastIndex = Math.max(lastIndex, end);
  });

  // 마지막 하이라이트 이후 텍스트
  if (lastIndex < normalizedParagraph.length) {
    elements.push(
      <span key="text-after" className="text-sm text-gray-700">
        {normalizedParagraph.substring(lastIndex)}
      </span>
    );
  }

  return <div className="text-sm text-gray-700">{elements}</div>;
}

