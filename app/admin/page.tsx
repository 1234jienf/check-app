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
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="mb-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            학생 관리
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>학생 승인 및 학생별 작성한 지문과 체크포인트를 확인하세요.</p>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6 flex gap-2 border-b-2" style={{ borderBottomColor: '#CCD5DA' }}>
          <button
            onClick={() => setActiveTab("students")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "students"
                ? "-mb-[2px]"
                : ""
            }`}
            style={activeTab === "students" ? {
              color: '#13181B',
              borderBottom: '2px solid #13181B'
            } : {
              color: '#13181B',
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "students") {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "students") {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            학생별 지문 관리
          </button>
          <button
            onClick={() => setActiveTab("approval")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "approval"
                ? "-mb-[2px]"
                : ""
            }`}
            style={activeTab === "approval" ? {
              color: '#13181B',
              borderBottom: '2px solid #13181B'
            } : {
              color: '#13181B',
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "approval") {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "approval") {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            승인 관리 {pendingStudents.length > 0 && (
              <span className="ml-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#FFF0ED', color: '#13181B' }}>
                {pendingStudents.length}
              </span>
            )}
          </button>
        </div>

        {/* 승인 관리 탭 */}
        {activeTab === "approval" && (
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#13181B' }}>승인 대기 학생</h2>
            {pendingStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>승인 대기 중인 학생이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingStudents.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl shadow-sm"
                    style={{ backgroundColor: '#FFF5E8' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold mb-1" style={{ color: '#13181B' }}>{s.name}</div>
                        <div className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>{s.email}</div>
                      </div>
                      <button
                        onClick={() => approveStudent(s.id)}
                        className="px-6 py-2 font-semibold rounded-lg transition-colors"
                        style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
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
              <div className="rounded-xl p-6 shadow-sm sticky top-4" style={{ backgroundColor: '#FFFFFF' }}>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>학생 목록</h2>
                <div className="max-h-[600px] overflow-y-auto">
                  {approvedStudents.length === 0 ? (
                    <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>승인된 학생이 없습니다.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {approvedStudents.map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStudentId(s.id)}
                          className="w-full p-3 text-left rounded-xl transition-all shadow-sm"
                        style={selectedStudentId === s.id ? {
                          backgroundColor: '#13181B',
                          color: '#F0EEEB',
                          boxShadow: '0 2px 6px rgba(19, 24, 27, 0.2)'
                        } : {
                          backgroundColor: '#FFFFFF',
                          color: '#13181B'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedStudentId !== s.id) {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedStudentId !== s.id) {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                          }
                        }}
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs" style={{ opacity: selectedStudentId === s.id ? 0.9 : 0.7 }}>{s.email}</div>
                        </button>
                      ))}
                    </div>
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
                      {Object.entries(studentPassages[selectedStudentId]).map(([category, passages]: [string, any[]]) => {
                        const categoryColor = category === "EBS" ? '#E8F0F8' : 
                                            category === "기출" || category === "평가원" ? '#FFF5E8' :
                                            category === "LEET" ? '#FFF0ED' : '#E8E9EA';
                        return (
                        <div key={category} className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                          <h3 className="text-xl font-bold mb-4 pb-3 border-b" style={{ color: '#13181B', borderBottomColor: '#CCD5DA' }}>
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
                                  className="group p-4 rounded-xl shadow-sm transition-all"
                                  style={{ backgroundColor: '#FFFFFF' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                                  }}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="font-semibold transition-colors flex-1" style={{ color: '#13181B' }}>
                                      {passage.title || "(제목 없음)"}
                                    </div>
                                    <svg 
                                      className="w-5 h-5 flex-shrink-0 ml-2 transition-transform group-hover:translate-x-1" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                      style={{ color: '#13181B', filter: 'brightness(0) saturate(100%)' }}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                  {passage.year && (
                                    <div className="text-xs mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                                      {passage.year} {passage.source && `- ${passage.source}`}
                                    </div>
                                  )}
                                  {sortedParagraphs.length > 0 && (
                                    <div className="mt-3 pt-3 space-y-2">
                                      {sortedParagraphs.map((cp: any) => {
                                        const paraNum = cp.paragraph || cp.paragraph_index;
                                        const isDontKnow = cp.reason && cp.reason.trim().length > 0;
                                        const maxAttempt = Math.max(...checkpoints
                                          .filter((c: any) => (c.paragraph || c.paragraph_index) === paraNum)
                                          .map((c: any) => c.attempt_number || 1));
                                        
                                        return (
                                          <div
                                            key={paraNum}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.location.href = `/admin/passages/${passage.id}?student=${selectedStudentId}`;
                                            }}
                                            className="group/checkpoint flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer"
                                            style={{ backgroundColor: '#FFFFFF' }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                                              e.currentTarget.style.boxShadow = 'none';
                                            }}
                                          >
                                            <div className="flex-1 text-sm">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                                                  {maxAttempt}차
                                                </span>
                                                <span className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>
                                                  {paraNum}문단
                                                </span>
                                              </div>
                                              {isDontKnow ? (
                                                <div className="text-xs italic" style={{ color: '#13181B', opacity: 0.6 }}>
                                                  모름
                                                </div>
                                              ) : cp.checkpoint_text ? (
                                                <div className="text-xs line-clamp-1" style={{ color: '#13181B', opacity: 0.8 }}>
                                                  {cp.checkpoint_text}
                                                </div>
                                              ) : null}
                                            </div>
                                            <svg 
                                              className="w-4 h-4 flex-shrink-0 ml-2 transition-transform group-hover/checkpoint:translate-x-1" 
                                              fill="none" 
                                              stroke="currentColor" 
                                              viewBox="0 0 24 24"
                                              style={{ color: '#13181B', filter: 'brightness(0) saturate(100%)' }}
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
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
                      )})}
                    </div>
                  ) : (
                    <div className="rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                      <div className="mx-auto mb-4" style={{ 
                        animation: 'spin 2s linear infinite, pulse 2s ease-in-out infinite',
                        width: '60px',
                        height: '60px',
                        display: 'inline-block'
                      }}>
                        <img 
                          src="/bishop-logo.png" 
                          alt="Loading" 
                          className="w-full h-full"
                          style={{ filter: 'grayscale(100%) brightness(0.8)' }}
                        />
                      </div>
                      <p style={{ color: '#13181B', opacity: 0.8 }}>로딩 중...</p>
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
                  )}
                </div>
              ) : (
                    <div className="rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                  <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>학생을 선택하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
