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

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("passages")
        .select("*")
        .order("category", { ascending: true })
        .order("year", { ascending: false })
        .order("created_at", { ascending: false });
      setPassages(data || []);
      
      if (data && data.length > 0) {
        const categories = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean))) as string[];
        setExpandedCategories(new Set(categories));
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
        return "from-blue-600 to-indigo-600";
      case "기출":
        return "from-green-600 to-emerald-600";
      case "LEET":
        return "from-purple-600 to-violet-600";
      default:
        return "from-gray-600 to-slate-600";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            전체 지문 보기
          </h1>
          <p className="text-gray-600 mt-2">모든 카테고리의 지문을 한 번에 확인합니다.</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="제목, 출처, 내용으로 검색"
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

          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <label className="block text-sm font-semibold text-gray-700 mb-2">카테고리 필터</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
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
          <div className="text-lg font-semibold text-gray-700">
            총 <span className="text-blue-600">{filteredPassages.length}</span>개의 지문
          </div>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPassages = groupedPassages[category];
            const isExpanded = expandedCategories.has(category);
            const colorClass = getCategoryColor(category);
            
            return (
              <div key={category} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full px-6 py-4 bg-gradient-to-r ${colorClass} text-white flex items-center justify-between hover:opacity-90 transition-all`}
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
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryPassages.map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/admin/passages/${p.id}`}
                          className="group relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
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
                              {p.year && (
                                <div className="text-gray-500">연도: {p.year}년</div>
                              )}
                            </div>
                          </div>
                          
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

        {filteredPassages.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-block p-8 bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-semibold text-gray-700 mb-2">조건에 맞는 지문이 없습니다</p>
              <p className="text-sm text-gray-500">검색어나 필터를 변경해보세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

