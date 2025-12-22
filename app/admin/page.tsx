"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<any[]>([]);
  const [studentPassages, setStudentPassages] = useState<Record<string, Record<string, any[]>>>({});
  const [studentCheckpoints, setStudentCheckpoints] = useState<Record<string, Record<string, any[]>>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"approval" | "students" | "student-edit">("students");
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingStudentSubjects, setEditingStudentSubjects] = useState<string[]>([]);
  const [allApprovedStudents, setAllApprovedStudents] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isLoadingPassages, setIsLoadingPassages] = useState<boolean>(true);

  // 세션에서 선택한 과목 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

  // 과목 변경 이벤트 리스너 (layout에서 과목 변경 시 동기화)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
    }
  }, []);

  // 승인 대기 학생 불러오기
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, approved")
      .eq("role", "student")
      .eq("approved", false);

    if (!error) setPendingStudents(data || []);
  };

  // 승인된 학생 불러오기 (선택한 과목으로 필터링)
  const fetchApproved = useCallback(async () => {
    try {
      // 세션 스토리지에서 최신 과목 값 가져오기 (상태 동기화 보장)
      const currentSubject = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null) || "korean"
        : selectedSubject;
      
      
      // subjects 컬럼을 포함해서 직접 쿼리 시도
      const { data: fullData, error: fullError } = await supabase
        .from("users")
        .select("id, name, email, approved, subjects")
        .eq("role", "student")
        .eq("approved", true)
        .order("name", { ascending: true });

      if (fullError) {
        const { data: basicData, error: basicError } = await supabase
      .from("users")
      .select("id, name, email, approved")
      .eq("role", "student")
      .eq("approved", true)
      .order("name", { ascending: true });

        if (basicError) {
          setApprovedStudents([]);
          return;
        }

        // subjects 필드가 없으면 기본값 처리
        const filtered = currentSubject === "korean" 
          ? (basicData || [])
          : []; // 영어 선택 시 subjects 필드가 없으면 빈 배열
        setApprovedStudents(filtered);
        return;
      }

      if (!fullData) {
        setApprovedStudents([]);
        return;
      }

      // subjects 필드가 있는 경우 - 필터링 적용
      const filtered = fullData.filter((student: any) => {
        // subjects가 null이거나 undefined인 경우
        if (student.subjects === null || student.subjects === undefined) {
          // null이면 국어로 간주 (기존 데이터 호환성)
          return currentSubject === "korean";
        }
        
        // subjects를 배열로 변환
        let studentSubjects: string[] = [];
        if (Array.isArray(student.subjects)) {
          studentSubjects = student.subjects;
        } else if (typeof student.subjects === 'string') {
          studentSubjects = [student.subjects];
        } else {
          // 예상치 못한 타입이면 국어로 간주
          return currentSubject === "korean";
        }
        
        // 빈 배열이면 아무 과목도 없는 것으로 간주
        if (studentSubjects.length === 0) {
          return false;
        }
        
        const hasAccess = studentSubjects.includes(currentSubject);
        
        return hasAccess;
      });
      setApprovedStudents(filtered);
    } catch (err) {
      setApprovedStudents([]);
    }
  }, [selectedSubject]); // selectedSubject가 변경되면 다시 실행되지만, 함수 내부에서는 세션 스토리지의 최신 값을 사용

  // 학생별 작성한 지문 불러오기
  // 모든 학생의 체크포인트 가져오기
  const fetchAllStudentPassages = async () => {
    setIsLoadingPassages(true);
    
    // 세션 스토리지에서 최신 과목 값 가져오기 (상태 동기화 보장)
    const currentSubject = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null) || "korean"
      : selectedSubject;
    
    const { data: studentsData } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "student")
      .eq("approved", true);

    if (!studentsData || studentsData.length === 0) {
      setStudentPassages({});
      setStudentCheckpoints({});
      setIsLoadingPassages(false);
      return;
    }

    const studentIds = studentsData.map(s => s.id);
    if (studentIds.length === 0) {
      setStudentPassages({});
      setStudentCheckpoints({});
      setIsLoadingPassages(false);
      return;
    }

    const { data, error } = await supabase
      .from("student_checkpoint_record")
      .select(`
        user_id,
        passage_id,
        checkpoint_text,
        paragraph,
        attempt_number,
        created_at,
        reason
      `)
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching student checkpoint records:", error);
      setStudentPassages({});
      setStudentCheckpoints({});
      setIsLoadingPassages(false);
      return;
    }

    // 데이터가 없어도 빈 객체로 초기화
    const allStudentPassages: Record<string, Record<string, any[]>> = {};
    const allStudentCheckpoints: Record<string, Record<string, any[]>> = {};

    if (data && data.length > 0) {
      // passage_id 목록 추출
      const passageIds = [...new Set(data.map((d: any) => d.passage_id).filter(Boolean))];
      
      // passages 정보 별도로 조회 (passageIds가 있을 때만)
      let passagesMap = new Map();
      if (passageIds.length > 0) {
        const { data: passagesData } = await supabase
          .from("passages")
          .select("id, title, category, year, source, subject")
          .in("id", passageIds);
        
        // passages 맵 생성
        passagesMap = new Map((passagesData || []).map((p: any) => [p.id, p]));
      }
      
      // 데이터 결합
      const dataWithPassages = data.map((d: any) => ({
        ...d,
        passages: passagesMap.get(d.passage_id) || null
      }));
      
      // 선택한 과목으로 필터링 (NULL도 국어로 간주)
      const filteredData = dataWithPassages.filter((d: any) => {
        if (!d.passages) return false;
        if (currentSubject === "korean") {
          return d.passages.subject === "korean" || d.passages.subject === null || d.passages.subject === undefined;
        } else {
          // 영어 페이지에서는 영어 체크포인트만 표시
          return d.passages.subject === "english";
        }
      });

      // 학생별로 그룹화
      studentsData.forEach((student: any) => {
        const studentData = filteredData.filter((d: any) => d.user_id === student.id);
        
        if (studentData.length > 0) {
          // 중복 제거 및 카테고리별 그룹화
          const uniquePassages = Array.from(
            new Map(
              studentData
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

          allStudentPassages[student.id] = grouped;

          // 지문별 체크포인트 그룹화
          const checkpointsByPassage: Record<string, any[]> = {};
          studentData.forEach((record: any) => {
            if (!checkpointsByPassage[record.passage_id]) {
              checkpointsByPassage[record.passage_id] = [];
            }
            checkpointsByPassage[record.passage_id].push(record);
          });

          allStudentCheckpoints[student.id] = checkpointsByPassage;
        }
      });
    }

    setStudentPassages(allStudentPassages);
    setStudentCheckpoints(allStudentCheckpoints);
    setIsLoadingPassages(false);
  };

  const fetchStudentPassages = async (studentId: string) => {
    // 세션 스토리지에서 최신 과목 값 가져오기 (상태 동기화 보장)
    const currentSubject = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null) || "korean"
      : selectedSubject;
    
    const { data, error } = await supabase
      .from("student_checkpoint_record")
      .select(`
        passage_id,
        checkpoint_text,
        paragraph,
        attempt_number,
        created_at,
        reason
      `)
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching student checkpoint records:", error);
      return;
    }

    if (data && data.length > 0) {
      // passage_id 목록 추출
      const passageIds = [...new Set(data.map((d: any) => d.passage_id).filter(Boolean))];
      
      // passages 정보 별도로 조회
      const { data: passagesData } = await supabase
        .from("passages")
        .select("id, title, category, year, source, subject")
        .in("id", passageIds);
      
      // passages 맵 생성
      const passagesMap = new Map((passagesData || []).map((p: any) => [p.id, p]));
      
      // 데이터 결합
      const dataWithPassages = data.map((d: any) => ({
        ...d,
        passages: passagesMap.get(d.passage_id) || null
      }));
      
      // 선택한 과목으로 필터링 (NULL도 국어로 간주)
      const filteredData = dataWithPassages.filter((d: any) => {
        if (!d.passages) return false;
        if (currentSubject === "korean") {
          return d.passages.subject === "korean" || d.passages.subject === null || d.passages.subject === undefined;
        } else {
          // 영어 페이지에서는 영어 체크포인트만 표시
          return d.passages.subject === "english";
        }
      });

      // 중복 제거 및 카테고리별 그룹화
      const uniquePassages = Array.from(
        new Map(
          filteredData
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

      setStudentPassages((prev) => ({ ...prev, [studentId]: grouped }));

      // 지문별 체크포인트 그룹화
      const checkpointsByPassage: Record<string, any[]> = {};
      filteredData.forEach((record: any) => {
        if (!checkpointsByPassage[record.passage_id]) {
          checkpointsByPassage[record.passage_id] = [];
        }
        checkpointsByPassage[record.passage_id].push(record);
      });

      setStudentCheckpoints((prev) => ({ ...prev, [studentId]: checkpointsByPassage }));
    } else {
      // 데이터가 없어도 빈 객체로 설정
      setStudentPassages((prev) => ({ ...prev, [studentId]: {} }));
      setStudentCheckpoints((prev) => ({ ...prev, [studentId]: {} }));
    }
  };

  const [approvingStudentId, setApprovingStudentId] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // 승인 처리
  const approveStudent = async (id: string, subjects: string[]) => {
    try {
      let hasSubjectsField = false;
      
      // 먼저 subjects 필드가 있는지 확인 (에러 무시)
      try {
        const { data: testData, error: testError } = await supabase
          .from("users")
          .select("subjects")
          .eq("id", id)
          .single();

        if (!testError && testData && testData.subjects !== undefined) {
          hasSubjectsField = true;
        }
      } catch (testErr: any) {
        // 400 에러나 다른 에러는 subjects 필드가 없는 것으로 간주
        hasSubjectsField = false;
      }

      let updateData: any = { approved: true };
      
      // subjects 필드가 있으면 업데이트, 없으면 기본 필드만 업데이트
      if (hasSubjectsField) {
        updateData.subjects = subjects;
      }

    const { error } = await supabase
      .from("users")
        .update(updateData)
      .eq("id", id);

    if (!error) {
      alert("승인 완료!");
        setApprovingStudentId(null);
        setSelectedSubjects([]);
        fetchPending();
        fetchApproved();
      } else {
        // subjects 필드 업데이트 실패 시 기본 승인만 처리
        if (hasSubjectsField && error.code === '42703') {
          // subjects 컬럼이 없다는 에러면 기본 승인만
          const { error: basicError } = await supabase
            .from("users")
            .update({ approved: true })
            .eq("id", id);
          
          if (!basicError) {
            alert("승인 완료! (과목 정보는 저장되지 않았습니다)");
            setApprovingStudentId(null);
            setSelectedSubjects([]);
      fetchPending();
      fetchApproved();
          } else {
            alert("승인 실패: " + basicError.message);
          }
        } else {
          alert("승인 실패: " + error.message);
        }
      }
    } catch (err) {
      alert("승인 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // 과목 변경 시 학생 목록 다시 불러오기 (디바운싱 적용)
  useEffect(() => {
    
    // 짧은 지연을 두어 연속된 상태 변경을 방지
    const timeoutId = setTimeout(() => {
    fetchApproved();
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  // 모든 승인된 학생 불러오기 (학생 정보 편집용 - 필터링 없음)
  const fetchAllApproved = useCallback(async () => {
    try {
      const { data: basicData, error: basicError } = await supabase
        .from("users")
        .select("id, name, email, approved")
        .eq("role", "student")
        .eq("approved", true)
        .order("name", { ascending: true });

      if (basicError || !basicData) {
        setAllApprovedStudents([]);
        return;
      }

      // subjects 필드가 있는지 확인
      let hasSubjectsField = false;
      if (basicData && basicData.length > 0) {
        try {
          const { data: testData, error: testError } = await supabase
            .from("users")
            .select("*")
            .eq("id", basicData[0].id)
            .single();

          if (!testError && testData && testData.subjects !== undefined && Array.isArray(testData.subjects)) {
            hasSubjectsField = true;
          }
        } catch (testErr: any) {
          hasSubjectsField = false;
        }
      }

      if (hasSubjectsField) {
        try {
          const { data: fullData, error: fullError } = await supabase
            .from("users")
            .select("id, name, email, approved, subjects")
            .eq("role", "student")
            .eq("approved", true)
            .order("name", { ascending: true });

          if (!fullError && fullData) {
            setAllApprovedStudents(fullData);
          } else {
            setAllApprovedStudents(basicData);
          }
        } catch (fullErr: any) {
          setAllApprovedStudents(basicData);
        }
      } else {
        setAllApprovedStudents(basicData);
      }
    } catch (err) {
      setAllApprovedStudents([]);
    }
  }, []);

  // 학생 정보 편집 탭이 활성화될 때 모든 학생 불러오기
  useEffect(() => {
    if (activeTab === "student-edit") {
      fetchAllApproved();
    }
  }, [activeTab, fetchAllApproved]);

  // 세션에서 선택한 과목 불러오기 (초기 로드 시에만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      const initialSubject = savedSubject || "korean";
      setSelectedSubject(initialSubject);
    }
  }, []);

  // 과목 변경 이벤트 리스너 (레이아웃에서 과목 변경 시)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
    }
  }, []);

  // selectedSubject가 변경될 때마다 학생 목록 다시 불러오기
  useEffect(() => {
    fetchApproved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  // 초기 로드 시 모든 학생의 체크포인트 가져오기
  useEffect(() => {
    fetchAllStudentPassages();
  }, [selectedSubject]);

  // 학생 선택 시 해당 학생의 체크포인트만 가져오기 (이미 있으면 스킵)
  useEffect(() => {
    if (selectedStudentId && (!studentPassages[selectedStudentId] || Object.keys(studentPassages[selectedStudentId]).length === 0)) {
      fetchStudentPassages(selectedStudentId);
    }
  }, [selectedStudentId, selectedSubject]);

  const categoryLabels: Record<string, string> = {
    "EBS": "EBS",
    "기출": "기출",
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
          <button
            onClick={() => setActiveTab("student-edit")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "student-edit"
                ? "-mb-[2px]"
                : ""
            }`}
            style={activeTab === "student-edit" ? {
              color: '#13181B',
              borderBottom: '2px solid #13181B'
            } : {
              color: '#13181B',
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "student-edit") {
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "student-edit") {
                e.currentTarget.style.opacity = '0.7';
              }
            }}
          >
            학생 정보 편집
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold mb-1" style={{ color: '#13181B' }}>{s.name}</div>
                        <div className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>{s.email}</div>
                      </div>
                    </div>
                    
                    {approvingStudentId === s.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>접근 가능한 과목 선택</label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSubjects.includes('korean')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubjects([...selectedSubjects, 'korean']);
                                  } else {
                                    setSelectedSubjects(selectedSubjects.filter(sub => sub !== 'korean'));
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
                                checked={selectedSubjects.includes('english')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSubjects([...selectedSubjects, 'english']);
                                  } else {
                                    setSelectedSubjects(selectedSubjects.filter(sub => sub !== 'english'));
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
                            onClick={() => {
                              if (selectedSubjects.length === 0) {
                                alert("최소 하나의 과목을 선택해주세요.");
                                return;
                              }
                              approveStudent(s.id, selectedSubjects);
                            }}
                            className="flex-1 px-4 py-2 font-semibold rounded-lg transition-colors"
                            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            승인
                          </button>
                          <button
                            onClick={() => {
                              setApprovingStudentId(null);
                              setSelectedSubjects([]);
                            }}
                            className="px-4 py-2 font-semibold rounded-lg transition-colors"
                            style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E9EA'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setApprovingStudentId(s.id);
                          setSelectedSubjects(['korean']); // 기본값: 국어
                        }}
                        className="w-full px-6 py-2 font-semibold rounded-lg transition-colors"
                        style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        승인하기
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 학생 정보 편집 탭 */}
        {activeTab === "student-edit" && (
          <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#13181B' }}>학생 정보 편집</h2>
            <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.8 }}>학생의 국어/영어 접근 권한을 관리할 수 있습니다.</p>
            
            {allApprovedStudents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>승인된 학생이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allApprovedStudents.map((s: any) => {
                  const studentSubjects = s.subjects || ['korean'];
                  const isEditing = editingStudentId === s.id;
                  
                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl shadow-sm"
                      style={{ backgroundColor: '#F0EEEB' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-bold mb-1" style={{ color: '#13181B' }}>{s.name}</div>
                          <div className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>{s.email}</div>
                        </div>
                        {!isEditing && (
                          <button
                            onClick={async () => {
                              if (!confirm(`${s.name} 학생을 탈퇴시키시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n- 작성한 질문 및 댓글\n- 체크포인트 기록\n- 일별 숙제 기록\n- 시험 결과`)) {
                                return;
                              }
                              
                              if (!confirm(`정말로 ${s.name} 학생을 탈퇴시키시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
                                return;
                              }
                              
                              try {
                                // 학생 계정 삭제 (CASCADE로 관련 데이터 자동 삭제)
                                const { error } = await supabase
                                  .from("users")
                                  .delete()
                                  .eq("id", s.id)
                                  .eq("role", "student");
                                
                                if (error) {
                                  alert("학생 삭제 실패: " + error.message);
                                } else {
                                  alert(`${s.name} 학생이 탈퇴 처리되었습니다.`);
                                  // 목록 새로고침
                                  fetchApproved();
                                  fetchAllApproved();
                                }
                              } catch (err: any) {
                                alert("학생 삭제 중 오류가 발생했습니다: " + err.message);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                            style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            title="학생 탈퇴 (관련 데이터 모두 삭제)"
                          >
                            탈퇴
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>접근 가능한 과목</label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingStudentSubjects.includes('korean')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditingStudentSubjects([...editingStudentSubjects, 'korean']);
                                    } else {
                                      setEditingStudentSubjects(editingStudentSubjects.filter(sub => sub !== 'korean'));
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
                                  checked={editingStudentSubjects.includes('english')}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditingStudentSubjects([...editingStudentSubjects, 'english']);
                                    } else {
                                      setEditingStudentSubjects(editingStudentSubjects.filter(sub => sub !== 'english'));
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
                              onClick={async () => {
                                if (editingStudentSubjects.length === 0) {
                                  alert("최소 하나의 과목을 선택해주세요.");
                                  return;
                                }
                                
                                try {
                                  let hasSubjectsField = false;
                                  try {
                                    const { data: testData, error: testError } = await supabase
                                      .from("users")
                                      .select("subjects")
                                      .eq("id", s.id)
                                      .single();

                                    if (!testError && testData && testData.subjects !== undefined) {
                                      hasSubjectsField = true;
                                    }
                                  } catch (testErr: any) {
                                    hasSubjectsField = false;
                                  }

                                  if (!hasSubjectsField) {
                                    alert("과목 필드가 데이터베이스에 없습니다. 먼저 SQL 스크립트를 실행해주세요.");
                                    return;
                                  }

                                  const { error } = await supabase
                                    .from("users")
                                    .update({ subjects: editingStudentSubjects })
                                    .eq("id", s.id);

                                  if (error) {
                                    alert("과목 업데이트 실패: " + error.message);
                                  } else {
                                    alert("과목이 업데이트되었습니다.");
                                    setEditingStudentId(null);
                                    setEditingStudentSubjects([]);
                                    fetchApproved();
                                    fetchAllApproved();
                                  }
                                } catch (err) {
                                  alert("과목 업데이트 중 오류가 발생했습니다.");
                                }
                              }}
                              className="flex-1 px-4 py-2 font-semibold rounded-lg transition-colors"
                              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setEditingStudentId(null);
                                setEditingStudentSubjects([]);
                              }}
                              className="px-4 py-2 font-semibold rounded-lg transition-colors"
                              style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8E9EA'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold" style={{ color: '#13181B' }}>접근 가능한 과목:</div>
                          <div className="flex gap-2 flex-wrap">
                            {studentSubjects.includes('korean') && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}>
                                국어
                              </span>
                            )}
                            {studentSubjects.includes('english') && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}>
                                영어
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setEditingStudentId(s.id);
                              setEditingStudentSubjects([...studentSubjects]);
                            }}
                            className="w-full mt-3 px-4 py-2 font-semibold rounded-lg transition-colors"
                            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            수정
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 학생별 지문 관리 탭 */}
        {activeTab === "students" && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 학생 목록 */}
            <div className="lg:col-span-1">
              <div 
                className="rounded-xl p-6 shadow-sm sticky top-4 transition-all"
                style={{ backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  if (!(e.target as HTMLElement).closest('.student-item')) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
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
                          className="student-item w-full p-3 text-left rounded-xl transition-all shadow-sm"
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

            {/* 오른쪽: 선택한 학생의 지문 목록 또는 모든 학생의 지문 목록 */}
            <div className="lg:col-span-2">
              {selectedStudentId ? (
                studentPassages[selectedStudentId] === undefined ? (
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
                    <style>{`
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
                ) : Object.keys(studentPassages[selectedStudentId] || {}).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(studentPassages[selectedStudentId]).map(([category, passages]: [string, any[]]) => {
                        const categoryColor = category === "EBS" ? '#E8F0F8' : 
                                            category === "기출" ? '#FFF5E8' :
                                            category === "LEET" ? '#FFF0ED' : '#E8E9EA';
                        const isExpanded = expandedCategories[category] !== false; // 기본값은 true (펼쳐짐)
                        return (
                        <div key={category} className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                          <div 
                            className="flex items-center justify-between mb-4 pb-3 border-b cursor-pointer"
                            style={{ borderBottomColor: '#CCD5DA' }}
                            onClick={() => setExpandedCategories({ ...expandedCategories, [category]: !isExpanded })}
                          >
                            <h3 className="text-xl font-bold" style={{ color: '#13181B' }}>
                              {categoryLabels[category] || category} ({passages.length}개)
                            </h3>
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{ color: '#13181B' }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {isExpanded && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {passages.map((passage: any) => {
                              const checkpoints = studentCheckpoints[selectedStudentId]?.[passage.id] || [];
                              
                              // 각 문단별로 마지막 차수(최고 attempt_number) 찾기
                              const lastAttemptByParagraph: Record<number, any> = {};
                              checkpoints.forEach((cp: any) => {
                                const paraNum = cp.paragraph;
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
                                    <div className="mt-3 pt-3">
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.location.href = `/admin/passages/${passage.id}?student=${selectedStudentId}`;
                                        }}
                                        className="block p-3 rounded-lg transition-all cursor-pointer"
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
                                            {sortedParagraphs.length}개 문단 체크포인트 확인
                                          </span>
                                          <svg 
                                            className="w-4 h-4 flex-shrink-0 ml-2" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                            style={{ color: '#13181B' }}
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                      <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>체크포인트가 없습니다.</p>
                    </div>
                  )
              ) : (
                // 모든 학생의 체크포인트 표시
                isLoadingPassages ? (
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
                    <style>{`
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
                ) : Object.keys(studentPassages).length > 0 ? (
                  <div className="space-y-6">
                    {approvedStudents.map((student: any) => {
                      const studentPassageData = studentPassages[student.id];
                      if (!studentPassageData || Object.keys(studentPassageData).length === 0) return null;

                      return (
                        <div key={student.id} className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                          <h2 className="text-2xl font-bold mb-4 pb-3 border-b" style={{ color: '#13181B', borderBottomColor: '#CCD5DA' }}>
                            {student.name}
                          </h2>
                          <div className="space-y-6">
                            {Object.entries(studentPassageData).map(([category, passages]: [string, any[]]) => {
                              const isExpanded = expandedCategories[`${student.id}-${category}`] !== false;
                              return (
                                <div key={category} className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                                  <div 
                                    className="flex items-center justify-between mb-4 pb-2 border-b cursor-pointer"
                                    style={{ borderBottomColor: '#CCD5DA' }}
                                    onClick={() => setExpandedCategories({ ...expandedCategories, [`${student.id}-${category}`]: !isExpanded })}
                                  >
                                    <h3 className="text-lg font-bold" style={{ color: '#13181B' }}>
                                      {categoryLabels[category] || category} ({passages.length}개)
                                    </h3>
                                    <svg
                                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      style={{ color: '#13181B' }}
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  {isExpanded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {passages.map((passage: any) => {
                                        const checkpoints = studentCheckpoints[student.id]?.[passage.id] || [];
                                        
                                        const lastAttemptByParagraph: Record<number, any> = {};
                                        checkpoints.forEach((cp: any) => {
                                          const paraNum = cp.paragraph;
                                          const attemptNum = cp.attempt_number || 1;
                                          if (!lastAttemptByParagraph[paraNum] || 
                                              (lastAttemptByParagraph[paraNum].attempt_number || 1) < attemptNum) {
                                            lastAttemptByParagraph[paraNum] = cp;
                                          }
                                        });
                                        
                                        const sortedParagraphs = Object.keys(lastAttemptByParagraph)
                                          .map(Number)
                                          .sort((a, b) => a - b)
                                          .map(paraNum => lastAttemptByParagraph[paraNum]);
                                        
                                        return (
                                          <Link
                                            key={passage.id}
                                            href={`/admin/passages/${passage.id}?student=${student.id}`}
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
                                              <div className="mt-3 pt-3">
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `/admin/passages/${passage.id}?student=${student.id}`;
                                                  }}
                                                  className="block p-3 rounded-lg transition-all cursor-pointer"
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
                                                      {sortedParagraphs.length}개 문단 체크포인트 확인
                                                    </span>
                                                    <svg 
                                                      className="w-4 h-4 flex-shrink-0 ml-2" 
                                                      fill="none" 
                                                      stroke="currentColor" 
                                                      viewBox="0 0 24 24"
                                                      style={{ color: '#13181B' }}
                                                    >
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                    <p className="text-lg" style={{ color: '#13181B', opacity: 0.8 }}>체크포인트가 없습니다.</p>
                  </div>
                )
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
