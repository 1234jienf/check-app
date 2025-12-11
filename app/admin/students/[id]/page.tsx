"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useSearchParams } from "next/navigation";

export default function StudentDetail() {
  const { id: studentId } = useParams();
  const search = useSearchParams();
  const passageId = search.get("passage");

  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [passage, setPassage] = useState<any>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});

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

  // 지문을 문단별로 나누기
  const paragraphs = passage?.content
    ? passage.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
    : [];

  const getCategoryColor = (category: string) => {
    if (category === "EBS") return '#003A6C';
    if (category === "기출" || category === "평가원") return '#FFBF65';
    if (category === "LEET") return '#FD8973';
    return '#13181B';
  };

  const categoryColor = passage ? getCategoryColor(passage.category) : '#13181B';

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            학생 답변 상세
            <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
        </div>
        {passage && (
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6" style={{ color: '#13181B' }}>{passage.title}</h2>
        )}

      {paragraphs.length > 0 ? (
        <div className="space-y-6">
          {paragraphs.map((paragraph: string, idx: number) => {
            const paragraphNum = idx + 1;
            const checkpoint = checkpoints.find(
              (cp: any) => {
                const paraNum = cp.paragraph_index || cp.paragraph;
                return paraNum === paragraphNum;
              }
            );

            return (
              <div key={idx} className="border-2 rounded-2xl p-4 md:p-6 shadow-xl mb-4 md:mb-6 transition-all duration-300" style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.borderColor = categoryColor;
                     e.currentTarget.style.boxShadow = `0 20px 25px rgba(0, 0, 0, 0.1)`;
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.borderColor = '#13181B';
                     e.currentTarget.style.boxShadow = 'none';
                   }}>
                <h3 className="text-lg font-bold mb-4 pb-3 border-b-2" style={{ color: '#13181B', borderBottomColor: '#CCD5DA' }}>
                  {paragraphNum}문단
                </h3>

                {/* 문단 내용 */}
                <div className="mb-4 p-4 rounded-xl border-2" style={{ backgroundColor: '#CCD5DA', borderColor: '#13181B' }}>
                  <div className="whitespace-pre-wrap text-sm" style={{ color: '#13181B' }}>
                    {paragraph.trim()}
                  </div>
                </div>

                {/* 학생 체크포인트 */}
                {checkpoint ? (
                  <div className="space-y-3 mt-4">
                    <div className="p-4 rounded-xl border-2" style={{ backgroundColor: '#CCD5DA', borderColor: categoryColor }}>
                      <div className="text-sm font-semibold mb-2" style={{ color: categoryColor }}>학생이 작성한 체크포인트:</div>
                      <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>{checkpoint.checkpoint_text || "(작성하지 않음)"}</div>
                    </div>
                    {/* reason이 있으면 모름으로 선택한 것 */}
                    {checkpoint.reason && (
                      <div className="p-4 rounded-xl border-l-4" style={{ backgroundColor: '#FFBF65', borderLeftColor: '#FD8973' }}>
                        <div className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                          ⚠️ 모름 - 사유:
                        </div>
                        <div className="whitespace-pre-wrap" style={{ color: '#13181B' }}>
                          {checkpoint.reason}
                        </div>
                      </div>
                    )}

                    {/* 선생님 댓글 */}
                    {comments[checkpoint.id] && comments[checkpoint.id].length > 0 && (
                      <div className="mt-4 p-4 rounded-xl border-2" style={{ backgroundColor: '#CCD5DA', borderColor: '#13181B' }}>
                        <div className="text-sm font-semibold mb-3" style={{ color: '#13181B' }}>💬 선생님 댓글 ({comments[checkpoint.id].length}개)</div>
                        <div className="space-y-3">
                          {comments[checkpoint.id].map((comment: any) => (
                            <div key={comment.id} className="p-3 rounded-lg border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                              <div className="text-xs mb-1" style={{ color: '#13181B', opacity: 0.7 }}>
                                {new Date(comment.created_at).toLocaleString('ko-KR')}
                              </div>
                              <div className="text-sm whitespace-pre-wrap" style={{ color: '#13181B' }}>
                                {comment.comment_text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
