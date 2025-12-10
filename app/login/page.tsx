"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 입력값 검증
    if (!email.trim()) {
      setErrorMsg("이메일을 입력해주세요.");
      return;
    }

    if (!password.trim()) {
      setErrorMsg("비밀번호를 입력해주세요.");
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    setErrorMsg(""); // 에러 메시지 초기화
    setLoading(true);

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error("로그인 오류:", error);
      // 더 친절한 에러 메시지
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrorMsg("이메일 인증이 완료되지 않았습니다.");
      } else {
        setErrorMsg(error.message || "로그인에 실패했습니다.");
      }
      setLoading(false);
      return;
    }

    const user = loginData.user;

    // users 테이블에서 프로필 정보 가져오기
    // RLS 정책 문제를 피하기 위해 여러 방법 시도
    let profile: any = null;
    let profileError: any = null;

    // 방법 1: 일반 조회
    const { data: profileData, error: profileErr } = await supabase
      .from("users")
      .select("role, approved")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      console.error("프로필 조회 오류:", profileErr);
      profileError = profileErr;
      
      // 406 에러인 경우 RLS 정책 문제일 수 있음
      if (profileErr.code === "PGRST116" || profileErr.message?.includes("406")) {
        // 방법 2: in() 사용 (RLS 정책이 다를 수 있음)
        const { data: altProfileData, error: altErr } = await supabase
          .from("users")
          .select("role, approved")
          .in("id", [user.id])
          .maybeSingle();
        
        if (!altErr && altProfileData) {
          profile = altProfileData;
        } else {
          // 방법 3: 모든 컬럼 조회 시도
          const { data: fullProfileData, error: fullErr } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          
          if (!fullErr && fullProfileData) {
            profile = {
              role: fullProfileData.role,
              approved: fullProfileData.approved,
            };
          }
        }
      }
    } else {
      profile = profileData;
    }

    if (!profile) {
      console.error("프로필 조회 최종 실패:", profileError);
      setErrorMsg(
        `사용자 정보를 불러올 수 없습니다. (${profileError?.code || "알 수 없는 오류"})\n` +
        `RLS 정책을 확인해주세요. users 테이블에서 자신의 정보를 조회할 수 있는 권한이 필요합니다.`
      );
      setLoading(false);
      return;
    }

    if (!profile.approved) {
      router.push("/pending-approval");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (profile.role === "teacher") {
      router.push("/admin");
    } else {
      router.push("/student");
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              백지훈 수능
            </h1>
            <p className="text-gray-600 text-sm">국어 강의 관리 시스템</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="이메일을 입력하세요"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <button
              onClick={() => router.push("/signup")}
              className="w-full px-4 py-2 border-2 border-gray-400 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
