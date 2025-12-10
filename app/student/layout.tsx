"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [myPassages, setMyPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      // 사용자 이름 가져오기
      const { data: userData } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", user.id)
        .single();
      
      if (userData) {
        setUserName(userData.name || userData.email || "학생");
      }
      
      // 내가 체크포인트를 작성한 지문들 가져오기
      const { data: submissions } = await supabase
        .from("student_checkpoint_record")
        .select("passage_id, passages(id, title, category)")
        .eq("user_id", user.id);

      if (submissions) {
        const uniquePassages = Array.from(
          new Map(
            submissions
              .filter((s: any) => s.passages)
              .map((s: any) => [s.passage_id, s.passages])
          ).values()
        );
        setMyPassages(uniquePassages);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>로딩 중...</div>
      </div>
    );
  }

  const menuItems = [
    { href: "/student", label: "자료 선택", icon: "📁", description: "지문 카테고리 선택" },
    { href: "/student/my-checkpoints", label: "내 체크포인트", icon: "📝", description: "작성한 체크포인트 확인" },
  ];

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href === "/student" && pathname.startsWith("/student/passages")) return false;
    if (href === "/student" && pathname.startsWith("/student/my-checkpoints")) return false;
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
    
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <aside className="relative w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold">백</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                백지훈 수능
              </h1>
              <p className="text-xs text-slate-400">국어 강의 학습</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  active
                    ? "bg-white/20"
                    : "bg-slate-700/50 group-hover:bg-slate-600/50"
                }`}>
                  <span className="text-xl">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${active ? "text-white" : "text-slate-200"}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${active ? "text-blue-100" : "text-slate-400"}`}>
                    {item.description}
                  </div>
                </div>
                {active && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}

        </nav>

        <div className="p-6 border-t border-slate-700 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">
                {userName ? userName.charAt(0) : "학"}
              </span>
            </div>
            <div>
              <div className="font-medium text-slate-300">
                {userName || "학생 모드"}
              </div>
              <div className="text-slate-500">수능 국어 학습</div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

