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

    // 0) users 테이블에서 이메일이 이미 존재하는지 확인 (하지만 Auth에는 없을 수 있음)
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      setErrorMsg("이미 가입된 이메일입니다. 로그인 페이지로 이동해주세요.");
      setLoading(false);
      return;
    }

    // 1) Supabase Auth 계정 생성 (이메일 인증 없이)
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // 이메일 인증 리다이렉트 비활성화
      }
    });

    if (authErr) {
      // "User already registered" 또는 "already exists" 에러인 경우
      // Auth에는 있지만 users 테이블에는 없는 경우 (관리자가 삭제했지만 Auth는 남아있는 경우)
      if (authErr.message.includes("already registered") || 
          authErr.message.includes("already exists") ||
          authErr.message.includes("User already registered") ||
          authErr.message.toLowerCase().includes("already")) {
        
        // Auth 사용자를 삭제하고 다시 가입 시도
        try {
          setErrorMsg("기존 Auth 사용자 삭제 중...");
          
          const deleteResponse = await fetch('/api/delete-auth-user-by-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          const deleteResult = await deleteResponse.json();

          if (!deleteResponse.ok) {
            // 삭제 실패 시 - 이미 삭제되었을 수도 있으니 바로 재시도
            console.log("삭제 API 응답:", deleteResult);
            // 404 에러는 이미 삭제된 경우이므로 무시하고 진행
            if (deleteResponse.status !== 404) {
              setErrorMsg(`Auth 사용자 삭제 실패: ${deleteResult.error || '알 수 없는 오류'}\n\nService Role Key가 설정되어 있는지 확인해주세요.`);
              setLoading(false);
              return;
            }
          }

          // 삭제 후 잠시 대기 (Supabase가 동기화될 시간을 줌)
          await new Promise(resolve => setTimeout(resolve, 1000));

          setErrorMsg("재가입 시도 중...");
          
          // 다시 가입 시도 (이메일 인증 없이)
          const { data: retryAuthData, error: retryAuthErr } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: undefined, // 이메일 인증 리다이렉트 비활성화
            }
          });

          if (retryAuthErr) {
            // 여전히 에러가 발생하면 더 자세한 정보 제공
            setErrorMsg(`재가입 실패: ${retryAuthErr.message}\n\n에러 코드: ${retryAuthErr.status || 'N/A'}\n\nSupabase 대시보드에서 직접 Auth 사용자를 삭제해주세요:\n1. Authentication > Users\n2. 이메일로 검색\n3. 삭제`);
            setLoading(false);
            return;
          }

          const retryUserId = retryAuthData.user?.id;
          if (!retryUserId) {
            setErrorMsg("유저 생성 오류 - user ID를 받지 못했습니다.");
            setLoading(false);
            return;
          }

          setErrorMsg("로그인 중...");
          
          // 자동 로그인
          const { error: retryLoginErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryLoginErr) {
            setErrorMsg("로그인 실패: " + retryLoginErr.message);
            setLoading(false);
            return;
          }

          setErrorMsg("사용자 정보 저장 중...");
          
          // users 테이블에 삽입
          const { error: retryDbErr } = await supabase.from("users").insert({
            id: retryUserId,
            email,
            name,
            role: "student",
            approved: false,
          });

          if (retryDbErr) {
            setErrorMsg("사용자 정보 저장 실패: " + retryDbErr.message);
            setLoading(false);
            return;
          }

          // 가입 완료
          router.push("/login");
          return;
        } catch (deleteErr: any) {
          setErrorMsg("Auth 사용자 삭제 중 오류가 발생했습니다: " + deleteErr.message + "\n\nService Role Key가 설정되어 있는지 확인해주세요.");
          setLoading(false);
          return;
        }
      }
      
      setErrorMsg(`가입 실패: ${authErr.message}\n\n에러 코드: ${(authErr as any).status || 'N/A'}`);
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
