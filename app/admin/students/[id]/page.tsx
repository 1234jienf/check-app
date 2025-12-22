"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentDetail() {
  const { id: studentId } = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const passageId = search.get("passage");

  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [passage, setPassage] = useState<any>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [expandedParagraphs, setExpandedParagraphs] = useState<Record<number, boolean>>({});

  // 학생 정보 및 과목 불러오기
  useEffect(() => {
    const loadStudentInfo = async () => {
      if (!studentId) return;
      
      try {
        // 먼저 기본 정보만 가져오기
        const { data: basicData, error: basicError } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("id", studentId)
          .single();

        if (basicError) {
          return;
        }

        if (!basicData) return;

        // subjects 필드가 있는지 확인 (에러 무시)
        let hasSubjectsField = false;
        let studentSubjectsData: string[] = ['korean'];
        
        try {
          const { data: testData, error: testError } = await supabase
            .from("users")
            .select("subjects")
            .eq("id", studentId)
            .single();

          if (!testError && testData && testData.subjects !== undefined) {
            hasSubjectsField = true;
            studentSubjectsData = testData.subjects || ['korean'];
          }
        } catch (testErr: any) {
          // 400 에러나 다른 에러는 subjects 필드가 없는 것으로 간주
          hasSubjectsField = false;
        }

        if (hasSubjectsField) {
          // subjects 필드가 있는 경우
          setStudentInfo({ ...basicData, subjects: studentSubjectsData });
          setStudentSubjects(studentSubjectsData);
        } else {
          // subjects 필드가 없는 경우 기본값
          setStudentInfo({ ...basicData, subjects: ['korean'] });
          setStudentSubjects(['korean']);
        }
      } catch (err) {
      }
    };
    loadStudentInfo();
  }, [studentId]);

  useEffect(() => {
    const load = async () => {
      if (!passageId) return;

      // 지문 정보 가져오기
      const { data: passageData } = await supabase
        .from("passages")
        .select("*")
        .eq("id", passageId)
        .single();

      setPassage(passageData);

      // student_checkpoint_record 테이블에서 학생 제출 확인
      const { data } = await supabase
        .from("student_checkpoint_record")
        .select("*")
        .eq("user_id", studentId) // 테이블에는 user_id 컬럼이 있음
        .eq("passage_id", passageId)
        .order("paragraph", { ascending: true });

      setCheckpoints(data || []);

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
    };
    load();
  }, [studentId, passageId]);

  // 학생 과목 업데이트
  const updateStudentSubjects = async () => {
    if (studentSubjects.length === 0) {
      alert("최소 하나의 과목을 선택해주세요.");
      return;
    }

    try {
      // 먼저 subjects 필드가 있는지 확인 (에러 무시)
      let hasSubjectsField = false;
      try {
        const { data: testData, error: testError } = await supabase
          .from("users")
          .select("subjects")
          .eq("id", studentId)
          .single();

        if (!testError && testData && testData.subjects !== undefined) {
          hasSubjectsField = true;
        }
      } catch (testErr: any) {
        // 400 에러나 다른 에러는 subjects 필드가 없는 것으로 간주
        hasSubjectsField = false;
      }

      if (!hasSubjectsField) {
        // subjects 컬럼이 없는 경우
        alert("과목 필드가 데이터베이스에 없습니다. 먼저 SQL 스크립트를 실행해주세요.");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ subjects: studentSubjects })
        .eq("id", studentId);

      if (error) {
        // subjects 컬럼 업데이트 실패 시 에러 메시지
        if (error.code === '42703') {
          alert("과목 필드가 데이터베이스에 없습니다. 먼저 SQL 스크립트를 실행해주세요.");
        } else {
          alert("과목 업데이트 실패: " + error.message);
        }
      } else {
        alert("과목이 업데이트되었습니다.");
        setIsEditingSubjects(false);
        setStudentInfo({ ...studentInfo, subjects: studentSubjects });
      }
    } catch (err) {
      alert("과목 업데이트 중 오류가 발생했습니다.");
    }
  };

  // 지문을 문단별로 나누기
  const paragraphs = passage?.content
    ? passage.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
    : [];

  const getCategoryColor = (category: string) => {
    if (category === "EBS") return '#E8F0F8';
    if (category === "기출") return '#FFF5E8';
    if (category === "LEET") return '#FFF0ED';
    return '#E8E9EA';
  };

  const categoryColor = passage ? getCategoryColor(passage.category) : '#13181B';

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/admin"
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            학생 관리로 돌아가기
          </Link>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
                {studentInfo ? `${studentInfo.name} 학생` : '학생 상세'}
                <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
              </h1>
            </div>
          </div>

          {/* 학생 정보 및 과목 관리 */}
          {studentInfo && (
            <div className="rounded-xl p-6 shadow-sm mb-6" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>학생 정보</h2>
                  <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>{studentInfo.email}</p>
                </div>
                <button
                  onClick={() => setIsEditingSubjects(!isEditingSubjects)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E9EA'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                >
                  {isEditingSubjects ? '취소' : '과목 수정'}
                </button>
              </div>

              {isEditingSubjects ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>접근 가능한 과목</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentSubjects.includes('korean')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStudentSubjects([...studentSubjects, 'korean']);
                            } else {
                              setStudentSubjects(studentSubjects.filter(sub => sub !== 'korean'));
                            }
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: '#13181B' }}
                        />
                        <span style={{ color: '#13181B' }}>국어</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentSubjects.includes('english')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStudentSubjects([...studentSubjects, 'english']);
                            } else {
                              setStudentSubjects(studentSubjects.filter(sub => sub !== 'english'));
                            }
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: '#13181B' }}
                        />
                        <span style={{ color: '#13181B' }}>영어</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={updateStudentSubjects}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingSubjects(false);
                        setStudentSubjects(studentInfo.subjects || ['korean']);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E9EA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>접근 가능한 과목:</p>
                  <div className="flex gap-2">
                    {studentInfo.subjects?.includes('korean') && (
                      <span className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}>국어</span>
                    )}
                    {studentInfo.subjects?.includes('english') && (
                      <span className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}>영어</span>
                    )}
                    {(!studentInfo.subjects || studentInfo.subjects.length === 0) && (
                      <span className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>과목이 설정되지 않았습니다.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {passageId && (
          <div className="flex items-center gap-3 mb-4">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h2 className="text-2xl md:text-3xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
          학생 답변 상세
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h2>
          </div>
        )}
        {passage && (
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-semibold mb-2" style={{ color: '#13181B' }}>{passage.title}</h2>
            {passage.difficulty && (
              <p className="text-sm mb-1" style={{ color: '#13181B', opacity: 0.9 }}>난이도 : {passage.difficulty}</p>
            )}
            {passage.source && (
              <p className="text-sm" style={{ color: '#13181B', opacity: 0.9 }}>출처: {passage.source}</p>
            )}
          </div>
        )}

      {paragraphs.length > 0 ? (
        <div className="space-y-6">
          {paragraphs.map((paragraph: string, idx: number) => {
            const paragraphNum = idx + 1;
            const checkpoint = checkpoints.find(
              (cp: any) => {
                const paraNum = cp.paragraph;
                return paraNum === paragraphNum;
              }
            );

            const isExpanded = expandedParagraphs[paragraphNum] || false;
            const passagePath = `/admin/passages/${passageId}`;

            return (
              <div key={idx} className="rounded-xl p-4 md:p-6 shadow-sm mb-4 md:mb-6 transition-all duration-300" style={{ backgroundColor: '#FFFFFF' }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                   }}>
                <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderBottomColor: '#CCD5DA' }}>
                  <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>
                    {paragraphNum}문단
                  </h3>
                  <button
                    onClick={() => setExpandedParagraphs({ ...expandedParagraphs, [paragraphNum]: !isExpanded })}
                    className="p-1 rounded transition-all"
                    style={{ color: '#13181B' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0EEEB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* 문단 내용 - 접기/펼치기 */}
                {isExpanded && (
                  <div className="mb-4">
                    <Link
                      href={passagePath}
                      className="block p-4 rounded-xl shadow-sm mb-3 transition-all cursor-pointer"
                      style={{ backgroundColor: '#F0EEEB' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#CCD5DA';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F0EEEB';
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: '#13181B' }}>
                          지문으로 이동하여 문단 내용 확인
                        </span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                )}

                {/* 학생 체크포인트 */}
                {checkpoint ? (
                  <div className="space-y-3 mt-4">
                    <div className="p-4 rounded-xl border-2" style={{ backgroundColor: '#CCD5DA', borderColor: categoryColor }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm font-semibold" style={{ color: categoryColor }}>학생이 작성한 체크포인트:</div>
                        {/* 거시/미시 카테고리 표시 (국어 지문만) */}
                        {checkpoint.category && (
                          <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                            backgroundColor: checkpoint.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                            color: '#13181B'
                          }}>
                            {checkpoint.category} 체크
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>{checkpoint.checkpoint_text || "(작성하지 않음)"}</div>
                    </div>
                    {/* reason이 있으면 모름으로 선택한 것 */}
                    {checkpoint.reason && (
                      <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: '#FFF5E8', borderLeftColor: '#CCD5DA' }}>
                        <div className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                          ⚠️ 모름 - 사유:
                        </div>
                        <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>
                          {checkpoint.reason}
                        </div>
                      </div>
                    )}

                    {/* 선생님 댓글 */}
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setShowCommentInput((prev: any) => ({
                            ...prev,
                            [checkpoint.id]: !prev[checkpoint.id],
                          }));
                        }}
                        className="text-sm mb-2 transition-colors"
                        style={{ color: '#13181B' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        댓글 {comments[checkpoint.id]?.length || 0}개
                      </button>

                      {/* 기존 댓글 */}
                    {comments[checkpoint.id] && comments[checkpoint.id].length > 0 && (
                        <div className="space-y-2 mb-2">
                          {comments[checkpoint.id].map((comment: any) => (
                            <div key={comment.id} className="p-3 rounded-lg shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                              <div className="text-xs mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                                {new Date(comment.created_at).toLocaleString('ko-KR')}
                              </div>
                              <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                {comment.comment_text}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 댓글 입력 */}
                      {showCommentInput[checkpoint.id] && (
                        <div className="mt-2">
                          <textarea
                            value={commentTexts[checkpoint.id] || ""}
                            onChange={(e) => {
                              setCommentTexts((prev: any) => ({
                                ...prev,
                                [checkpoint.id]: e.target.value,
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
                              const commentText = commentTexts[checkpoint.id];
                              if (!commentText?.trim()) {
                                alert("댓글을 입력해주세요.");
                                return;
                              }

                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) {
                                alert("로그인이 필요합니다.");
                                return;
                              }

                              const { error } = await supabase
                                .from("teacher_comments")
                                .insert({
                                  student_submission_id: checkpoint.id,
                                  teacher_id: user.id,
                                  comment_text: commentText,
                                });

                              if (error) {
                                alert("댓글 추가 실패: " + error.message);
                              } else {
                                // 댓글 다시 로드
                                const { data: commentsData } = await supabase
                                  .from("teacher_comments")
                                  .select("*")
                                  .eq("student_submission_id", checkpoint.id)
                                  .order("created_at", { ascending: false });

                                if (commentsData) {
                                  setComments((prev: any) => ({
                                    ...prev,
                                    [checkpoint.id]: commentsData,
                                  }));
                                }

                                setCommentTexts((prev: any) => ({
                                  ...prev,
                                  [checkpoint.id]: "",
                                }));
                                setShowCommentInput((prev: any) => ({
                                  ...prev,
                                  [checkpoint.id]: false,
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
                    )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 rounded-xl text-sm" style={{ backgroundColor: '#CCD5DA', color: '#13181B', opacity: 0.8 }}>
                    아직 제출하지 않았습니다.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-gray-500">지문이 없습니다.</div>
      )}

      {checkpoints.length === 0 && paragraphs.length > 0 && (
        <div className="mt-6 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl text-center">
          <p className="text-gray-500 text-lg">이 학생은 아직 아무것도 제출하지 않았습니다.</p>
        </div>
      )}
      </div>
    </div>
  );
}
