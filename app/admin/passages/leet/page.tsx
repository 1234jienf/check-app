"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LEETPassageList() {
  const [passages, setPassages] = useState<any[]>([]);
  const [filteredPassages, setFilteredPassages] = useState<any[]>([]);
  
  const [selectedLiteraryType, setSelectedLiteraryType] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // 토글 상태
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("category", "LEET")
        .order("year", { ascending: false })
        .order("leet_type", { ascending: true })
        .order("created_at", { ascending: false });
      setPassages(data || []);
      
      if (data && data.length > 0) {
        const years = Array.from(new Set(data.map((p: any) => p.year).filter(Boolean))) as number[];
        const types = Array.from(new Set(data.map((p: any) => p.leet_type).filter(Boolean))) as string[];
        setExpandedYears(new Set(years));
        years.forEach(year => {
          types.forEach(type => {
            if (type) setExpandedTypes(prev => new Set([...prev, `${year}-${type}`]));
          });
        });
      }
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
      filtered = filtered.filter((p) => p.sub_category === selectedSubCategory);
    }

    setFilteredPassages(filtered);
  }, [passages, selectedLiteraryType, selectedSubCategory, searchQuery]);
  
  const groupedPassages = filteredPassages.reduce((acc: any, passage: any) => {
    const year = passage.year || 0;
    const type = passage.leet_type || "기타";
    
    if (!acc[year]) acc[year] = {};
    if (!acc[year][type]) acc[year][type] = [];
    
    acc[year][type].push(passage);
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
  
  const toggleType = (year: number, type: string) => {
    const key = `${year}-${type}`;
    setExpandedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const nonLiteraryCategories = ["인문", "사회", "과학", "기술", "예술", "복합", "독서"];
  const literaryCategories = ["현대시", "고전시가", "현대소설", "고전소설", "고전수필", "수필", "희곡"];

  const getSubCategoryOptions = () => {
    if (selectedLiteraryType === "비문학") {
      return nonLiteraryCategories;
    } else if (selectedLiteraryType === "문학") {
      return literaryCategories;
    }
    return [...nonLiteraryCategories, ...literaryCategories];
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: 'linear-gradient(to bottom right, #F0EEEB, #CCD5DA)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin/passages" 
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#003A6C' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#13181B'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#003A6C'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 관리로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/bishop_black.svg" alt="Bishop" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%) invert(60%) sepia(95%) saturate(2000%) hue-rotate(330deg) brightness(1.05) contrast(1.1)' }} />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#FD8973' }}>
                LEET
                <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #FD8973 0%, #FD8973 50%, transparent 100%)', borderRadius: '2px' }}></span>
              </h1>
            </div>
            <Link
              href="/admin/passages/new/leet"
              className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 overflow-hidden"
              style={{ background: 'linear-gradient(to right, #FD8973, #FFBF65)', color: '#13181B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #FFBF65, #FD8973)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #FD8973, #FFBF65)';
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg 
                  className="w-5 h-5 drop-shadow-lg" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                새 지문 추가
              </span>
            </Link>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative group">
            <div className="relative rounded-2xl p-4 shadow-xl border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
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
                    opacity: 0.7;
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

          <div className="rounded-2xl p-6 shadow-xl border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
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
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FD8973'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CCD5DA'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FD8973';
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
                    color: selectedLiteraryType === "all" ? '#CCD5DA' : '#13181B' 
                  }}
                  disabled={selectedLiteraryType === "all"}
                  onMouseEnter={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#FD8973';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }
                  }}
                  onFocus={(e) => {
                    if (selectedLiteraryType !== "all") {
                      e.currentTarget.style.borderColor = '#FD8973';
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
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: '#13181B' }}>
              총 <span style={{ color: '#FD8973' }}>{filteredPassages.length}</span>개의 지문
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {years.map((year) => {
            const yearPassages = groupedPassages[year];
            const types = Object.keys(yearPassages).sort();
            const isYearExpanded = expandedYears.has(year);
            
            return (
              <div key={year} className="rounded-2xl shadow-xl overflow-hidden border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-all"
                  style={{ background: 'linear-gradient(to right, #FD8973, #FFBF65)', color: '#13181B' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #FFBF65, #FD8973)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #FD8973, #FFBF65)';
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
                      ({Object.values(yearPassages).reduce((sum: number, arr: any) => sum + arr.length, 0)}개)
                    </span>
                  </div>
                </button>
                
                {isYearExpanded && (
                  <div className="p-4 space-y-4">
                    {types.map((type) => {
                      const typePassages = yearPassages[type];
                      const typeKey = `${year}-${type}`;
                      const isTypeExpanded = expandedTypes.has(typeKey);
                      
                      return (
                        <div key={type} className="rounded-xl overflow-hidden border-2" style={{ borderColor: '#CCD5DA' }}>
                          <button
                            onClick={() => toggleType(year, type)}
                            className="w-full px-5 py-3 flex items-center justify-between transition-all"
                            style={{ backgroundColor: '#CCD5DA' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0EEEB'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#CCD5DA'}
                          >
                            <div className="flex items-center gap-3">
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${isTypeExpanded ? 'rotate-90' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                style={{ color: '#13181B' }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-semibold" style={{ color: '#13181B' }}>{type}</span>
                              <span className="text-sm" style={{ color: '#13181B', opacity: 0.7 }}>({typePassages.length}개)</span>
                            </div>
                          </button>
                          
                          {isTypeExpanded && (
                            <div className="p-4" style={{ backgroundColor: '#F0EEEB' }}>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {typePassages.map((p: any) => (
                                  <Link
                                    key={p.id}
                                    href={`/admin/passages/${p.id}`}
                                    className="group relative rounded-xl p-5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border-2"
                                    style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = '#FD8973';
                                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(253, 137, 115, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = '#CCD5DA';
                                      e.currentTarget.style.boxShadow = 'none';
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
                                      </div>
                                      
                                      <div className="space-y-1.5 text-xs">
                                        {p.source && (
                                          <div className="flex items-start gap-2">
                                            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#FD8973', opacity: 0.8 }}>
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="line-clamp-1" style={{ color: '#FD8973' }}>{p.source}</span>
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
                                        style={{ color: '#FD8973' }}
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
                )}
              </div>
            );
          })}
        </div>

        {filteredPassages.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block p-8 rounded-2xl shadow-xl border-2" style={{ backgroundColor: '#F0EEEB', borderColor: '#CCD5DA' }}>
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#CCD5DA' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold mb-2" style={{ color: '#13181B' }}>조건에 맞는 지문이 없습니다</p>
              <p className="text-sm mb-6" style={{ color: '#13181B', opacity: 0.8 }}>검색어나 필터를 변경해보세요</p>
              <Link
                href="/admin/passages/new/leet"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{ background: 'linear-gradient(to right, #FD8973, #FFBF65)', color: '#13181B' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #FFBF65, #FD8973)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #FD8973, #FFBF65)';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 지문 추가하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
