"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function StudentCheckpointPage() {
  const { id: passageId } = useParams();
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { answer: string; reason: string }>>({});

  // 1) 현재 로그인한 사용자 ID 가져오기
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) setUserId(user.id);
    };

    getUser();
  }, []);

  // 2) 체크포인트 로드
  useEffect(() => {
    const loadCheckpoints = async () => {
      const { data } = await supabase
        .from("checkpoints")
        .select("*")
        .eq("passage_id", passageId)
        .order("order_num");

      setCheckpoints(data || []);
    };

    if (passageId) loadCheckpoints();
  }, [passageId]);

  // 3) 입력값 저장 (로컬 상태)
  const updateField = (cpId: string, field: "answer" | "reason", value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [cpId]: {
        ...prev[cpId],
        [field]: value,
      },
    }));
  };

  // 4) 제출 버튼 → student_answers 테이블에 저장
  const submitAll = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }

    for (const cp of checkpoints) {
      const cpId = cp.id;
      const { answer = "", reason = "" } = answers[cpId] || {};

      await supabase.from("student_answers").upsert(
        {
          passage_id: passageId,
          checkpoint_id: cpId,
          student_id: userId,
          answer,
          reason,
        },
        { onConflict: "student_id,checkpoint_id" }
      );
    }

    alert("제출이 완료되었습니다!");
  };

  return (
    <div className="p-10 max-w-2xl mx-auto flex flex-col gap-8">
      <h1 className="text-2xl font-bold">체크포인트 기록</h1>

      {checkpoints.map((cp: any) => (
        <div key={cp.id} className="border rounded p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-lg">
            {cp.order_num}. {cp.text}
          </h2>

          <textarea
            className="border p-2 w-full h-24"
            placeholder="이 포인트에서 생각한 내용을 작성하세요"
            value={answers[cp.id]?.answer || ""}
            onChange={(e) => updateField(cp.id, "answer", e.target.value)}
          />

          <textarea
            className="border p-2 w-full h-20"
            placeholder="못했다면 그 이유를 작성하세요 (선택)"
            value={answers[cp.id]?.reason || ""}
            onChange={(e) => updateField(cp.id, "reason", e.target.value)}
          />
        </div>
      ))}

      {checkpoints.length > 0 && (
        <button
          className="bg-blue-500 text-white px-6 py-3 rounded"
          onClick={submitAll}
        >
          제출하기
        </button>
      )}
    </div>
  );
}
