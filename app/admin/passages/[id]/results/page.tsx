"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

// 문단에 하이라이트를 표시하는 컴포넌트
const ParagraphWithHighlights = ({ paragraph, checkpoints }: { paragraph: string; checkpoints: any[] }) => {
  if (!checkpoints || checkpoints.length === 0) {
    return <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>{paragraph}</div>;
  }

  // 하이라이트 정보를 정렬 (시작 위치 기준)
  const sortedHighlights = [...checkpoints]
    .filter((cp: any) => cp.highlight_start !== null && cp.highlight_end !== null)
    .sort((a: any, b: any) => a.highlight_start - b.highlight_start);

  if (sortedHighlights.length === 0) {
    return <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>{paragraph}</div>;
  }

  // 하이라이트가 겹치지 않도록 처리
  const parts: Array<{ text: string; highlight: any | null }> = [];
  let currentIndex = 0;

  sortedHighlights.forEach((cp: any) => {
    const start = cp.highlight_start;
    const end = cp.highlight_end;

    // 하이라이트 전 텍스트
    if (start > currentIndex) {
      parts.push({
        text: paragraph.substring(currentIndex, start),
        highlight: null,
      });
    }

    // 하이라이트된 텍스트
    parts.push({
      text: paragraph.substring(start, end),
      highlight: cp,
    });

    currentIndex = Math.max(currentIndex, end);
  });

  // 마지막 하이라이트 이후 텍스트
  if (currentIndex < paragraph.length) {
    parts.push({
      text: paragraph.substring(currentIndex),
      highlight: null,
    });
  }

  return (
    <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B', lineHeight: '1.6' }}>
      {parts.map((part, idx) => {
        if (part.highlight) {
          const bgColor = part.highlight.category === "거시" ? '#E8F0F8' : part.highlight.category === "미시" ? '#FFF5E8' : '#F0EEEB';
          const borderColor = part.highlight.category === "거시" ? '#13181B' : part.highlight.category === "미시" ? '#13181B' : '#CCD5DA';
          return (
            <span
              key={idx}
              className="px-1 rounded"
              style={{
                backgroundColor: bgColor,
                borderBottom: `2px solid ${borderColor}`,
                fontWeight: '500',
              }}
              title={`${part.highlight.category || ''} 체크포인트`}
            >
              {part.text}
            </span>
          );
        }
        return <span key={idx}>{part.text}</span>;
      })}
    </div>
  );
};

export default function PassageResults() {
  const { id } = useParams();
  const [results, setResults] = useState<any[]>([]);
  const [passage, setPassage] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [studentFeedbacks, setStudentFeedbacks] = useState<Record<string, any>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // 지문 정보 가져오기
      const { data: passageData } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();
      
      setPassage(passageData);

      // student_checkpoint_record 테이블에서 학생 제출 확인
      const { data, error } = await supabase
        .from("student_checkpoint_record")
        .select("*, users(name, email)")
        .eq("passage_id", id);

      let finalData: any[] = [];
      
      if (error) {
        // users 테이블 조인 실패 시 직접 조회
        const { data: checkpointsData } = await supabase
          .from("student_checkpoint_record")
          .select("*")
          .eq("passage_id", id);
        
        if (checkpointsData) {
          finalData = checkpointsData;
          // users 테이블에서 이름 가져오기
          const userIds = [...new Set(checkpointsData.map((c: any) => c.user_id))];
          const { data: usersData } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);
          
          const usersMap = new Map(usersData?.map((u: any) => [u.id, u]) || []);
          const resultsWithUsers = checkpointsData.map((c: any) => ({
            ...c,
            users: usersMap.get(c.user_id) || { name: "이름 미등록", email: "" },
          }));
          setResults(resultsWithUsers);
        }
      } else {
        finalData = data || [];
        setResults(finalData);
      }

      // 댓글 로드
      if (finalData.length > 0) {
        const submissionIds = finalData.map((c: any) => c.id);
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
          setComments(commentsMap);
        }
      }

      // 학생 피드백 로드 (에러 무시)
      if (finalData.length > 0) {
        const submissionIds = finalData.map((c: any) => c.id);
        try {
          const { data: feedbacksData, error: feedbackError } = await supabase
            .from("student_feedback")
            .select("*")
            .in("student_submission_id", submissionIds);

          if (!feedbackError && feedbacksData) {
            const feedbacksMap: Record<string, any> = {};
            feedbacksData.forEach((feedback: any) => {
              feedbacksMap[feedback.student_submission_id] = feedback;
            });
            setStudentFeedbacks(feedbacksMap);
          }
        } catch (feedbackErr: any) {
          // student_feedback 테이블이 없거나 접근 권한이 없으면 무시
        }
      }
    };
    load();
  }, [id]);

  const getCategoryColor = (category: string) => {
    if (category === "EBS") return '#E8F0F8';
    if (category === "기출") return '#FFF5E8';
    if (category === "LEET") return '#FFF0ED';
    return '#E8E9EA';
  };

  const categoryColor = passage ? getCategoryColor(passage.category) : '#13181B';

  const byStudent = results.reduce((acc: any, row: any) => {
    const userId = row.user_id || row.student_id; // user_id 또는 student_id
    acc[userId] = acc[userId] || {
      name: row.users?.name || row.users?.email || "이름 미등록",
      student_id: userId,
      count: 0,
    };
    acc[userId].count++;
    return acc;
  }, {});

  // 선택한 학생의 체크포인트 가져오기
  const selectedStudentCheckpoints = selectedStudentId
    ? results.filter((r: any) => (r.user_id || r.student_id) === selectedStudentId)
    : [];

  // paragraph 컬럼명 처리
  const getParagraphNum = (submission: any) => {
    return submission.paragraph || 0;
  };

  // 지문을 문단별로 나누기
  const paragraphs = passage?.content
    ? passage.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
    : [];

  const handleStudentClick = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto" style={{ backgroundColor: '#F0EEEB', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-4 md:mb-5">
        <div className="flex items-center gap-3">
        <img src="/file.svg" alt="File" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%)' }} />
        <h1 className="text-xl md:text-2xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
          학생 제출 현황
          <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
        </h1>
        </div>
        {passage && (
          <Link
            href={`/admin/passages/${id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>지문 상세히 보기</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
      {passage && (
        <div className="mb-4 md:mb-6">
          <h2 className="text-base md:text-lg mb-2" style={{ color: '#13181B' }}>{passage.title}</h2>
          {passage.source && (
            <p className="text-sm" style={{ color: '#13181B', opacity: 0.9 }}>출처: {passage.source}</p>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* 왼쪽: 학생 목록 */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {results.length === 0 ? (
            <div className="p-4 rounded-xl shadow-sm" style={{ color: '#13181B' }}>
              아직 제출한 학생이 없습니다.
            </div>
          ) : (
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
              {Object.values(byStudent).map((s: any) => (
                <button
                  key={s.student_id}
                  onClick={() => handleStudentClick(s.student_id, s.name)}
                  className="p-3 md:p-4 rounded-xl text-left transition-colors whitespace-nowrap lg:whitespace-normal shadow-sm"
                  style={selectedStudentId === s.student_id ? {
                    backgroundColor: categoryColor,
                    color: '#13181B'
                  } : {
                    backgroundColor: '#FFFFFF',
                    color: '#13181B'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStudentId !== s.student_id) {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStudentId !== s.student_id) {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    }
                  }}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm" style={{ opacity: selectedStudentId === s.student_id ? 0.9 : 0.7 }}>
                    제출한 체크포인트: {s.count}개
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 학생별로 답변 보기 */}
        <div className="flex-1 w-full">
          {paragraphs.length > 0 ? (
            <div className="space-y-4 md:space-y-6">
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4" style={{ color: '#13181B' }}>
                {selectedStudentId ? `${selectedStudentName} 님의 답변` : '모든 학생 답변'}
              </h3>

              {/* 학생별로 카드 형태로 표시 */}
              {(selectedStudentId 
                ? Object.values(byStudent).filter((s: any) => s.student_id === selectedStudentId)
                : Object.values(byStudent)
              ).map((student: any) => {
                const studentCheckpoints = results.filter(
                  (r: any) => (r.user_id || r.student_id) === student.student_id
                );

                // attempt_number별로 그룹화
                const checkpointsByParagraph = paragraphs.reduce((acc: any, paragraph: string, idx: number) => {
                  const paragraphNum = idx + 1;
                  const paragraphCheckpoints = studentCheckpoints.filter((cp: any) => {
                    const paraNum = cp.paragraph;
                    return paraNum === paragraphNum;
                  }).sort((a: any, b: any) => (a.attempt_number || 1) - (b.attempt_number || 1));

                  if (paragraphCheckpoints.length > 0) {
                    const byAttempt = paragraphCheckpoints.reduce((attemptAcc: any, cp: any) => {
                      const attempt = cp.attempt_number || 1;
                      if (!attemptAcc[attempt]) attemptAcc[attempt] = [];
                      attemptAcc[attempt].push(cp);
                      return attemptAcc;
                    }, {});
                    acc[paragraphNum] = byAttempt;
                  }
                  return acc;
                }, {});

                // 학생의 모든 체크포인트 ID 수집
                const allStudentCheckpointIds = studentCheckpoints.map((cp: any) => cp.id);
                const allViewed = allStudentCheckpointIds.length > 0 && 
                                  studentCheckpoints.every((cp: any) => cp.teacher_viewed);

                return (
                  <div key={student.student_id} className="rounded-xl p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderBottomColor: '#CCD5DA' }}>
                      <h4 className="text-lg font-bold" style={{ color: '#13181B' }}>
                      {student.name} 님
                    </h4>
                      {/* 전체 확인 버튼 */}
                      {allStudentCheckpointIds.length > 0 && (
                        <button
                          onClick={async () => {
                            // 학생의 모든 체크포인트 확인 상태 업데이트
                            const { error } = await supabase
                              .from("student_checkpoint_record")
                              .update({ teacher_viewed: true })
                              .in("id", allStudentCheckpointIds);
                            
                            if (error) {
                              alert("확인 상태 업데이트 실패: " + error.message);
                            } else {
                              // 결과 다시 로드
                              const { data, error: loadError } = await supabase
                                .from("student_checkpoint_record")
                                .select("*, users(name, email)")
                                .eq("passage_id", id);
                              
                              if (loadError) {
                                // users 조인 실패 시 직접 조회
                                const { data: checkpointsData } = await supabase
                                  .from("student_checkpoint_record")
                                  .select("*")
                                  .eq("passage_id", id);
                                
                                if (checkpointsData) {
                                  const userIds = [...new Set(checkpointsData.map((c: any) => c.user_id))];
                                  const { data: usersData } = await supabase
                                    .from("users")
                                    .select("id, name, email")
                                    .in("id", userIds);
                                  
                                  const usersMap = new Map(usersData?.map((u: any) => [u.id, u]) || []);
                                  const resultsWithUsers = checkpointsData.map((c: any) => ({
                                    ...c,
                                    users: usersMap.get(c.user_id) || { name: "이름 미등록", email: "" },
                                  }));
                                  setResults(resultsWithUsers);
                                }
                              } else if (data) {
                                setResults(data);
                              }
                            }
                          }}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                          style={{ 
                            backgroundColor: allViewed ? '#D4E4F4' : '#F0EEEB',
                            color: '#13181B',
                            border: '2px solid #CCD5DA'
                          }}
                          onMouseEnter={(e) => {
                            if (!allViewed) {
                              e.currentTarget.style.backgroundColor = '#E8F0F8';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!allViewed) {
                              e.currentTarget.style.backgroundColor = '#F0EEEB';
                            }
                          }}
                        >
                          {allViewed ? (
                            <span className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              전체 확인 완료
                            </span>
                          ) : (
                            '전체 확인'
                          )}
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {paragraphs.map((paragraph: string, idx: number) => {
                        const paragraphNum = idx + 1;
                        const paragraphAttempts = checkpointsByParagraph[paragraphNum] || {};
                        const attemptNumbers = Object.keys(paragraphAttempts).map(Number).sort((a, b) => a - b);
                        
                        // 해당 문단의 모든 체크포인트 수집 (하이라이트 표시용)
                        const allCheckpointsForHighlight: any[] = [];
                        attemptNumbers.forEach((attemptNum) => {
                          const attemptCheckpoints = paragraphAttempts[attemptNum] || [];
                          attemptCheckpoints.forEach((cp: any) => {
                            if (cp.highlighted_text && cp.highlight_start !== null && cp.highlight_end !== null) {
                              allCheckpointsForHighlight.push(cp);
                            }
                          });
                        });

                        return (
                          <div key={idx} className="border-l-4 pl-4 py-2" style={{ borderLeftColor: '#CCD5DA' }}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
                                {paragraphNum}문단
                              </span>
                              {attemptNumbers.length > 0 && (
                                <div className="flex gap-1">
                                  {attemptNumbers.map((attemptNum) => (
                                    <span
                                      key={attemptNum}
                                      className="px-3 py-1.5 text-xs rounded font-semibold"
                                      style={{ color: '#13181B' }}
                                    >
                                      {attemptNum}차
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 문단 내용에 하이라이트 표시 */}
                            {allCheckpointsForHighlight.length > 0 && (
                              <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#F0EEEB', border: '1px solid #CCD5DA' }}>
                                <ParagraphWithHighlights
                                  paragraph={paragraph}
                                  checkpoints={allCheckpointsForHighlight}
                                />
                              </div>
                            )}

                            {/* attempt_number별로 체크포인트 표시 */}
                            {attemptNumbers.length > 0 ? (
                              <div className="space-y-3">
                                {attemptNumbers.map((attemptNum) => {
                                  const attemptCheckpoints = paragraphAttempts[attemptNum] || [];
                                  // 거시와 미시 체크포인트 분리
                                  const 거시Checkpoint = attemptCheckpoints.find((cp: any) => cp.category === "거시");
                                  const 미시Checkpoint = attemptCheckpoints.find((cp: any) => cp.category === "미시");
                                  const 기타Checkpoints = attemptCheckpoints.filter((cp: any) => cp.category !== "거시" && cp.category !== "미시");
                                  const firstCheckpoint = attemptCheckpoints[0];
                                  const createdDate = firstCheckpoint?.created_at ? new Date(firstCheckpoint.created_at).toLocaleDateString('ko-KR') : '';
                                  
                                  return (
                                    <div key={`${paragraphNum}-${attemptNum}`} className="rounded-xl p-3 shadow-sm border-2" style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA' }}>
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-bold px-3 py-1.5 rounded" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
                                          {attemptNum}차
                                        </span>
                                        <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                          {createdDate}
                                        </span>
                                      </div>

                                      {/* 거시/미시 체크포인트를 한 줄에 나란히 표시 */}
                                      {(거시Checkpoint || 미시Checkpoint) ? (
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                          {/* 거시 체크포인트 */}
                                          <div className="p-3 rounded-lg border-2 relative" style={{ 
                                            backgroundColor: 거시Checkpoint ? '#E8F0F8' : '#F0EEEB',
                                            borderColor: '#CCD5DA',
                                            borderLeft: '4px solid #13181B'
                                          }}>
                                            <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                                backgroundColor: '#D4E4F4',
                                        color: '#13181B'
                                      }}>
                                                거시
                                      </span>
                                    </div>
                                            {거시Checkpoint?.highlighted_text && (
                                    <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FFFFFF', color: '#13181B', opacity: 0.9, border: '1px solid #CCD5DA' }}>
                                                <span className="font-semibold">하이라이트:</span> {거시Checkpoint.highlighted_text}
                                              </div>
                                            )}
                                            {거시Checkpoint?.checkpoint_text && 거시Checkpoint.checkpoint_text.trim() ? (
                                              <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                                {거시Checkpoint.checkpoint_text}
                                              </div>
                                            ) : (
                                              <div className="text-sm italic" style={{ color: '#13181B', opacity: 0.5 }}>
                                                없음
                                              </div>
                                            )}
                                          </div>

                                          {/* 미시 체크포인트 */}
                                          <div className="p-3 rounded-lg border-2 relative" style={{ 
                                            backgroundColor: 미시Checkpoint ? '#FFF5E8' : '#F0EEEB',
                                            borderColor: '#CCD5DA',
                                            borderLeft: '4px solid #13181B'
                                          }}>
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                                backgroundColor: '#FFE5CC',
                                                color: '#13181B'
                                              }}>
                                                미시
                                        </span>
                                            </div>
                                            {미시Checkpoint?.highlighted_text && (
                                              <div className="mb-2 p-2 rounded text-xs" style={{ backgroundColor: '#FFFFFF', color: '#13181B', opacity: 0.9, border: '1px solid #CCD5DA' }}>
                                                <span className="font-semibold">하이라이트:</span> {미시Checkpoint.highlighted_text}
                                              </div>
                                            )}
                                            {미시Checkpoint?.checkpoint_text && 미시Checkpoint.checkpoint_text.trim() ? (
                                              <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                                {미시Checkpoint.checkpoint_text}
                                              </div>
                                            ) : (
                                              <div className="text-sm italic" style={{ color: '#13181B', opacity: 0.5 }}>
                                                없음
                                    </div>
                                  )}
                                  </div>
                                        </div>
                                      ) : null}

                                      {/* 기타 체크포인트 (거시/미시가 아닌 경우) */}
                                      {기타Checkpoints.map((checkpoint: any) => (
                                        <div key={checkpoint.id} className="mb-2">
                                          {checkpoint?.checkpoint_text && checkpoint.checkpoint_text.trim() ? (
                                            <div className="text-sm p-3 rounded" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
                                              {checkpoint.checkpoint_text}
                                </div>
                              ) : (
                                          <span className="text-sm italic" style={{ color: '#13181B', opacity: 0.6 }}>체크포인트 없음</span>
                              )}
                            </div>
                                      ))}

                            {/* 모름 사유 */}
                                      {(거시Checkpoint?.reason || 미시Checkpoint?.reason || 기타Checkpoints.some((cp: any) => cp.reason)) && (
                                        <div className="mt-2 p-3 rounded border-l-4" style={{ borderLeftColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
                                          <span className="text-xs font-semibold" style={{ color: '#13181B' }}>⚠️ 모름 - 사유: </span>
                                          <span className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                            {거시Checkpoint?.reason || 미시Checkpoint?.reason || 기타Checkpoints.find((cp: any) => cp.reason)?.reason}
                                </span>
                                        </div>
                                      )}

                                      {/* 학생 자기 피드백 */}
                                      {(거시Checkpoint && studentFeedbacks[거시Checkpoint.id]) || (미시Checkpoint && studentFeedbacks[미시Checkpoint.id]) ? (
                                        <div className="mt-2 p-3 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                                          <div className="text-xs font-semibold mb-1" style={{ color: '#13181B' }}>
                                            ✍️ 학생 자기 피드백
                                          </div>
                                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                            {studentFeedbacks[거시Checkpoint?.id]?.feedback_text || studentFeedbacks[미시Checkpoint?.id]?.feedback_text}
                                          </div>
                                        </div>
                                      ) : null}

                                      {/* 선생님 댓글 */}
                                      <div className="mt-2">
                                        <button
                                          onClick={() => {
                                            const checkpointId = 거시Checkpoint?.id || 미시Checkpoint?.id || 기타Checkpoints[0]?.id;
                                            if (checkpointId) {
                                            setShowCommentInput((prev: any) => ({
                                              ...prev,
                                                [checkpointId]: !prev[checkpointId],
                                            }));
                                            }
                                          }}
                                          className="text-xs mb-2 transition-colors"
                                          style={{ color: '#13181B' }}
                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        >
                                          댓글 {(거시Checkpoint && comments[거시Checkpoint.id]?.length) || (미시Checkpoint && comments[미시Checkpoint.id]?.length) || 0}개
                                        </button>

                                        {/* 기존 댓글 - 거시/미시 각각 표시 */}
                                        {((거시Checkpoint && comments[거시Checkpoint.id]?.length > 0) || (미시Checkpoint && comments[미시Checkpoint.id]?.length > 0)) && (
                                          <div className="space-y-2 mb-2">
                                            {거시Checkpoint && comments[거시Checkpoint.id]?.map((comment: any) => {
                                              const isMyComment = currentUserId && comment.teacher_id === currentUserId;
                                              const isEditing = editingCommentId === comment.id;
                                              
                                              return (
                                                <div key={comment.id} className="p-3 rounded-lg shadow-sm border-l-2" style={{ backgroundColor: '#F0EEEB', borderLeftColor: '#13181B' }}>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <div className="font-semibold text-sm" style={{ color: '#13181B' }}>선생님</div>
                                                    {isMyComment && !isEditing && (
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() => {
                                                            setEditingCommentId(comment.id);
                                                            setEditCommentText(comment.comment_text);
                                                          }}
                                                          className="text-xs px-2 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          수정
                                                        </button>
                                                        <button
                                                          onClick={async () => {
                                                            if (!confirm("정말 삭제하시겠습니까?")) return;
                                                            
                                                            const { error } = await supabase
                                                              .from("teacher_comments")
                                                              .delete()
                                                              .eq("id", comment.id);
                                                            
                                                            if (error) {
                                                              alert("삭제 실패: " + error.message);
                                                            } else {
                                                              const { data: commentsData } = await supabase
                                                                .from("teacher_comments")
                                                                .select("*")
                                                                .eq("student_submission_id", 거시Checkpoint.id)
                                                                .order("created_at", { ascending: false });
                                                              if (commentsData) {
                                                                setComments((prev: any) => ({
                                                                  ...prev,
                                                                  [거시Checkpoint.id]: commentsData,
                                                                }));
                                                              }
                                                            }
                                                          }}
                                                          className="text-xs px-2 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          삭제
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {isEditing ? (
                                                    <div className="space-y-2">
                                                      <textarea
                                                        value={editCommentText}
                                                        onChange={(e) => setEditCommentText(e.target.value)}
                                                        className="w-full text-sm p-2 rounded-xl transition-all shadow-sm"
                                                        style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}
                                                        rows={3}
                                                      />
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={async () => {
                                                            if (!editCommentText.trim()) {
                                                              alert("댓글을 입력해주세요.");
                                                              return;
                                                            }
                                                            
                                                            const { error } = await supabase
                                                              .from("teacher_comments")
                                                              .update({ comment_text: editCommentText.trim() })
                                                              .eq("id", comment.id);
                                                            
                                                            if (error) {
                                                              alert("수정 실패: " + error.message);
                                                            } else {
                                                              setEditingCommentId(null);
                                                              setEditCommentText("");
                                                              const { data: commentsData } = await supabase
                                                                .from("teacher_comments")
                                                                .select("*")
                                                                .eq("student_submission_id", 거시Checkpoint.id)
                                                                .order("created_at", { ascending: false });
                                                              if (commentsData) {
                                                                setComments((prev: any) => ({
                                                                  ...prev,
                                                                  [거시Checkpoint.id]: commentsData,
                                                                }));
                                                              }
                                                            }
                                                          }}
                                                          className="text-xs px-3 py-1 rounded transition-colors font-semibold"
                                                          style={{ backgroundColor: '#13181B', color: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          저장
                                                        </button>
                                                        <button
                                                          onClick={() => {
                                                            setEditingCommentId(null);
                                                            setEditCommentText("");
                                                          }}
                                                          className="text-xs px-3 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          취소
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div>
                                                      <div className="text-sm whitespace-pre-wrap mb-1" style={{ color: '#13181B' }}>
                                                        {comment.comment_text}
                                                      </div>
                                                      <div className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                                  {new Date(comment.created_at).toLocaleString('ko-KR')}
                                                </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            {미시Checkpoint && comments[미시Checkpoint.id]?.map((comment: any) => {
                                              const isMyComment = currentUserId && comment.teacher_id === currentUserId;
                                              const isEditing = editingCommentId === comment.id;
                                              
                                              return (
                                                <div key={comment.id} className="p-3 rounded-lg shadow-sm border-l-2" style={{ backgroundColor: '#F0EEEB', borderLeftColor: '#13181B' }}>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <div className="font-semibold text-sm" style={{ color: '#13181B' }}>선생님</div>
                                                    {isMyComment && !isEditing && (
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() => {
                                                            setEditingCommentId(comment.id);
                                                            setEditCommentText(comment.comment_text);
                                                          }}
                                                          className="text-xs px-2 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          수정
                                                        </button>
                                                        <button
                                                          onClick={async () => {
                                                            if (!confirm("정말 삭제하시겠습니까?")) return;
                                                            
                                                            const { error } = await supabase
                                                              .from("teacher_comments")
                                                              .delete()
                                                              .eq("id", comment.id);
                                                            
                                                            if (error) {
                                                              alert("삭제 실패: " + error.message);
                                                            } else {
                                                              const { data: commentsData } = await supabase
                                                                .from("teacher_comments")
                                                                .select("*")
                                                                .eq("student_submission_id", 미시Checkpoint.id)
                                                                .order("created_at", { ascending: false });
                                                              if (commentsData) {
                                                                setComments((prev: any) => ({
                                                                  ...prev,
                                                                  [미시Checkpoint.id]: commentsData,
                                                                }));
                                                              }
                                                            }
                                                          }}
                                                          className="text-xs px-2 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          삭제
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {isEditing ? (
                                                    <div className="space-y-2">
                                                      <textarea
                                                        value={editCommentText}
                                                        onChange={(e) => setEditCommentText(e.target.value)}
                                                        className="w-full text-sm p-2 rounded-xl transition-all shadow-sm"
                                                        style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}
                                                        rows={3}
                                                      />
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={async () => {
                                                            if (!editCommentText.trim()) {
                                                              alert("댓글을 입력해주세요.");
                                                              return;
                                                            }
                                                            
                                                            const { error } = await supabase
                                                              .from("teacher_comments")
                                                              .update({ comment_text: editCommentText.trim() })
                                                              .eq("id", comment.id);
                                                            
                                                            if (error) {
                                                              alert("수정 실패: " + error.message);
                                                            } else {
                                                              setEditingCommentId(null);
                                                              setEditCommentText("");
                                                              const { data: commentsData } = await supabase
                                                                .from("teacher_comments")
                                                                .select("*")
                                                                .eq("student_submission_id", 미시Checkpoint.id)
                                                                .order("created_at", { ascending: false });
                                                              if (commentsData) {
                                                                setComments((prev: any) => ({
                                                                  ...prev,
                                                                  [미시Checkpoint.id]: commentsData,
                                                                }));
                                                              }
                                                            }
                                                          }}
                                                          className="text-xs px-3 py-1 rounded transition-colors font-semibold"
                                                          style={{ backgroundColor: '#13181B', color: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          저장
                                                        </button>
                                                        <button
                                                          onClick={() => {
                                                            setEditingCommentId(null);
                                                            setEditCommentText("");
                                                          }}
                                                          className="text-xs px-3 py-1 rounded transition-colors"
                                                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                                                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                        >
                                                          취소
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div>
                                                      <div className="text-sm whitespace-pre-wrap mb-1" style={{ color: '#13181B' }}>
                                                        {comment.comment_text}
                                                      </div>
                                                      <div className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                                        {new Date(comment.created_at).toLocaleString('ko-KR')}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* 댓글 입력 */}
                                        {(() => {
                                          const checkpointId = 거시Checkpoint?.id || 미시Checkpoint?.id || 기타Checkpoints[0]?.id;
                                          return checkpointId && showCommentInput[checkpointId] && (
                                          <div className="mt-2">
                                            <textarea
                                              value={commentTexts[checkpointId] || ""}
                                              onChange={(e) => {
                                                setCommentTexts((prev: any) => ({
                                                  ...prev,
                                                  [checkpointId]: e.target.value,
                                                }));
                                              }}
                                              placeholder="댓글을 입력하세요..."
                                              className="w-full text-sm p-3 rounded-xl mb-2 transition-all shadow-sm"
                                              style={{ 
                                                backgroundColor: '#FFFFFF', 
                                                border: '1px solid #CCD5DA',
                                                color: '#13181B'
                                              }}
                                              onFocus={(e) => {
                                                e.currentTarget.style.borderColor = '#13181B';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                                                e.currentTarget.style.outline = 'none';
                                              }}
                                              onBlur={(e) => {
                                                e.currentTarget.style.borderColor = '#CCD5DA';
                                                e.currentTarget.style.boxShadow = 'none';
                                              }}
                                              rows={3}
                                            />
                                            <button
                                              onClick={async () => {
                                                const commentText = commentTexts[checkpointId];
                                                if (!commentText?.trim()) {
                                                  alert("댓글을 입력해주세요.");
                                                  return;
                                                }

                                                const { data: { user } } = await supabase.auth.getUser();
                                                if (!user) {
                                                  alert("로그인이 필요합니다.");
                                                  return;
                                                }

                                                const { error, data: newComment } = await supabase
                                                  .from("teacher_comments")
                                                  .insert({
                                                    student_submission_id: checkpointId,
                                                    teacher_id: user.id,
                                                    comment_text: commentText.trim(),
                                                  })
                                                  .select()
                                                  .single();

                                                if (error) {
                                                  alert("댓글 추가 실패: " + error.message);
                                                  console.error("댓글 작성 에러:", error);
                                                } else {
                                                  // 즉시 UI에 반영 (새로고침 없이)
                                                  if (newComment) {
                                                    setComments((prev: any) => ({
                                                      ...prev,
                                                      [checkpointId]: [
                                                        newComment,
                                                        ...(prev[checkpointId] || [])
                                                      ],
                                                    }));
                                                  } else {
                                                    // fallback: 댓글 다시 로드
                                                  const { data: commentsData } = await supabase
                                                    .from("teacher_comments")
                                                    .select("*")
                                                    .eq("student_submission_id", checkpointId)
                                                    .order("created_at", { ascending: false });

                                                  if (commentsData) {
                                                    setComments((prev: any) => ({
                                                      ...prev,
                                                      [checkpointId]: commentsData,
                                                    }));
                                                    }
                                                  }

                                                  setCommentTexts((prev: any) => ({
                                                    ...prev,
                                                    [checkpointId]: "",
                                                  }));
                                                  setShowCommentInput((prev: any) => ({
                                                    ...prev,
                                                    [checkpointId]: false,
                                                  }));
                                                }
                                              }}
                                              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                                              style={{ 
                                                backgroundColor: '#13181B',
                                                color: '#F0EEEB'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.opacity = '0.9';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.opacity = '1';
                                                e.currentTarget.style.boxShadow = 'none';
                                              }}
                                            >
                                              댓글 작성
                                            </button>
                                          </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm italic" style={{ color: '#13181B', opacity: 0.6 }}>아직 제출하지 않음</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {Object.keys(byStudent).length === 0 && (
                <div className="p-4 rounded-xl shadow-sm" style={{ color: '#13181B' }}>
                  아직 제출한 학생이 없습니다.
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#13181B', opacity: 0.8 }}>지문이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
