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


export default function MaterialsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"vocabulary" | "sentences">("vocabulary");
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [sentenceExamples, setSentenceExamples] = useState<SentenceExample[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    words: "",
    pattern: "",
    sentences: "",
    passage_text: "",
    analysis: "",
  });

  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setTeacherId(user.id);
      }
    };
    getTeacherId();
  }, []);

  useEffect(() => {
    if (teacherId) {
      loadData();
    }
  }, [teacherId, activeTab]);

  const loadData = async () => {
    if (!teacherId) return;
    setLoading(true);

    try {
      if (activeTab === "vocabulary") {
        const { data, error } = await supabase
          .from("english_vocabulary")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setVocabularies(data);
        }
      } else if (activeTab === "sentences") {
        const { data, error } = await supabase
          .from("english_sentence_examples")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setSentenceExamples(data);
        }
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!teacherId) return;

    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    try {
      if (activeTab === "vocabulary") {
        if (!formData.words.trim()) {
          alert("단어 목록을 입력해주세요.");
          return;
        }
        const wordCount = formData.words.trim().split('\n').filter(w => w.trim()).length;

        if (editingItem) {
          const { error } = await supabase
            .from("english_vocabulary")
            .update({
              title: formData.title.trim(),
              words: formData.words.trim(),
              word_count: wordCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingItem.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("english_vocabulary")
            .insert({
              teacher_id: teacherId,
              title: formData.title.trim(),
              words: formData.words.trim(),
              word_count: wordCount,
            });

          if (error) throw error;
        }
      } else if (activeTab === "sentences") {
        if (!formData.pattern.trim() || !formData.sentences.trim()) {
          alert("문장 패턴과 문장 예제를 입력해주세요.");
          return;
        }
        const sentenceCount = formData.sentences.trim().split('\n').filter(s => s.trim()).length;

        if (editingItem) {
          const { error } = await supabase
            .from("english_sentence_examples")
            .update({
              title: formData.title.trim(),
              pattern: formData.pattern.trim(),
              sentences: formData.sentences.trim(),
              sentence_count: sentenceCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingItem.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("english_sentence_examples")
            .insert({
              teacher_id: teacherId,
              title: formData.title.trim(),
              pattern: formData.pattern.trim(),
              sentences: formData.sentences.trim(),
              sentence_count: sentenceCount,
            });

          if (error) throw error;
        }
      }

      alert(editingItem ? "수정되었습니다." : "추가되었습니다.");
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        title: "",
        words: "",
        pattern: "",
        sentences: "",
        passage_text: "",
        analysis: "",
      });
      await loadData();
    } catch (err: any) {
      alert("오류가 발생했습니다: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      if (activeTab === "vocabulary") {
        const { error } = await supabase
          .from("english_vocabulary")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } else if (activeTab === "sentences") {
        const { error } = await supabase
          .from("english_sentence_examples")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }

      alert("삭제되었습니다.");
      await loadData();
    } catch (err: any) {
      alert("삭제 오류: " + err.message);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === "vocabulary") {
      setFormData({
        title: item.title,
        words: item.words,
        pattern: "",
        sentences: "",
        passage_text: "",
        analysis: "",
      });
    } else if (activeTab === "sentences") {
      setFormData({
        title: item.title,
        words: "",
        pattern: item.pattern,
        sentences: item.sentences,
        passage_text: "",
        analysis: "",
      });
    }
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      words: "",
      pattern: "",
      sentences: "",
      passage_text: "",
      analysis: "",
    });
    setShowModal(true);
  };

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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/pawn_black.svg" alt="Pawn" className="w-8 h-8 md:w-10 md:h-10" style={{ filter: 'brightness(0) saturate(100%)' }} />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold relative inline-block pb-2" style={{ color: '#13181B' }}>
              영어 자료실
              <span className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(to right, #13181B 0%, #13181B 50%, transparent 100%)', borderRadius: '2px' }}></span>
            </h1>
          </div>
          <p className="text-sm md:text-base" style={{ color: '#13181B', opacity: 0.8 }}>영어 단어장, 문장 예제 자료를 관리합니다.</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("vocabulary")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "vocabulary" ? "-mb-[2px]" : ""
            }`}
            style={activeTab === "vocabulary" ? {
              color: '#13181B',
              borderBottom: '2px solid #13181B'
            } : {
              color: '#13181B',
              opacity: 0.7
            }}
          >
            단어장
          </button>
          <button
            onClick={() => setActiveTab("sentences")}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === "sentences" ? "-mb-[2px]" : ""
            }`}
            style={activeTab === "sentences" ? {
              color: '#13181B',
              borderBottom: '2px solid #13181B'
            } : {
              color: '#13181B',
              opacity: 0.7
            }}
          >
            문장 예제
          </button>
        </div>

        {/* 추가 버튼 */}
        <div className="mb-6">
          <button
            onClick={handleNew}
            className="px-6 py-3 rounded-xl font-semibold transition-all shadow-sm"
            style={{ backgroundColor: '#13181B', color: '#F0EEEB' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
            }}
          >
            + 새 자료 추가
          </button>
        </div>

        {/* 자료 목록 */}
        <div className="space-y-4">
          {activeTab === "vocabulary" && (
            vocabularies.length === 0 ? (
              <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 단어장이 없습니다.</p>
              </div>
            ) : (
              vocabularies.map((vocab) => (
                <div
                  key={vocab.id}
                  onClick={() => router.push(`/admin/materials/vocabulary/${vocab.id}`)}
                  className="block rounded-xl p-6 shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{vocab.title}</h3>
                      <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                        단어 {vocab.word_count}개
                      </p>
                      <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: '#13181B', opacity: 0.8 }}>
                        {vocab.words}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(vocab);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#13181B' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#CCD5DA';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(vocab.id);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#FD8973' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFF0ED';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === "sentences" && (
            sentenceExamples.length === 0 ? (
              <div className="text-center py-20 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
                <p style={{ color: '#13181B', opacity: 0.7 }}>등록된 문장 예제가 없습니다.</p>
              </div>
            ) : (
              sentenceExamples.map((example) => (
                <div
                  key={example.id}
                  onClick={() => router.push(`/admin/materials/sentences/${example.id}`)}
                  className="block rounded-xl p-6 shadow-sm transition-all cursor-pointer"
                  style={{ backgroundColor: '#FFFFFF' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(19, 24, 27, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2" style={{ color: '#13181B' }}>{example.title}</h3>
                      <p className="text-sm mb-2 font-semibold" style={{ color: '#13181B' }}>
                        패턴: {example.pattern}
                      </p>
                      <p className="text-sm mb-2" style={{ color: '#13181B', opacity: 0.7 }}>
                        문장 {example.sentence_count}개
                      </p>
                      <div className="text-sm whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: '#13181B', opacity: 0.8 }}>
                        {example.sentences}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(example);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#13181B' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#CCD5DA';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(example.id);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#FD8973' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFF0ED';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* 모달 */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(19, 24, 27, 0.5)' }}
            onClick={() => {
              setShowModal(false);
              setEditingItem(null);
            }}
          >
            <div
              className="rounded-xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              style={{ backgroundColor: '#FFFFFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#13181B' }}>
                  {editingItem ? "자료 수정" : "새 자료 추가"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                  }}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: '#13181B' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#CCD5DA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                    제목 <span style={{ color: '#FD8973' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#13181B';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CCD5DA';
                    }}
                    placeholder="자료 제목"
                  />
                </div>

                {activeTab === "vocabulary" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                      단어 목록 (줄바꿈으로 구분) <span style={{ color: '#FD8973' }}>*</span>
                    </label>
                    <textarea
                      value={formData.words}
                      onChange={(e) => setFormData({ ...formData, words: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#13181B';
                        e.currentTarget.style.outline = 'none';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CCD5DA';
                      }}
                      rows={10}
                      placeholder="단어를 한 줄에 하나씩 입력하세요&#10;예:&#10;abandon&#10;ability&#10;able"
                    />
                  </div>
                )}

                {activeTab === "sentences" && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                        문장 패턴 <span style={{ color: '#FD8973' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pattern}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                        }}
                        placeholder="예: S+V, S+V+O, S+V+O+C"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#13181B' }}>
                        문장 예제 (줄바꿈으로 구분) <span style={{ color: '#FD8973' }}>*</span>
                      </label>
                      <textarea
                        value={formData.sentences}
                        onChange={(e) => setFormData({ ...formData, sentences: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 transition-all"
                        style={{ backgroundColor: '#FFFFFF', borderColor: '#CCD5DA', color: '#13181B' }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#13181B';
                          e.currentTarget.style.outline = 'none';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#CCD5DA';
                        }}
                        rows={10}
                        placeholder="문장을 한 줄에 하나씩 입력하세요"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all"
                    style={{ backgroundColor: '#13181B' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 24, 27, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {editingItem ? "수정" : "추가"}
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold transition-all"
                    style={{ backgroundColor: '#CCD5DA', color: '#13181B' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E8E9EA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#CCD5DA';
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

