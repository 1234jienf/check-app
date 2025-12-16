"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface DailyHomework {
  id: string;
  homework_date: string;
  notes?: string;
  tasks: Array<{
    id: string;
    task_text: string;
    is_completed: boolean;
    is_from_teacher?: boolean; // 선생님이 내준 Daily 숙제인지
    order_num?: number;
  }>;
}

export default function StudentHomeworkCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [homeworkData, setHomeworkData] = useState<Record<string, DailyHomework>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTaskText, setNewTaskText] = useState<string>("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");
  const [currentSubject, setCurrentSubject] = useState<"korean" | "english">("korean");

  // task.id에서 teacher_homework_id 추출
  // 형식: "teacher-{homeworkId}-{type}" (예: "teacher-a1b2c3d4-e5f6-7890-abcd-ef1234567890-vocab")
  const getTeacherHomeworkId = (taskId: string): string | null => {
    if (taskId.startsWith("teacher-")) {
      // "teacher-" 제거
      const withoutPrefix = taskId.substring(8);
      // 마지막 하이픈 이후의 타입 제거 (vocab, sentence, passage, korean)
      const lastDashIndex = withoutPrefix.lastIndexOf("-");
      if (lastDashIndex > 0) {
        return withoutPrefix.substring(0, lastDashIndex);
      }
      // 타입이 없는 경우 (이론적으로는 없어야 함)
      return withoutPrefix;
    }
    return null;
  };

  // 시험 페이지로 이동
  const handleTakeTest = (taskId: string) => {
    const homeworkId = getTeacherHomeworkId(taskId);
    if (homeworkId) {
      router.push(`/student/daily-test/${homeworkId}`);
    }
  };

  useEffect(() => {
    const getStudentId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
      }
    };
    getStudentId();

    // 세션에서 선택한 과목 불러오기
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

  // 초기 과목 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('selectedSubject') as "korean" | "english" | null;
      if (savedSubject && savedSubject !== currentSubject) {
        setCurrentSubject(savedSubject);
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;

    const loadHomework = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      
      // 현재 선택한 과목 가져오기 (세션 스토리지에서 직접 읽기)
      const currentSubjectFromStorage = typeof window !== 'undefined' 
        ? (sessionStorage.getItem('selectedSubject') as "korean" | "english" | null) || "korean"
        : currentSubject;
      
      // currentSubject state 업데이트
      if (currentSubjectFromStorage !== currentSubject) {
        setCurrentSubject(currentSubjectFromStorage);
        setSelectedSubject(currentSubjectFromStorage);
      }
      
      // 실제 사용할 과목 (업데이트된 currentSubject 또는 storage 값)
      const subjectToUse = currentSubjectFromStorage;

      // 학생 개인 숙제 불러오기 (현재 선택한 과목만)
      let homeworkQuery = supabase
        .from("daily_homework")
        .select("*")
        .eq("student_id", studentId)
        .gte("homework_date", startDateStr)
        .lte("homework_date", endDateStr);

      // subject 컬럼이 있는지 확인하고 필터링
      try {
        const { data: testData } = await supabase
          .from("daily_homework")
          .select("subject")
          .limit(1)
          .maybeSingle();

        if (testData && testData.subject !== undefined) {
          // subject 컬럼이 있는 경우 필터링
          if (subjectToUse === "korean") {
            homeworkQuery = homeworkQuery.or("subject.eq.korean,subject.is.null");
          } else {
            homeworkQuery = homeworkQuery.eq("subject", "english");
          }
        }
      } catch (err) {
        // subject 컬럼이 없으면 모든 숙제 표시 (기존 동작)
      }

      const { data: homeworkList } = await homeworkQuery;

      // 선생님이 내준 Daily 숙제 불러오기 (현재 선택한 과목만)
      // RLS 정책에 의해 자동으로 필터링되므로, 모든 숙제를 가져온 후 클라이언트에서 필터링
      const { data: teacherHomeworkList, error: teacherHomeworkError } = await supabase
        .from("teacher_homework")
        .select("*")
        .eq("subject", subjectToUse)
        .gte("homework_date", startDateStr)
        .lte("homework_date", endDateStr);

      if (teacherHomeworkError) {
        // 400 에러가 발생하면 RLS 정책 문제일 수 있음
        // 에러를 무시하고 계속 진행 (학생 개인 숙제는 표시)
      }

      const homeworkMap: Record<string, DailyHomework> = {};
      
      // 학생 개인 숙제 처리
      if (homeworkList) {
        for (const homework of homeworkList) {
          const { data: tasks } = await supabase
            .from("daily_homework_tasks")
            .select("*")
            .eq("daily_homework_id", homework.id)
            .order("order_num");

          homeworkMap[homework.homework_date] = {
            id: homework.id,
            homework_date: homework.homework_date,
            tasks: (tasks || []).map(t => ({ ...t, is_from_teacher: false })),
          };
        }
      }

      // 선생님이 내준 Daily 숙제 처리
      if (teacherHomeworkList) {
        for (const teacherHomework of teacherHomeworkList) {
          // student_ids가 null이면 전체 학생, 배열이면 해당 학생만
          const isForThisStudent = teacherHomework.student_ids === null || 
            (Array.isArray(teacherHomework.student_ids) && teacherHomework.student_ids.includes(studentId));

          if (!isForThisStudent) continue;

          const dateStr = teacherHomework.homework_date;
          
          // 선생님 숙제를 task로 변환
          const teacherTasks: Array<{ id: string; task_text: string; is_completed: boolean; is_from_teacher: boolean }> = [];

          // 과목이 현재 선택한 과목과 일치하는지 다시 확인
          if (teacherHomework.subject !== subjectToUse) continue;

          // 국어는 시험 보기 버튼이 없으므로 task에 표시하지 않음 (content만 표시)
          if (teacherHomework.subject === "korean" && teacherHomework.content) {
            teacherTasks.push({
              id: `teacher-${teacherHomework.id}-korean`,
              task_text: teacherHomework.content,
              is_completed: false,
              is_from_teacher: true,
            });
          } else if (teacherHomework.subject === "english") {
            // 영어 자료 정보 가져오기
            if (teacherHomework.vocabulary_id) {
              const { data: vocab } = await supabase
                .from("english_vocabulary")
                .select("title, word_count")
                .eq("id", teacherHomework.vocabulary_id)
                .single();
              if (vocab) {
                teacherTasks.push({
                  id: `teacher-${teacherHomework.id}-vocab`,
                  task_text: `[단어장] ${vocab.title} (${vocab.word_count}개)`,
                  is_completed: false,
                  is_from_teacher: true,
                });
              }
            }
            if (teacherHomework.sentence_example_id) {
              const { data: sentence } = await supabase
                .from("english_sentence_examples")
                .select("title, sentence_count, pattern")
                .eq("id", teacherHomework.sentence_example_id)
                .single();
              if (sentence) {
                teacherTasks.push({
                  id: `teacher-${teacherHomework.id}-sentence`,
                  task_text: `[문장 예제] ${sentence.title} (${sentence.pattern}) - ${sentence.sentence_count}개`,
                  is_completed: false,
                  is_from_teacher: true,
                });
              }
            }
            if (teacherHomework.passage_analysis_id) {
              const { data: passage } = await supabase
                .from("english_passage_analysis")
                .select("title")
                .eq("id", teacherHomework.passage_analysis_id)
                .single();
              if (passage) {
                teacherTasks.push({
                  id: `teacher-${teacherHomework.id}-passage`,
                  task_text: `[지문 해체] ${passage.title}`,
                  is_completed: false,
                  is_from_teacher: true,
                });
              }
            }
          }

          // 기존 homework가 있으면 tasks에 추가, 없으면 새로 생성
          if (homeworkMap[dateStr]) {
            homeworkMap[dateStr].tasks = [...teacherTasks, ...homeworkMap[dateStr].tasks];
          } else {
            // daily_homework 레코드가 없으면 생성
            const { data: newHomework } = await supabase
              .from("daily_homework")
              .insert({
                student_id: studentId,
                homework_date: dateStr,
                subject: subjectToUse,
              })
              .select()
              .single();

            if (newHomework) {
              homeworkMap[dateStr] = {
                id: newHomework.id,
                homework_date: dateStr,
                tasks: teacherTasks,
              };
            }
          }
        }
      }
      
      setHomeworkData(homeworkMap);
    };

    loadHomework();
  }, [studentId, currentDate, currentSubject]);

  // 과목 변경 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
        setCurrentSubject(newSubject);
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
    }
  }, []);


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

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const addTask = async () => {
    if (!newTaskText.trim() || !studentId || !selectedDate) return;

    setSaving(true);
    const dateStr = formatDate(selectedDate);

    // daily_homework가 없으면 먼저 생성
    let homework = homeworkData[dateStr];
    if (!homework) {
      const { data: newHomework } = await supabase
        .from("daily_homework")
        .insert({
          student_id: studentId,
          homework_date: dateStr,
          subject: currentSubject,
        })
        .select()
        .single();

      if (newHomework) {
        homework = {
          id: newHomework.id,
          homework_date: dateStr,
          notes: "",
          tasks: [],
        };
        setHomeworkData({ ...homeworkData, [dateStr]: homework });
      } else {
        setSaving(false);
        return;
      }
    }

    // 할 일 추가
    const maxOrder = homework.tasks.length > 0 ? Math.max(...homework.tasks.map(t => t.order_num || 0)) : 0;
    const { data: newTask } = await supabase
      .from("daily_homework_tasks")
      .insert({
        daily_homework_id: homework.id,
        task_text: newTaskText.trim(),
        is_completed: false,
        order_num: maxOrder + 1,
      })
      .select()
      .single();

    if (newTask) {
      const updatedHomework = {
        ...homework,
        tasks: [...homework.tasks, { id: newTask.id, task_text: newTask.task_text, is_completed: false }],
      };
      setHomeworkData({ ...homeworkData, [dateStr]: updatedHomework });
    }

    setNewTaskText("");
    setSaving(false);
  };

  const toggleTask = async (taskId: string) => {
    if (!studentId || !selectedDate) return;

    const dateStr = formatDate(selectedDate);
    const homework = homeworkData[dateStr];
    if (!homework) return;

    const task = homework.tasks.find(t => t.id === taskId);
    if (task) {
      // 선생님이 내준 숙제는 체크만 로컬에서 처리 (DB 업데이트 안 함)
      if (task.is_from_teacher) {
        const updatedTasks = homework.tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
        );
        setHomeworkData({
          ...homeworkData,
          [dateStr]: { ...homework, tasks: updatedTasks }
        });
      } else {
        // 학생 개인 숙제는 DB 업데이트
        await supabase
          .from("daily_homework_tasks")
          .update({ 
            is_completed: !task.is_completed,
            updated_at: new Date().toISOString()
          })
          .eq("id", taskId);

        const updatedTasks = homework.tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: !t.is_completed } : t
        );
        setHomeworkData({
          ...homeworkData,
          [dateStr]: { ...homework, tasks: updatedTasks }
        });
      }
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!studentId || !selectedDate) return;

    const dateStr = formatDate(selectedDate);
    const homework = homeworkData[dateStr];
    if (!homework) return;

    const task = homework.tasks.find(t => t.id === taskId);
    // 선생님이 내준 숙제는 삭제 불가
    if (task?.is_from_teacher) {
      alert("선생님이 내주신 Daily 숙제는 삭제할 수 없습니다.");
      return;
    }

    if (confirm("이 할 일을 삭제하시겠습니까?")) {
      await supabase
        .from("daily_homework_tasks")
        .delete()
        .eq("id", taskId);

      if (homework) {
        const updatedTasks = homework.tasks.filter(t => t.id !== taskId);
        setHomeworkData({
          ...homeworkData,
          [dateStr]: { ...homework, tasks: updatedTasks }
        });
      }
    }
  };


  const days = getCalendarDays();
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : null;
  const selectedHomework = selectedDate ? homeworkData[selectedDateStr || ""] : null;

  return (
    <div className="space-y-6">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }}
          className="p-2 rounded-lg transition-all"
          style={{ color: '#13181B' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg md:text-xl font-bold" style={{ color: '#13181B' }}>
          {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
        </h2>
        <button
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }}
          className="p-2 rounded-lg transition-all"
          style={{ color: '#13181B' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium py-2" style={{ color: '#13181B', opacity: 0.8 }}>
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 mb-6">
        {days.map((date, idx) => {
          const dateStr = formatDate(date);
          const homework = homeworkData[dateStr];
          const hasTasks = homework && homework.tasks.length > 0;
          const hasCompletedTasks = homework && homework.tasks.some(t => t.is_completed);
          const isSelected = selectedDateStr === dateStr;

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(date)}
              className="relative aspect-square flex flex-col items-center justify-center text-xs rounded-lg transition-all border-2 p-1"
              style={!isCurrentMonth(date) ? {
                color: '#13181B',
                opacity: 0.4,
                borderColor: 'transparent',
                backgroundColor: '#F0EEEB'
              } : isToday(date) ? {
                backgroundColor: '#13181B',
                color: '#F0EEEB',
                borderColor: '#13181B'
              } : isSelected ? {
                backgroundColor: '#CCD5DA',
                color: '#13181B',
                borderColor: '#13181B'
              } : hasTasks ? {
                color: '#13181B',
                borderColor: '#CCD5DA',
                backgroundColor: '#FFFFFF'
              } : {
                color: '#13181B',
                borderColor: 'transparent',
                backgroundColor: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (isCurrentMonth(date)) {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="text-xs font-medium">{date.getDate()}</span>
              {hasTasks && (
                <div className="flex gap-0.5 mt-1">
                  {homework.tasks.slice(0, 3).map((task, taskIdx) => (
                    <div
                      key={taskIdx}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: task.is_completed ? '#13181B' : '#CCD5DA'
                      }}
                    />
                  ))}
                  {homework.tasks.length > 3 && (
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#CCD5DA', opacity: 0.5 }} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 할 일 목록 */}
      {selectedDate && (
        <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#13181B' }}>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 할 일
          </h3>

          {/* 할 일 추가 */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTask();
                }
              }}
              placeholder="할 일을 입력하세요..."
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
              style={{ 
                backgroundColor: '#F0EEEB', 
                borderColor: '#CCD5DA', 
                color: '#13181B'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.outline = 'none';
              }}
              onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
            />
            <button
              onClick={addTask}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl font-semibold transition-all"
              style={{ 
                backgroundColor: '#13181B',
                color: '#F0EEEB',
                opacity: saving ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              추가
            </button>
          </div>
          <style jsx>{`
            input::placeholder {
              color: #13181B;
              opacity: 0.5;
            }
          `}</style>

          {/* 할 일 목록 */}
          {selectedHomework && selectedHomework.tasks.length > 0 ? (
            <div className="space-y-2 mb-4">
              {selectedHomework.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all"
                  style={{ 
                    backgroundColor: task.is_completed ? '#F0EEEB' : '#FFFFFF',
                    border: `2px solid ${task.is_completed ? '#13181B' : '#CCD5DA'}`
                  }}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="flex-shrink-0 mt-1"
                  >
                    <div
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: task.is_completed ? '#13181B' : 'transparent',
                        borderColor: '#13181B'
                      }}
                    >
                      {task.is_completed && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#F0EEEB' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.is_from_teacher && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: '#FFD700', color: '#13181B' }}
                        >
                          [daily]
                        </span>
                      )}
                      <div 
                        className={`font-medium ${task.is_completed ? 'line-through' : ''}`}
                        style={{ 
                          color: '#13181B',
                          opacity: task.is_completed ? 0.6 : 1
                        }}
                      >
                        {task.task_text}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.is_from_teacher && getTeacherHomeworkId(task.id) && (() => {
                      const currentSubjectForButton = typeof window !== 'undefined' 
                        ? (sessionStorage.getItem('selectedSubject') as "korean" | "english" | null) || "korean"
                        : currentSubject;
                      return currentSubjectForButton === "english";
                    })() && (
                      <button
                        onClick={() => handleTakeTest(task.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ 
                          backgroundColor: '#13181B',
                          color: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(19, 24, 27, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        시험 보기
                      </button>
                    )}
                    {!task.is_from_teacher && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="flex-shrink-0 p-1 rounded transition-colors"
                        style={{ color: '#13181B', opacity: 0.6 }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-4 mb-4" style={{ color: '#13181B', opacity: 0.6 }}>
              아직 할 일이 없습니다. 위에서 할 일을 추가해보세요.
            </p>
          )}

        </div>
      )}
    </div>
  );
}
