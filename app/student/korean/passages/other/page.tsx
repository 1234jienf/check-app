"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function StudentOtherPassageList() {
  const [passages, setPassages] = useState<any[]>([]);
  const [filteredPassages, setFilteredPassages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedLiteraryType, setSelectedLiteraryType] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 토글 상태
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("category", "기타")
        .eq("subject", "korean")
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      setPassages(data || []);
      
      if (data && data.length > 0) {
        const years = Array.from(new Set(data.map((p: any) => p.year).filter(Boolean))) as number[];
        setExpandedYears(new Set(years));
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    let filtered = [...passages];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(query) || false;
        const sourceMatch = p.source?.toLowerCase().includes(query) || false;
        return titleMatch || sourceMatch;
      });
    }

    if (selectedLiteraryType !== "all") {
      filtered = filtered.filter((p) => p.literary_type === selectedLiteraryType);
    }

    if (selectedSubCategory !== "all") {
      filtered = filtered.filter((p) => {
        if (selectedLiteraryType === "문학") {
          const subCategories = p.sub_category?.split(",").map((s: string) => s.trim()) || [];
          return subCategories.includes(selectedSubCategory);
        }
        return p.sub_category === selectedSubCategory || p.sub_category?.includes(selectedSubCategory);
      });
    }

    setFilteredPassages(filtered);
  }, [passages, selectedLiteraryType, selectedSubCategory, searchQuery]);
  
  const groupedPassages = filteredPassages.reduce((acc: any, passage: any) => {
    const year = passage.year || 0;
    
    if (!acc[year]) acc[year] = [];
    acc[year].push(passage);
    return acc;
  }, {});
  
  const years = Object.keys(groupedPassages)
    .map(Number)
    .sort((a, b) => b - a);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const nonLiteraryCategories = ["인문", "예술", "법", "경제", "과학", "기술", "복합", "국어", "독서"];
  const literaryCategories = ["현대시", "고전시가", "현대소설", "고전소설", "고전수필", "수필", "희곡"];

  const getSubCategoryOptions = () => {
    if (selectedLiteraryType === "비문학") {
      return nonLiteraryCategories;
    } else if (selectedLiteraryType === "문학") {
      return literaryCategories;
    }
    return [...nonLiteraryCategories, ...literaryCategories];
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
          <p className="text-[#13181B]">지문을 불러오는 중...</p>
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/student" 
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#13181B'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#13181B'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            자료 선택으로 돌아가기
          </Link>
          <div className="flex items-center gap-3">
            <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            기타
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative group">
            <div className="relative rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="제목 또는 출처로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-lg"
                  style={{ color: '#13181B' }}
                />
                <style jsx>{`
                  input::placeholder {
                    color: #13181B;
                    opacity: 0.5;
                  }
                `}</style>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 rounded-full transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.6 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>문학/비문학</label>
                <select
                  value={selectedLiteraryType}
                  onChange={(e) => {
                    setSelectedLiteraryType(e.target.value);
                    setSelectedSubCategory("all");
                  }}
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm border-2"
                  style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA', color: '#13181B' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#13181B'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#13181B';
                    e.currentTarget.style.outline = 'none';
                  }}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                >
                  <option value="all">전체</option>
                  <option value="비문학">비문학</option>
                  <option value="문학">문학</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>세부 카테고리</label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm border-2"
                  style={{ 
                    backgroundColor: selectedLiteraryType === "all" ? '#CCD5DA' : '#F0EEEB', 
                    borderColor: '#CCD5DA', 
                    color: selectedLiteraryType === "all" ? '#13181B' : '#13181B',
                    opacity: selectedLiteraryType === "all" ? 0.5 : 1
                  }}
                  disabled={selectedLiteraryType === "all"}
                  onMouseEnter={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#13181B';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }
                  }}
                  onFocus={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.outline = 'none';
                    }
                  }}
                  onBlur={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }
                  }}
                >
                  <option value="all">전체</option>
                  {getSubCategoryOptions().map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-lg font-semibold" style={{ color: '#13181B' }}>
            총 <span style={{ color: '#13181B' }}>{filteredPassages.length}</span>개의 지문
          </div>
        </div>

        <div className="space-y-6">
          {years.map((year) => {
            const yearPassages = groupedPassages[year];
            const isYearExpanded = expandedYears.has(year);
            
            return (
              <div key={year} className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-all"
                  style={{ backgroundColor: '#E8E9EA', color: '#13181B' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#CCD5DA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8E9EA';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${isYearExpanded ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xl font-bold">{year}년</span>
                    <span className="text-sm opacity-90">
                      ({yearPassages.length}개)
                    </span>
                  </div>
                </button>
                
                {isYearExpanded && (
                  <div className="p-4" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {yearPassages.map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/student/passages/${p.id}/checkpoint`}
                          className="group relative rounded-xl p-5 transition-all duration-300 overflow-hidden shadow-sm"
                          style={{ backgroundColor: '#FFFFFF' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                          }}
                        >
                          <div className="relative z-10">
                            <h2 className="text-lg font-bold mb-3 transition-colors line-clamp-2" style={{ color: '#13181B' }}>
                              {p.title || "(제목 없음)"}
                            </h2>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {p.literary_type && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}>
                                  {p.literary_type}
                                </span>
                              )}
                              {p.sub_category && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFBF65', color: '#13181B' }}>
                                  {p.sub_category.split(",").join(", ")}
                                </span>
                              )}
                              {p.difficulty && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFBF65', color: '#13181B' }}>
                                  {p.difficulty}
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              {p.source && (
                                <div className="flex items-start gap-2">
                                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.8 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="line-clamp-1" style={{ color: '#13181B' }}>{p.source}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                            <svg 
                              className="w-4 h-4 drop-shadow-md" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              style={{ color: '#13181B' }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredPassages.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.6 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold mb-2" style={{ color: '#13181B' }}>조건에 맞는 지문이 없습니다</p>
              <p className="text-sm" style={{ color: '#13181B', opacity: 0.8 }}>검색어나 필터를 변경해보세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

