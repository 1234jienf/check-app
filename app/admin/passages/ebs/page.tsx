"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EBSPassageList() {
  const router = useRouter();
  const [passages, setPassages] = useState<any[]>([]);
  const [filteredPassages, setFilteredPassages] = useState<any[]>([]);
  
  // 필터 상태
  const [selectedLiteraryType, setSelectedLiteraryType] = useState<string>("all"); // 문학/비문학
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all"); // 세부 카테고리
  const [searchQuery, setSearchQuery] = useState<string>(""); // 검색어
  
  // 토글 상태 (년도별, 타입별)
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set()); // 펼쳐진 년도들
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set()); // 펼쳐진 타입들 (예: "2025-수완")

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .eq("category", "EBS")
        .order("year", { ascending: false })
        .order("ebs_type", { ascending: true })
        .order("created_at", { ascending: false });
      setPassages(data || []);
      
      // 기본적으로 모든 년도와 타입 펼치기
      if (data && data.length > 0) {
        const years = Array.from(new Set(data.map((p: any) => p.year).filter(Boolean))) as number[];
        const types = Array.from(new Set(data.map((p: any) => p.ebs_type).filter(Boolean))) as string[];
        setExpandedYears(new Set(years));
        years.forEach(year => {
          types.forEach(type => {
            setExpandedTypes(prev => new Set([...prev, `${year}-${type}`]));
          });
        });
      }
    };
    load();
  }, []);

  // 필터링 및 검색 로직
  useEffect(() => {
    let filtered = [...passages];

    // 검색어 필터링 (제목, 출처)
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
  
  // 년도별, 타입별로 그룹화
  const groupedPassages = filteredPassages.reduce((acc: any, passage: any) => {
    const year = passage.year || 0;
    const type = passage.ebs_type || "기타";
    
    if (!acc[year]) acc[year] = {};
    if (!acc[year][type]) acc[year][type] = [];
    
    acc[year][type].push(passage);
    return acc;
  }, {});
  
  const years = Object.keys(groupedPassages)
    .map(Number)
    .sort((a, b) => b - a); // 내림차순

  // 토글 함수들
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

  // 비문학 세부 카테고리
  const nonLiteraryCategories = ["인문", "사회", "과학", "기술", "예술", "복합", "독서"];
  // 문학 세부 카테고리
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <Link 
            href="/admin/passages" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            지문 관리로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EBS 지문 관리
            </h1>
            <Link
              href="/admin/passages/new/ebs"
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 overflow-hidden"
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
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </Link>
          </div>
        </div>

        {/* 검색 및 필터 섹션 */}
        <div className="mb-6 space-y-4">
          {/* 검색 바 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="제목 또는 출처로 검색 (예: 수능완성 실전모의고사 1-3)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 필터 섹션 */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 문학/비문학 필터 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">문학/비문학</label>
                <select
                  value={selectedLiteraryType}
                  onChange={(e) => {
                    setSelectedLiteraryType(e.target.value);
                    setSelectedSubCategory("all"); // 문학/비문학 변경 시 세부 카테고리 초기화
                  }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
                >
                  <option value="all">전체</option>
                  <option value="비문학">비문학</option>
                  <option value="문학">문학</option>
                </select>
              </div>

              {/* 세부 카테고리 필터 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">세부 카테고리</label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400"
                  disabled={selectedLiteraryType === "all"}
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

        {/* 지문 목록 - 년도별 그룹화 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-gray-700">
              총 <span className="text-blue-600">{filteredPassages.length}</span>개의 지문
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {years.map((year) => {
            const yearPassages = groupedPassages[year];
            const types = Object.keys(yearPassages).sort();
            const isYearExpanded = expandedYears.has(year);
            
            return (
              <div key={year} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
                {/* 년도 헤더 (토글 가능) */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between hover:from-blue-700 hover:to-indigo-700 transition-all"
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
                
                {/* 년도별 타입 그룹 */}
                {isYearExpanded && (
                  <div className="p-4 space-y-4">
                    {types.map((type) => {
                      const typePassages = yearPassages[type];
                      const typeKey = `${year}-${type}`;
                      const isTypeExpanded = expandedTypes.has(typeKey);
                      
                      return (
                        <div key={type} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* 타입 헤더 (토글 가능) */}
                          <button
                            onClick={() => toggleType(year, type)}
                            className="w-full px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <svg 
                                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isTypeExpanded ? 'rotate-90' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-semibold text-gray-800">{type}</span>
                              <span className="text-sm text-gray-500">({typePassages.length}개)</span>
                            </div>
                          </button>
                          
                          {/* 갤러리 뷰 */}
                          {isTypeExpanded && (
                            <div className="p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {typePassages.map((p: any) => (
                                  <Link
                                    key={p.id}
                                    href={`/admin/passages/${p.id}`}
                                    className="group relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5 hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                                  >
                                    {/* 3D 효과 배경 */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    
                                    <div className="relative z-10">
                                      <h2 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {p.title || "(제목 없음)"}
                                      </h2>
                                      
                                      <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {p.literary_type && (
                                          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                            {p.literary_type}
                                          </span>
                                        )}
                                        {p.sub_category && (
                                          <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-xs font-medium">
                                            {p.sub_category.split(",").join(", ")}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="space-y-1.5 text-xs text-gray-600">
                                        {p.source && (
                                          <div className="flex items-start gap-2">
                                            <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="line-clamp-1">{p.source}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 호버 시 우측 상단 화살표 */}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                                      <svg 
                                        className="w-4 h-4 text-blue-500 drop-shadow-md" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
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
            <div className="inline-block p-8 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-2">조건에 맞는 지문이 없습니다</p>
              <p className="text-sm text-gray-500 mb-6">검색어나 필터를 변경해보세요</p>
              <Link
                href="/admin/passages/new/ebs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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

