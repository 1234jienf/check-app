"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function MyCheckpointsPage() {
  const [myCheckpoints, setMyCheckpoints] = useState<any[]>([]);
  const [filteredCheckpoints, setFilteredCheckpoints] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<"korean" | "english">("korean");

  // 세션에서 선택한 과목 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSubject = sessionStorage.getItem('adminSelectedSubject') as "korean" | "english" | null;
      if (savedSubject) {
        setSelectedSubject(savedSubject);
      }
    }
  }, []);

  useEffect(() => {
    const loadMyCheckpoints = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // 세션에서 선택한 과목 확인
        const savedSubject = typeof window !== 'undefined' ? sessionStorage.getItem('adminSelectedSubject') : 'korean';
        const subject = (savedSubject || 'korean') as "korean" | "english";
        setSelectedSubject(subject);
        
        // 본인이 작성한 체크포인트가 있는 지문들 가져오기
        // teacher_id 컬럼이 없거나 NULL인 경우도 포함 (기존 체크포인트는 모두 표시)
        const { data: checkpoints, error } = await supabase
          .from("checkpoints")
          .select(`
            id,
            passage_id,
            paragraph,
            text,
            order_num,
            teacher_id,
            passages!inner(id, title, category, year, source, subject)
          `)
          .or(`teacher_id.eq.${user.id},teacher_id.is.null`);

        if (error) {
          if (error.code === "42703") {
            setMyCheckpoints([]);
            setLoading(false);
            return;
          }
          setLoading(false);
          return;
        }

        if (checkpoints && checkpoints.length > 0) {
          // 선택한 과목으로 필터링
          // 국어 선택 시: subject가 'korean'이거나 NULL인 경우 모두 포함
          // 영어 선택 시: subject가 'english'인 경우만 포함
          const filteredCheckpoints = checkpoints.filter((cp: any) => {
            if (!cp.passages) return false;
            if (subject === "korean") {
              return cp.passages.subject === "korean" || cp.passages.subject === null || cp.passages.subject === undefined;
            } else {
              return cp.passages.subject === "english";
            }
          });
          
          // 지문별로 그룹화 (중복 제거)
          const passageMap = new Map();
          filteredCheckpoints.forEach((cp: any) => {
            if (cp.passages && !passageMap.has(cp.passage_id)) {
              passageMap.set(cp.passage_id, {
                ...cp.passages,
                checkpoints: [],
              });
            }
            if (passageMap.has(cp.passage_id)) {
              passageMap.get(cp.passage_id).checkpoints.push(cp);
            }
          });
          setMyCheckpoints(Array.from(passageMap.values()));
        } else {
          setMyCheckpoints([]);
        }
        setLoading(false);
      } catch (err) {
        setMyCheckpoints([]);
        setLoading(false);
      }
    };

    loadMyCheckpoints();
  }, []);

  // 필터링 로직
  useEffect(() => {
    let filtered = [...myCheckpoints];

    // 카테고리 필터
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p: any) => {
        if (selectedCategory === "기출") {
          return p.category === "기출";
        }
        return p.category === selectedCategory;
      });
    }

    // 연도 필터
    if (selectedYear !== "all") {
      filtered = filtered.filter((p: any) => p.year === parseInt(selectedYear));
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) => 
        (p.title || "").toLowerCase().includes(query) ||
        (p.source || "").toLowerCase().includes(query)
      );
    }

    setFilteredCheckpoints(filtered);
  }, [myCheckpoints, selectedCategory, selectedYear, searchQuery]);

  const getCategoryPath = (category: string) => {
    if (category === "EBS") return "/admin/passages/ebs";
    if (category === "기출") return "/admin/passages/gichul";
    if (category === "LEET") return "/admin/passages/leet";
    if (category === "기타") return "/admin/passages/other";
    return "/admin/passages";
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "EBS":
        return "from-blue-600 to-indigo-600";
      case "기출":
        return "from-green-600 to-emerald-600";
      case "LEET":
        return "from-purple-600 to-violet-600";
      default:
        return "from-gray-600 to-slate-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0EEEB' }}>
        <div className="text-center">
          <div className="mx-auto mb-4" style={{ 
            animation: 'spin 2s linear infinite, pulse 2s ease-in-out infinite',
            width: '80px',
            height: '80px'
          }}>
            <img 
              src="/bishop-logo.png" 
              alt="Loading" 
              className="w-full h-full"
              style={{ filter: 'grayscale(100%) brightness(0.8)' }}
            />
          </div>
          <p className="text-[#13181B]">로딩 중...</p>
          <style jsx>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            체크포인트
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>체크포인트가 있는 지문을 확인 할 수 있습니다.</p>
        </div>

        {/* 필터 섹션 */}
        {myCheckpoints.length > 0 && (
          <div className="mb-6 rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 검색 */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>검색</label>
                <input
                  type="text"
                  placeholder="제목 또는 출처로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-2 rounded-xl px-4 py-2 text-sm transition-all"
                  style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#13181B';
                    e.currentTarget.style.outline = 'none';
                  }}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                />
              </div>

              {/* 카테고리 필터 */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>카테고리</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border-2 rounded-xl px-4 py-2 text-sm transition-all"
                  style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#13181B';
                    e.currentTarget.style.outline = 'none';
                  }}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                >
                  <option value="all">전체</option>
                  <option value="EBS">EBS</option>
                  <option value="기출">평가원 기출</option>
                  <option value="LEET">LEET</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 연도 필터 */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>연도</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border-2 rounded-xl px-4 py-2 text-sm transition-all"
                  style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#13181B';
                    e.currentTarget.style.outline = 'none';
                  }}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                >
                  <option value="all">전체</option>
                  {Array.from(new Set(myCheckpoints.map((p: any) => p.year).filter(Boolean))).sort((a: any, b: any) => b - a).map((year: any) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 text-sm" style={{ color: '#13181B', opacity: 0.8 }}>
              총 {filteredCheckpoints.length}개 지문
            </div>
          </div>
        )}

        {myCheckpoints.length === 0 ? (
          <div className="p-12 text-center rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-6xl mb-4"></div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#13181B' }}>작성한 체크포인트가 없습니다</h2>
            <p className="mb-6" style={{ color: '#13181B', opacity: 0.8 }}>
              지문에 체크포인트를 추가하면 여기에 표시됩니다.
            </p>
            <Link
              href="/admin/passages"
              className="inline-flex items-center px-6 py-3 font-semibold transition-all duration-200"
              style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#13181B'}
            >
              지문 관리로 이동
            </Link>
          </div>
        ) : filteredCheckpoints.length === 0 ? (
          <div className="p-12 text-center rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#13181B' }}>검색 결과가 없습니다</h2>
            <p className="mb-6" style={{ color: '#13181B', opacity: 0.8 }}>
              필터 조건을 변경해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCheckpoints.map((passage: any) => (
              <div
                key={passage.id}
                className="p-6 transition-all duration-300 flex flex-col rounded-xl shadow-sm"
                style={{ backgroundColor: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                }}
              >
                {/* 헤더 */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/admin/passages/${passage.id}`}
                      className="text-xl font-bold transition-colors line-clamp-2 flex-1"
                      style={{ color: '#13181B' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#13181B'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#13181B'}
                    >
                      {passage.title || "(제목 없음)"}
                    </Link>
                    <Link
                      href={`/admin/passages/${passage.id}`}
                      className="flex-shrink-0 ml-2 transition-transform hover:translate-x-1"
                      style={{ color: '#13181B' }}
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ filter: 'brightness(0) saturate(100%)' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full" style={{ 
                      backgroundColor: passage.category === "EBS" ? '#E8F0F8' : 
                                       passage.category === "기출" ? '#FFF5E8' :
                                       passage.category === "LEET" ? '#FFF0ED' : '#E8E9EA', 
                      color: '#13181B' 
                    }}>
                      {passage.category || "기타"}
                    </span>
                    {passage.year && (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-full" style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}>
                        {passage.year}년
                      </span>
                    )}
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full" style={{ 
                      backgroundColor: passage.category === "EBS" ? '#E8F0F8' : 
                                       passage.category === "기출" ? '#FFF5E8' :
                                       passage.category === "LEET" ? '#FFF0ED' : '#E8E9EA', 
                      color: '#13181B' 
                    }}>
                      체크 {passage.checkpoints.length}개
                    </span>
                  </div>
                  {passage.source && (
                    <p className="text-xs line-clamp-1" style={{ color: '#13181B', opacity: 0.8 }}>출처: {passage.source}</p>
                  )}
                </div>

                {/* 체크포인트 미리보기 (최대 3개) */}
                <div className="flex-1 space-y-2 mb-4">
                  {passage.checkpoints
                    .sort((a: any, b: any) => (a.order_num || 0) - (b.order_num || 0))
                    .slice(0, 3)
                    .map((cp: any) => {
                      const categoryBg = cp.category === "거시" ? '#E8F0F8' : cp.category === "미시" ? '#FFF5E8' : '#FFFFFF';
                      return (
                        <div
                          key={cp.id}
                          className="p-3 rounded-lg"
                          style={{ 
                            backgroundColor: categoryBg,
                            borderLeft: `4px solid ${cp.category === "거시" ? '#13181B' : cp.category === "미시" ? '#13181B' : 'transparent'}`
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {cp.category && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ 
                                backgroundColor: cp.category === "거시" ? '#D4E4F4' : '#FFE5CC',
                                color: '#13181B'
                              }}>
                                {cp.category}
                              </span>
                            )}
                            {cp.paragraph && (
                              <span className="text-xs font-semibold" style={{ color: '#13181B' }}>
                                [{cp.paragraph}문단]
                              </span>
                            )}
                          </div>
                          <p className="text-xs line-clamp-2" style={{ color: '#13181B' }}>{cp.text}</p>
                        </div>
                      );
                    })}
                  {passage.checkpoints.length > 3 && (
                    <div className="text-xs text-center py-1" style={{ color: '#13181B', opacity: 0.8 }}>
                      + {passage.checkpoints.length - 3}개 더 보기
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

