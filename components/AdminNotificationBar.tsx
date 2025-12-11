"use client";

import { useEffect, useState } from "react";
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

export default function AdminNotificationBar() {
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

  useEffect(() => {
    if (!teacherId) return;

    const loadNotifications = async () => {
      // 읽은 알림을 먼저 로드 (이미 로드되어 있지만 확실하게)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: readData } = await supabase
        .from("notification_read")
        .select("notification_type, notification_id")
        .eq("teacher_id", teacherId)
        .gte("read_at", sevenDaysAgo.toISOString());

      const currentReadSet: Set<string> = readData 
        ? new Set(readData.map((r) => `${r.notification_type}_${r.notification_id}`))
        : new Set<string>();
      const notifs: Notification[] = [];

      // 1. 오늘 스케줄 확인
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const { data: todaySchedules, error: scheduleError } = await supabase
        .from("teacher_schedule")
        .select("*")
        .eq("teacher_id", teacherId)
        .eq("schedule_date", todayStr)
        .order("start_time", { ascending: true });

      if (scheduleError) {
        console.error("스케줄 조회 오류:", scheduleError);
      }

      if (todaySchedules && todaySchedules.length > 0) {
        // 각 스케줄마다 개별 알림 생성
        todaySchedules.forEach((schedule: any) => {
          const readKey = `schedule_${schedule.id}`;
          if (!currentReadSet.has(readKey)) {
            const timeStr = schedule.start_time 
              ? `${schedule.start_time}${schedule.end_time ? ` - ${schedule.end_time}` : ''}`
              : '';
            notifs.push({
              id: schedule.id,
              type: "schedule",
              message: timeStr 
                ? `${schedule.title} (${timeStr})`
                : schedule.title,
              link: "/admin/schedule",
              scheduleId: schedule.id,
              scheduleTitle: schedule.title,
              scheduleTime: timeStr,
            });
          }
        });
      }

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

        // 각 학생별로 개별 알림 생성
        Object.entries(byStudent).forEach(([studentId, studentData]) => {
          const totalAttempts = Object.values(studentData.passages).reduce((sum, p) => sum + p.attempts.length, 0);
          const readKey = `new_checkpoint_${studentId}`;
          
          if (!currentReadSet.has(readKey)) {
            const attemptSummary = Object.values(studentData.passages)
              .map(p => {
                const attempts = p.attempts.sort((a, b) => a - b).join(', ');
                return `${p.title}(${attempts}차)`;
              })
              .join(', ');
            
            notifs.push({
              id: `new_checkpoint_${studentId}`,
              type: "new_checkpoint",
              message: `${studentData.name}님이 ${totalAttempts}개의 새 체크포인트를 작성했습니다`,
              link: "/admin",
              count: totalAttempts,
            });
          }
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
      setReadNotifications(currentReadSet);
    };

    loadNotifications();

    // 30초마다 업데이트
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [teacherId]);

  // 알림 읽음 처리
  const markAsRead = async (notif: Notification, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!teacherId) return;

    try {
      const { error } = await supabase
        .from("notification_read")
        .upsert({
          teacher_id: teacherId,
          notification_type: notif.type,
          notification_id: notif.id,
        }, {
          onConflict: "teacher_id,notification_type,notification_id"
        });

      if (error) {
        console.error("알림 읽음 처리 오류:", error);
        // 에러가 발생해도 UI에서는 제거 (로컬 상태만 업데이트)
      }
      
      // 읽은 알림 목록 업데이트
      setReadNotifications((prev) => {
        const newSet = new Set(prev);
        newSet.add(`${notif.type}_${notif.id}`);
        return newSet;
      });
      // 알림 목록에서 제거
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (err) {
      console.error("알림 읽음 처리 중 오류:", err);
      // 에러가 발생해도 UI에서는 제거
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    }
  };

  const totalCount = notifications.reduce((sum, notif) => sum + (notif.count || 1), 0);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-all border-2 border-blue-500"
      >
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
          <div className="absolute top-14 right-0 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">알림</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  알림이 없습니다.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="group relative p-4 hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notif.type === "schedule"
                          ? "bg-blue-100"
                          : notif.type === "pending_student"
                          ? "bg-yellow-100"
                          : "bg-green-100"
                      }`}
                    >
                      {notif.type === "schedule" && (
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                          className="w-5 h-5 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                          className="w-5 h-5 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                    >
                      <p className="text-sm font-medium text-gray-900">{notif.message}</p>
                      {notif.type === "schedule" && notif.scheduleTime && (
                        <p className="text-xs text-gray-500 mt-1">
                          {notif.scheduleTime}
                        </p>
                      )}
                      {notif.count && notif.count > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {notif.count}개 항목
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={notif.link}
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="이동"
                      >
                        <svg
                          className="w-4 h-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="알림 지우기"
                      >
                        <svg
                          className="w-4 h-4 text-gray-500 hover:text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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

