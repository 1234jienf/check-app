"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<any[]>([]);
  const [studentPassages, setStudentPassages] = useState<Record<string, Record<string, any[]>>>({});
  const [studentCheckpoints, setStudentCheckpoints] = useState<Record<string, Record<string, any[]>>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"approval" | "students">("students");

  // 승인 대기 학생 불러오기
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, approved")
      .eq("role", "student")
      .eq("approved", false);

    if (!error) setPendingStudents(data || []);
  };

  // 승인된 학생 불러오기
  const fetchApproved = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, approved")
      .eq("role", "student")
      .eq("approved", true)
      .order("name", { ascending: true });

    if (!error) setApprovedStudents(data || []);
  };

  // 학생별 작성한 지문 불러오기
  const fetchStudentPassages = async (studentId: string) => {
    const { data, error } = await supabase
      .from("student_checkpoint_record")
      .select(`
        passage_id,
        checkpoint_text,
        paragraph,
        attempt_number,
        created_at,
        reason,
        passages!inner(id, title, category, year, source)
      `)
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // 중복 제거 및 카테고리별 그룹화
      const uniquePassages = Array.from(
        new Map(
          data
            .filter((d: any) => d.passages)
            .map((d: any) => [d.passage_id, d.passages])
        ).values()
      );

      // 카테고리별로 그룹화
      const grouped: Record<string, any[]> = {};
      uniquePassages.forEach((passage: any) => {
        const category = passage.category || "기타";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(passage);
      });

      setStudentPassages({ [studentId]: grouped });

      // 지문별 체크포인트 그룹화
      const checkpointsByPassage: Record<string, any[]> = {};
      data.forEach((record: any) => {
        if (!checkpointsByPassage[record.passage_id]) {
          checkpointsByPassage[record.passage_id] = [];
        }
        checkpointsByPassage[record.passage_id].push(record);
      });

      setStudentCheckpoints({ [studentId]: checkpointsByPassage });
    }
  };

  // 승인 처리
  const approveStudent = async (id: string) => {
    const { error } = await supabase
      .from("users")
      .update({ approved: true })
      .eq("id", id);

    if (!error) {
      alert("승인 완료!");
      fetchPending();
      fetchApproved();
    }
  };

  useEffect(() => {
    fetchPending();
    fetchApproved();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentPassages(selectedStudentId);
    }
  }, [selectedStudentId]);

  const categoryLabels: Record<string, string> = {
    "EBS": "EBS",
    "기출": "평가원 기출",
    "평가원": "평가원 기출",
    "LEET": "LEET",
    "기타": "기타",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            학생 관리
          </h1>
          <p className="text-gray-600">학생 승인 및 학생별 작성한 지문과 체크포인트를 확인하세요.</p>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6 flex gap-2 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab("students")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "students"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            학생별 지문 관리
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "approval"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-[2px]"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            승인 관리 {pendingStudents.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingStudents.length}
              </span>
            )}
          </button>
        </div>

        {/* 승인 관리 탭 */}
        {activeTab === "approval" && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">승인 대기 학생</h2>
            {pendingStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">승인 대기 중인 학생이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingStudents.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">{s.name}</div>
                        <div className="text-sm text-gray-600">{s.email}</div>
                      </div>
                      <button
                        onClick={() => approveStudent(s.id)}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        승인하기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 학생별 지문 관리 탭 */}
        {activeTab === "students" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 학생 목록 */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">학생 목록</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {approvedStudents.length === 0 ? (
                    <p className="text-gray-500 text-sm">승인된 학생이 없습니다.</p>
                  ) : (
                    approvedStudents.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full p-3 text-left rounded-lg transition-all ${
                          selectedStudentId === s.id
                            ? "bg-blue-100 border-2 border-blue-500"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-600">{s.email}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 오른쪽: 선택한 학생의 지문 목록 */}
            <div className="lg:col-span-2">
              {selectedStudentId ? (
                <div>
                  {studentPassages[selectedStudentId] ? (
                    <div className="space-y-6">
                      {Object.entries(studentPassages[selectedStudentId]).map(([category, passages]: [string, any[]]) => (
                        <div key={category} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
                          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-gray-200">
                            {categoryLabels[category] || category} ({passages.length}개)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {passages.map((passage: any) => {
                              const checkpoints = studentCheckpoints[selectedStudentId]?.[passage.id] || [];
                              
                              // 각 문단별로 마지막 차수(최고 attempt_number) 찾기
                              const lastAttemptByParagraph: Record<number, any> = {};
                              checkpoints.forEach((cp: any) => {
                                const paraNum = cp.paragraph || cp.paragraph_index;
                                const attemptNum = cp.attempt_number || 1;
                                if (!lastAttemptByParagraph[paraNum] || 
                                    (lastAttemptByParagraph[paraNum].attempt_number || 1) < attemptNum) {
                                  lastAttemptByParagraph[paraNum] = cp;
                                }
                              });
                              
                              // 문단 번호 순서대로 정렬
                              const sortedParagraphs = Object.keys(lastAttemptByParagraph)
                                .map(Number)
                                .sort((a, b) => a - b)
                                .map(paraNum => lastAttemptByParagraph[paraNum]);
                              
                              return (
                                <Link
                                  key={passage.id}
                                  href={`/admin/passages/${passage.id}?student=${selectedStudentId}`}
                                  className="group p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                                >
                                  <div className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                                    {passage.title || "(제목 없음)"}
                                  </div>
                                  {passage.year && (
                                    <div className="text-xs text-gray-600 mb-2">
                                      {passage.year} {passage.source && `- ${passage.source}`}
                                    </div>
                                  )}
                                  {sortedParagraphs.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                                      {sortedParagraphs.map((cp: any) => {
                                        const paraNum = cp.paragraph || cp.paragraph_index;
                                        const isDontKnow = cp.reason && cp.reason.trim().length > 0;
                                        const maxAttempt = Math.max(...checkpoints
                                          .filter((c: any) => (c.paragraph || c.paragraph_index) === paraNum)
                                          .map((c: any) => c.attempt_number || 1));
                                        
                                        return (
                                          <div key={paraNum} className="text-sm">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                {maxAttempt}차
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {paraNum}문단
                                              </span>
                                            </div>
                                            {isDontKnow ? (
                                              <div className="text-xs text-gray-500 italic">
                                                모름
                                              </div>
                                            ) : cp.checkpoint_text ? (
                                              <div className="text-xs text-gray-700 line-clamp-1">
                                                {cp.checkpoint_text}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl text-center">
                      <p className="text-gray-500">로딩 중...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl text-center">
                  <p className="text-gray-500 text-lg">왼쪽에서 학생을 선택하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
