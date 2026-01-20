"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    // 입력값 검증
    if (!currentPassword.trim()) {
      setPasswordError("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("새 비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("현재 비밀번호와 새 비밀번호가 동일합니다.");
      return;
    }

    setPasswordLoading(true);

    try {
      // 현재 비밀번호 확인 (로그인 시도)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPasswordError("로그인이 필요합니다.");
        setPasswordLoading(false);
        return;
      }

      // 현재 비밀번호 확인을 위해 재로그인 시도
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (verifyError) {
        setPasswordError("현재 비밀번호가 올바르지 않습니다.");
        setPasswordLoading(false);
        return;
      }

      // 비밀번호 변경
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError(`비밀번호 변경 실패: ${updateError.message}`);
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess("비밀번호가 성공적으로 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(`오류가 발생했습니다: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#13181B' }}>설정</h1>

      {/* 비밀번호 변경 섹션 */}
      <div className="p-6 border-2 rounded-xl mb-6" style={{ 
        backgroundColor: '#FFFFFF', 
        borderColor: '#CCD5DA' 
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#13181B' }}>
          비밀번호 변경
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              현재 비밀번호
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 rounded-xl transition-all"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#CCD5DA', 
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="현재 비밀번호를 입력하세요"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              새 비밀번호
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 rounded-xl transition-all"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#CCD5DA', 
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="새 비밀번호를 입력하세요 (최소 6자)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
              새 비밀번호 확인
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 rounded-xl transition-all"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#CCD5DA', 
                color: '#13181B',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#13181B';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(19, 24, 27, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#CCD5DA';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="새 비밀번호를 다시 입력하세요"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handlePasswordChange()}
              disabled={passwordLoading}
            />
          </div>

          {passwordError && (
            <div className="p-3 rounded-xl border-2" style={{ 
              backgroundColor: '#FFF5F5', 
              borderColor: '#FCA5A5' 
            }}>
              <p className="text-sm" style={{ color: '#DC2626' }}>{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-xl border-2" style={{ 
              backgroundColor: '#F0FDF4', 
              borderColor: '#86EFAC' 
            }}>
              <p className="text-sm" style={{ color: '#16A34A' }}>{passwordSuccess}</p>
            </div>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={passwordLoading}
            className="w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: passwordLoading ? '#CCD5DA' : '#13181B', 
              color: '#F0EEEB',
              cursor: passwordLoading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!passwordLoading) {
                e.currentTarget.style.backgroundColor = '#2D3748';
              }
            }}
            onMouseLeave={(e) => {
              if (!passwordLoading) {
                e.currentTarget.style.backgroundColor = '#13181B';
              }
            }}
          >
            {passwordLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                변경 중...
              </>
            ) : (
              "비밀번호 변경"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

