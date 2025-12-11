"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Schedule {
  id: string;
  schedule_date: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export default function TeacherCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Record<string, Schedule[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
  });
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

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

  // 스케줄 불러오기
  useEffect(() => {
    if (!teacherId) return;

    const loadSchedules = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      // 오늘 날짜 이전의 스케줄은 제외 (지난 스케줄은 로드하지 않음)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("teacher_schedule")
        .select("*")
        .eq("teacher_id", teacherId)
        .gte("schedule_date", startDate.toISOString().split("T")[0])
        .lte("schedule_date", endDate.toISOString().split("T")[0])
        .gte("schedule_date", todayStr) // 오늘 이후의 스케줄만
        .order("schedule_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (!error && data) {
        const grouped: Record<string, Schedule[]> = {};
        data.forEach((schedule) => {
          const date = schedule.schedule_date;
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(schedule);
        });
        setSchedules(grouped);
      }
    };

    loadSchedules();
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

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setEditingSchedule(null);
    setFormData({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
    });
  };

  // 스케줄 저장
  const handleSaveSchedule = async () => {
    if (!teacherId || !selectedDate || !formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const scheduleData = {
      teacher_id: teacherId,
      schedule_date: formatDate(selectedDate),
      title: formData.title,
      description: formData.description || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
    };

    if (editingSchedule) {
      // 수정
      const { error } = await supabase
        .from("teacher_schedule")
        .update(scheduleData)
        .eq("id", editingSchedule.id);

      if (error) {
        alert("스케줄 수정에 실패했습니다.");
        console.error(error);
      } else {
        // 스케줄 다시 불러오기
        await reloadSchedules();
        setEditingSchedule(null);
        setFormData({
          title: "",
          description: "",
          start_time: "",
          end_time: "",
        });
      }
    } else {
      // 추가
      const { error } = await supabase.from("teacher_schedule").insert(scheduleData);

      if (error) {
        alert("스케줄 추가에 실패했습니다.");
        console.error(error);
      } else {
        // 스케줄 다시 불러오기
        await reloadSchedules();
        setFormData({
          title: "",
          description: "",
          start_time: "",
          end_time: "",
        });
      }
    }
  };

  // 스케줄 다시 불러오기
  const reloadSchedules = async () => {
    if (!teacherId) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const { data } = await supabase
      .from("teacher_schedule")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("schedule_date", startDate.toISOString().split("T")[0])
      .lte("schedule_date", endDate.toISOString().split("T")[0])
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (data) {
      const grouped: Record<string, Schedule[]> = {};
      data.forEach((schedule) => {
        const date = schedule.schedule_date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(schedule);
      });
      setSchedules(grouped);
    }
  };

  // 스케줄 삭제
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("teacher_schedule")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      alert("스케줄 삭제에 실패했습니다.");
      console.error(error);
    } else {
      await reloadSchedules();
    }
  };

  // 스케줄 수정 모드로 전환
  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setSelectedDate(new Date(schedule.schedule_date));
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      start_time: schedule.start_time || "",
      end_time: schedule.end_time || "",
    });
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingSchedule(null);
    setFormData({
      title: "",
      description: "",
      start_time: "",
      end_time: "",
    });
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
  const selectedDateSchedules = selectedDateStr ? schedules[selectedDateStr] || [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 왼쪽: 달력 */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="text-gray-400 hover:text-gray-700 transition-colors p-2 hover:bg-gray-50 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-gray-800">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </h3>
            <button
              onClick={nextMonth}
              className="text-gray-400 hover:text-gray-700 transition-colors p-2 hover:bg-gray-50 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((date, idx) => {
              const dateStr = formatDate(date);
              const daySchedules = schedules[dateStr] || [];
              const hasSchedule = daySchedules.length > 0;
              const isSelected = selectedDateStr === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => handleDateClick(date)}
                  className={`relative aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${
                    !isCurrentMonth(date)
                      ? "text-gray-200"
                      : isToday(date)
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold ring-2 ring-blue-500"
                      : hasSchedule
                      ? "text-gray-700 hover:bg-blue-50"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{date.getDate()}</span>
                  {hasSchedule && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 오른쪽: 스케줄 입력 및 목록 */}
      <div className="lg:col-span-2">
        {selectedDate ? (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
              </h3>
              <p className="text-sm text-gray-600">스케줄을 추가하거나 수정하세요.</p>
            </div>

            {/* 스케줄 입력 폼 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">
                {editingSchedule ? "스케줄 수정" : "새 스케줄 추가"}
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="스케줄 제목"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="스케줄 설명 (선택사항)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">시작 시간</label>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.start_time ? (parseInt(formData.start_time.split(':')[0]) || 0) : ''}
                        onChange={(e) => {
                          const hour = Math.max(0, Math.min(23, parseInt(e.target.value) || 0)).toString().padStart(2, '0');
                          const minute = formData.start_time && formData.start_time.includes(':') ? formData.start_time.split(':')[1] : '00';
                          setFormData({ ...formData, start_time: `${hour}:${minute}` });
                        }}
                        placeholder="시"
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <span className="text-gray-500">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.start_time && formData.start_time.includes(':') ? (parseInt(formData.start_time.split(':')[1]) || 0) : ''}
                        onChange={(e) => {
                          const minute = Math.max(0, Math.min(59, parseInt(e.target.value) || 0)).toString().padStart(2, '0');
                          const hour = formData.start_time && formData.start_time.includes(':') ? formData.start_time.split(':')[0] : '00';
                          setFormData({ ...formData, start_time: `${hour}:${minute}` });
                        }}
                        placeholder="분"
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">종료 시간</label>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formData.end_time ? (parseInt(formData.end_time.split(':')[0]) || 0) : ''}
                        onChange={(e) => {
                          const hour = Math.max(0, Math.min(23, parseInt(e.target.value) || 0)).toString().padStart(2, '0');
                          const minute = formData.end_time && formData.end_time.includes(':') ? formData.end_time.split(':')[1] : '00';
                          setFormData({ ...formData, end_time: `${hour}:${minute}` });
                        }}
                        placeholder="시"
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <span className="text-gray-500">:</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={formData.end_time && formData.end_time.includes(':') ? (parseInt(formData.end_time.split(':')[1]) || 0) : ''}
                        onChange={(e) => {
                          const minute = Math.max(0, Math.min(59, parseInt(e.target.value) || 0)).toString().padStart(2, '0');
                          const hour = formData.end_time && formData.end_time.includes(':') ? formData.end_time.split(':')[0] : '00';
                          setFormData({ ...formData, end_time: `${hour}:${minute}` });
                        }}
                        placeholder="분"
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveSchedule}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {editingSchedule ? "수정" : "추가"}
                  </button>
                  {editingSchedule && (
                    <>
                      <button
                        onClick={() => handleDeleteSchedule(editingSchedule.id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        삭제
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                      >
                        취소
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 스케줄 목록 */}
            {selectedDateSchedules.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">등록된 스케줄</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedDateSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        editingSchedule?.id === schedule.id
                          ? "bg-blue-50 border-blue-500 shadow-md"
                          : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer"
                      }`}
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">{schedule.title}</div>
                          {schedule.description && (
                            <div className="text-xs text-gray-600 mb-2">{schedule.description}</div>
                          )}
                          {schedule.start_time && (
                            <div className="text-xs text-gray-500">
                              {schedule.start_time}
                              {schedule.end_time && ` - ${schedule.end_time}`}
                            </div>
                          )}
                        </div>
                        {editingSchedule?.id === schedule.id && (
                          <div className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded font-semibold">
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
          <div className="bg-white rounded-xl p-12 shadow-lg text-center">
            <p className="text-gray-500 text-lg">왼쪽 달력에서 날짜를 선택하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

