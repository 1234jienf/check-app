"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import React from "react";

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

      // 선생이 추가한 체크포인트 로드
      if (passageId) {
        const { data: teacherCheckpointsData } = await supabase
          .from("checkpoints")
          .select("*")
          .eq("passage_id", passageId)
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

      // 기존 학생 체크포인트 로드
      if (userId && passageId) {
        const { data: existingCheckpointsData } = await supabase
          .from("student_checkpoint_record")
          .select("*")
          .eq("user_id", userId)
          .eq("passage_id", passageId);

        if (existingCheckpointsData) {
          setExistingCheckpoints(existingCheckpointsData);
          
          const checkpointMap: Record<
            number,
            { checkpoint: string; hasCheckpoint: boolean; dontKnow: boolean; reason: string }
          > = {};
          existingCheckpointsData.forEach((cp: any) => {
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

          // 선생 댓글 로드
          const submissionIds = existingCheckpointsData.map((c: any) => c.id);
          if (submissionIds.length > 0) {
            const { data: commentsData } = await supabase
              .from("teacher_comments")
              .select("*")
              .in("student_submission_id", submissionIds)
              .order("created_at", { ascending: false });

            if (commentsData) {
              const commentsMap: Record<string, any[]> = {};
              commentsData.forEach((comment: any) => {
                if (!commentsMap[comment.student_submission_id]) {
                  commentsMap[comment.student_submission_id] = [];
                }
                commentsMap[comment.student_submission_id].push(comment);
              });
              setTeacherComments(commentsMap);
            }
          }
        }
      }
    };

    if (passageId) loadData();
  }, [passageId, userId]);

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

      // 체크포인트 없음이면 빈 값으로 저장
      if (!data.hasCheckpoint) {
        // paragraph_index 또는 paragraph 컬럼명 확인
        const upsertData: any = {
          passage_id: passageId,
          user_id: userId,
          checkpoint_text: "", // 빈 값
        };
        upsertData.paragraph = paragraph;
        
        const { error } = await supabase.from("student_checkpoint_record").upsert(
          upsertData,
          { onConflict: "passage_id,user_id,paragraph" }
        );
        
        if (error) {
          console.error(`문단 ${paragraph} 제출 오류:`, error);
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
          checkpoint_text: data.checkpoint.trim() || "", // 체크포인트가 비어있어도 저장
          reason: data.reason.trim(),
        };

        const { error } = await supabase.from("student_checkpoint_record").upsert(
          upsertData,
          { onConflict: "passage_id,user_id,paragraph" }
        );

        if (error) {
          console.error(`문단 ${paragraph} 제출 오류:`, error);
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
        checkpoint_text: data.checkpoint,
      };

      const { error } = await supabase.from("student_checkpoint_record").upsert(
        upsertData,
        { onConflict: "passage_id,user_id,paragraph" }
      );

      if (error) {
        console.error(`문단 ${paragraph} 제출 오류:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      alert(`제출 중 오류가 발생했습니다. 성공: ${successCount}개, 실패: ${errorCount}개`);
    } else if (successCount > 0) {
      alert(`제출이 완료되었습니다! (${successCount}개 문단)`);
    } else {
      alert("제출할 내용이 없습니다. 체크포인트를 작성해주세요.");
    }
  };

  if (!passage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={getCategoryPath(passage.category)}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 목록으로 돌아가기
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {passage.title}
          </h1>
        </div>

        {/* 문단별 체크포인트 작성 */}
        <div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">문단별 Checkpoint</h2>
          <p className="text-sm text-gray-600 mb-6">
            각 문단을 읽고, 해당 문단에서 확인해야 할 체크포인트를 작성해주세요.
          </p>

        {paragraphs.length === 0 ? (
          <p className="text-gray-500">지문이 등록되지 않았습니다.</p>
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
                return paraNum === paragraphNum;
              }) : null;
              const comments = submission ? teacherComments[submission.id] || [] : [];

              return (
                <div key={index} className="mb-8 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold mb-4 pb-3 border-b-2 border-gray-200 text-gray-900">
                    {paragraphNum}문단
                  </h3>

                  {/* 문단 내용 */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-400 relative">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <ParagraphWithHighlights
                          paragraph={paragraph}
                          checkpoints={teacherCheckpoints[paragraphNum] || []}
                          onCheckpointClick={(cp) => setSelectedCheckpoint(cp)}
                        />
                      </div>
                      {/* 문단 옆 체크포인트 목록 */}
                      {teacherCheckpoints[paragraphNum] && teacherCheckpoints[paragraphNum].length > 0 && (
                        <div className="flex-shrink-0">
                          <div className="flex flex-col gap-2">
                            {teacherCheckpoints[paragraphNum].map((cp: any, idx: number) => (
                              <button
                                key={cp.id}
                                onClick={() => setSelectedCheckpoint(cp)}
                                className="px-3 py-1.5 bg-yellow-100 border border-yellow-300 rounded-lg text-xs font-medium text-yellow-800 hover:bg-yellow-200 transition-colors cursor-pointer"
                                title={cp.text}
                              >
                                체크 {idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 선생 댓글 표시 */}
                  {comments.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="text-sm font-semibold text-blue-700 mb-2">선생님 댓글 ({comments.length}개)</div>
                      <div className="space-y-2">
                        {comments.map((comment: any) => (
                          <div key={comment.id} className="p-3 bg-white rounded-lg border border-blue-100">
                            <div className="text-xs text-gray-500 mb-1">
                              {new Date(comment.created_at).toLocaleDateString("ko-KR")}
                            </div>
                            <div className="text-sm text-gray-800 whitespace-pre-wrap">{comment.comment_text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 체크포인트 작성 */}
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
                      />
                      <label htmlFor={`no-checkpoint-${paragraphNum}`} className="text-sm">
                        체크포인트 없음
                      </label>
                    </div>

                    {checkpointData.hasCheckpoint && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            이 문단의 체크포인트 *
                          </label>
                          <textarea
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px]"
                            placeholder="이 문단에서 확인해야 할 포인트를 작성하세요"
                            value={checkpointData.checkpoint}
                            onChange={(e) =>
                              updateField(paragraphNum, "checkpoint", e.target.value)
                            }
                          />
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
                          />
                          <label htmlFor={`dont-know-${paragraphNum}`} className="text-sm font-medium">
                            모름
                          </label>
                        </div>

                        {/* 모름일 때만 이유 입력 */}
                        {checkpointData.dontKnow && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              이유 * <span className="text-red-500">(필수)</span>
                            </label>
                            <textarea
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px]"
                              placeholder="모른 이유를 작성하세요"
                              value={checkpointData.reason}
                              onChange={(e) =>
                                updateField(paragraphNum, "reason", e.target.value)
                              }
                              required
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 mt-4"
              onClick={submitAll}
            >
              제출하기
            </button>
          </>
        )}
      </div>

      {/* 체크포인트 상세 모달 */}
      {selectedCheckpoint && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedCheckpoint(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">선생님 체크포인트</h3>
              <button
                onClick={() => setSelectedCheckpoint(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {selectedCheckpoint.highlighted_text && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xs font-semibold text-yellow-700 mb-1">하이라이트된 텍스트:</div>
                  <div className="text-sm text-gray-800">{selectedCheckpoint.highlighted_text}</div>
                </div>
              )}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-blue-700 mb-1">체크포인트:</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{selectedCheckpoint.text}</div>
              </div>
            </div>
            <button
              onClick={() => setSelectedCheckpoint(null)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
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
  if (checkpoints.length === 0) {
    return <div className="whitespace-pre-wrap text-gray-700">{paragraph}</div>;
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
        <span key={`text-${idx}-before`} className="text-gray-700">
          {paragraph.substring(lastIndex, start)}
        </span>
      );
    }

    // 하이라이트된 텍스트
    const highlightedText = paragraph.substring(start, end);
    if (highlightedText) {
      elements.push(
        <span
          key={`highlight-${idx}`}
          className="bg-yellow-300 text-gray-900 cursor-pointer hover:bg-yellow-400 transition-colors px-0.5 rounded"
          onClick={() => onCheckpointClick(cp)}
          title="클릭하여 체크포인트 보기"
        >
          {highlightedText}
        </span>
      );
    }

    lastIndex = Math.max(lastIndex, end);
  });

  // 마지막 하이라이트 이후 텍스트
  if (lastIndex < paragraph.length) {
    elements.push(
      <span key="text-after" className="text-gray-700">
        {paragraph.substring(lastIndex)}
      </span>
    );
  }

  return <div className="whitespace-pre-wrap">{elements}</div>;
}

