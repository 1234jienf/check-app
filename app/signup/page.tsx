"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async () => {
    setLoading(true);
    setErrorMsg("");

    // 1) Supabase Auth 계정 생성
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authErr) {
      setErrorMsg(authErr.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setErrorMsg("유저 생성 오류");
      setLoading(false);
      return;
    }

    // 2) signUp 직후 자동 로그인 필요
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginErr) {
      setErrorMsg("로그인 실패: " + loginErr.message);
      setLoading(false);
      return;
    }

    // 3) 로그인된 상태에서 insert => RLS 통과됨
    const { error: dbErr } = await supabase.from("users").insert({
      id: userId,
      email,
      name,
      role: "student",
      approved: false,
    });

    if (dbErr) {
      setErrorMsg(dbErr.message);
      setLoading(false);
      return;
    }

    // 4) 가입 완료 후 login으로 이동
    router.push("/login");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-6">회원가입</h1>

      <div className="flex flex-col gap-3 w-80">
        <input
          className="border px-3 py-2 rounded"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border px-3 py-2 rounded"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="border px-3 py-2 rounded"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

        <button
          onClick={handleSignup}
          disabled={loading}
          className="py-2 bg-blue-500 text-white rounded"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </div>
    </div>
  );
}
