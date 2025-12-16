"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Vocabulary {
  id: string;
  title: string;
  words: string;
  word_count: number;
  created_at: string;
}

interface SentenceExample {
  id: string;
  title: string;
  pattern: string;
  sentences: string;
  sentence_count: number;
  created_at: string;
}

interface PassageAnalysis {
  id: string;
  title: string;
  passage_text: string;
  created_at: string;
}

export default function StudentMaterialsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vocabulary" | "sentences" | "passages">("vocabulary");
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [sentenceExamples, setSentenceExamples] = useState<SentenceExample[]>([]);
  const [passageAnalyses, setPassageAnalyses] = useState<PassageAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 영어 페이지 접근 시 세션 스토리지에 영어 저장
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedSubject', 'english');
      window.dispatchEvent(new CustomEvent('subjectChanged', { detail: { subject: 'english' } }));
    }

    const loadMaterials = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        if (activeTab === "vocabulary") {
          const { data, error } = await supabase
            .from("english_vocabulary")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            setVocabularies(data);
          }
        } else if (activeTab === "sentences") {
          const { data, error } = await supabase
            .from("english_sentence_examples")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            setSentenceExamples(data);
          }
        } else if (activeTab === "passages") {
          const { data, error } = await supabase
            .from("english_passage_analysis")
            .select("*")
            .order("created_at", { ascending: false });

          if (!error && data) {
            setPassageAnalyses(data);
          }
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [activeTab, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F0EEEB' }}>
        <p style={{ color: '#13181B' }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ backgroundColor: '#F0EEEB' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              자료실
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>영어 학습 자료를 확인하세요.</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("vocabulary")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === "vocabulary" ? 'text-white' : ''
            }`}
            style={activeTab === "vocabulary" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
          >
            영어 단어장
          </button>
          <button
            onClick={() => setActiveTab("sentences")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === "sentences" ? 'text-white' : ''
            }`}
            style={activeTab === "sentences" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
          >
            문장 예제
          </button>
          <button
            onClick={() => setActiveTab("passages")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === "passages" ? 'text-white' : ''
            }`}
            style={activeTab === "passages" ? { backgroundColor: '#13181B' } : { backgroundColor: '#CCD5DA', color: '#13181B' }}
          >
            지문 해체
          </button>
        </div>

        {/* 자료 목록 */}
        <div className="space-y-4">
          {activeTab === "vocabulary" && (
            vocabularies.length === 0 ? (
              <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 단어장이 없습니다.</p>
              </div>
            ) : (
              vocabularies.map((vocab) => (
                <Link
                  key={vocab.id}
                  href={`/student/materials/vocabulary/${vocab.id}`}
                  className="block rounded-xl p-6 shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: '#F0EEEB' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{vocab.title}</h3>
                  <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                    단어 {vocab.word_count}개
                  </p>
                  <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: '#13181B', opacity: 0.8 }}>
                    {vocab.words}
                  </div>
                </Link>
              ))
            )
          )}

          {activeTab === "sentences" && (
            sentenceExamples.length === 0 ? (
              <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 문장 예제가 없습니다.</p>
              </div>
            ) : (
              sentenceExamples.map((example) => (
                <Link
                  key={example.id}
                  href={`/student/materials/sentences/${example.id}`}
                  className="block rounded-xl p-6 shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: '#F0EEEB' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{example.title}</h3>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                    패턴: {example.pattern}
                  </p>
                  <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                    문장 {example.sentence_count}개
                  </p>
                  <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: '#13181B', opacity: 0.8 }}>
                    {example.sentences}
                  </div>
                </Link>
              ))
            )
          )}

          {activeTab === "passages" && (
            passageAnalyses.length === 0 ? (
              <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#F0EEEB' }}>
                <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 지문 해체가 없습니다.</p>
              </div>
            ) : (
              passageAnalyses.map((passage) => (
                <Link
                  key={passage.id}
                  href={`/student/materials/passages/${passage.id}`}
                  className="block rounded-xl p-6 shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: '#F0EEEB' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <h3 className="text-xl font-bold mb-4" style={{ color: '#13181B' }}>{passage.title}</h3>
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#13181B' }}>지문</h4>
                    <div className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: '#F0EEEB', color: '#13181B', opacity: 0.9 }}>
                      {passage.passage_text}
                    </div>
                  </div>
                </Link>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

