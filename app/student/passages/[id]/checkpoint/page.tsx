"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import React from "react";

// 체크포인트 타입 정의
type CheckpointItem = {
  id?: string;
  checkpoint: string;
  highlighted_text: string;
  highlight_start: number;
  highlight_end: number;
  category: string;
  dontKnow: boolean;
  reason: string;
};

export default function StudentCheckpointPage() {
  const { id: passageId } = useParams();
  const [passage, setPassage] = useState<any>(null);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  // 문단별 체크포인트 리스트로 변경
  const [studentCheckpoints, setStudentCheckpoints] = useState<
    Record<number, CheckpointItem[]>
  >({});
  const [teacherCheckpoints, setTeacherCheckpoints] = useState<Record<number, any[]>>({});
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any | null>(null);
  const [teacherComments, setTeacherComments] = useState<Record<string, any[]>>({});
  const [existingCheckpoints, setExistingCheckpoints] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<number>(1);
  const [attemptStatus, setAttemptStatus] = useState<Record<number, number[]>>({});
  const [studentFeedbacks, setStudentFeedbacks] = useState<Record<string, { text: string; id?: string }>>({});
  const [expandedTeacherCheckpoints, setExpandedTeacherCheckpoints] = useState<Record<number, boolean>>({});
  const [commentReplies, setCommentReplies] = useState<Record<string, any[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [showReplyInput, setShowReplyInput] = useState<Record<string, boolean>>({});
  
  // 체크포인트 입력 관련 상태
  const [newCheckpointText, setNewCheckpointText] = useState<Record<number, string>>({});
  const [newCheckpointCategory, setNewCheckpointCategory] = useState<Record<number, string>>({});
  
  // 체크포인트 없음 및 모름 상태
  const [hasNoCheckpoint, setHasNoCheckpoint] = useState<Record<number, boolean>>({});
  const [dontKnow, setDontKnow] = useState<Record<number, boolean>>({});
  const [dontKnowReason, setDontKnowReason] = useState<Record<number, string>>({});

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
      // 지문 로드
      const { data: passageData } = await supabase
        .from("passages")
        .select("*")
        .eq("id", passageId)
        .single();

      setPassage(passageData);

      // 지문을 문단별로 나누기
      if (passageData?.content) {
        const content = passageData.content;
        let paragraphs: string[] = [];

        // 1차: 빈 줄(2개 이상의 연속된 줄바꿈)로 문단 구분
        const splitByBlankLines = content.split(/\n\s*\n/);
        
        if (splitByBlankLines.length > 1) {
          paragraphs = splitByBlankLines
            .map((p: string) => p.trim())
            .filter((p: string) => p.length > 0);
        } else {
          const sentences = content
            .split(/([.!?]\s+|[.!?]\n+)/)
            .filter((s: string) => s.trim().length > 0);
          
          let currentParagraph = "";
          let sentenceCount = 0;
          
          sentences.forEach((sentence: string) => {
            const trimmed = sentence.trim();
            if (!trimmed) return;
            
            currentParagraph += (currentParagraph ? " " : "") + trimmed;
            sentenceCount++;
            
            if (sentenceCount >= 4 || trimmed.length > 200) {
              if (currentParagraph.trim()) {
                paragraphs.push(currentParagraph.trim());
              }
              currentParagraph = "";
              sentenceCount = 0;
            }
          });
          
          if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
          }
          
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
              // 중복 제거: 이미 포함되어 있지 않은 경우만 추가
              if (!attemptMap[paraNum].includes(cp.attempt_number)) {
                attemptMap[paraNum].push(cp.attempt_number);
              }
            }
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
          const checkpointMap: Record<number, CheckpointItem[]> = {};
          const noCheckpointMap: Record<number, boolean> = {};
          const dontKnowMap: Record<number, boolean> = {};
          const dontKnowReasonMap: Record<number, string> = {};
          
          existingCheckpointsData
            .filter((cp: any) => (cp.attempt_number || 1) === selectedAttempt)
            .forEach((cp: any) => {
              const paraNum = cp.paragraph || cp.paragraph_index;
              
              // 체크포인트 없음 확인 (checkpoint_text가 비어있고 reason도 없음)
              if (!cp.checkpoint_text || cp.checkpoint_text.trim() === "") {
                if (!cp.reason || cp.reason.trim() === "") {
                  noCheckpointMap[paraNum] = true;
                } else {
                  // 모름인 경우
                  dontKnowMap[paraNum] = true;
                  dontKnowReasonMap[paraNum] = cp.reason || "";
                }
              } else {
                // 일반 체크포인트
                if (!checkpointMap[paraNum]) {
                  checkpointMap[paraNum] = [];
                }
                checkpointMap[paraNum].push({
                  id: cp.id,
                  checkpoint: cp.checkpoint_text || "",
                  highlighted_text: cp.highlighted_text || "",
                  highlight_start: cp.highlight_start || 0,
                  highlight_end: cp.highlight_end || 0,
                  category: cp.category || "미시",
                  dontKnow: !!cp.reason,
                  reason: cp.reason || "",
                });
              }
            });
          setStudentCheckpoints(checkpointMap);
          setHasNoCheckpoint(noCheckpointMap);
          setDontKnow(dontKnowMap);
          setDontKnowReason(dontKnowReasonMap);

          // 선생 댓글 및 답글 로드
          const submissionIds = existingCheckpointsData.map((c: any) => c.id);
          if (submissionIds.length > 0) {
            const { data: commentsData } = await supabase
              .from("teacher_comments")
              .select("*")
              .in("student_submission_id", submissionIds)
              .order("created_at", { ascending: false });

            if (commentsData) {
              const commentsMap: Record<string, any[]> = {};
              const repliesMap: Record<string, any[]> = {};
              
              commentsData.forEach((comment: any) => {
                if (comment.parent_comment_id) {
                  if (!repliesMap[comment.parent_comment_id]) {
                    repliesMap[comment.parent_comment_id] = [];
                  }
                  repliesMap[comment.parent_comment_id].push(comment);
                } else {
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

  // 체크포인트 추가
  const handleAddCheckpoint = (paragraphNum: number) => {
    const checkpointText = newCheckpointText[paragraphNum] || "";
    const category = newCheckpointCategory[paragraphNum] || "미시";
    
    if (!checkpointText.trim()) {
      alert("체크포인트 내용을 입력해주세요.");
      return;
    }

    const newCheckpoint: CheckpointItem = {
      checkpoint: checkpointText.trim(),
      highlighted_text: "",
      highlight_start: 0,
      highlight_end: 0,
      category,
      dontKnow: false,
      reason: "",
    };

    setStudentCheckpoints(prev => ({
      ...prev,
      [paragraphNum]: [...(prev[paragraphNum] || []), newCheckpoint]
    }));

    // 입력 필드 초기화
    setNewCheckpointText(prev => {
      const newState = { ...prev };
      delete newState[paragraphNum];
      return newState;
    });
    setNewCheckpointCategory(prev => {
      const newState = { ...prev };
      delete newState[paragraphNum];
      return newState;
    });
  };

  // 체크포인트 삭제
  const handleDeleteCheckpoint = (paragraphNum: number, index: number) => {
    setStudentCheckpoints(prev => {
      const checkpoints = prev[paragraphNum] || [];
      return {
        ...prev,
        [paragraphNum]: checkpoints.filter((_, i) => i !== index)
      };
    });
  };

  // 4) 제출 버튼 → student_checkpoint_record 테이블에 저장
  const submitAll = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!passageId) {
      alert("지문 정보를 불러올 수 없습니다.");
      return;
    }

    const isKorean = !passage?.subject || passage.subject === "korean" || passage.subject === null;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = i + 1;
      const checkpoints = studentCheckpoints[paragraph] || [];

      // attempt_number 확인 및 검증
      const completedAttempts = attemptStatus[paragraph] || [];
      if (completedAttempts.length >= 3 && !completedAttempts.includes(selectedAttempt)) {
        alert(`${paragraph}문단: 이미 3차까지 모두 제출하셨습니다.`);
        errorCount++;
        continue;
      } else if (selectedAttempt > completedAttempts.length + 1) {
        alert(`${paragraph}문단: ${completedAttempts.length + 1}차를 먼저 제출해주세요.`);
        errorCount++;
        continue;
      }

      // 기존 체크포인트 삭제 (해당 attempt_number의)
      const existingForPara = existingCheckpoints.filter((cp: any) => {
        const paraNum = cp.paragraph || cp.paragraph_index;
        return paraNum === paragraph && (cp.attempt_number || 1) === selectedAttempt;
      });

      for (const existing of existingForPara) {
        const { error } = await supabase
          .from("student_checkpoint_record")
          .delete()
          .eq("id", existing.id);
        
        if (error) {
          console.error("기존 체크포인트 삭제 실패:", error);
        }
      }

      // 체크포인트 없음 처리
      if (hasNoCheckpoint[paragraph]) {
        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          paragraph: paragraph,
          attempt_number: selectedAttempt,
          checkpoint_text: "",
          category: null,
          reason: null,
        };

        const { error } = await supabase.from("student_checkpoint_record").insert(upsertData);

        if (error) {
          console.error("체크포인트 없음 저장 실패:", error);
          errorCount++;
        } else {
          successCount++;
        }
        continue;
      }

      // 모름 처리
      if (dontKnow[paragraph]) {
        const reason = dontKnowReason[paragraph] || "";
        if (!reason.trim()) {
          alert(`${paragraph}문단: 모름을 선택했으면 이유를 작성해주세요.`);
          errorCount++;
          continue;
        }

        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          paragraph: paragraph,
          attempt_number: selectedAttempt,
          checkpoint_text: "",
          category: null,
          reason: reason.trim(),
        };

        const { error } = await supabase.from("student_checkpoint_record").insert(upsertData);

        if (error) {
          console.error("모름 저장 실패:", error);
          errorCount++;
        } else {
          successCount++;
        }
        continue;
      }

      // 체크포인트가 없으면 스킵
      if (checkpoints.length === 0) {
        continue;
      }

      // 각 체크포인트 저장
      for (const checkpoint of checkpoints) {
        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          paragraph: paragraph,
          attempt_number: selectedAttempt,
          checkpoint_text: checkpoint.checkpoint,
          highlighted_text: null,
          highlight_start: null,
          highlight_end: null,
          category: isKorean ? checkpoint.category : null,
          reason: checkpoint.dontKnow ? checkpoint.reason : null,
        };

        const { error } = await supabase.from("student_checkpoint_record").insert(upsertData);

        if (error) {
          console.error("체크포인트 저장 실패:", error);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    if (errorCount > 0) {
      alert(`제출 중 오류가 발생했습니다. 성공: ${successCount}개, 실패: ${errorCount}개`);
    } else if (successCount > 0) {
      alert(`${selectedAttempt}차 제출이 완료되었습니다! (${successCount}개 체크포인트)`);
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

  const getCategoryPath = (category: string) => {
    if (category === "EBS") return "/student/passages/ebs";
    if (category === "기출") return "/student/passages/gichul";
    if (category === "LEET") return "/student/passages/leet";
    if (category === "기타") return "/student/passages/other";
    return "/student";
  };

  const getCategoryColor = (category: string) => {
    return '#13181B';
  };

  const categoryColor = getCategoryColor(passage?.category || "");
  const isKorean = !passage?.subject || passage.subject === "korean" || passage.subject === null;

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
          {passage.difficulty && (
            <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.9 }}>난이도 : {passage.difficulty}</p>
          )}
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
                
                let canSelect = false;
                if (attempt === 1) {
                  canSelect = true;
                } else if (attempt === 2) {
                  const hasCompleted1 = Object.values(attemptStatus).some((attempts) => 
                    attempts.includes(1)
                  );
                  canSelect = hasCompleted1;
                } else if (attempt === 3) {
                  const hasCompleted2 = Object.values(attemptStatus).some((attempts) => 
                    attempts.includes(2)
                  );
                  canSelect = hasCompleted2;
                }
                
                return (
                  <button
                    key={attempt}
                    onClick={() => {
                      if (!canSelect) {
                        if (attempt === 2) {
                          alert("1차를 먼저 완료해주세요.");
                        } else if (attempt === 3) {
                          alert("2차를 먼저 완료해주세요.");
                        }
                        return;
                      }
                      setSelectedAttempt(attempt);
                      // 선택된 attempt에 맞는 체크포인트 로드
                      const checkpointMap: Record<number, CheckpointItem[]> = {};
                      existingCheckpoints
                        .filter((cp: any) => (cp.attempt_number || 1) === attempt)
                        .forEach((cp: any) => {
                          const paraNum = cp.paragraph || cp.paragraph_index;
                          if (!checkpointMap[paraNum]) {
                            checkpointMap[paraNum] = [];
                          }
                          checkpointMap[paraNum].push({
                            id: cp.id,
                            checkpoint: cp.checkpoint_text || "",
                            highlighted_text: cp.highlighted_text || "",
                            highlight_start: cp.highlight_start || 0,
                            highlight_end: cp.highlight_end || 0,
                            category: cp.category || "미시",
                            dontKnow: !!cp.reason,
                            reason: cp.reason || "",
                          });
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
                    disabled={!canSelect}
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
            문단 내에서 텍스트를 선택하고, 해당 부분에 대한 체크포인트를 작성해주세요. 여러 개의 체크포인트를 작성할 수 있습니다.
          </p>

          {paragraphs.length === 0 ? (
            <p style={{ color: '#13181B', opacity: 0.7 }}>지문이 등록되지 않았습니다.</p>
          ) : (
            <>
              {paragraphs.map((paragraph, index) => {
                const paragraphNum = index + 1;
                const checkpoints = studentCheckpoints[paragraphNum] || [];
                const normalizedParagraph = paragraph.trim().replace(/\n/g, " ");

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
                          {completedAttemptsForPara.map((attempt, idx) => (
                            <span
                              key={`${paragraphNum}-${attempt}-${idx}`}
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
                      <div 
                        className="flex-1 w-full"
                        style={{ 
                          lineHeight: '1.6'
                        }}
                      >
                        <ParagraphWithHighlights
                          paragraph={paragraph}
                          checkpoints={hasSubmitted ? (teacherCheckpoints[paragraphNum] || []) : []}
                          studentCheckpoints={canEdit ? checkpoints : []}
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
                              const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#F0EEEB';
                              return (
                                <div key={cp.id} className="p-3 border-2 rounded-lg" style={{ 
                                  backgroundColor: categoryBg, 
                                  borderColor: '#CCD5DA',
                                  borderLeft: `4px solid ${cp.category === "거시" ? '#13181B' : cp.category === "미시" ? '#13181B' : 'transparent'}`
                                }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {cp.category && (
                                      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                        backgroundColor: cp.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                        color: '#13181B'
                                      }}>
                                        {cp.category}
                                      </span>
                                    )}
                                  </div>
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
                            checked={hasNoCheckpoint[paragraphNum] || false}
                            onChange={(e) => {
                              setHasNoCheckpoint(prev => ({
                                ...prev,
                                [paragraphNum]: e.target.checked
                              }));
                              // 체크포인트 없음을 선택하면 모름과 체크포인트 초기화
                              if (e.target.checked) {
                                setDontKnow(prev => ({
                                  ...prev,
                                  [paragraphNum]: false
                                }));
                                setDontKnowReason(prev => {
                                  const newState = { ...prev };
                                  delete newState[paragraphNum];
                                  return newState;
                                });
                                setStudentCheckpoints(prev => {
                                  const newState = { ...prev };
                                  delete newState[paragraphNum];
                                  return newState;
                                });
                              }
                            }}
                            className="w-4 h-4"
                            style={{ accentColor: '#13181B' }}
                          />
                          <label htmlFor={`no-checkpoint-${paragraphNum}`} className="text-sm" style={{ color: '#13181B' }}>
                            체크포인트 없음
                          </label>
                        </div>

                        {/* 모름 옵션 */}
                        {!hasNoCheckpoint[paragraphNum] && (
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id={`dont-know-${paragraphNum}`}
                              checked={dontKnow[paragraphNum] || false}
                              onChange={(e) => {
                                setDontKnow(prev => ({
                                  ...prev,
                                  [paragraphNum]: e.target.checked
                                }));
                                // 모름을 선택하면 체크포인트 초기화
                                if (e.target.checked) {
                                  setStudentCheckpoints(prev => {
                                    const newState = { ...prev };
                                    delete newState[paragraphNum];
                                    return newState;
                                  });
                                }
                              }}
                              className="w-4 h-4"
                              style={{ accentColor: '#13181B' }}
                            />
                            <label htmlFor={`dont-know-${paragraphNum}`} className="text-sm font-medium" style={{ color: '#13181B' }}>
                              모름
                            </label>
                          </div>
                        )}

                        {/* 모름일 때만 이유 입력 */}
                        {dontKnow[paragraphNum] && (
                          <div className="mb-4">
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
                              value={dontKnowReason[paragraphNum] || ""}
                              onChange={(e) =>
                                setDontKnowReason(prev => ({
                                  ...prev,
                                  [paragraphNum]: e.target.value
                                }))
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

                        {/* 텍스트 선택 및 체크포인트 추가 UI */}
                        {!hasNoCheckpoint[paragraphNum] && !dontKnow[paragraphNum] && (
                        <div className="border-2 rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA' }}>
                          <h4 className="text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
                            체크포인트 추가
                          </h4>

                          <div className="mb-3">
                            <label className="block text-xs font-semibold mb-2" style={{ color: '#13181B' }}>
                              체크포인트 내용 *
                            </label>
                            <textarea
                              value={newCheckpointText[paragraphNum] || ""}
                              onChange={(e) => setNewCheckpointText(prev => ({
                                ...prev,
                                [paragraphNum]: e.target.value
                              }))}
                              placeholder="체크포인트 내용을 입력하세요..."
                              className="w-full text-sm p-2 border-2 rounded transition-all"
                              style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#13181B';
                                e.currentTarget.style.outline = 'none';
                              }}
                              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                              rows={3}
                            />
                            <style jsx>{`
                              textarea::placeholder {
                                color: #13181B;
                                opacity: 0.5;
                              }
                            `}</style>
                          </div>

                          {isKorean && (
                            <div className="mb-3">
                              <label className="block text-xs font-semibold mb-2" style={{ color: '#13181B' }}>
                                카테고리 선택
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setNewCheckpointCategory(prev => ({
                                    ...prev,
                                    [paragraphNum]: "거시"
                                  }))}
                                  className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all"
                                  style={{
                                    backgroundColor: (newCheckpointCategory[paragraphNum] || "미시") === "거시" ? '#E8F0F8' : '#F0EEEB',
                                    border: '2px solid #CCD5DA',
                                    color: '#13181B'
                                  }}
                                >
                                  거시
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewCheckpointCategory(prev => ({
                                    ...prev,
                                    [paragraphNum]: "미시"
                                  }))}
                                  className="flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all"
                                  style={{
                                    backgroundColor: (newCheckpointCategory[paragraphNum] || "미시") === "미시" ? '#FFF5E8' : '#F0EEEB',
                                    border: '2px solid #CCD5DA',
                                    color: '#13181B'
                                  }}
                                >
                                  미시
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => handleAddCheckpoint(paragraphNum)}
                            className="w-full px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            체크포인트 추가
                          </button>
                        </div>
                        )}

                        {/* 작성된 체크포인트 목록 */}
                        {checkpoints.length > 0 && (
                          <div className="border-2 rounded-xl p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA' }}>
                            <h4 className="text-sm font-semibold mb-3" style={{ color: '#13181B' }}>
                              작성된 체크포인트 ({checkpoints.length}개)
                            </h4>
                            <div className="space-y-3">
                              {checkpoints.map((cp, idx) => {
                                const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#F0EEEB';
                                return (
                                  <div key={cp.id || `${paragraphNum}-${idx}-${cp.highlight_start}-${cp.highlight_end}`} className="p-3 border-2 rounded-lg relative" style={{ 
                                    backgroundColor: categoryBg, 
                                    borderColor: '#CCD5DA',
                                    borderLeft: `4px solid ${cp.category === "거시" ? '#13181B' : cp.category === "미시" ? '#13181B' : 'transparent'}`
                                  }}>
                                    <button
                                      onClick={() => handleDeleteCheckpoint(paragraphNum, idx)}
                                      className="absolute top-2 right-2 text-xs px-2 py-1 rounded transition-colors"
                                      style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                      삭제
                                    </button>
                                    <div className="flex items-center gap-2 mb-2">
                                      {cp.category && (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                          backgroundColor: cp.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                          color: '#13181B'
                                        }}>
                                          {cp.category}
                                        </span>
                                      )}
                                    </div>
                                    {cp.highlighted_text && (
                                      <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FFFFFF', color: '#13181B', opacity: 0.9 }}>
                                        <span className="font-semibold">하이라이트:</span> {cp.highlighted_text}
                                      </div>
                                    )}
                                    <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                      <span className="font-semibold">체크포인트:</span> {cp.checkpoint}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 border-2 rounded-xl" style={{ backgroundColor: '#CCD5DA', borderColor: '#CCD5DA' }}>
                        <div className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>내가 작성한 체크포인트:</div>
                        {hasNoCheckpoint[paragraphNum] ? (
                          <div className="whitespace-pre-wrap p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}>
                            (체크포인트 없음)
                          </div>
                        ) : dontKnow[paragraphNum] ? (
                          <div className="p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                            <div className="text-sm font-semibold mb-1" style={{ color: '#13181B' }}>모름</div>
                            <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                              이유: {dontKnowReason[paragraphNum] || ""}
                            </div>
                          </div>
                        ) : checkpoints.length > 0 ? (
                          <div className="space-y-2">
                            {checkpoints.map((cp, idx) => {
                              const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#F0EEEB';
                              return (
                                <div key={cp.id || `${paragraphNum}-${idx}-${cp.highlight_start}-${cp.highlight_end}`} className="p-3 border-2 rounded-lg" style={{ 
                                  backgroundColor: categoryBg, 
                                  borderColor: '#CCD5DA',
                                  borderLeft: `4px solid ${cp.category === "거시" ? '#13181B' : cp.category === "미시" ? '#13181B' : 'transparent'}`
                                }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {cp.category && (
                                      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                        backgroundColor: cp.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                        color: '#13181B'
                                      }}>
                                        {cp.category}
                                      </span>
                                    )}
                                  </div>
                                  {cp.highlighted_text && (
                                    <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FFFFFF', color: '#13181B', opacity: 0.9 }}>
                                      <span className="font-semibold">하이라이트:</span> {cp.highlighted_text}
                                    </div>
                                  )}
                                  <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                    {cp.checkpoint}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap p-3 border-2 rounded-lg" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}>
                            (체크포인트 없음)
                          </div>
                        )}
                      </div>
                    )}

                    {/* 학생 자기 피드백 */}
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
                const allParagraphsSubmitted = paragraphs.length > 0 && paragraphs.every((_, index) => {
                  const paragraphNum = index + 1;
                  const completedAttemptsForPara = attemptStatus[paragraphNum] || [];
                  return completedAttemptsForPara.includes(selectedAttempt);
                });
                
                const hasSubmittableParagraphs = paragraphs.some((_, index) => {
                  const paragraphNum = index + 1;
                  const checkpoints = studentCheckpoints[paragraphNum] || [];
                  return checkpoints.length > 0 || hasNoCheckpoint[paragraphNum] || dontKnow[paragraphNum];
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
  studentCheckpoints,
  onCheckpointClick,
}: {
  paragraph: string;
  checkpoints: any[];
  studentCheckpoints?: CheckpointItem[];
  onCheckpointClick: (cp: any) => void;
}) {
  const normalizedParagraph = paragraph.trim().replace(/\n/g, " ");

  // 선생님 체크포인트와 학생 체크포인트 합치기
  const allCheckpoints = [
    ...checkpoints.map((cp: any) => ({ ...cp, isTeacher: true })),
    ...(studentCheckpoints || []).map((cp: CheckpointItem) => ({ ...cp, isTeacher: false }))
  ];

  if (allCheckpoints.length === 0) {
    return <div className="text-sm" style={{ color: '#13181B' }}>{normalizedParagraph}</div>;
  }

  // 하이라이트 정보를 정렬 (start 위치 기준)
  const sortedCheckpoints = [...allCheckpoints].sort((a, b) => {
    const aStart = a.highlight_start ?? 0;
    const bStart = b.highlight_start ?? 0;
    return aStart - bStart;
  });

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
      const isTeacher = (cp as any).isTeacher;
      const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#FFFBE6';
      const categoryBorder = cp.category === "거시" ? '#D4E4F4' : cp.category === "미시" ? '#FFE5CC' : '#FFFBE6';
      
      elements.push(
        <span
          key={`highlight-${idx}`}
          className="cursor-pointer transition-colors px-0.5 rounded text-sm"
          style={{ 
            backgroundColor: categoryBg, 
            color: '#13181B',
            borderBottom: `2px solid ${categoryBorder}`,
            opacity: isTeacher ? 1 : 0.7
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = isTeacher ? '1' : '0.7';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={() => onCheckpointClick(cp)}
          title={`${cp.category || ''} 체크포인트 - 클릭하여 보기`}
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
      <span key="text-after" className="text-sm" style={{ color: '#13181B' }}>
        {normalizedParagraph.substring(lastIndex)}
      </span>
    );
  }

  return <div className="text-sm" style={{ color: '#13181B' }}>{elements}</div>;
}
