"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Notification {
  id: string;
  type: "schedule" | "pending_student" | "new_checkpoint" | "student_feedback";
  message: string;
  link: string;
  count?: number;
  scheduleId?: string; // 스케줄 ID (개별 알림용)
  scheduleTitle?: string; // 스케줄 제목
  scheduleTime?: string; // 스케줄 시간
}

export default function AdminNotificationBar({ isMobile = false }: { isMobile?: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getTeacherId();
  }, []);

  // 읽은 알림 불러오기 (최근 7일 이내만)
  useEffect(() => {
    if (!teacherId) return;

    const loadReadNotifications = async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from("notification_read")
        .select("notification_type, notification_id, read_at")
        .eq("teacher_id", teacherId)
        .gte("read_at", sevenDaysAgo.toISOString());

      if (data) {
        const readSet = new Set(
          data.map((r) => `${r.notification_type}_${r.notification_id}`)
        );
        setReadNotifications(readSet);
      }
    };

    loadReadNotifications();
  }, [teacherId]);

  // 알림 로드 함수 (재사용 가능하도록 분리)
  const loadNotifications = useCallback(async () => {
    if (!teacherId) return;

    // 읽은 알림을 먼저 로드 (모든 읽은 알림 가져오기 - 7일 제한 제거)
    const { data: readData, error: readError } = await supabase
        .from("notification_read")
        .select("notification_type, notification_id")
      .eq("teacher_id", teacherId);

    if (readError) {
    }

    // 데이터베이스에서 읽은 알림만 사용 (항상 최신 상태)
    // readKey 생성 로직은 markAsRead와 동일해야 함
    const currentReadSet = new Set<string>();
    if (readData) {
      readData.forEach((r) => {
        let readKey: string;
        if (r.notification_type === "new_checkpoint" || r.notification_type === "student_feedback") {
          // notification_id가 이미 올바른 형식 (예: "new_checkpoint_${studentId}")
          readKey = r.notification_id;
        } else if (r.notification_type === "schedule") {
          // "schedule_${schedule.id}" 형식
          readKey = `schedule_${r.notification_id}`;
        } else if (r.notification_type === "pending_student") {
          // 고정 키
          readKey = "pending_student_pending_students";
        } else {
          // 기본값: type_id 형식
          readKey = `${r.notification_type}_${r.notification_id}`;
        }
        currentReadSet.add(readKey);
      });
    }
    
    // 상태 업데이트 (데이터베이스와 동기화)
    setReadNotifications(currentReadSet);
    
      const notifs: Notification[] = [];

      // 1. 오늘 스케줄 확인
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Daily 숙제 알림은 제거 (선생님이 내주는 숙제이므로 알림 불필요)
      // 필요시 나중에 추가 가능

      // 2. 승인 대기 학생 확인
      const { data: pendingStudents } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "student")
        .eq("approved", false);

      if (pendingStudents && pendingStudents.length > 0) {
        const readKey = `pending_student_pending_students`;
        if (!currentReadSet.has(readKey)) {
          notifs.push({
            id: "pending_students",
            type: "pending_student",
            message: `승인 대기 학생 ${pendingStudents.length}명`,
            link: "/admin",
            count: pendingStudents.length,
          });
        }
      }

      // 3. 최근 24시간 내 새 체크포인트 확인 (1차, 2차, 3차 모두 포함)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const yesterdayStr = yesterday.toISOString();

      const { data: newCheckpoints } = await supabase
        .from("student_checkpoint_record")
        .select(`
          id,
          created_at,
          attempt_number,
          paragraph,
          passages!inner(id, title),
          users!student_checkpoint_record_user_id_fkey(id, name)
        `)
        .gte("created_at", yesterdayStr)
        .order("created_at", { ascending: false });

      if (newCheckpoints && newCheckpoints.length > 0) {
        // 학생별, 지문별로 그룹화하여 더 상세한 알림 제공
        const byStudent: Record<string, { name: string; passages: Record<string, { title: string; attempts: number[] }> }> = {};
        
        newCheckpoints.forEach((cp: any) => {
          const studentId = cp.users?.id;
          const studentName = cp.users?.name || "학생";
          const passageId = cp.passages?.id;
          const passageTitle = cp.passages?.title || "지문";
          const attemptNum = cp.attempt_number || 1;
          
          if (!byStudent[studentId]) {
            byStudent[studentId] = {
              name: studentName,
              passages: {},
            };
          }
          
          if (!byStudent[studentId].passages[passageId]) {
            byStudent[studentId].passages[passageId] = {
              title: passageTitle,
              attempts: [],
            };
          }
          
          if (!byStudent[studentId].passages[passageId].attempts.includes(attemptNum)) {
            byStudent[studentId].passages[passageId].attempts.push(attemptNum);
          }
        });

        // 각 학생별, 지문별, attempt별로 개별 알림 생성
        Object.entries(byStudent).forEach(([studentId, studentData]) => {
          Object.entries(studentData.passages).forEach(([passageId, passageData]) => {
            passageData.attempts.forEach((attemptNum) => {
              const readKey = `new_checkpoint_${studentId}_${passageId}_${attemptNum}`;
              
              if (!currentReadSet.has(readKey)) {
                notifs.push({
                  id: `new_checkpoint_${studentId}_${passageId}_${attemptNum}`,
                  type: "new_checkpoint",
                  message: `${studentData.name}님이 ${passageData.title}에 ${attemptNum}차 체크포인트를 작성했습니다`,
                  link: "/admin",
                  count: 1,
                });
              }
            });
          });
        });
      }

      // 4. 최근 24시간 내 새 학생 피드백 확인
      const { data: newFeedbacks } = await supabase
        .from("student_feedback")
        .select(`
          id,
          created_at,
          teacher_viewed,
          student_submission_id,
          student_checkpoint_record!inner(
            id,
            passage_id,
            paragraph,
            attempt_number,
            passages!inner(id, title),
            users!student_checkpoint_record_user_id_fkey(id, name)
          )
        `)
        .eq("teacher_viewed", false)
        .gte("created_at", yesterdayStr)
        .order("created_at", { ascending: false });

      if (newFeedbacks && newFeedbacks.length > 0) {
        // 각 학생별로 그룹화
        const feedbacksByStudent = new Map();
        newFeedbacks.forEach((feedback: any) => {
          const studentId = feedback.student_checkpoint_record?.users?.id;
          const studentName = feedback.student_checkpoint_record?.users?.name || "학생";
          if (studentId) {
            if (!feedbacksByStudent.has(studentId)) {
              feedbacksByStudent.set(studentId, {
                studentId,
                studentName,
                count: 0,
                feedbacks: [],
              });
            }
            const studentData = feedbacksByStudent.get(studentId);
            studentData.count++;
            studentData.feedbacks.push(feedback);
          }
        });

        // 각 학생별로 개별 알림 생성
        feedbacksByStudent.forEach((studentData, studentId) => {
          const readKey = `student_feedback_${studentId}`;
          if (!currentReadSet.has(readKey)) {
            notifs.push({
              id: `student_feedback_${studentId}`,
              type: "student_feedback",
              message: `${studentData.studentName}님이 ${studentData.count}개의 피드백을 작성했습니다`,
              link: "/admin",
              count: studentData.count,
            });
          }
        });
      }

      setNotifications(notifs);
  }, [teacherId]);

  // 초기 로드 및 주기적 업데이트
  useEffect(() => {
    if (!teacherId) return;

    loadNotifications();

    // 30초마다 업데이트
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [teacherId, loadNotifications]);

  // 알림 창을 열 때마다 알림 다시 로드
  useEffect(() => {
    if (isOpen && teacherId) {
      loadNotifications();
    }
  }, [isOpen, teacherId, loadNotifications]);

  // 알림 읽음 처리
  const markAsRead = async (notif: Notification, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!teacherId) {
      return;
    }

    // 즉시 UI에서 알림 제거 (낙관적 업데이트)
    setNotifications((prev) => {
      const filtered = prev.filter((n) => {
        // 같은 타입이고 같은 ID인 경우 제거
        if (n.type === notif.type && n.id === notif.id) {
          return false;
        }
        return true;
      });
      return filtered;
    });

    // 읽은 알림 목록에 추가
    // readKey는 loadNotifications에서 사용하는 형식과 정확히 동일해야 함
    let readKey: string;
    if (notif.type === "new_checkpoint") {
      // loadNotifications에서는 "new_checkpoint_${studentId}_${passageId}_${attemptNum}" 형식 사용
      // notif.id가 이미 해당 형식이므로 그대로 사용
      readKey = notif.id;
    } else if (notif.type === "student_feedback") {
      // loadNotifications에서는 "student_feedback_${studentId}" 형식 사용
      // notif.id가 이미 "student_feedback_${studentId}" 형식이므로 그대로 사용
      readKey = notif.id;
    } else if (notif.type === "schedule") {
      // loadNotifications에서는 "schedule_${schedule.id}" 형식 사용
      readKey = `schedule_${notif.id}`;
    } else if (notif.type === "pending_student") {
      // loadNotifications에서는 "pending_student_pending_students" 고정 키 사용
      readKey = "pending_student_pending_students";
    } else {
      // 기본값: type_id 형식
      readKey = `${notif.type}_${notif.id}`;
    }
    
    setReadNotifications((prev) => {
      const newSet = new Set(prev);
      newSet.add(readKey);
      return newSet;
    });

    try {
      // 데이터베이스에 저장할 때는 notification_id에 notif.id를 그대로 저장
      // readKey는 로컬 상태 관리용이고, DB에는 type과 id를 분리해서 저장
      const { data, error } = await supabase
        .from("notification_read")
        .upsert({
          teacher_id: teacherId,
          notification_type: notif.type,
          notification_id: notif.id,
        }, {
          onConflict: "teacher_id,notification_type,notification_id"
        });
      

      if (error) {
        // 에러 발생 시 다시 로드하여 상태 복구
        loadNotifications();
        alert("알림 삭제에 실패했습니다: " + error.message);
        return;
      }

      
      // 성공적으로 저장되었으므로 낙관적 업데이트 유지
      // loadNotifications를 호출하지 않음 (낙관적 업데이트로 이미 UI가 업데이트됨)
      // 주기적 업데이트(30초)나 알림 창을 다시 열 때 자동으로 동기화됨
    } catch (err) {
      // 에러 발생 시 다시 로드하여 상태 복구
      loadNotifications();
      alert("알림 삭제 중 오류가 발생했습니다.");
    }
  };

  const totalCount = notifications.reduce((sum, notif) => sum + (notif.count || 1), 0);

  return (
    <div className={isMobile ? "relative" : "fixed top-4 right-4 z-50"}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-lg shadow-lg p-3 hover:shadow-xl transition-all border-2 ${isMobile ? 'p-2' : ''}`}
        style={{ backgroundColor: '#F0EEEB', borderColor: '#13181B' }}
      >
        <svg
          className={isMobile ? "w-5 h-5" : "w-6 h-6"}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: '#13181B' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute ${isMobile ? 'top-12 right-0' : 'top-14 right-0'} w-80 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto`} style={{ backgroundColor: '#F0EEEB', border: '1px solid #CCD5DA' }}>
            <div className="p-4" style={{ borderBottom: '1px solid #CCD5DA' }}>
              <h3 className="font-bold" style={{ color: '#13181B' }}>알림</h3>
            </div>
            <div style={{ borderTop: '1px solid #CCD5DA' }}>
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: '#CCD5DA' }}>
                  알림이 없습니다.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="group relative p-4 transition-colors flex items-start gap-3"
                    style={{ borderBottom: '1px solid #CCD5DA' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                      style={notif.type === "schedule" 
                        ? { backgroundColor: '#CCD5DA' }
                          : notif.type === "pending_student"
                        ? { backgroundColor: '#FFBF65' }
                        : { backgroundColor: '#FD8973' }
                      }
                    >
                      {notif.type === "schedule" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      {notif.type === "pending_student" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      )}
                      {notif.type === "new_checkpoint" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      {notif.type === "student_feedback" && (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      )}
                    </div>
                    <Link
                      href={notif.link}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 min-w-0"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <p className="text-sm font-medium" style={{ color: '#13181B' }}>{notif.message}</p>
                      {notif.type === "schedule" && notif.scheduleTime && (
                        <p className="text-xs mt-1" style={{ color: '#CCD5DA' }}>
                          {notif.scheduleTime}
                        </p>
                      )}
                      {notif.count && notif.count > 1 && (
                        <p className="text-xs mt-1" style={{ color: '#CCD5DA' }}>
                          {notif.count}개 항목
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ zIndex: 10, position: 'relative' }}>
                      <Link
                        href={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="이동"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(notif, e);
                        }}
                        className="p-1 rounded transition-colors"
                        style={{ 
                          backgroundColor: 'transparent',
                          zIndex: 20,
                          position: 'relative',
                          pointerEvents: 'auto',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FD8973'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="알림 지우기"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: '#13181B', pointerEvents: 'none' }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

