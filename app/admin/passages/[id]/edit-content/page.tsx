"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPassageContent() {
  const { id } = useParams();
  const router = useRouter();
  const [passage, setPassage] = useState<any>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setPassage(data);
        setContent(data.content || "");
      }
    };

    if (id) load();
  }, [id]);

  const saveContent = async () => {
    const { error } = await supabase
      .from("passages")
      .update({ content })
      .eq("id", id);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    alert("지문이 저장되었습니다!");
    router.push(`/admin/passages/${id}`);
  };

  if (!passage) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/admin/passages/${id}`}
          className="text-blue-600 underline mb-4 inline-block"
        >
          ← 지문 상세로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold mb-2">지문 내용 수정</h1>
        <p className="text-gray-600">{passage.title}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">지문 내용</label>
          <textarea
            className="border p-3 w-full h-96"
            placeholder="지문을 붙여넣으세요. 빈 줄로 문단이 자동으로 구분됩니다."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            지문을 붙여넣으면 자동으로 문단이 나뉩니다. 문단 구분을 위해 빈 줄을 사용하세요.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveContent}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
          >
            저장하기
          </button>
          <Link
            href={`/admin/passages/${id}`}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded"
          >
            취소
          </Link>
        </div>
      </div>
    </div>
  );
}

