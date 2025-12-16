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
    <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ backgroundColor: '#13181B' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#F0EEEB' }}>회원가입</h1>
          <p className="text-sm" style={{ color: '#F0EEEB', opacity: 0.8 }}>CHECK MATE에 오신 것을 환영합니다</p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: '#F0EEEB' }}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#CCD5DA', 
                  color: '#13181B' 
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#13181B';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CCD5DA';
                }}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#CCD5DA', 
                  color: '#13181B' 
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#13181B';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CCD5DA';
                }}
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#CCD5DA', 
                  color: '#13181B' 
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#13181B';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CCD5DA';
                }}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#FFF0ED' }}>
                <p className="text-sm font-medium" style={{ color: '#FD8973' }}>{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#13181B' }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(19, 24, 27, 0.3)';
                  e.currentTarget.style.backgroundColor = '#003A6C';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(19, 24, 27, 0.2)';
                  e.currentTarget.style.backgroundColor = '#13181B';
                }
              }}
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>

            <div className="text-center mt-4">
              <button
                onClick={() => router.push("/login")}
                className="text-sm transition-colors"
                style={{ color: '#13181B', opacity: 0.7 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
