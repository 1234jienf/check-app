"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

export default function EditPassage() {
  const { id } = useParams();
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [newPoint, setNewPoint] = useState("");
  const [newParagraph, setNewParagraph] = useState(1);

  // 체크포인트 불러오기
  const loadCheckpoints = async () => {
    const { data } = await supabase
      .from("checkpoints")
      .select("*")
      .eq("passage_id", id)
      .order("paragraph", { ascending: true })
      .order("order_num", { ascending: true });

    setCheckpoints(data || []);
  };

  useEffect(() => {
    if (id) loadCheckpoints();
  }, [id]);

  // 체크포인트 추가
  const addCheckpoint = async () => {
    if (!newPoint.trim()) return;

    // 같은 문단 내에서의 순서 계산
    const sameParagraphCheckpoints = checkpoints.filter(
      (cp: any) => (cp.paragraph || 1) === newParagraph
    );
    const nextOrderNum = sameParagraphCheckpoints.length + 1;

    await supabase.from("checkpoints").insert([
      {
        passage_id: id,
        text: newPoint,
        paragraph: newParagraph,
        order_num: nextOrderNum,
      },
    ]);

    setNewPoint("");
    setNewParagraph(1);
    loadCheckpoints();
  };

  // 체크포인트 삭제
  const deleteCheckpoint = async (cpId: string) => {
    await supabase.from("checkpoints").delete().eq("id", cpId);
    loadCheckpoints();
  };

  return (
    <div className="p-10 max-w-xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">체크포인트 수정</h1>

      {/* 기존 체크포인트 목록 (문단별로 그룹화) */}
      <div className="flex flex-col gap-6">
        {(() => {
          const groupedByParagraph: Record<number, any[]> = {};
          checkpoints.forEach((cp: any) => {
            const paraNum = cp.paragraph || 1;
            if (!groupedByParagraph[paraNum]) {
              groupedByParagraph[paraNum] = [];
            }
            groupedByParagraph[paraNum].push(cp);
          });

          return Object.keys(groupedByParagraph)
            .sort((a, b) => Number(a) - Number(b))
            .map((paraNum) => (
              <div key={paraNum}>
                <h3 className="font-semibold text-lg mb-3">
                  {paraNum}문단
                </h3>
                <div className="flex flex-col gap-3">
                  {groupedByParagraph[Number(paraNum)].map((cp: any) => (
                    <div
                      key={cp.id}
                      className="p-3 border rounded flex justify-between items-center"
                    >
                      <span>
                        {cp.order_num}. {cp.text}
                      </span>
                      <button
                        className="text-red-500"
                        onClick={() => deleteCheckpoint(cp.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ));
        })()}

        {checkpoints.length === 0 && (
          <p className="text-gray-500">아직 체크포인트가 없습니다.</p>
        )}
      </div>

      {/* 신규 체크포인트 추가 */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            className="border p-2 w-24"
            placeholder="문단"
            value={newParagraph}
            onChange={(e) => setNewParagraph(Number(e.target.value) || 1)}
          />
          <input
            className="border p-2 flex-1"
            placeholder="새 체크포인트 내용"
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-4 rounded"
            onClick={addCheckpoint}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
