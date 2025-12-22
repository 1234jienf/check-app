"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import React from "react";

export default function AdminPassageDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedStudentId = searchParams?.get("student");
  const [passage, setPassage] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});
  const [studentFeedbacks, setStudentFeedbacks] = useState<Record<string, any>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCheckpointId, setEditingCheckpointId] = useState<string | null>(null);
  const [editCheckpointText, setEditCheckpointText] = useState<string>("");
  const [editCheckpointCategory, setEditCheckpointCategory] = useState<string>("미시");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any | null>(null);

  // 카테고리 키워드 체크 (영어로 변경)
  const isCategoryKeyword = (str: string) => {
    const keywords = ['ebs', 'gichul', 'leet', 'other'];
    return keywords.includes(str.toLowerCase());
  };

  // UUID 형식 검증 (간단한 체크)
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // 카테고리 키워드면 아예 null 반환 (정적 라우트로 처리되어야 함)
  // 이렇게 하면 useEffect도 실행되지 않음
  if (!id || typeof id !== 'string' || isCategoryKeyword(id)) {
    return null;
  }

  useEffect(() => {
    const load = async () => {
      // 이미 위에서 카테고리 키워드 체크를 했으므로 여기서는 UUID만 처리
      if (!isValidUUID(id as string)) {
        return;
      }

      // 세션에서 선택한 과목 확인
      const savedSubject = typeof window !== 'undefined' ? sessionStorage.getItem('adminSelectedSubject') : 'korean';
      const selectedSubject = (savedSubject || 'korean') as "korean" | "english";

      const { data: p } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();

      if (!p) {
        return;
      }

      // 과목 필터링: 선택한 과목과 일치하는 지문만 표시
      // subject가 null이면 국어로 간주
      const passageSubject = p.subject || 'korean';
      if (selectedSubject === "english" && passageSubject !== "english") {
        // 영어를 선택했는데 국어 지문이면 목록으로 리다이렉트
        alert("이 지문은 국어 지문입니다. 영어 지문 목록으로 이동합니다.");
        router.push("/admin/passages");
        return;
      }
      if (selectedSubject === "korean" && passageSubject === "english") {
        // 국어를 선택했는데 영어 지문이면 목록으로 리다이렉트
        alert("이 지문은 영어 지문입니다. 국어 지문 목록으로 이동합니다.");
        router.push("/admin/passages");
        return;
      }

      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: cp } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("passage_id", id)
        .order("order_num");

      // 체크포인트도 과목 필터링 (paragraph를 참조하지만 지문의 과목과 일치해야 함)
      // 이미 지문이 필터링되었으므로 체크포인트는 그대로 사용

      // 학생 제출 데이터 가져오기 - 먼저 모든 데이터를 가져온 후 users 조인
      // 1단계: 현재 지문에 대한 모든 제출 데이터 가져오기
      // RLS 정책을 우회하기 위해 service_role 키를 사용할 수 없으므로,
      // 정책이 제대로 작동하는지 확인
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from("student_checkpoint_record")
        .select("*")
        .eq("passage_id", id);
      
      if (checkpointsError) {
        setStudentSubmissions([]);
      } else if (checkpointsData && checkpointsData.length > 0) {
        // 2단계: 고유한 user_id 추출
        const userIds = [...new Set(checkpointsData.map((c: any) => c.user_id).filter(Boolean))];
        
        // 3단계: users 정보 가져오기
        let usersMap = new Map();
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);
          
          if (usersError) {
          } else if (usersData) {
            usersMap = new Map(usersData.map((u: any) => [u.id, u]));
          }
        }
        
        // 4단계: 데이터 결합
        const allSubmissions = checkpointsData.map((c: any) => ({
          ...c,
          users: usersMap.get(c.user_id) || { name: "이름 미등록", email: "" },
        }));
        
        // paragraph로 정렬
        allSubmissions.sort((a: any, b: any) => {
          const aPara = a.paragraph || 0;
          const bPara = b.paragraph || 0;
          return aPara - bPara;
        });
        
        setStudentSubmissions(allSubmissions);

        // 댓글 로드
        const submissionIds = allSubmissions.map((s: any) => s.id);
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
            setComments(commentsMap);
          }

          // 학생 피드백 로드 (에러 무시)
          try {
            const { data: feedbackData, error: feedbackError } = await supabase
              .from("student_feedback")
              .select("*")
              .in("student_submission_id", submissionIds)
              .order("created_at", { ascending: false });

            if (!feedbackError && feedbackData) {
              const feedbackMap: Record<string, any> = {};
              feedbackData.forEach((feedback: any) => {
                feedbackMap[feedback.student_submission_id] = feedback;
              });
              setStudentFeedbacks(feedbackMap);
            }
          } catch (feedbackErr: any) {
            // student_feedback 테이블이 없거나 접근 권한이 없으면 무시
          }
        }
      } else {
        setStudentSubmissions([]);
      }

      setPassage(p);
      setCheckpoints(cp || []);
    };
    load();
  }, [id]);

  // 학생별로 그룹화
  const byStudent: Record<string, any> = {};
  const studentNames: string[] = [];
  const uniqueStudentIds = new Set<string>();
  
  studentSubmissions.forEach((sub: any) => {
    const userId = sub.user_id;
    if (!userId) {
      return;
    }
    if (!uniqueStudentIds.has(userId)) {
      uniqueStudentIds.add(userId);
      const studentName = sub.users?.name || sub.users?.email || "이름 미등록";
      studentNames.push(studentName);
    }
    if (!byStudent[userId]) {
      byStudent[userId] = {
        name: sub.users?.name || sub.users?.email || "이름 미등록",
        user_id: userId,
        submissions: [],
      };
    }
    byStudent[userId].submissions.push(sub);
  });
  
  // 선택된 학생이 있으면 해당 학생만 필터링
  const filteredByStudent = selectedStudentId && byStudent[selectedStudentId]
    ? { [selectedStudentId]: byStudent[selectedStudentId] }
    : byStudent;

  // UUID가 아니면 에러 표시
  if (!isValidUUID(id as string)) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold mb-4">잘못된 경로</h1>
        <p className="mb-4" style={{ color: '#13181B' }}>
          유효하지 않은 지문 ID입니다. ({id})
        </p>
        <Link href="/admin/passages" className="transition-colors" style={{ color: '#13181B' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#13181B'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#13181B'}>
          ← 지문 관리로 돌아가기
        </Link>
      </div>
    );
  }

  if (!passage) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
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
          <p style={{ color: '#13181B' }}>로딩 중...</p>
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

  const categoryColor = getCategoryColor(passage.category);

  // 카테고리에 따른 목록 페이지 경로
  const getCategoryListPath = (category: string) => {
    if (category === "EBS") return "/admin/passages/ebs";
    if (category === "기출") return "/admin/passages/gichul";
    if (category === "LEET") return "/admin/passages/leet";
    return "/admin/passages/other";
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <Link
            href={getCategoryListPath(passage.category)}
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 내역 보기
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            {passage.title || "(제목 없음)"}
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)`, borderRadius: '2px' }}></span>
          </h1>
          </div>
          {passage.difficulty && (
            <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.9 }}>난이도 : {passage.difficulty}</p>
          )}
          {passage.source && (
            <p className="text-sm mb-3" style={{ color: '#13181B', opacity: 0.9 }}>출처: {passage.source}</p>
          )}
          {studentNames.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: '#13181B' }}>작성한 학생:</span>
              <div className="flex flex-wrap gap-2">
                {studentNames.map((name, idx) => {
                  const studentId = Object.keys(byStudent).find(
                    (id) => byStudent[id].name === name
                  );
                  return (
                    <Link
                      key={idx}
                      href={selectedStudentId === studentId 
                        ? `/admin/passages/${id}` 
                        : `/admin/passages/${id}?student=${studentId}`
                      }
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={selectedStudentId === studentId ? {
                        backgroundColor: categoryColor,
                        color: '#13181B'
                      } : {
                        backgroundColor: 'transparent',
                        color: '#13181B'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedStudentId !== studentId) {
                          e.currentTarget.style.backgroundColor = categoryColor;
                          e.currentTarget.style.color = '#13181B';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedStudentId !== studentId) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#13181B';
                        }
                      }}
                    >
                      {name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 왼쪽: 지문 내용 및 체크포인트 관리 */}
          <div className="flex-1 w-full">
            <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
              <Link
                href={`/admin/passages/${id}/edit-metadata`}
                className="px-3 md:px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors shadow-sm"
                style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                지문 정보 수정
              </Link>
              <Link
                href={`/admin/passages/${id}/edit-content`}
                className="px-3 md:px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors shadow-sm"
                style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                지문 내용 수정
              </Link>
              <button
              onClick={async () => {
                const confirmed = window.confirm(
                  `정말로 이 지문을 삭제하시겠습니까?\n\n제목: ${passage.title || "(제목 없음)"}\n\n이 작업은 되돌릴 수 없습니다.`
                );
                if (!confirmed) return;

                try {
                  // 관련 데이터 먼저 삭제 (CASCADE가 설정되어 있지 않을 수 있음)
                  await supabase
                    .from("student_checkpoint_record")
                    .delete()
                    .eq("passage_id", id);
                  
                  await supabase
                    .from("checkpoints")
                    .delete()
                    .eq("passage_id", id);

                  // 지문 삭제
                  const { error } = await supabase
                    .from("passages")
                    .delete()
                    .eq("id", id);

                  if (error) {
                    alert("삭제 실패: " + error.message);
                    return;
                  }

                  alert("지문이 삭제되었습니다.");
                  // 카테고리에 따라 적절한 목록 페이지로 이동
                  const category = passage.category;
                  if (category === "EBS") {
                    router.push("/admin/passages/ebs");
                  } else if (category === "기출") {
                    router.push("/admin/passages/gichul");
                  } else if (category === "LEET") {
                    router.push("/admin/passages/leet");
                  } else {
                    router.push("/admin/passages/other");
                  }
                } catch (error: any) {
                  alert("삭제 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"));
                }
              }}
                className="px-3 md:px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-colors shadow-sm"
                style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                지문 삭제
              </button>
            </div>

          {/* 지문 내용 미리보기 - 문단별로 표시 */}
          {passage.content && (
            <div className="mb-4 md:mb-6 rounded-xl p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
              <h3 className="font-semibold mb-4 text-lg" style={{ color: '#13181B' }}>지문 내용 (문단별)</h3>
              <div className="space-y-4">
                {paragraphs.map((paragraph: string, idx: number) => {
                  const paragraphNum = idx + 1;
                  const paragraphCheckpoints = checkpoints.filter((cp: any) => (cp.paragraph || 1) === paragraphNum);
                  // 하이라이트를 위해 원본 paragraph 사용 (줄바꿈을 공백으로 변환)
                  const normalizedParagraph = paragraph.trim().replace(/\n/g, " ");
                  
                  return (
                    <div key={idx} className="p-4 rounded-xl border-l-4" style={{ borderLeftColor: categoryColor }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: categoryColor, color: '#13181B' }}>{paragraphNum}문단</span>
                        <Link
                          href={`/admin/passages/${id}/add-checkpoint?paragraph=${paragraphNum}`}
                          className="text-xs px-3 py-1.5 rounded transition-colors shadow-sm"
                          style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                          }}
                        >
                          + 체크포인트 추가
                        </Link>
                      </div>
                      <div className="text-sm" style={{ color: '#13181B' }}>
                        <ParagraphWithHighlights
                          paragraph={normalizedParagraph}
                          checkpoints={paragraphCheckpoints}
                          currentUserId={currentUserId}
                          onHighlightClick={(cp) => setSelectedCheckpoint(cp)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ color: '#13181B' }}>체크포인트</h2>
              <Link
                href={`/admin/passages/${id}/add-checkpoint`}
                className="px-3 py-1.5 rounded-lg font-medium transition-colors text-sm shadow-sm"
                style={{ color: '#13181B', backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                + 체크포인트 추가
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {checkpoints.map((cp: any) => {
                const isMyCheckpoint = currentUserId && cp.teacher_id === currentUserId;
                const isEditing = editingCheckpointId === cp.id;
                const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#FFFFFF';
                
                return (
                  <div 
                    className="p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      backgroundColor: categoryBg,
                      borderLeft: `4px solid ${cp.category === "거시" ? '#13181B' : cp.category === "미시" ? '#13181B' : 'transparent'}`
                    }}
                    key={cp.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex gap-2 mb-2">
                              <button
                                onClick={() => setEditCheckpointCategory("거시")}
                                className="flex-1 px-3 py-2 text-xs rounded transition-colors font-semibold"
                                style={{ 
                                  backgroundColor: editCheckpointCategory === "거시" ? '#E8F0F8' : '#F0EEEB',
                                  border: `2px solid ${editCheckpointCategory === "거시" ? '#13181B' : '#CCD5DA'}`,
                                  color: '#13181B'
                                }}
                              >
                                거시
                              </button>
                              <button
                                onClick={() => setEditCheckpointCategory("미시")}
                                className="flex-1 px-3 py-2 text-xs rounded transition-colors font-semibold"
                                style={{ 
                                  backgroundColor: editCheckpointCategory === "미시" ? '#FFF5E8' : '#F0EEEB',
                                  border: `2px solid ${editCheckpointCategory === "미시" ? '#13181B' : '#CCD5DA'}`,
                                  color: '#13181B'
                                }}
                              >
                                미시
                              </button>
                            </div>
                            <textarea
                              value={editCheckpointText}
                              onChange={(e) => setEditCheckpointText(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              rows={3}
                              style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from("checkpoints")
                                    .update({ 
                                      text: editCheckpointText,
                                      category: editCheckpointCategory
                                    })
                                    .eq("id", cp.id);
                                  
                                  if (error) {
                                    alert("수정 실패: " + error.message);
                                  } else {
                                    alert("수정되었습니다.");
                                    setEditingCheckpointId(null);
                                    setEditCheckpointText("");
                                    setEditCheckpointCategory("미시");
                                    // 페이지 새로고침 또는 상태 업데이트
                                    window.location.reload();
                                  }
                                }}
                                className="px-3 py-1 text-xs rounded transition-colors"
                                style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              >
                                저장
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCheckpointId(null);
                                  setEditCheckpointText("");
                                  setEditCheckpointCategory("미시");
                                }}
                                className="px-3 py-1 text-xs rounded transition-colors"
                                style={{ color: '#13181B' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {cp.category && (
                                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                  backgroundColor: cp.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                  color: '#13181B'
                                }}>
                                  {cp.category}
                                </span>
                              )}
                              {cp.paragraph && (
                                <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                                  [{cp.paragraph}문단]
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#13181B' }}>{cp.text}</span>
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isMyCheckpoint && (
                            <button
                              onClick={() => {
                                setEditingCheckpointId(cp.id);
                                setEditCheckpointText(cp.text);
                                setEditCheckpointCategory(cp.category || "미시");
                              }}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: '#13181B' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              title="수정"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'brightness(0) saturate(100%)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          {isMyCheckpoint && (
                            <button
                              onClick={async () => {
                                if (!confirm("정말 삭제하시겠습니까?")) return;
                                
                                const { error } = await supabase
                                  .from("checkpoints")
                                  .delete()
                                  .eq("id", cp.id);
                                
                                if (error) {
                                  alert("삭제 실패: " + error.message);
                                } else {
                                  alert("삭제되었습니다.");
                                  window.location.reload();
                                }
                              }}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: '#13181B' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                              title="삭제"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'brightness(0) saturate(100%)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* 체크포인트 상세 모달 */}
          {selectedCheckpoint && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={() => setSelectedCheckpoint(null)}
            >
              <div 
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold" style={{ color: '#13181B' }}>체크포인트 상세</h3>
                  <button
                    onClick={() => setSelectedCheckpoint(null)}
                    className="p-2 rounded transition-colors"
                    style={{ color: '#13181B' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0EEEB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {selectedCheckpoint.paragraph && (
                  <div className="mb-3">
                    <span className="text-sm font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: categoryColor, color: '#13181B' }}>
                      [{selectedCheckpoint.paragraph}문단]
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>체크포인트 내용:</p>
                  <p className="text-base whitespace-pre-wrap" style={{ color: '#13181B' }}>{selectedCheckpoint.text}</p>
                </div>
                {selectedCheckpoint.highlighted_text && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>하이라이트:</p>
                    <p className="text-base" style={{ color: '#13181B' }}>{selectedCheckpoint.highlighted_text}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 오른쪽: 학생 제출 현황 */}
          <div className="w-full lg:w-96 flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-3 border-b" style={{ borderBottomColor: '#CCD5DA' }}>
              <h2 className="text-xl md:text-2xl font-bold" style={{ color: '#13181B' }}>학생 제출 현황</h2>
              <Link
                href={`/admin/passages/${id}/results`}
                className="text-xs transition-colors"
                style={{ color: '#13181B', opacity: 0.7 }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                자세히
              </Link>
            </div>

            {Object.keys(filteredByStudent).length > 0 ? (
              <div className="space-y-4 max-h-[600px] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
                {Object.entries(filteredByStudent).map(([userId, studentData]: [string, any]) => (
                  <div key={userId} className="rounded-xl p-4 md:p-5 transition-all duration-300 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                       }}>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b-2" style={{ borderBottomColor: '#CCD5DA' }}>
                      <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>
                      {studentData.name} 님 ({studentData.submissions.length}개 제출)
                    </h3>
                      <button
                        onClick={async () => {
                          if (!confirm(`이 학생의 이 지문에 작성한 모든 체크포인트(1,2,3차 모든 문단)를 삭제하시겠습니까?`)) return;
                          const { error } = await supabase
                            .from("student_checkpoint_record")
                            .delete()
                            .eq("passage_id", id as string)
                            .eq("user_id", userId);
                          
                          if (error) {
                            alert("삭제에 실패했습니다: " + error.message);
                          } else {
                            alert("해당 학생의 이 지문에 작성한 모든 체크포인트가 삭제되었습니다.");
                            // 페이지 새로고침 또는 상태 업데이트
                            window.location.reload();
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded transition-all font-semibold"
                        style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        title="이 학생의 이 지문 전체 체크포인트 삭제"
                      >
                        전체 삭제
                      </button>
                    </div>

                    <div className="space-y-3">
                      {paragraphs.map((paragraph: string, idx: number) => {
                        const paragraphNum = idx + 1;
                        // 해당 문단의 모든 attempt_number 제출 찾기
                        const submissions = studentData.submissions.filter(
                          (s: any) => {
                            const paraNum = s.paragraph;
                            return paraNum === paragraphNum;
                          }
                        ).sort((a: any, b: any) => (a.attempt_number || 1) - (b.attempt_number || 1));

                        // attempt_number별로 그룹화
                        const submissionsByAttempt = submissions.reduce((acc: any, sub: any) => {
                          const attempt = sub.attempt_number || 1;
                          if (!acc[attempt]) acc[attempt] = [];
                          acc[attempt].push(sub);
                          return acc;
                        }, {});

                        const attemptNumbers = Object.keys(submissionsByAttempt).map(Number).sort((a, b) => a - b);

                        return (
                          <ParagraphSubmissions 
                            key={idx}
                            paragraphNum={paragraphNum}
                            categoryColor={categoryColor}
                            submissionsByAttempt={submissionsByAttempt}
                            attemptNumbers={attemptNumbers}
                            studentFeedbacks={studentFeedbacks}
                            comments={comments}
                            commentTexts={commentTexts}
                            showCommentInput={showCommentInput}
                            setCommentTexts={setCommentTexts}
                            setShowCommentInput={setShowCommentInput}
                            setComments={setComments}
                            setStudentFeedbacks={setStudentFeedbacks}
                            supabase={supabase}
                            passageId={id as string}
                            studentUserId={userId}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>아직 제출한 학생이 없습니다.</p>
              </div>
            )}

          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 문단별 제출 현황 컴포넌트
function ParagraphSubmissions({
  paragraphNum,
  categoryColor,
  submissionsByAttempt,
  attemptNumbers,
  studentFeedbacks,
  comments,
  commentTexts,
  showCommentInput,
  setCommentTexts,
  setShowCommentInput,
  setComments,
  setStudentFeedbacks,
  supabase,
  passageId,
  studentUserId,
}: {
  paragraphNum: number;
  categoryColor: string;
  submissionsByAttempt: Record<number, any[]>;
  attemptNumbers: number[];
  studentFeedbacks: Record<string, any>;
  comments: Record<string, any[]>;
  commentTexts: Record<string, string>;
  showCommentInput: Record<string, boolean>;
  setCommentTexts: (prev: any) => void;
  setShowCommentInput: (prev: any) => void;
  setComments: (prev: any) => void;
  setStudentFeedbacks: (prev: any) => void;
  supabase: any;
  passageId: string;
  studentUserId: string;
}) {

  // 기본값을 첫 번째 attempt로 설정
  const [selectedAttempt, setSelectedAttempt] = useState<number | null>(
    attemptNumbers.length > 0 ? attemptNumbers[0] : null
  );

  const currentSubmissions = selectedAttempt === null 
    ? []
    : (submissionsByAttempt[selectedAttempt] || []);

  return (
    <div className="border-l-4 pl-3 py-2" style={{ borderLeftColor: '#CCD5DA' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold px-3 py-1.5 rounded" style={{ backgroundColor: '#F0EEEB', color: '#13181B' }}>
                                {paragraphNum}문단
                              </span>
        {attemptNumbers.length > 0 && (
                                <div className="flex gap-1">
            {attemptNumbers.map((attemptNum) => (
              <button
                key={attemptNum}
                onClick={() => setSelectedAttempt(attemptNum)}
                className="px-3 py-1.5 text-xs rounded transition-all font-semibold"
                style={selectedAttempt === attemptNum ? {
                  backgroundColor: '#13181B',
                  color: '#F0EEEB'
                } : {
                  backgroundColor: 'transparent',
                  color: '#13181B'
                }}
              >
                {attemptNum}차
              </button>
                                  ))}
                                </div>
                              )}
                            </div>

      {/* 선택된 attempt_number의 체크포인트 표시 */}
      {currentSubmissions.length > 0 ? (
                              <div className="space-y-2">
          {currentSubmissions.map((submission: any) => (
            <div key={submission.id} className="rounded-xl p-3 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded" style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}>
                                        {submission.attempt_number || 1}차
                                      </span>
                <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                        {submission.created_at ? new Date(submission.created_at).toLocaleDateString('ko-KR') : ''}
                                      </span>
                                    </div>

                                    {/* 체크포인트 */}
              <div className="mb-2">
                                      {submission?.checkpoint_text && submission.checkpoint_text.trim() ? (
                  <div>
                                          {/* 거시/미시 카테고리 표시 (국어 지문만) */}
                                          {submission.category && (
                                            <div className="mb-2">
                                              <span className="text-xs font-semibold px-2 py-1 rounded" style={{ 
                                                backgroundColor: submission.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                                color: '#13181B'
                                              }}>
                                                {submission.category} 체크
                                              </span>
                                            </div>
                                          )}
                                          <div className="text-xs p-3 rounded" style={{ color: '#13181B' }}>
                                            {submission.checkpoint_text}
                                          </div>
                                        </div>
                                      ) : (
                  <span className="text-xs italic" style={{ color: '#13181B', opacity: 0.6 }}>체크포인트 없음</span>
                                      )}
                                    </div>

                                    {/* 모름 사유 */}
                                    {submission?.reason && (
                <div className="mt-2 p-3 rounded border-l-4" style={{ borderLeftColor: '#CCD5DA' }}>
                  <span className="text-xs font-semibold" style={{ color: '#13181B' }}>⚠️ 모름: </span>
                  <span className="text-xs whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                          {submission.reason}
                                        </span>
                                      </div>
                                    )}

                                    {/* 학생 자기 피드백 */}
                                    {studentFeedbacks[submission.id] && (
                <div className="mt-2 p-3 rounded-xl shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                                            ✍️ 학생 자기 피드백
                                          </span>
                                          {!studentFeedbacks[submission.id].teacher_viewed && (
                      <span className="text-xs text-white px-3 py-1.5 rounded" style={{ backgroundColor: '#13181B' }}>
                                              NEW
                                            </span>
                                          )}
                                        </div>
                  <div className="text-xs whitespace-pre-wrap mt-1" style={{ color: '#13181B' }}>
                                          {studentFeedbacks[submission.id].feedback_text}
                                        </div>
                                        <button
                                          onClick={async () => {
                                            const { error } = await supabase
                                              .from("student_feedback")
                                              .update({ teacher_viewed: true })
                                              .eq("id", studentFeedbacks[submission.id].id);

                                            if (!error) {
                        setStudentFeedbacks((prev: any) => ({
                                                ...prev,
                                                [submission.id]: {
                                                  ...prev[submission.id],
                                                  teacher_viewed: true,
                                                },
                                              }));
                                            }
                                          }}
                    className="mt-2 text-xs transition-colors"
                    style={{ color: '#13181B' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                        >
                                          확인 완료
                                        </button>
                                      </div>
                                    )}

                                    {/* 댓글 섹션 */}
                                    <div className="mt-2">
                                      <button
                                        onClick={() => {
                    setShowCommentInput((prev: any) => ({
                                            ...prev,
                                            [submission.id]: !prev[submission.id],
                                          }));
                                        }}
                  className="text-xs mb-2 transition-colors"
                  style={{ color: '#13181B' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                      >
                                        댓글 {comments[submission.id]?.length || 0}개
                                      </button>

                                      {/* 기존 댓글 */}
                                      {comments[submission.id] && comments[submission.id].length > 0 && (
                                        <div className="space-y-2 mb-2">
                                          {comments[submission.id].map((comment: any) => (
                      <div key={comment.id} className="p-3 rounded text-xs">
                        <div className="font-semibold mb-1" style={{ color: '#13181B' }}>선생님</div>
                        <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                                {comment.comment_text}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* 댓글 입력 */}
                                      {showCommentInput[submission.id] && (
                                        <div className="mt-2">
                                          <textarea
                                            value={commentTexts[submission.id] || ""}
                                            onChange={(e) => {
                        setCommentTexts((prev: any) => ({
                                                ...prev,
                                                [submission.id]: e.target.value,
                                              }));
                                            }}
                                            placeholder="댓글을 입력하세요..."
                      className="w-full text-xs p-2 rounded-xl mb-2 transition-all shadow-sm"
                      style={{ backgroundColor: '#FFFFFF', color: '#13181B' }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)'}
                                            rows={3}
                                          />
                                          <button
                                            onClick={async () => {
                                              const { data: { user } } = await supabase.auth.getUser();
                                              if (!user) return;

                                              const { error } = await supabase
                                                .from("teacher_comments")
                                                .insert({
                                                  student_submission_id: submission.id,
                                                  teacher_id: user.id,
                                                  comment_text: commentTexts[submission.id] || "",
                                                });

                                              if (error) {
                                                alert("댓글 작성 실패: " + error.message);
                                              } else {
                          setCommentTexts((prev: any) => ({
                                                  ...prev,
                                                  [submission.id]: "",
                                                }));
                          setShowCommentInput((prev: any) => ({
                                                  ...prev,
                                                  [submission.id]: false,
                                                }));
                                                // 댓글 다시 로드
                                                const { data: commentsData } = await supabase
                                                  .from("teacher_comments")
                                                  .select("*")
                                                  .eq("student_submission_id", submission.id)
                                                  .order("created_at", { ascending: false });
                                                if (commentsData) {
                            setComments((prev: any) => ({
                                                    ...prev,
                                                    [submission.id]: commentsData,
                                                  }));
                                                }
                                              }
                                            }}
                      className="text-xs text-white px-3 py-1 rounded transition-colors"
                      style={{ backgroundColor: categoryColor }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                          >
                                            댓글 작성
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
        <div className="text-xs italic" style={{ color: '#13181B', opacity: 0.6 }}>아직 제출하지 않음</div>
            )}
    </div>
  );
}

// 문단에 하이라이트를 적용하는 컴포넌트
function ParagraphWithHighlights({
  paragraph,
  checkpoints,
  currentUserId,
  onHighlightClick,
}: {
  paragraph: string;
  checkpoints: any[];
  currentUserId: string | null;
  onHighlightClick?: (cp: any) => void;
}) {
  // 본인이 작성한 체크포인트만 필터링
  const myCheckpoints = checkpoints.filter((cp: any) => 
    currentUserId && cp.teacher_id === currentUserId
  );

  if (myCheckpoints.length === 0) {
    return <div className="text-sm" style={{ color: '#13181B' }}>{paragraph}</div>;
  }

  // 하이라이트 정보를 정렬 (start 위치 기준)
  const sortedCheckpoints = [...myCheckpoints].sort((a, b) => {
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
          {paragraph.substring(lastIndex, start)}
        </span>
      );
    }

    // 하이라이트된 텍스트
    const highlightedText = paragraph.substring(start, end);
    if (highlightedText) {
      const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#FFFBE6';
      const categoryHoverBg = cp.category === "거시" ? '#D4E4F4' : cp.category === "미시" ? '#FFE5CC' : '#FFF9D6';
      elements.push(
        <span
          key={`highlight-${idx}`}
          className="rounded text-sm font-medium cursor-pointer"
          style={{ 
            backgroundColor: categoryBg, 
            color: '#13181B', 
            padding: '2px 4px',
            borderBottom: `2px solid ${cp.category === "거시" ? '#D4E4F4' : cp.category === "미시" ? '#FFE5CC' : 'transparent'}`
          }}
          onClick={() => onHighlightClick?.(cp)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = categoryHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = categoryBg;
          }}
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
      <span key="text-after" className="text-sm" style={{ color: '#13181B' }}>
        {paragraph.substring(lastIndex)}
      </span>
    );
  }

  return <div className="text-sm text-gray-700">{elements}</div>;
}
