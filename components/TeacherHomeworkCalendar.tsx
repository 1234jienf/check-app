"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface TeacherHomework {
  id: string;
  homework_date: string;
  subject: "korean" | "english";
  content?: string; // 국어용 줄글
  vocabulary_id?: string; // 영어용 단어장 ID
  sentence_example_id?: string; // 영어용 문장 예제 ID
  passage_analysis_id?: string; // 영어용 지문 해체 ID
  student_ids?: string[]; // 지정 학생 ID 배열, null이면 전체
}

export default function TeacherHomeworkCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [homeworks, setHomeworks] = useState<Record<string, TeacherHomework[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");
  const [formData, setFormData] = useState({
    subject: "korean" as "korean" | "english",
    content: "",
    vocabulary_id: null as string | null,
    sentence_example_id: null as string | null,
    passage_analysis_id: null as string | null,
    student_ids: null as string[] | null, // null이면 전체, 배열이면 지정 학생
  });
  const [editingHomework, setEditingHomework] = useState<TeacherHomework | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [studentSelectionMode, setStudentSelectionMode] = useState<"all" | "select">("all");
  
  // 영어 자료 목록
  const [vocabularies, setVocabularies] = useState<any[]>([]);
  const [sentenceExamples, setSentenceExamples] = useState<any[]>([]);
  const [passageAnalyses, setPassageAnalyses] = useState<any[]>([]);

  // 세션에서 선택한 과목 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
        setFormData(prev => ({ ...prev, subject: savedSubject }));
      }
    }
  }, []);

  // 과목 변경 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
        setFormData(prev => ({ ...prev, subject: newSubject }));
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
    }
  }, []);

  // 현재 로그인한 선생님 ID 가져오기
  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getTeacherId();
  }, []);

  // 선택한 과목의 학생 목록 불러오기
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const currentSubject = typeof window !== 'undefined' 
          ? (sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null) || "korean"
          : selectedSubject;

        const { data: fullData, error: fullError } = await supabase
          .from("users")
          .select("id, name, email, subjects")
          .eq("role", "student")
          .eq("approved", true)
          .order("name", { ascending: true });

        if (fullError || !fullData) {
          setAvailableStudents([]);
          return;
        }

        // 선택한 과목에 해당하는 학생만 필터링
        const filtered = fullData.filter((student: any) => {
          if (!student.subjects) {
            return currentSubject === "korean";
          }
          const studentSubjects = Array.isArray(student.subjects) 
            ? student.subjects 
            : (typeof student.subjects === 'string' ? [student.subjects] : ['korean']);
          return studentSubjects.includes(currentSubject);
        });

        setAvailableStudents(filtered);
      } catch (err) {
        setAvailableStudents([]);
      }
    };

    loadStudents();
  }, [selectedSubject]);

  // 영어 자료 목록 불러오기
  useEffect(() => {
    const loadMaterials = async () => {
      if (!teacherId || selectedSubject !== "english") return;

      try {
        const [vocabData, sentenceData, passageData] = await Promise.all([
          supabase.from("english_vocabulary").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
          supabase.from("english_sentence_examples").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
          supabase.from("english_passage_analysis").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
        ]);

        if (!vocabData.error && vocabData.data) {
          setVocabularies(vocabData.data);
        }
        if (!sentenceData.error && sentenceData.data) {
          setSentenceExamples(sentenceData.data);
        }
        if (!passageData.error && passageData.data) {
          setPassageAnalyses(passageData.data);
        }
      } catch (err) {
      }
    };

    loadMaterials();
  }, [teacherId, selectedSubject]);

  // 숙제 불러오기
  useEffect(() => {
    if (!teacherId) return;

    const loadHomeworks = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data, error } = await supabase
        .from("teacher_homework")
        .select("*")
        .eq("teacher_id", teacherId)
        .gte("homework_date", startDate.toISOString().split("T")[0])
        .lte("homework_date", endDate.toISOString().split("T")[0])
        .order("homework_date", { ascending: true });

      if (!error && data) {
        const grouped: Record<string, TeacherHomework[]> = {};
        data.forEach((homework) => {
          const date = homework.homework_date;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(homework);
        });
        setHomeworks(grouped);
      }
    };

    loadHomeworks();
  }, [teacherId, currentDate]);

  // 달력 날짜 생성
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return days;
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // 날짜가 현재 달인지 확인
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // 오늘인지 확인
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // 숙제 저장
  const handleSaveHomework = async () => {
    if (!teacherId || !selectedDate) return;

    if (formData.subject === "korean" && !formData.content.trim()) {
      alert("국어 숙제 내용을 입력해주세요.");
      return;
    }

    if (formData.subject === "english") {
      if (!formData.vocabulary_id && !formData.sentence_example_id && !formData.passage_analysis_id) {
        alert("영어 숙제는 단어장, 문장 예제, 지문 해체 중 하나 이상을 선택해주세요.");
        return;
      }
    }

    try {
      // 학생 선택: 전체면 null, 지정이면 배열
      const studentIds = studentSelectionMode === "all" ? null : formData.student_ids;

      const homeworkData: any = {
        teacher_id: teacherId,
        homework_date: formatDate(selectedDate),
        subject: formData.subject,
        content: formData.subject === "korean" ? formData.content.trim() : null,
        vocabulary_id: formData.subject === "english" ? formData.vocabulary_id : null,
        sentence_example_id: formData.subject === "english" ? formData.sentence_example_id : null,
        passage_analysis_id: formData.subject === "english" ? formData.passage_analysis_id : null,
        student_ids: studentIds,
      };

      if (editingHomework) {
        // 수정
        const { error } = await supabase
          .from("teacher_homework")
          .update(homeworkData)
          .eq("id", editingHomework.id);

        if (error) {
          alert("숙제 수정에 실패했습니다: " + error.message);
        } else {
          alert("숙제가 수정되었습니다.");
          await reloadHomeworks();
          handleCancelEdit();
        }
      } else {
        // 추가 (기존 숙제가 있으면 업데이트)
        // 먼저 기존 숙제 확인
        const { data: existingHomework } = await supabase
          .from("teacher_homework")
          .select("id")
          .eq("teacher_id", teacherId)
          .eq("homework_date", formatDate(selectedDate))
          .eq("subject", formData.subject)
          .maybeSingle();

        let error = null;
        
        if (existingHomework) {
          // 기존 숙제가 있으면 업데이트
          const { error: updateError } = await supabase
            .from("teacher_homework")
            .update(homeworkData)
            .eq("id", existingHomework.id);
          
          error = updateError;
          
          if (!error) {
            alert("숙제가 수정되었습니다. (기존 숙제를 업데이트했습니다.)");
          }
        } else {
          // 기존 숙제가 없으면 새로 추가
          const { error: insertError } = await supabase
          .from("teacher_homework")
          .insert(homeworkData);
          
          error = insertError;
          
          if (!error) {
            alert("숙제가 추가되었습니다.");
          }
        }

        if (error) {
          alert("숙제 저장에 실패했습니다: " + error.message);
        } else {
          await reloadHomeworks();
          setFormData({
            subject: selectedSubject,
            content: "",
            vocabulary_id: null,
            sentence_example_id: null,
            passage_analysis_id: null,
            student_ids: null,
          });
          setStudentSelectionMode("all");
        }
      }
    } catch (error: any) {
      alert("오류가 발생했습니다: " + error.message);
    }
  };

  // 숙제 다시 불러오기
  const reloadHomeworks = async () => {
    if (!teacherId) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const { data } = await supabase
      .from("teacher_homework")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("homework_date", startDate.toISOString().split("T")[0])
      .lte("homework_date", endDate.toISOString().split("T")[0])
      .order("homework_date", { ascending: true });

    if (data) {
      const grouped: Record<string, TeacherHomework[]> = {};
      data.forEach((homework) => {
        const date = homework.homework_date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(homework);
      });
      setHomeworks(grouped);
    }
  };

  // 숙제 삭제
  const handleDeleteHomework = async (homeworkId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("teacher_homework")
      .delete()
      .eq("id", homeworkId);

    if (error) {
      alert("숙제 삭제에 실패했습니다.");
    } else {
      await reloadHomeworks();
    }
  };

  // 숙제 수정 모드로 전환
  const handleEditHomework = (homework: TeacherHomework) => {
    setEditingHomework(homework);
    setSelectedDate(new Date(homework.homework_date));
    const studentIds = homework.student_ids || null;
    setFormData({
      subject: homework.subject,
      content: homework.content || "",
      vocabulary_id: homework.vocabulary_id || null,
      sentence_example_id: homework.sentence_example_id || null,
      passage_analysis_id: homework.passage_analysis_id || null,
      student_ids: studentIds,
    });
    setStudentSelectionMode(studentIds === null ? "all" : "select");
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingHomework(null);
    setFormData({
      subject: selectedSubject,
      content: "",
      vocabulary_id: null,
      sentence_example_id: null,
      passage_analysis_id: null,
      student_ids: null,
    });
    setStudentSelectionMode("all");
  };

  // 이전 달
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // 다음 달
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getCalendarDays();
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : null;
  const selectedDateHomeworks = selectedDateStr 
    ? (homeworks[selectedDateStr] || []).filter(h => h.subject === selectedSubject)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* 왼쪽: 달력 */}
      <div className="lg:col-span-1">
        <div className="rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="transition-colors p-2 rounded-lg"
              style={{ color: '#13181B', opacity: 0.7 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm md:text-base font-semibold" style={{ color: '#13181B' }}>
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h3>
            <button
              onClick={nextMonth}
              className="transition-colors p-2 rounded-lg"
              style={{ color: '#13181B', opacity: 0.7 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#CCD5DA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold py-1" style={{ color: '#13181B', opacity: 0.7 }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((date, idx) => {
              const dateStr = formatDate(date);
              const hasHomework = homeworks[dateStr]?.some(h => h.subject === selectedSubject);
              const isSelected = selectedDate && formatDate(selectedDate) === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className="relative aspect-square text-[10px] rounded transition-all p-0.5"
                  style={!isCurrentMonth(date) ? {
                    color: '#CCD5DA',
                    backgroundColor: 'transparent'
                  } : isToday(date) ? {
                    color: '#F0EEEB',
                    backgroundColor: '#13181B',
                    border: '2px solid #13181B'
                  } : isSelected ? {
                    color: '#F0EEEB',
                    backgroundColor: '#13181B',
                    border: '2px solid #13181B'
                  } : hasHomework ? {
                    color: '#13181B',
                    borderColor: '#CCD5DA',
                    backgroundColor: '#F0EEEB',
                    border: '1px solid'
                  } : {
                    color: '#13181B',
                    borderColor: 'transparent',
                    backgroundColor: '#F0EEEB'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentMonth(date)) return;
                    if (!isToday(date) && !isSelected) {
                      e.currentTarget.style.backgroundColor = '#CCD5DA';
                      e.currentTarget.style.borderColor = '#13181B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentMonth(date)) return;
                    if (!isToday(date) && !isSelected) {
                      e.currentTarget.style.backgroundColor = hasHomework ? '#F0EEEB' : '#F0EEEB';
                      e.currentTarget.style.borderColor = hasHomework ? '#CCD5DA' : 'transparent';
                    }
                  }}
                >
                  <span className="text-[10px] leading-tight">{date.getDate()}</span>
                  {hasHomework && !isSelected && (
                    <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: '#FFBF65' }}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 오른쪽: 숙제 입력 및 목록 */}
      <div className="lg:col-span-2">
        {selectedDate ? (
          <div className="rounded-xl p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold mb-1" style={{ color: '#13181B' }}>
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 Daily 숙제
              </h3>
              <p className="text-xs md:text-sm" style={{ color: '#13181B', opacity: 0.8 }}>
                {selectedSubject === "korean" ? "국어" : "영어"} 숙제를 추가하거나 수정하세요.
              </p>
            </div>

            {/* 숙제 입력 폼 */}
            <div className="mb-6 p-4 rounded-lg shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#13181B' }}>
                {editingHomework ? "숙제 수정" : "새 숙제 추가"}
              </h4>
              <div className="space-y-3">
                {/* 학생 선택 */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: '#13181B' }}>
                    지정 학생
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="studentMode"
                          checked={studentSelectionMode === "all"}
                          onChange={() => {
                            setStudentSelectionMode("all");
                            setFormData({ ...formData, student_ids: null });
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: '#13181B' }}
                        />
                        <span style={{ color: '#13181B' }}>전체</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="studentMode"
                          checked={studentSelectionMode === "select"}
                          onChange={() => {
                            setStudentSelectionMode("select");
                            setFormData({ ...formData, student_ids: [] });
                          }}
                          className="w-4 h-4"
                          style={{ accentColor: '#13181B' }}
                        />
                        <span style={{ color: '#13181B' }}>지정 선택</span>
                      </label>
                    </div>
                    {studentSelectionMode === "select" && (
                      <div className="max-h-48 overflow-y-auto border-2 rounded-lg p-2" style={{ borderColor: '#CCD5DA', backgroundColor: '#FFFFFF' }}>
                        {availableStudents.length === 0 ? (
                          <p className="text-xs" style={{ color: '#13181B', opacity: 0.7 }}>선택 가능한 학생이 없습니다.</p>
                        ) : (
                          <div className="space-y-1">
                            {availableStudents.map((student) => (
                              <label key={student.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.student_ids?.includes(student.id) || false}
                                  onChange={(e) => {
                                    const currentIds = formData.student_ids || [];
                                    if (e.target.checked) {
                                      setFormData({ ...formData, student_ids: [...currentIds, student.id] });
                                    } else {
                                      setFormData({ ...formData, student_ids: currentIds.filter(id => id !== student.id) });
                                    }
                                  }}
                                  className="w-4 h-4"
                                  style={{ accentColor: '#13181B' }}
                                />
                                <span className="text-xs" style={{ color: '#13181B' }}>{student.name} ({student.email})</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {formData.subject === "korean" ? (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#13181B' }}>
                      내용 <span style={{ color: '#FD8973' }}>*</span>
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-all"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#13181B';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                      rows={6}
                      placeholder="국어 숙제 내용을 입력하세요"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#13181B' }}>
                        단어장 선택 <span style={{ color: '#FD8973' }}>*</span>
                      </label>
                      <select
                        value={formData.vocabulary_id || ""}
                        onChange={(e) => setFormData({ ...formData, vocabulary_id: e.target.value || null })}
                        className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-all"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                        }}
                      >
                        <option value="">단어장을 선택하세요</option>
                        {vocabularies.map((vocab) => (
                          <option key={vocab.id} value={vocab.id}>
                            {vocab.title} ({vocab.word_count}개)
                          </option>
                        ))}
                      </select>
                      {vocabularies.length === 0 && (
                        <p className="text-xs mt-1" style={{ color: '#13181B', opacity: 0.7 }}>
                          자료실에서 단어장을 먼저 등록해주세요. <Link href="/admin/materials" className="underline">자료실로 이동</Link>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#13181B' }}>
                        문장 예제 선택 (선택사항)
                      </label>
                      <select
                        value={formData.sentence_example_id || ""}
                        onChange={(e) => setFormData({ ...formData, sentence_example_id: e.target.value || null })}
                        className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-all"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                        }}
                      >
                        <option value="">문장 예제를 선택하세요 (선택사항)</option>
                        {sentenceExamples.map((example) => (
                          <option key={example.id} value={example.id}>
                            {example.title} ({example.pattern}) - {example.sentence_count}개
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#13181B' }}>
                        지문 해체 선택 (선택사항)
                      </label>
                      <select
                        value={formData.passage_analysis_id || ""}
                        onChange={(e) => setFormData({ ...formData, passage_analysis_id: e.target.value || null })}
                        className="w-full px-3 py-2 text-sm border-2 rounded-lg transition-all"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                        }}
                      >
                        <option value="">지문 해체를 선택하세요 (선택사항)</option>
                        {passageAnalyses.map((passage) => (
                          <option key={passage.id} value={passage.id}>
                            {passage.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveHomework}
                    className="flex-1 px-4 py-2 text-white text-sm rounded-lg font-semibold transition-colors"
                    style={{ backgroundColor: '#13181B' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#003A6C';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#13181B';
                    }}
                  >
                    {editingHomework ? "수정" : "추가"}
                  </button>
                  {editingHomework && (
                    <>
                      <button
                        onClick={() => handleDeleteHomework(editingHomework.id)}
                        className="px-4 py-2 text-white text-sm rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#FD8973' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        삭제
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                      >
                        취소
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 숙제 목록 */}
            {selectedDateHomeworks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: '#13181B' }}>등록된 숙제</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedDateHomeworks.map((homework) => (
                    <div
                      key={homework.id}
                      className="relative p-4 rounded-lg border-2 transition-all cursor-pointer"
                      style={editingHomework?.id === homework.id ? {
                        backgroundColor: '#CCD5DA',
                        borderColor: '#13181B'
                      } : {
                        backgroundColor: '#F0EEEB',
                        borderColor: '#CCD5DA'
                      }}
                      onClick={() => handleEditHomework(homework)}
                      onMouseEnter={(e) => {
                        if (editingHomework?.id !== homework.id) {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.backgroundColor = '#CCD5DA';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (editingHomework?.id !== homework.id) {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                          e.currentTarget.style.backgroundColor = '#F0EEEB';
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {homework.subject === "korean" && homework.content && (
                            <div className="text-xs mb-2 whitespace-pre-wrap" style={{ color: '#13181B', opacity: 0.8 }}>{homework.content}</div>
                          )}
                          {homework.subject === "english" && (
                            <div className="text-xs space-y-1 mb-2" style={{ color: '#13181B', opacity: 0.8 }}>
                              {homework.vocabulary_id && (
                                <div>단어장: 선택됨</div>
                              )}
                              {homework.sentence_example_id && (
                                <div>문장 예제: 선택됨</div>
                              )}
                              {homework.passage_analysis_id && (
                                <div>지문 해체: 선택됨</div>
                              )}
                            </div>
                          )}
                          {homework.student_ids && homework.student_ids.length > 0 && (
                            <div className="text-xs mt-2" style={{ color: '#13181B', opacity: 0.6 }}>
                              지정 학생: {homework.student_ids.length}명
                            </div>
                          )}
                          {(!homework.student_ids || homework.student_ids.length === 0) && (
                            <div className="text-xs mt-2" style={{ color: '#13181B', opacity: 0.6 }}>
                              전체 학생
                            </div>
                          )}
                        </div>
                        {editingHomework?.id === homework.id && (
                          <div className="ml-2 px-3 py-1.5 text-white text-xs rounded font-semibold" style={{ backgroundColor: '#13181B' }}>
                            수정 중
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl p-12 shadow-sm text-center" style={{ backgroundColor: '#FFFFFF' }}>
            <p style={{ color: '#13181B', opacity: 0.7 }}>날짜를 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
