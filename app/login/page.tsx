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
      // 학생인 경우 과목 선택 페이지로 이동
      router.push("/select-subject");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* 배경에 큰 비숍 */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.3 }}>
              <img 
          src="/bishop-logo.png" 
          alt="Bishop Background" 
          className="w-[900px] h-auto"
          style={{ 
            filter: 'grayscale(100%) brightness(0.8)',
            transform: 'scale(1.3)',
            pointerEvents: 'none'
                }}
              />
            </div>

      {/* CHECK MATE 텍스트 (카드 바깥) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
        <span
          style={{
            opacity: 0.25,
            fontSize: 'clamp(60px, 15vw, 200px)',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#FFFFFF',
            textShadow: '0 0 40px rgba(255, 255, 255, 0.3)',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          CHECK MATE
        </span>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="border-2 rounded-2xl p-8 shadow-2xl relative" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: '#FFFFFF', backdropFilter: 'blur(20px)' }}>
          <div className="text-center mb-8">
            <p className="text-sm font-medium" style={{ color: '#FFFFFF', opacity: 0.95 }}>백지훈 강의 관리페이지</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                이메일
              </label>
              <input
                className="w-full px-4 py-3 border-2 rounded-xl transition-all"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                  borderColor: '#FFFFFF', 
                  color: '#FFFFFF',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }}
                placeholder="이메일을 입력하세요"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
              <style jsx>{`
                input::placeholder {
                  color: #FFFFFF;
                  opacity: 0.5;
                }
              `}</style>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#FFFFFF' }}>
                비밀번호
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 rounded-xl transition-all"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                  borderColor: '#FFFFFF', 
                  color: '#FFFFFF',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                disabled={loading}
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl border-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: '#FFFFFF' }}>
                <p className="text-sm" style={{ color: '#FFFFFF' }}>{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#FFFFFF',
                color: '#000000'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <button
              onClick={() => router.push("/signup")}
              className="w-full px-4 py-2 border-2 rounded-xl font-medium transition-all"
              style={{ 
                backgroundColor: 'transparent',
                borderColor: '#FFFFFF',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
