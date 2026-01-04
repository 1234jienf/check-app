"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  title: string;
  content: string;
  subject: "korean" | "english";
  student_id: string;
  student_name?: string;
  is_resolved: boolean;
  created_at: string;
  comment_count?: number;
}

export default function AdminQuestionsPage() {
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
        const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
        if (savedSubject) {
          currentSubject = savedSubject;
        }
      }
      setSelectedSubject(currentSubject);

      // 질문 목록 가져오기 (현재 과목에 맞는 것만, 최신순)
      const { data: questionsData, error } = await supabase
        .from("questions")
        .select(`
          *,
          users(id, name)
        `)
        .eq("subject", currentSubject)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("질문 목록 로드 실패:", error);
      } else if (questionsData) {
        // 각 질문의 댓글 개수 가져오기
        const questionsWithCounts = await Promise.all(
          questionsData.map(async (q: any) => {
            const { count } = await supabase
              .from("question_comments")
              .select("*", { count: "exact", head: true })
              .eq("question_id", q.id);
            
            return {
              ...q,
              student_name: q.users?.name || "학생",
              comment_count: count || 0,
            };
          })
        );
        setQuestions(questionsWithCounts);
      }

      setLoading(false);
    };

    loadData();
  }, [router, selectedSubject]);

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
            <button
              onClick={async () => {
                if (!confirm("1년 이상 된 질문의 이미지와 파일을 정리하시겠습니까?")) return;
                
                try {
                  const response = await fetch("/api/cleanup-old-question-files", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ daysOld: 365 }),
                  });

                  const data = await response.json();
                  
                  if (data.error) {
                    alert("정리 실패: " + data.error);
                  } else {
                    alert(`정리 완료: ${data.deletedFiles}개의 파일이 삭제되었습니다. (${data.processedQuestions}개 질문 처리)`);
                  }
                } catch (error: any) {
                  alert("정리 중 오류가 발생했습니다: " + error.message);
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#13181B';
                e.currentTarget.style.color = '#F0EEEB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#CCD5DA';
                e.currentTarget.style.color = '#13181B';
              }}
            >
              오래된 파일 정리
            </button>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>
            학생들의 질문을 확인하고 답변해주세요.
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
            <p style={{ color: '#13181B', opacity: 0.7 }}>아직 질문이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 질문 목록 */}
            <div className="lg:col-span-1 space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => setSelectedQuestion(question)}
                  className="p-4 rounded-xl shadow-sm cursor-pointer transition-all"
                  style={{
                    backgroundColor: selectedQuestion?.id === question.id ? '#CCD5DA' : '#FFFFFF',
                    border: selectedQuestion?.id === question.id ? '2px solid #13181B' : '2px solid #CCD5DA',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedQuestion?.id !== question.id) {
                      e.currentTarget.style.borderColor = '#13181B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedQuestion?.id !== question.id) {
                      e.currentTarget.style.borderColor = '#CCD5DA';
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
                    <span>{question.comment_count || 0}개 댓글</span>
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
                <QuestionDetail questionId={selectedQuestion.id} />
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
  );
}

// 질문 상세 컴포넌트
function QuestionDetail({ questionId }: { questionId: string }) {
  const [question, setQuestion] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !teacherId) return;

    const { error } = await supabase
      .from("question_comments")
      .insert({
        question_id: questionId,
        teacher_id: teacherId,
        content: newComment.trim(),
      });

    if (error) {
      alert("댓글 작성에 실패했습니다: " + error.message);
    } else {
      setNewComment("");
      // 댓글 목록 다시 로드
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

      // 질문을 답변 완료로 표시
      await supabase
        .from("questions")
        .update({ is_resolved: true })
        .eq("id", questionId);

      if (question) {
        setQuestion({ ...question, is_resolved: true });
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B', opacity: 0.7 }}>로딩 중...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B', opacity: 0.7 }}>질문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 질문 내용 */}
      <div className="p-6 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {question.is_resolved && (
              <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}>
                답변완료
              </span>
            )}
            <h2 className="text-xl font-bold" style={{ color: '#13181B' }}>
              {question.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm mb-4" style={{ color: '#13181B', opacity: 0.7 }}>
          <span>작성자: {question.student_name}</span>
          <span>{new Date(question.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
            max-width: 100%;
            height: auto;
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
      <div className="p-6 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="font-semibold mb-4" style={{ color: '#13181B' }}>
          댓글 ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <p className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>아직 댓글이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* 원댓글 */}
                <div className="p-4 rounded-lg border-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: '#13181B', color: '#FFFFFF' }}>
                      댓글
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-semibold text-sm" style={{ color: '#13181B' }}>
                        {comment.teacher_name}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                      {new Date(comment.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap mb-3" style={{ color: '#13181B' }}>
                    {comment.content}
                  </div>
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}>
                            답글
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                              {reply.teacher_name}
                            </span>
                          </div>
                          <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                            {new Date(reply.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs whitespace-pre-wrap" style={{ color: '#13181B' }}>
                          {reply.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 대댓글 작성 폼 */}
                {replyingTo === comment.id && (
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
                      onClick={async () => {
                        const replyContent = replyText[comment.id];
                        if (!replyContent?.trim() || !teacherId) return;

                        const { error } = await supabase
                          .from("question_comments")
                          .insert({
                            question_id: questionId,
                            parent_comment_id: comment.id,
                            teacher_id: teacherId,
                            content: replyContent.trim(),
                          });

                        if (error) {
                          alert("대댓글 작성에 실패했습니다: " + error.message);
                        } else {
                          setReplyText({ ...replyText, [comment.id]: "" });
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
                                if (!repliesMap[c.parent_comment_id]) {
                                  repliesMap[c.parent_comment_id] = [];
                                }
                                repliesMap[c.parent_comment_id].push(comment);
                              } else {
                                topLevelComments.push(comment);
                              }
                            });
                            
                            setComments(topLevelComments);
                            setReplies(repliesMap);
                          }
                        }
                      }}
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
            ))}
          </div>
        )}
      </div>

      {/* 댓글 작성 */}
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
    </div>
  );
}




