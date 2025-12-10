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
    };
    load();
  }, [id]);

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
    <div className="p-10 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-5">학생 제출 현황</h1>
      {passage && <h2 className="text-lg text-gray-700 mb-6">{passage.title}</h2>}

      <div className="flex gap-6">
        {/* 왼쪽: 학생 목록 */}
        <div className="w-80 flex-shrink-0">
          {results.length === 0 ? (
            <div className="p-4 bg-yellow-50 rounded text-yellow-700">
              아직 제출한 학생이 없습니다.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.values(byStudent).map((s: any) => (
                <button
                  key={s.student_id}
                  onClick={() => handleStudentClick(s.student_id, s.name)}
                  className={`border p-4 rounded text-left hover:bg-gray-50 transition-colors ${
                    selectedStudentId === s.student_id
                      ? "bg-blue-50 border-blue-400 border-2"
                      : ""
                  }`}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-gray-500">
                    제출한 체크포인트: {s.count}개
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 학생별로 답변 보기 */}
        <div className="flex-1">
          {paragraphs.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">모든 학생 답변</h3>

              {/* 학생별로 카드 형태로 표시 */}
              {Object.values(byStudent).map((student: any) => {
                const studentCheckpoints = results.filter(
                  (r: any) => (r.user_id || r.student_id) === student.student_id
                );

                return (
                  <div key={student.student_id} className="border rounded-lg p-6 bg-white shadow-sm">
                    <h4 className="text-lg font-bold mb-4 pb-2 border-b-2 border-blue-200">
                      {student.name} 님
                    </h4>

                    <div className="space-y-4">
                      {paragraphs.map((paragraph: string, idx: number) => {
                        const paragraphNum = idx + 1;
                        const checkpoint = studentCheckpoints.find(
                          (cp: any) => {
                            const paraNum = cp.paragraph_index || cp.paragraph;
                            return paraNum === paragraphNum;
                          }
                        );

                        return (
                          <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-blue-600">
                                {paragraphNum}문단
                              </span>
                            </div>

                            {/* 체크포인트 */}
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">체크포인트: </span>
                              {checkpoint?.checkpoint_text && checkpoint.checkpoint_text.trim() ? (
                                <div className="text-sm text-gray-800 mt-1 p-2 bg-blue-50 rounded">
                                  {checkpoint.checkpoint_text}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">체크포인트 없음</span>
                              )}
                            </div>

                            {/* 모름 사유 */}
                            {checkpoint?.reason && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-2 border-yellow-400">
                                <span className="text-xs font-semibold text-yellow-700">⚠️ 모름 - 사유: </span>
                                <span className="text-sm text-gray-800 whitespace-pre-wrap">
                                  {checkpoint.reason}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {Object.keys(byStudent).length === 0 && (
                <div className="p-4 bg-yellow-50 rounded text-yellow-700">
                  아직 제출한 학생이 없습니다.
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">지문이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
