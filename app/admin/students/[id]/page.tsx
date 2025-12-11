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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          학생 답변 상세
        </h1>
        {passage && (
          <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-gray-800">{passage.title}</h2>
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
              <div key={idx} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-4 md:p-6 shadow-xl mb-4 md:mb-6 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-lg font-bold mb-4 pb-3 border-b-2 border-gray-200 text-gray-900">
                  {paragraphNum}문단
                </h3>

                {/* 문단 내용 */}
                <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="whitespace-pre-wrap text-gray-700 text-sm">
                    {paragraph.trim()}
                  </div>
                </div>

                {/* 학생 체크포인트 */}
                {checkpoint ? (
                  <div className="space-y-3 mt-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="text-sm font-semibold text-blue-700 mb-2">학생이 작성한 체크포인트:</div>
                      <div className="text-gray-800 whitespace-pre-wrap">{checkpoint.checkpoint_text || "(작성하지 않음)"}</div>
                    </div>
                    {/* reason이 있으면 모름으로 선택한 것 */}
                    {checkpoint.reason && (
                      <div className="p-4 bg-yellow-50 rounded-xl border-l-4 border-yellow-400">
                        <div className="text-sm font-semibold text-yellow-700 mb-2">
                          ⚠️ 모름 - 사유:
                        </div>
                        <div className="text-gray-800 whitespace-pre-wrap">
                          {checkpoint.reason}
                        </div>
                      </div>
                    )}

                    {/* 선생님 댓글 */}
                    {comments[checkpoint.id] && comments[checkpoint.id].length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="text-sm font-semibold text-green-700 mb-3">💬 선생님 댓글 ({comments[checkpoint.id].length}개)</div>
                        <div className="space-y-3">
                          {comments[checkpoint.id].map((comment: any) => (
                            <div key={comment.id} className="p-3 bg-white rounded-lg border border-green-200">
                              <div className="text-xs text-gray-500 mb-1">
                                {new Date(comment.created_at).toLocaleString('ko-KR')}
                              </div>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                {comment.comment_text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-gray-100 rounded-xl text-gray-500 text-sm">
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
