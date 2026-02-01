"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  title: string;
  content: string;
  student_id: string;
  subject: "korean" | "english";
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  student_name?: string;
  comment_count?: number;
}

export default function StudentQuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // 현재 선택한 과목 가져오기
      let currentSubject: "korean" | "english" = "korean";
      if (typeof window !== 'undefined') {
        const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
        if (savedSubject) {
          currentSubject = savedSubject;
        }
      }
      setSelectedSubject(currentSubject);

      // 사용자 역할 확인
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      const isTeacher = userData?.role === "teacher";

      // 질문 목록 가져오기
      // 선생님: 모든 질문, 학생: 자신이 작성한 질문만
      let query = supabase
        .from("questions")
        .select("*")
        .eq("subject", currentSubject);
      
      // 학생인 경우 자신이 작성한 질문만 필터링
      if (!isTeacher) {
        query = query.eq("student_id", user.id);
      }
      
      const { data: questionsData, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("질문 목록 로드 실패:", error);
      } else if (questionsData) {
        // 학생 이름 가져오기
        const studentIds = [...new Set(questionsData.map((q: any) => q.student_id))];
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name")
          .in("id", studentIds);

        const usersMap = new Map(
          (usersData || []).map((u: any) => [u.id, u.name])
        );

        // 각 질문의 댓글 개수 가져오기
        const questionIds = questionsData.map((q: any) => q.id);
        const { data: commentsData } = await supabase
          .from("question_comments")
          .select("question_id")
          .in("question_id", questionIds);

        const commentCountMap = new Map<string, number>();
        (commentsData || []).forEach((c: any) => {
          commentCountMap.set(c.question_id, (commentCountMap.get(c.question_id) || 0) + 1);
        });

        setQuestions(questionsData.map((q: any) => ({
          ...q,
          student_name: usersMap.get(q.student_id) || "학생",
          comment_count: commentCountMap.get(q.id) || 0,
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [router]);

  // 영어 페이지 접근 시 세션 스토리지에 영어 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/questions')) {
        // questions 페이지는 현재 선택된 과목을 유지
        const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
        if (savedSubject) {
          setSelectedSubject(savedSubject);
        }
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
                {selectedSubject === "korean" ? "국어" : "영어"} 질문 게시판
                <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
              </h1>
            </div>
            <Link
              href="/student/questions/new"
              className="px-4 py-2 rounded-lg font-semibold transition-all"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              질문 작성
            </Link>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>
            문제에 대한 질문을 올리고 선생님의 답변을 받아보세요.
          </p>
        </div>

        <div className="rounded-xl p-4 md:p-6 lg:p-8 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          {questions.length === 0 ? (
            <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
              <p style={{ color: '#13181B', opacity: 0.7 }}>아직 질문이 없습니다. 첫 질문을 작성해보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 질문 목록 */}
              <div className="lg:col-span-1 space-y-4">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    onClick={() => setSelectedQuestion(question)}
                    className="border-2 rounded-xl p-4 cursor-pointer transition-all"
                    style={{
                      backgroundColor: selectedQuestion?.id === question.id ? '#CCD5DA' : '#F0EEEB',
                      borderColor: question.is_resolved ? '#3B82F6' : '#13181B'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedQuestion?.id !== question.id) {
                        e.currentTarget.style.backgroundColor = '#CCD5DA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedQuestion?.id !== question.id) {
                        e.currentTarget.style.backgroundColor = '#F0EEEB';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {question.is_resolved && (
                        <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}>
                          답변완료
                        </span>
                      )}
                      <h3 className="font-bold text-sm flex-1" style={{ color: '#13181B' }}>
                        {question.title}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                      <span>{question.student_name}</span>
                      <span>{question.comment_count}개 댓글</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#13181B', opacity: 0.7 }}>
                      {new Date(question.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 질문 상세 */}
              <div className="lg:col-span-2">
                {selectedQuestion ? (
                  <QuestionDetail 
                    questionId={selectedQuestion.id} 
                    onDelete={() => {
                      // 질문 삭제 후 목록 새로고침
                      setSelectedQuestion(null);
                      // 질문 목록 다시 불러오기
                      const reloadQuestions = async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        const currentSubject = selectedSubject;
                        
                        // 사용자 역할 확인
                        const { data: { user: reloadUser } } = await supabase.auth.getUser();
                        if (!reloadUser) return;
                        
                        const { data: reloadUserData } = await supabase
                          .from("users")
                          .select("role")
                          .eq("id", reloadUser.id)
                          .single();
                        
                        const isTeacher = reloadUserData?.role === "teacher";
                        
                        // 질문 목록 가져오기
                        let reloadQuery = supabase
                          .from("questions")
                          .select("*")
                          .eq("subject", currentSubject);
                        
                        // 학생인 경우 자신이 작성한 질문만 필터링
                        if (!isTeacher) {
                          reloadQuery = reloadQuery.eq("student_id", reloadUser.id);
                        }
                        
                        const { data: questionsData, error } = await reloadQuery.order("created_at", { ascending: false });

                        if (!error && questionsData) {
                          const studentIds = [...new Set(questionsData.map((q: any) => q.student_id))];
                          const { data: usersData } = await supabase
                            .from("users")
                            .select("id, name")
                            .in("id", studentIds);

                          const usersMap = new Map(
                            (usersData || []).map((u: any) => [u.id, u.name])
                          );

                          const questionIds = questionsData.map((q: any) => q.id);
                          const { data: commentsData } = await supabase
                            .from("question_comments")
                            .select("question_id")
                            .in("question_id", questionIds);

                          const commentCountMap = new Map<string, number>();
                          (commentsData || []).forEach((c: any) => {
                            commentCountMap.set(c.question_id, (commentCountMap.get(c.question_id) || 0) + 1);
                          });

                          setQuestions(questionsData.map((q: any) => ({
                            ...q,
                            student_name: usersMap.get(q.student_id) || "학생",
                            comment_count: commentCountMap.get(q.id) || 0,
                          })));
                        }
                      };
                      reloadQuestions();
                    }}
                  />
                ) : (
                  <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                    <p style={{ color: '#13181B', opacity: 0.7 }}>질문을 선택하면 상세 내용을 볼 수 있습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 질문 상세 컴포넌트
function QuestionDetail({ questionId, onDelete }: { questionId: string; onDelete?: () => void }) {
  const [question, setQuestion] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setTeacherId(user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (userData?.role === "teacher") {
          setIsTeacher(true);
        }
      }

      // 질문 상세 가져오기
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select(`
          *,
          users(id, name)
        `)
        .eq("id", questionId)
        .single();

      if (questionError) {
        console.error("질문 로드 실패:", questionError);
      } else if (questionData) {
        // 이미지 파일 링크를 실제 이미지로 변환
        let processedContent = questionData.content || '';
        
        // 📎 파일명.png 형태의 링크를 이미지로 변환
        const imageLinkRegex = /<a[^>]+href=["']([^"']+\.(png|jpg|jpeg|gif|webp|svg))["'][^>]*>📎\s*([^<]+)<\/a>/gi;
        processedContent = processedContent.replace(imageLinkRegex, (...args: string[]) => {
          const url = args[1];
          const filename = args[3];
          // 이미지 파일이면 <img> 태그로 변환
          return `<img src="${url}" alt="${filename}" style="max-width: 100%; height: auto; display: block; margin: 1em 0;" />`;
        });
        
        setQuestion({
          ...questionData,
          content: processedContent,
          student_name: questionData.users?.name || "학생",
        });
      }

      // 댓글 가져오기
      const { data: commentsData, error: commentsError } = await supabase
        .from("question_comments")
        .select(`
          *,
          users(id, name, role)
        `)
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });

      if (commentsError) {
        console.error("댓글 로드 실패:", commentsError);
      } else if (commentsData) {
        // 원댓글과 대댓글 분리
        const topLevelComments: any[] = [];
        const repliesMap: Record<string, any[]> = {};
        
        commentsData.forEach((c: any) => {
          const comment = {
            ...c,
            teacher_name: c.users?.name || (c.users?.role === "teacher" ? "선생님" : "학생"),
          };
          
          if (c.parent_comment_id) {
            // 대댓글
            if (!repliesMap[c.parent_comment_id]) {
              repliesMap[c.parent_comment_id] = [];
            }
            repliesMap[c.parent_comment_id].push(comment);
          } else {
            // 원댓글
            topLevelComments.push(comment);
          }
        });
        
        setComments(topLevelComments);
        setReplies(repliesMap);
      }

      setLoading(false);
    };

    loadData();
  }, [questionId]);

  // 이미지가 제대로 로드되도록 처리
  useEffect(() => {
    if (question?.content) {
      setTimeout(() => {
        const contentDiv = document.querySelector('.quill-content');
        if (contentDiv) {
          const images = contentDiv.querySelectorAll('img');
          images.forEach((imgElement) => {
            const img = imgElement as HTMLImageElement;
            // 이미지 스타일 강제 적용
            img.style.display = 'block';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.margin = '1em 0';
            img.style.objectFit = 'contain';
            
            // 이미지 로드 실패 시 처리
            if (!img.complete || img.naturalHeight === 0) {
              img.onerror = () => {
                console.error('Image failed to load:', img.src);
                img.style.display = 'none';
              };
              // 이미지 다시 로드 시도
              const src = img.src;
              if (src) {
                img.src = '';
                img.src = src;
              }
            }
          });
        }
      }, 200);
    }
  }, [question?.content]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    const { error } = await supabase
      .from("question_comments")
      .insert({
        question_id: questionId,
        teacher_id: currentUserId, // 학생도 댓글을 달 수 있도록 (필드명은 teacher_id지만 모든 사용자 사용)
        content: newComment.trim(),
      });

    if (error) {
      alert("댓글 작성에 실패했습니다: " + error.message);
    } else {
      setNewComment("");
      // 댓글 다시 불러오기
      const { data: commentsData } = await supabase
        .from("question_comments")
        .select(`
          *,
          users(id, name, role)
        `)
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });

      if (commentsData) {
        // 원댓글과 대댓글 분리
        const topLevelComments: any[] = [];
        const repliesMap: Record<string, any[]> = {};
        
        commentsData.forEach((c: any) => {
          const comment = {
            ...c,
            teacher_name: c.users?.name || (c.users?.role === "teacher" ? "선생님" : "학생"),
          };
          
          if (c.parent_comment_id) {
            // 대댓글
            if (!repliesMap[c.parent_comment_id]) {
              repliesMap[c.parent_comment_id] = [];
            }
            repliesMap[c.parent_comment_id].push(comment);
          } else {
            // 원댓글
            topLevelComments.push(comment);
          }
        });
        
        setComments(topLevelComments);
        setReplies(repliesMap);
      }
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    const replyContent = replyText[parentCommentId];
    if (!replyContent?.trim() || !currentUserId) return;

    const { error } = await supabase
      .from("question_comments")
      .insert({
        question_id: questionId,
        parent_comment_id: parentCommentId,
        teacher_id: currentUserId,
        content: replyContent.trim(),
      });

    if (error) {
      alert("대댓글 작성에 실패했습니다: " + error.message);
    } else {
      setReplyText({ ...replyText, [parentCommentId]: "" });
      setReplyingTo(null);
      // 댓글 다시 불러오기
      const { data: commentsData } = await supabase
        .from("question_comments")
        .select(`
          *,
          users(id, name, role)
        `)
        .eq("question_id", questionId)
        .order("created_at", { ascending: true });

      if (commentsData) {
        // 원댓글과 대댓글 분리
        const topLevelComments: any[] = [];
        const repliesMap: Record<string, any[]> = {};
        
        commentsData.forEach((c: any) => {
          const comment = {
            ...c,
            teacher_name: c.users?.name || (c.users?.role === "teacher" ? "선생님" : "학생"),
          };
          
          if (c.parent_comment_id) {
            // 대댓글
            if (!repliesMap[c.parent_comment_id]) {
              repliesMap[c.parent_comment_id] = [];
            }
            repliesMap[c.parent_comment_id].push(comment);
          } else {
            // 원댓글
            topLevelComments.push(comment);
          }
        });
        
        setComments(topLevelComments);
        setReplies(repliesMap);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <p style={{ color: '#13181B', opacity: 0.7 }}>로딩 중...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-10">
        <p style={{ color: '#13181B', opacity: 0.7 }}>질문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 질문 내용 */}
      <div className="p-6 rounded-xl border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>
            {question.title}
          </h2>
          <div className="flex items-center gap-2">
            {question.is_resolved && (
              <span className="text-xs font-bold px-3 py-1 rounded" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}>
                답변완료
              </span>
            )}
            {/* 본인 질문만 삭제 가능 */}
            {currentUserId && question.student_id === currentUserId && (
              <button
                onClick={async () => {
                  if (!confirm("이 질문을 삭제하시겠습니까? 관련 이미지와 파일도 함께 삭제됩니다.")) return;
                  
                  try {
                    // 먼저 관련 파일 삭제
                    const deleteResponse = await fetch("/api/delete-question-files", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        questionId: question.id,
                        content: question.content,
                      }),
                    });

                    // 질문 삭제
                    const { error } = await supabase
                      .from("questions")
                      .delete()
                      .eq("id", question.id);

                    if (error) {
                      alert("질문 삭제에 실패했습니다: " + error.message);
                    } else {
                      alert("질문이 삭제되었습니다.");
                      // 부모 컴포넌트에 삭제 완료 알림
                      if (onDelete) {
                        onDelete();
                      } else {
                        // 폴백: 페이지 새로고침
                        router.refresh();
                      }
                    }
                  } catch (error: any) {
                    alert("삭제 중 오류가 발생했습니다: " + error.message);
                  }
                }}
                className="p-1.5 rounded transition-all hover:bg-gray-200"
                style={{ color: '#13181B' }}
                title="삭제"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                  style={{ color: '#13181B' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="text-sm mb-4" style={{ color: '#13181B', opacity: 0.7 }}>
          작성자: {question.student_name} | {new Date(question.created_at).toLocaleDateString('ko-KR')}
        </div>
        <div 
          className="text-base leading-relaxed quill-content"
          style={{ color: '#13181B', lineHeight: '1.8' }}
          dangerouslySetInnerHTML={{ __html: question.content || '' }}
        />
        <style jsx global>{`
          .ql-editor,
          .quill-content {
            padding: 0;
          }
          .ql-editor p,
          .quill-content p {
            margin: 1em 0;
            white-space: pre-wrap;
          }
          .ql-editor ol,
          .ql-editor ul,
          .quill-content ol,
          .quill-content ul {
            margin: 1em 0;
            padding-left: 1.5em;
          }
          .ql-editor li,
          .quill-content li {
            margin: 0.5em 0;
            white-space: pre-wrap;
            line-height: 1.8;
          }
          .ql-editor li p,
          .quill-content li p {
            margin: 0;
            white-space: pre-wrap;
          }
          .ql-editor ol li,
          .ql-editor ul li,
          .quill-content ol li,
          .quill-content ul li {
            display: list-item;
            white-space: pre-wrap;
          }
          .ql-editor pre,
          .ql-editor blockquote,
          .ql-editor h1,
          .ql-editor h2,
          .ql-editor h3,
          .ql-editor h4,
          .ql-editor h5,
          .ql-editor h6,
          .quill-content pre,
          .quill-content blockquote,
          .quill-content h1,
          .quill-content h2,
          .quill-content h3,
          .quill-content h4,
          .quill-content h5,
          .quill-content h6 {
            margin: 1em 0;
          }
          .ql-editor img,
          .quill-content img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 1em 0 !important;
            object-fit: contain !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          /* Quill의 image embed도 처리 */
          .ql-editor .ql-image,
          .quill-content .ql-image {
            display: inline-block !important;
          }
          .ql-editor .ql-image img,
          .quill-content .ql-image img {
            display: block !important;
            max-width: 100% !important;
            height: auto !important;
          }
          .ql-editor hr,
          .quill-content hr {
            border-top: 2px solid #CCD5DA;
            margin: 20px 0;
          }
          /* 들여쓰기 스타일 - Quill은 클래스 기반으로 작동 (ql-indent-1, ql-indent-2 등) */
          .ql-editor .ql-indent-1,
          .quill-content .ql-indent-1,
          .ql-editor p.ql-indent-1,
          .quill-content p.ql-indent-1,
          .ql-editor div.ql-indent-1,
          .quill-content div.ql-indent-1 {
            padding-left: 3em !important;
          }
          .ql-editor .ql-indent-2,
          .quill-content .ql-indent-2,
          .ql-editor p.ql-indent-2,
          .quill-content p.ql-indent-2,
          .ql-editor div.ql-indent-2,
          .quill-content div.ql-indent-2 {
            padding-left: 6em !important;
          }
          .ql-editor .ql-indent-3,
          .quill-content .ql-indent-3,
          .ql-editor p.ql-indent-3,
          .quill-content p.ql-indent-3,
          .ql-editor div.ql-indent-3,
          .quill-content div.ql-indent-3 {
            padding-left: 9em !important;
          }
          .ql-editor .ql-indent-4,
          .quill-content .ql-indent-4,
          .ql-editor p.ql-indent-4,
          .quill-content p.ql-indent-4,
          .ql-editor div.ql-indent-4,
          .quill-content div.ql-indent-4 {
            padding-left: 12em !important;
          }
          .ql-editor .ql-indent-5,
          .quill-content .ql-indent-5,
          .ql-editor p.ql-indent-5,
          .quill-content p.ql-indent-5,
          .ql-editor div.ql-indent-5,
          .quill-content div.ql-indent-5 {
            padding-left: 15em !important;
          }
          .ql-editor .ql-indent-6,
          .quill-content .ql-indent-6,
          .ql-editor p.ql-indent-6,
          .quill-content p.ql-indent-6,
          .ql-editor div.ql-indent-6,
          .quill-content div.ql-indent-6 {
            padding-left: 18em !important;
          }
          .ql-editor .ql-indent-7,
          .quill-content .ql-indent-7,
          .ql-editor p.ql-indent-7,
          .quill-content p.ql-indent-7,
          .ql-editor div.ql-indent-7,
          .quill-content div.ql-indent-7 {
            padding-left: 21em !important;
          }
          .ql-editor .ql-indent-8,
          .quill-content .ql-indent-8,
          .ql-editor p.ql-indent-8,
          .quill-content p.ql-indent-8,
          .ql-editor div.ql-indent-8,
          .quill-content div.ql-indent-8 {
            padding-left: 24em !important;
          }
          /* inline style로 적용된 경우도 처리 */
          .ql-editor [style*="padding-left"],
          .quill-content [style*="padding-left"] {
            /* inline style이 우선순위가 높으므로 그대로 적용됨 */
          }
          /* 리스트 들여쓰기 */
          .ql-editor ol,
          .ql-editor ul,
          .quill-content ol,
          .quill-content ul {
            padding-left: 1.5em;
          }
          .ql-editor li,
          .quill-content li {
            padding-left: 0.5em;
          }
        `}</style>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>
          댓글 ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#F0EEEB' }}>
            <p style={{ color: '#13181B', opacity: 0.7 }}>아직 댓글이 없습니다.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <div
                className="p-4 rounded-xl border-2"
                style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: '#13181B' }}>
                      {comment.teacher_name}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                    {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm mb-3" style={{ color: '#13181B' }}>
                  {comment.content}
                </div>
                {currentUserId && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs px-3 py-1 rounded transition-all"
                    style={{ 
                      backgroundColor: replyingTo === comment.id ? '#CCD5DA' : '#F0EEEB',
                      color: '#13181B'
                    }}
                  >
                    {replyingTo === comment.id ? '취소' : '답글'}
                  </button>
                )}
              </div>
              
              {/* 대댓글 목록 */}
              {replies[comment.id] && replies[comment.id].length > 0 && (
                <div className="ml-6 space-y-2 border-l-2 pl-4" style={{ borderColor: '#CCD5DA' }}>
                  {replies[comment.id].map((reply: any) => (
                    <div
                      key={reply.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                            {reply.teacher_name}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                          {new Date(reply.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap text-xs" style={{ color: '#13181B' }}>
                        {reply.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 대댓글 작성 폼 */}
              {replyingTo === comment.id && currentUserId && (
                <div className="ml-6 p-3 rounded-lg border" style={{ borderColor: '#CCD5DA', backgroundColor: '#F0EEEB' }}>
                  <textarea
                    value={replyText[comment.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border-2 mb-2 text-sm"
                    style={{ borderColor: '#CCD5DA', color: '#13181B' }}
                    placeholder="답글을 작성해주세요..."
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }}
                  />
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText[comment.id]?.trim()}
                    className="text-xs px-4 py-1.5 rounded font-semibold transition-all"
                    style={{
                      backgroundColor: '#13181B',
                      color: '#F0EEEB',
                      opacity: replyText[comment.id]?.trim() ? 1 : 0.6,
                    }}
                  >
                    답글 작성
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 댓글 작성 (모든 사용자) */}
      {currentUserId && (
        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
          <h4 className="font-semibold mb-3" style={{ color: '#13181B' }}>댓글 작성</h4>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border-2 mb-3"
            style={{ borderColor: '#CCD5DA', color: '#13181B' }}
            placeholder="답변을 작성해주세요..."
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#13181B';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#CCD5DA';
            }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="px-6 py-2 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: '#13181B',
              color: '#F0EEEB',
              opacity: newComment.trim() ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (newComment.trim()) {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            댓글 작성
          </button>
        </div>
      )}
    </div>
  );
}
