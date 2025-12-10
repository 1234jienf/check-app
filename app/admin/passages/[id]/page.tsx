"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPassageDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [passage, setPassage] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [showCommentInput, setShowCommentInput] = useState<Record<string, boolean>>({});

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
        console.error("Invalid passage ID:", id);
        return;
      }

      const { data: p } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();

      if (!p) {
        console.error("Passage not found");
        return;
      }

      const { data: cp } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("passage_id", id)
        .order("order_num");

      // 학생 제출 데이터 가져오기 - 먼저 모든 데이터를 가져온 후 users 조인
      console.log("지문 ID:", id);
      
      // 현재 사용자 정보 확인
      const { data: { user } } = await supabase.auth.getUser();
      console.log("현재 로그인한 사용자:", user?.id);
      
      if (user) {
        const { data: currentUser } = await supabase
          .from("users")
          .select("id, role, name")
          .eq("id", user.id)
          .single();
        console.log("현재 사용자 역할:", currentUser?.role);
      }
      
      // 1단계: 현재 지문에 대한 모든 제출 데이터 가져오기
      // RLS 정책을 우회하기 위해 service_role 키를 사용할 수 없으므로,
      // 정책이 제대로 작동하는지 확인
      const { data: checkpointsData, error: checkpointsError } = await supabase
        .from("student_checkpoint_record")
        .select("*")
        .eq("passage_id", id);
      
      // 에러가 있으면 상세 정보 출력
      if (checkpointsError) {
        console.error("RLS 정책 오류 상세:", checkpointsError);
      }
      
      console.log("1단계 - 제출 데이터 조회 결과:", {
        count: checkpointsData?.length || 0,
        error: checkpointsError,
        data: checkpointsData
      });
      
      // 각 레코드의 상세 정보 출력
      if (checkpointsData) {
        console.log("1단계 상세 - 각 레코드의 user_id와 passage_id:", 
          checkpointsData.map((c: any) => ({
            id: c.id,
            user_id: c.user_id,
            passage_id: c.passage_id,
            paragraph: c.paragraph || c.paragraph_index
          }))
        );
      }
      
      if (checkpointsError) {
        console.error("학생 제출 조회 오류:", checkpointsError);
        setStudentSubmissions([]);
      } else if (checkpointsData && checkpointsData.length > 0) {
        // 2단계: 고유한 user_id 추출
        const userIds = [...new Set(checkpointsData.map((c: any) => c.user_id).filter(Boolean))];
        console.log("2단계 - 고유한 학생 ID:", userIds.length, userIds);
        
        // 3단계: users 정보 가져오기
        let usersMap = new Map();
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, name, email")
            .in("id", userIds);
          
          console.log("3단계 - 사용자 정보 조회 결과:", {
            count: usersData?.length || 0,
            error: usersError,
            data: usersData
          });
          
          if (usersError) {
            console.error("사용자 정보 조회 오류:", usersError);
          } else if (usersData) {
            usersMap = new Map(usersData.map((u: any) => [u.id, u]));
          }
        }
        
        // 4단계: 데이터 결합
        const allSubmissions = checkpointsData.map((c: any) => ({
          ...c,
          users: usersMap.get(c.user_id) || { name: "이름 미등록", email: "" },
        }));
        
        console.log("4단계 - 결합된 데이터:", {
          total: allSubmissions.length,
          uniqueUsers: new Set(allSubmissions.map((s: any) => s.user_id)).size,
          userIds: [...new Set(allSubmissions.map((s: any) => s.user_id))]
        });
        
        // paragraph로 정렬
        allSubmissions.sort((a: any, b: any) => {
          const aPara = a.paragraph || a.paragraph_index || 0;
          const bPara = b.paragraph || b.paragraph_index || 0;
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
        }
      } else {
        console.log("제출 데이터가 없습니다.");
        setStudentSubmissions([]);
      }

      setPassage(p);
      setCheckpoints(cp || []);
    };
    load();
  }, [id]);

  // 학생별로 그룹화
  const byStudent: Record<string, any> = {};
  studentSubmissions.forEach((sub: any) => {
    const userId = sub.user_id;
    if (!userId) {
      console.warn("user_id가 없는 제출 데이터:", sub);
      return;
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
  
  console.log("그룹화된 학생 수:", Object.keys(byStudent).length);
  console.log("학생별 제출 개수:", Object.entries(byStudent).map(([id, data]: [string, any]) => ({
    id,
    name: data.name,
    count: data.submissions.length
  })));

  // UUID가 아니면 에러 표시
  if (!isValidUUID(id as string)) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold mb-4">잘못된 경로</h1>
        <p className="text-red-600 mb-4">
          유효하지 않은 지문 ID입니다. ({id})
        </p>
        <Link href="/admin/passages" className="text-blue-600 hover:underline">
          ← 지문 관리로 돌아가기
        </Link>
      </div>
    );
  }

  if (!passage) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-bold mb-4">지문을 불러오는 중...</h1>
        <Link href="/admin/passages" className="text-blue-600 hover:underline">
          ← 지문 관리로 돌아가기
        </Link>
      </div>
    );
  }

  // 지문을 문단별로 나누기
  const paragraphs = passage?.content
    ? passage.content.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {passage.title || "(제목 없음)"}
          </h1>
        </div>

        <div className="flex gap-6">
          {/* 왼쪽: 지문 내용 및 체크포인트 관리 */}
          <div className="flex-1">
            <div className="flex gap-3 mb-6">
              <Link
                href={`/admin/passages/${id}/edit-metadata`}
                className="px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                지문 정보 수정
              </Link>
              <Link
                href={`/admin/passages/${id}/edit-content`}
                className="px-4 py-2 border-2 border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
                  } else if (category === "기출" || category === "평가원") {
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
                className="px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                지문 삭제
              </button>
            </div>

          {/* 지문 내용 미리보기 - 문단별로 표시 */}
          {passage.content && (
            <div className="mb-6 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
              <h3 className="font-semibold mb-4 text-lg text-gray-900">지문 내용 (문단별)</h3>
              <div className="space-y-4">
                {paragraphs.map((paragraph: string, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border-l-4 border-blue-400">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-blue-600">{idx + 1}문단</div>
                      <Link
                        href={`/admin/passages/${id}/add-checkpoint?paragraph=${idx + 1}`}
                        className="text-xs border border-blue-400 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        + 체크포인트 추가
                      </Link>
                    </div>
                    <div className="text-sm text-gray-700">
                      {paragraph.trim().replace(/\n/g, " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">체크포인트</h2>
              <Link
                href={`/admin/passages/${id}/add-checkpoint`}
                className="px-3 py-1.5 border-2 border-blue-500 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm"
              >
                + 체크포인트 추가
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {checkpoints.map((cp: any) => (
                <div className="border border-gray-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow" key={cp.id}>
                  <b className="text-blue-600">{cp.order_num}. </b> 
                  <span className="text-gray-800">{cp.text}</span>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* 오른쪽: 학생 제출 현황 */}
          <div className="w-96 flex-shrink-0">
          <div className="sticky top-4">
            <h2 className="text-2xl font-bold mb-6 pb-3 border-b-2 border-gray-200">학생 제출 현황</h2>

            {Object.keys(byStudent).length > 0 ? (
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {Object.entries(byStudent).map(([userId, studentData]: [string, any]) => (
                  <div key={userId} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <h3 className="text-lg font-bold mb-4 pb-3 border-b-2 border-gray-200 text-gray-900">
                      {studentData.name} 님 ({studentData.submissions.length}개 제출)
                    </h3>

                    <div className="space-y-3">
                      {paragraphs.map((paragraph: string, idx: number) => {
                        const paragraphNum = idx + 1;
                        const submission = studentData.submissions.find(
                          (s: any) => {
                            const paraNum = s.paragraph || s.paragraph_index;
                            return paraNum === paragraphNum;
                          }
                        );

                        return (
                          <div key={idx} className="border-l-2 border-blue-300 pl-3 py-2">
                            <div className="text-xs font-semibold text-blue-600 mb-1">
                              {paragraphNum}문단
                            </div>

                            {/* 체크포인트 */}
                            <div className="mb-1">
                              {submission?.checkpoint_text && submission.checkpoint_text.trim() ? (
                                <div className="text-xs text-gray-800 p-2 bg-blue-50 rounded">
                                  {submission.checkpoint_text}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">체크포인트 없음</span>
                              )}
                            </div>

                            {/* 모름 사유 */}
                            {submission?.reason && (
                              <div className="mt-1 p-1.5 bg-yellow-50 rounded border-l-2 border-yellow-400">
                                <span className="text-xs font-semibold text-yellow-700">⚠️ 모름: </span>
                                <span className="text-xs text-gray-800 whitespace-pre-wrap">
                                  {submission.reason}
                                </span>
                              </div>
                            )}

                            {/* 댓글 섹션 */}
                            {submission && (
                              <div className="mt-3">
                                <button
                                  onClick={() => {
                                    setShowCommentInput((prev) => ({
                                      ...prev,
                                      [submission.id]: !prev[submission.id],
                                    }));
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 mb-2"
                                >
                                  💬 댓글 {comments[submission.id]?.length || 0}개
                                </button>

                                {/* 기존 댓글 */}
                                {comments[submission.id] && comments[submission.id].length > 0 && (
                                  <div className="space-y-2 mb-2">
                                    {comments[submission.id].map((comment: any) => (
                                      <div key={comment.id} className="p-2 bg-gray-50 rounded text-xs">
                                        <div className="font-semibold text-gray-700 mb-1">선생님</div>
                                        <div className="text-gray-800 whitespace-pre-wrap">
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
                                        setCommentTexts((prev) => ({
                                          ...prev,
                                          [submission.id]: e.target.value,
                                        }));
                                      }}
                                      placeholder="댓글을 입력하세요..."
                                      className="w-full text-xs p-2 border border-gray-300 rounded mb-2"
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
                                          setCommentTexts((prev) => ({
                                            ...prev,
                                            [submission.id]: "",
                                          }));
                                          setShowCommentInput((prev) => ({
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
                                            setComments((prev) => ({
                                              ...prev,
                                              [submission.id]: commentsData,
                                            }));
                                          }
                                        }
                                      }}
                                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                    >
                                      댓글 작성
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl text-center">
                <p className="text-gray-500 text-lg">아직 제출한 학생이 없습니다.</p>
              </div>
            )}

            <div className="mt-4">
              <Link
                href={`/admin/passages/${id}/results`}
                className="text-blue-600 underline text-sm"
              >
                👉 상세 보기
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
