"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function PassageResults() {
  const { id } = useParams();
  const [results, setResults] = useState<any[]>([]);
  const [passage, setPassage] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>("");
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [studentFeedbacks, setStudentFeedbacks] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
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

      if (error) {
        console.error("학생 제출 조회 오류:", error);
        // users 테이블 조인 실패 시 직접 조회
        const { data: checkpointsData } = await supabase
          .from("student_checkpoint_record")
          .select("*")
          .eq("passage_id", id);
        
        if (checkpointsData) {
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
        setResults(data || []);
      }

      // 댓글 로드
      if (data && data.length > 0) {
        const submissionIds = data.map((c: any) => c.id);
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

      // 학생 피드백 로드
      if (data && data.length > 0) {
        const submissionIds = data.map((c: any) => c.id);
        const { data: feedbacksData } = await supabase
          .from("student_feedback")
          .select("*")
          .in("student_submission_id", submissionIds);

        if (feedbacksData) {
          const feedbacksMap: Record<string, any> = {};
          feedbacksData.forEach((feedback: any) => {
            feedbacksMap[feedback.student_submission_id] = feedback;
          });
          setStudentFeedbacks(feedbacksMap);
        }
      }
    };
    load();
  }, [id]);

  const getCategoryColor = (category: string) => {
    if (category === "EBS") return '#003A6C';
    if (category === "기출" || category === "평가원") return '#FFBF65';
    if (category === "LEET") return '#FD8973';
    return '#13181B';
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

  // paragraph_index 컬럼명 처리
  const getParagraphNum = (submission: any) => {
    return submission.paragraph_index || submission.paragraph || 0;
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
      <div className="flex items-center gap-3 mb-4 md:mb-5">
        <img src="/file.svg" alt="File" className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%)' }} />
        <h1 className="text-xl md:text-2xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
          학생 제출 현황
          <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
        </h1>
      </div>
      {passage && (
        <div className="mb-4 md:mb-6">
          <h2 className="text-base md:text-lg mb-2" style={{ color: '#13181B' }}>{passage.title}</h2>
          {passage.source && (
            <p className="text-sm" style={{ color: categoryColor, opacity: 0.9 }}>출처: {passage.source}</p>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* 왼쪽: 학생 목록 */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {results.length === 0 ? (
            <div className="p-4 rounded border-2" style={{ backgroundColor: '#FFBF65', borderColor: '#FD8973', color: '#13181B' }}>
              아직 제출한 학생이 없습니다.
            </div>
          ) : (
            <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
              {Object.values(byStudent).map((s: any) => (
                <button
                  key={s.student_id}
                  onClick={() => handleStudentClick(s.student_id, s.name)}
                  className="border-2 p-3 md:p-4 rounded text-left transition-colors whitespace-nowrap lg:whitespace-normal"
                  style={selectedStudentId === s.student_id ? {
                    backgroundColor: categoryColor,
                    borderColor: categoryColor,
                    color: '#F0EEEB'
                  } : {
                    backgroundColor: '#F0EEEB',
                    borderColor: '#CCD5DA',
                    color: '#13181B'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStudentId !== s.student_id) {
                      e.currentTarget.style.borderColor = categoryColor;
                      e.currentTarget.style.backgroundColor = '#CCD5DA';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStudentId !== s.student_id) {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                      e.currentTarget.style.backgroundColor = '#F0EEEB';
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
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4" style={{ color: '#13181B' }}>모든 학생 답변</h3>

              {/* 학생별로 카드 형태로 표시 */}
              {Object.values(byStudent).map((student: any) => {
                const studentCheckpoints = results.filter(
                  (r: any) => (r.user_id || r.student_id) === student.student_id
                );

                // attempt_number별로 그룹화
                const checkpointsByParagraph = paragraphs.reduce((acc: any, paragraph: string, idx: number) => {
                  const paragraphNum = idx + 1;
                  const paragraphCheckpoints = studentCheckpoints.filter((cp: any) => {
                    const paraNum = cp.paragraph_index || cp.paragraph;
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

                return (
                  <div key={student.student_id} className="border-2 rounded-lg p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}>
                    <h4 className="text-lg font-bold mb-4 pb-2 border-b-2" style={{ color: '#13181B', borderBottomColor: '#CCD5DA' }}>
                      {student.name} 님
                    </h4>

                    <div className="space-y-4">
                      {paragraphs.map((paragraph: string, idx: number) => {
                        const paragraphNum = idx + 1;
                        const paragraphAttempts = checkpointsByParagraph[paragraphNum] || {};
                        const attemptNumbers = Object.keys(paragraphAttempts).map(Number).sort((a, b) => a - b);

                        return (
                          <div key={idx} className="border-l-4 pl-4 py-2" style={{ borderLeftColor: categoryColor }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: categoryColor, color: '#F0EEEB' }}>
                                {paragraphNum}문단
                              </div>
                              {attemptNumbers.length > 0 && (
                                <div className="flex gap-1">
                                  {attemptNumbers.map((attemptNum) => (
                                    <span
                                      key={attemptNum}
                                      className="px-3 py-1.5 text-xs rounded font-semibold"
                                      style={{ backgroundColor: '#FFBF65', color: '#13181B' }}
                                    >
                                      {attemptNum}차
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* attempt_number별로 체크포인트 표시 */}
                            {attemptNumbers.length > 0 ? (
                              <div className="space-y-2">
                                {attemptNumbers.map((attemptNum) => {
                                  const attemptCheckpoints = paragraphAttempts[attemptNum] || [];
                                  return attemptCheckpoints.map((checkpoint: any) => (
                                    <div key={checkpoint.id} className="border-2 rounded p-3 mb-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold px-3 py-1.5 rounded" style={{ backgroundColor: '#FFBF65', color: '#13181B' }}>
                                          {attemptNum}차
                                        </span>
                                        <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                          {checkpoint.created_at ? new Date(checkpoint.created_at).toLocaleDateString('ko-KR') : ''}
                                        </span>
                                      </div>

                                      {/* 체크포인트 */}
                                      <div className="mb-2">
                                        {checkpoint?.checkpoint_text && checkpoint.checkpoint_text.trim() ? (
                                          <div className="text-sm p-3 rounded" style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}>
                                            {checkpoint.checkpoint_text}
                                          </div>
                                        ) : (
                                          <span className="text-sm italic" style={{ color: '#13181B', opacity: 0.6 }}>체크포인트 없음</span>
                                        )}
                                      </div>

                                      {/* 모름 사유 */}
                                      {checkpoint?.reason && (
                                        <div className="mt-2 p-3 rounded border-l-4" style={{ backgroundColor: '#FFBF65', borderLeftColor: '#FD8973' }}>
                                          <span className="text-xs font-semibold" style={{ color: '#13181B' }}>⚠️ 모름 - 사유: </span>
                                          <span className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                            {checkpoint.reason}
                                          </span>
                                        </div>
                                      )}

                                      {/* 학생 자기 피드백 */}
                                      {studentFeedbacks[checkpoint.id] && (
                                        <div className="mt-2 p-3 rounded border-2" style={{ backgroundColor: '#CCD5DA', borderColor: '#13181B' }}>
                                          <div className="text-xs font-semibold mb-1" style={{ color: '#13181B' }}>
                                            ✍️ 학생 자기 피드백
                                          </div>
                                          <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                            {studentFeedbacks[checkpoint.id].feedback_text}
                                          </div>
                                        </div>
                                      )}

                                      {/* 선생님 댓글 */}
                                      {comments[checkpoint.id] && comments[checkpoint.id].length > 0 && (
                                        <div className="mt-2">
                                          <div className="text-xs font-semibold mb-2" style={{ color: categoryColor }}>
                                            💬 선생님 댓글 ({comments[checkpoint.id].length}개)
                                          </div>
                                          <div className="space-y-2">
                                            {comments[checkpoint.id].map((comment: any) => (
                                              <div key={comment.id} className="p-3 rounded text-sm" style={{ backgroundColor: '#CCD5DA' }}>
                                                <div className="font-semibold mb-1" style={{ color: '#13181B' }}>선생님</div>
                                                <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                                  {comment.comment_text}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ));
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
                <div className="p-4 rounded border-2" style={{ backgroundColor: '#FFBF65', borderColor: '#FD8973', color: '#13181B' }}>
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
