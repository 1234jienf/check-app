"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AllPassagesPage() {
  const [passages, setPassages] = useState<any[]>([]);
  const [filteredPassages, setFilteredPassages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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
    const load = async () => {
      // 세션에서 선택한 과목 확인
      const savedSubject = typeof window !== 'undefined' ? sessionStorage.getItem('adminSelectedSubject') : 'korean';
      const subject = (savedSubject || 'korean') as "korean" | "english";
      setSelectedSubject(subject);
      
      // 국어 선택 시: subject가 'korean'이거나 NULL인 경우 모두 포함
      // 영어 선택 시: subject가 'english'인 경우만 포함
      let query = supabase
        .from("passages")
        .select("*");
      
      if (subject === "korean") {
        query = query.or("subject.eq.korean,subject.is.null");
      } else {
        query = query.eq("subject", "english");
      }
      
      const { data } = await query
        .order("category", { ascending: true })
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      // 영어 선택 시 LEET 카테고리 제외
      const filteredData = subject === "english" 
        ? (data || []).filter((p: any) => p.category !== "LEET")
        : (data || []);
      
      setPassages(filteredData);
      
      if (filteredData && filteredData.length > 0) {
        const categories = Array.from(new Set(filteredData.map((p: any) => p.category).filter(Boolean))) as string[];
        setExpandedCategories(new Set(categories));
      }
    };
    load();
  }, [selectedSubject]);

  // 과목 변경 이벤트 리스너
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleSubjectChanged = (event: CustomEvent) => {
        const newSubject = event.detail.subject as "korean" | "english";
        setSelectedSubject(newSubject);
      };

      window.addEventListener('subjectChanged', handleSubjectChanged as EventListener);
      
      return () => {
        window.removeEventListener('subjectChanged', handleSubjectChanged as EventListener);
      };
    }
  }, []);

  useEffect(() => {
    let filtered = [...passages];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const titleMatch = p.title?.toLowerCase().includes(query) || false;
        const sourceMatch = p.source?.toLowerCase().includes(query) || false;
        const contentMatch = p.content?.toLowerCase().includes(query) || false;
        return titleMatch || sourceMatch || contentMatch;
      });
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    setFilteredPassages(filtered);
  }, [passages, searchQuery, selectedCategory]);

  const groupedPassages = filteredPassages.reduce((acc: any, passage: any) => {
    const category = passage.category || "기타";
    if (!acc[category]) acc[category] = [];
    acc[category].push(passage);
    return acc;
  }, {});

  const categories = Object.keys(groupedPassages).sort();

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "EBS":
        return '#E8F0F8';
      case "기출":
        return '#FFF5E8';
      case "LEET":
        return '#FFF0ED';
      default:
        return '#E8E9EA';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case "EBS":
        return "EBS";
      case "기출":
        return "평가원 기출";
      case "LEET":
        return "LEET";
      default:
        return "기타";
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin/passages" 
            className="inline-flex items-center mb-4 transition-colors"
            style={{ color: '#13181B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#13181B'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#13181B'}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 관리로 돌아가기
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-10 h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
            전체 지문 보기
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
          </h1>
          </div>
          <p style={{ color: '#13181B', opacity: 0.8 }}>모든 카테고리의 지문을 한 번에 확인합니다.</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
              <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.7 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="제목, 출처, 내용으로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-lg"
                style={{ color: '#13181B' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full transition-colors"
                  style={{ color: '#13181B', opacity: 0.7 }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            <style jsx>{`
              input::placeholder {
                color: #13181B;
                opacity: 0.5;
              }
            `}</style>
          </div>

          <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>카테고리 필터</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-2.5 text-sm transition-all"
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
        </div>

        <div className="mb-6">
          <div className="text-lg font-semibold" style={{ color: '#13181B' }}>
            총 <span style={{ color: '#13181B' }}>{filteredPassages.length}</span>개의 지문
          </div>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPassages = groupedPassages[category];
            const isExpanded = expandedCategories.has(category);
            const categoryColor = getCategoryColor(category);
            
            return (
              <div key={category} className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between transition-all"
                  style={{ backgroundColor: categoryColor, color: '#13181B' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div className="flex items-center gap-3">
                    <svg 
                      className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xl font-bold">{getCategoryName(category)}</span>
                    <span className="text-sm opacity-90">
                      ({categoryPassages.length}개)
                    </span>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="p-4" style={{ backgroundColor: '#FFFFFF' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryPassages.map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/admin/passages/${p.id}`}
                          className="group relative rounded-xl p-5 transition-all duration-300 shadow-sm"
                          style={{ backgroundColor: '#FFFFFF' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                          }}
                        >
                          <div className="relative z-10">
                            <h2 className="text-lg font-bold mb-3 line-clamp-2 transition-colors" style={{ color: '#13181B' }}>
                              {p.title || "(제목 없음)"}
                            </h2>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {p.literary_type && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}>
                                  {p.literary_type}
                                </span>
                              )}
                              {p.sub_category && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: categoryColor, color: '#13181B' }}>
                                  {p.sub_category.split(",").join(", ")}
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-1.5 text-xs" style={{ color: '#13181B', opacity: 0.8 }}>
                              {p.source && (
                                <div className="flex items-start gap-2">
                                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.7 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="line-clamp-1">{p.source}</span>
                                </div>
                              )}
                              {p.year && (
                                <div>연도: {p.year}년</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                            <svg 
                              className="w-4 h-4 drop-shadow-md" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              style={{ color: categoryColor }}
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
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#13181B', opacity: 0.5 }}>
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

