"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface StudentHomework {
  student_id: string;
  student_name: string;
  homework_date: string;
  tasks: Array<{
    id: string;
    task_text: string;
    is_completed: boolean;
  }>;
  notes?: string;
}

export default function AdminHomeworkCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [homeworkData, setHomeworkData] = useState<Record<string, StudentHomework[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getTeacherId();
  }, []);

  // 세션에서 선택한 과목 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

  useEffect(() => {
    if (teacherId) {
      loadHomework();
    }
  }, [teacherId, currentDate, selectedSubject]);


  const loadHomework = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    // 모든 학생의 일별 숙제 로드 (과목 필터링)
    let homeworkQuery = supabase
      .from("daily_homework")
      .select(`
        id,
        student_id,
        homework_date,
        notes,
        subject
      `)
      .gte("homework_date", startDate.toISOString().split("T")[0])
      .lte("homework_date", endDate.toISOString().split("T")[0]);

    // subject 컬럼이 있는지 확인하고 필터링
    try {
      const { data: testData, error: testError } = await supabase
        .from("daily_homework")
        .select("subject")
        .limit(1)
        .maybeSingle();

      if (!testError && testData && testData.subject !== undefined) {
        // subject 컬럼이 있는 경우 필터링
        if (selectedSubject === "korean") {
          homeworkQuery = homeworkQuery.or("subject.eq.korean,subject.is.null");
        } else {
          homeworkQuery = homeworkQuery.eq("subject", "english");
        }
      }
    } catch (testErr: any) {
      // subject 컬럼이 없으면 모든 숙제 표시 (기존 동작)
    }

    const { data: homeworkList } = await homeworkQuery;

    // 선생님이 내준 Daily 숙제도 불러오기
    const { data: teacherHomeworkList } = await supabase
      .from("teacher_homework")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("subject", selectedSubject)
      .gte("homework_date", startDate.toISOString().split("T")[0])
      .lte("homework_date", endDate.toISOString().split("T")[0]);

    if (homeworkList) {
      // 학생 정보 가져오기 (과목 필터링)
      const studentIds = [...new Set(homeworkList.map(h => h.student_id))];
      
      // 먼저 기본 정보만 가져오기
      const { data: basicStudentData, error: basicError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "student")
        .eq("approved", true)
        .in("id", studentIds);

      if (!basicStudentData) {
        setHomeworkData({});
        return;
      }

      // subjects 필드가 있는지 확인하고 필터링
      let filteredStudentIds = studentIds;
      let hasSubjectsField = false;
      
      if (basicStudentData && basicStudentData.length > 0) {
        try {
          const { data: testData, error: testError } = await supabase
            .from("users")
            .select("subjects")
            .eq("id", basicStudentData[0].id)
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
          const { data: fullStudentData, error: fullError } = await supabase
            .from("users")
            .select("id, name, email, subjects")
            .eq("role", "student")
            .eq("approved", true)
            .in("id", studentIds);

          if (!fullError && fullStudentData) {
            // 선택한 과목에 해당하는 학생만 필터링
            filteredStudentIds = fullStudentData
              .filter((student: any) => {
                const studentSubjects = Array.isArray(student.subjects) ? student.subjects : (student.subjects ? [student.subjects] : ['korean']);
                return studentSubjects.includes(selectedSubject);
              })
              .map((s: any) => s.id);
          }
        } catch (fullErr: any) {
          // 에러 발생 시 기본값 사용
          if (selectedSubject === "english") {
            filteredStudentIds = [];
          }
        }
      } else {
        // subjects 필드가 없으면 영어 선택 시 빈 배열
        if (selectedSubject === "english") {
          filteredStudentIds = [];
        }
      }

      // 필터링된 학생 정보만 가져오기
      const { data: studentData } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", filteredStudentIds.length > 0 ? filteredStudentIds : []);

      const studentMap = new Map();
      if (studentData) {
        studentData.forEach(s => studentMap.set(s.id, s));
      }

      const homeworkMap: Record<string, StudentHomework[]> = {};
      
      for (const homework of homeworkList) {
        // 필터링된 학생만 처리
        if (!filteredStudentIds.includes(homework.student_id)) {
          continue;
        }

        const { data: tasks } = await supabase
          .from("daily_homework_tasks")
          .select("*")
          .eq("daily_homework_id", homework.id)
          .order("order_num");

        const dateStr = homework.homework_date;
        if (!homeworkMap[dateStr]) {
          homeworkMap[dateStr] = [];
        }

        const student = studentMap.get(homework.student_id);
        if (student) {
          homeworkMap[dateStr].push({
            student_id: homework.student_id,
            student_name: student?.name || student?.email || "학생",
            homework_date: homework.homework_date,
            tasks: tasks || [],
            notes: homework.notes || "",
          });
        }
      }
      
      // 선생님이 내준 Daily 숙제를 각 학생의 할 일에 추가
      if (teacherHomeworkList) {
        // 모든 학생의 선생님 숙제 체크 상태 불러오기
        // daily_homework_teacher_checks 테이블 사용 (수정된 구조)
        const { data: completionData } = await supabase
          .from("daily_homework_teacher_checks")
          .select("*")
          .in("teacher_homework_id", teacherHomeworkList.map((h: any) => h.id))
          .in("student_id", filteredStudentIds.length > 0 ? filteredStudentIds : [])
          .not("teacher_homework_id", "is", null);

        const completionMap = new Map();
        if (completionData) {
          completionData.forEach((c: any) => {
            const key = `${c.student_id}-${c.teacher_homework_id}-${c.task_type}`;
            completionMap.set(key, c.is_completed);
          });
        }

        for (const teacherHomework of teacherHomeworkList) {
          const dateStr = teacherHomework.homework_date;
          if (!homeworkMap[dateStr]) {
            homeworkMap[dateStr] = [];
          }

          // 선생님 숙제를 task로 변환
          const teacherTasks: Array<{ id: string; task_text: string; is_completed: boolean }> = [];

          if (teacherHomework.subject === "korean" && teacherHomework.content) {
            teacherTasks.push({
              id: `teacher-${teacherHomework.id}-korean`,
              task_text: `[daily] ${teacherHomework.content}`,
              is_completed: false, // 기본값, 각 학생별로 설정됨
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
                  task_text: `[daily] [단어장] ${vocab.title} (${vocab.word_count}개)`,
                  is_completed: false, // 기본값, 각 학생별로 설정됨
                });
              }
            }
            if (teacherHomework.sentence_example_id) {
              const { data: sentence } = await supabase
                .from("english_sentence_examples")
                .select("title, sentence_count")
                .eq("id", teacherHomework.sentence_example_id)
                .single();
              if (sentence) {
                teacherTasks.push({
                  id: `teacher-${teacherHomework.id}-sentence`,
                  task_text: `[daily] [구문 해석] ${sentence.title} (${sentence.sentence_count}개)`,
                  is_completed: false, // 기본값, 각 학생별로 설정됨
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
                  task_text: `[daily] [지문 해석] ${passage.title}`,
                  is_completed: false, // 기본값, 각 학생별로 설정됨
                });
              }
            }
          }

          // student_ids가 null이면 모든 학생에게 추가, 배열이면 해당 학생들에게만 추가
          const targetStudentIds = teacherHomework.student_ids === null 
            ? filteredStudentIds 
            : (Array.isArray(teacherHomework.student_ids) 
                ? teacherHomework.student_ids.filter((id: string) => filteredStudentIds.includes(id))
                : []);

          // 각 학생의 할 일에 선생님 숙제 추가
          for (const studentId of targetStudentIds) {
            // 각 학생별로 체크 상태 설정
            const studentTasks = teacherTasks.map(task => {
              const taskType = task.id.split('-').slice(-1)[0]; // korean, vocab, sentence, passage
              const completionKey = `${studentId}-${teacherHomework.id}-${taskType}`;
              const isCompleted = completionMap.get(completionKey) || false;
              return {
                ...task,
                is_completed: isCompleted,
              };
            });

            const existingHomework = homeworkMap[dateStr].find(h => h.student_id === studentId);
            if (existingHomework) {
              // 기존 할 일에 선생님 숙제 추가
              existingHomework.tasks = [...studentTasks, ...existingHomework.tasks];
            } else {
              // 해당 학생의 할 일이 없으면 새로 생성
              const student = studentMap.get(studentId);
              if (student) {
                homeworkMap[dateStr].push({
                  student_id: studentId,
                  student_name: student?.name || student?.email || "학생",
                  homework_date: dateStr,
                  tasks: studentTasks,
                  notes: "",
                });
              }
            }
          }
        }
      }
      
      setHomeworkData(homeworkMap);
    }
  };

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

  const days = getCalendarDays();
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : null;
  const selectedDateHomework = selectedDate ? (homeworkData[selectedDateStr || ""] || []) : [];

  // 날짜별로 체크한 학생 수 계산
  const getDateStudentCount = (dateStr: string) => {
    const homeworks = homeworkData[dateStr] || [];
    return homeworks.filter(h => h.tasks.some(t => t.is_completed)).length;
  };

  return (
    <div className="space-y-6 px-2 sm:px-4">
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
        <h2 className="text-lg font-bold" style={{ color: '#13181B' }}>
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
      <div className="grid grid-cols-7 gap-0.5 mb-4 max-w-2xl mx-auto">
        {days.map((date, idx) => {
          const dateStr = formatDate(date);
          const homeworks = homeworkData[dateStr] || [];
          const hasHomework = homeworks.length > 0;
          const completedCount = getDateStudentCount(dateStr);
          const isSelected = selectedDateStr === dateStr;

          return (
            <button
              key={idx}
              onClick={() => handleDateClick(date)}
              className="relative aspect-square flex flex-col items-center justify-center text-[10px] rounded transition-all border p-0.5"
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
              } : hasHomework ? {
                color: '#13181B',
                borderColor: '#CCD5DA',
                backgroundColor: completedCount > 0 ? '#E8F0F8' : '#FFFFFF'
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
              <span className="text-[10px] font-medium leading-tight">{date.getDate()}</span>
              {hasHomework && (
                <div className="mt-0.5 text-[8px] leading-tight" style={{ color: '#13181B', opacity: 0.7 }}>
                  {homeworks.length}명
                  {completedCount > 0 && (
                    <span className="ml-0.5" style={{ color: '#13181B' }}>✓{completedCount}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 학생별 할 일 목록 */}
      {selectedDate && (
        <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-base font-bold mb-3" style={{ color: '#13181B' }}>
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 학생 할 일
          </h3>

          {selectedDateHomework.length > 0 ? (
            <div className="space-y-4">
              {selectedDateHomework.map((homework) => {
                const completedTasks = homework.tasks.filter(t => t.is_completed).length;
                const totalTasks = homework.tasks.length;
                return (
                  <div
                    key={homework.student_id}
                    className="p-4 rounded-xl border-2"
                    style={{ 
                      backgroundColor: completedTasks > 0 ? '#F0EEEB' : '#FFFFFF',
                      borderColor: '#CCD5DA'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold" style={{ color: '#13181B' }}>
                        {homework.student_name}
                      </h4>
                      {totalTasks > 0 && (
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: completedTasks === totalTasks ? '#13181B' : '#CCD5DA',
                          color: completedTasks === totalTasks ? '#F0EEEB' : '#13181B'
                        }}>
                          {completedTasks}/{totalTasks} 완료
                        </span>
                      )}
                    </div>

                    {homework.tasks.length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {(() => {
                          // daily 태그가 있는 항목을 맨 위로 정렬
                          const sortedTasks = [...homework.tasks].sort((a, b) => {
                            const aHasDaily = a.task_text.includes('[daily]');
                            const bHasDaily = b.task_text.includes('[daily]');
                            if (aHasDaily && !bHasDaily) return -1;
                            if (!aHasDaily && bHasDaily) return 1;
                            return 0;
                          });
                          
                          return sortedTasks.map((task) => {
                            const hasDaily = task.task_text.includes('[daily]');
                            // [daily] 태그를 노란색 하이라이트로 표시
                            const parts = task.task_text.split(/(\[daily\])/);
                            
                            return (
                              <div
                                key={task.id}
                                className="flex items-start gap-2 p-2 rounded-lg"
                                style={{ 
                                  backgroundColor: task.is_completed ? '#F0EEEB' : '#FFFFFF',
                                  border: `1px solid ${task.is_completed ? '#13181B' : '#CCD5DA'}`
                                }}
                              >
                                <div className="flex-shrink-0 mt-1">
                                  <div
                                    className="w-4 h-4 rounded border-2 flex items-center justify-center"
                                    style={{
                                      backgroundColor: task.is_completed ? '#13181B' : 'transparent',
                                      borderColor: '#13181B'
                                    }}
                                  >
                                    {task.is_completed && (
                                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#F0EEEB' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div 
                                    className={`text-sm ${task.is_completed ? 'line-through' : ''}`}
                                    style={{ 
                                      color: '#13181B',
                                      opacity: task.is_completed ? 0.6 : 1
                                    }}
                                  >
                                    {parts.map((part, idx) => 
                                      part === '[daily]' ? (
                                        <span 
                                          key={idx}
                                          style={{
                                            backgroundColor: '#FFEB3B',
                                            padding: '2px 4px',
                                            borderRadius: '3px',
                                            fontWeight: '600'
                                          }}
                                        >
                                          {part}
                                        </span>
                                      ) : (
                                        <span key={idx}>{part}</span>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm mb-3" style={{ color: '#13181B', opacity: 0.6 }}>
                        작성한 할 일이 없습니다.
                      </p>
                    )}

                    {homework.notes && (
                      <div className="mt-3 pt-3 border-t" style={{ borderTopColor: '#CCD5DA' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#13181B', opacity: 0.7 }}>메모</p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: '#13181B', opacity: 0.8 }}>
                          {homework.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#13181B', opacity: 0.6 }}>
              이 날짜에 작성한 학생이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
