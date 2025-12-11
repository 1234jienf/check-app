"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface ParsedPassage {
  number: string;
  title: string;
  source: string;
  content: string;
  pages: number[];
}

function ParsePDFContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("return") || "/admin/passages";
  
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPassages, setParsedPassages] = useState<ParsedPassage[]>([]);
  const [selectedPassageIndex, setSelectedPassageIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) {
      setError("PDF 파일만 지원합니다.");
      return;
    }

    setIsParsing(true);
    setError("");
    setParsedPassages([]);
    setSelectedPassageIndex(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
        setIsParsing(false);
        return;
      }

      // 여러 지문이 있는 경우
      if (result.passages && Array.isArray(result.passages) && result.passages.length > 0) {
        setParsedPassages(result.passages);
        // 첫 번째 지문 자동 선택
        setSelectedPassageIndex(0);
      } else if (result.content) {
        // 단일 지문인 경우 (기존 형식)
        setParsedPassages([{
          number: "1",
          title: result.title || "",
          source: result.source || "",
          content: result.content,
          pages: [1],
        }]);
        setSelectedPassageIndex(0);
      } else {
        setError("파싱된 지문을 찾을 수 없습니다.");
      }
    } catch (err: any) {
      setError("PDF 파싱 중 오류가 발생했습니다: " + (err.message || "알 수 없는 오류"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleCopyPassage = async () => {
    if (selectedPassageIndex === null || !parsedPassages[selectedPassageIndex]) {
      alert("지문을 선택해주세요.");
      return;
    }

    const selectedPassage = parsedPassages[selectedPassageIndex];
    
    try {
      await navigator.clipboard.writeText(selectedPassage.content);
      alert("지문 내용이 클립보드에 복사되었습니다. 지문 등록 페이지에서 붙여넣어 사용하세요.");
    } catch (err) {
      alert("복사에 실패했습니다. 지문 내용을 직접 복사해주세요.");
    }
  };

  const handleUsePassage = () => {
    if (selectedPassageIndex === null || !parsedPassages[selectedPassageIndex]) {
      alert("지문을 선택해주세요.");
      return;
    }

    const selectedPassage = parsedPassages[selectedPassageIndex];
    
    // return URL이 있으면 해당 페이지로 이동
    if (returnUrl && returnUrl !== "/admin/passages") {
      const params = new URLSearchParams({
        title: selectedPassage.title || "",
        source: selectedPassage.source || "",
        content: selectedPassage.content,
      });
      router.push(`${returnUrl}?${params.toString()}`);
    } else {
      // return URL이 없으면 카테고리 선택 페이지로 이동
      router.push("/admin/passages");
    }
  };

  const handleRegisterPassage = () => {
    if (selectedPassageIndex === null || !parsedPassages[selectedPassageIndex]) {
      alert("지문을 선택해주세요.");
      return;
    }

    const selectedPassage = parsedPassages[selectedPassageIndex];
    
    // 카테고리 선택 페이지로 이동 (데이터는 sessionStorage에 저장)
    sessionStorage.setItem('parsedPassage', JSON.stringify({
      title: selectedPassage.title || "",
      source: selectedPassage.source || "",
      content: selectedPassage.content,
    }));
    
    router.push("/admin/passages");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
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
            PDF 파싱
          </h1>
          <p className="text-gray-600 mt-2">PDF에서 본문을 추출하고 문제를 제거합니다. 파싱된 지문은 복사하여 지문 등록 페이지에서 사용하세요.</p>
        </div>

        {/* 파일 업로드 */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">PDF 파일 선택</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isParsing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer disabled:opacity-50"
          />
          {isParsing && (
            <div className="mt-4 flex items-center gap-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>PDF 파싱 중...</span>
            </div>
          )}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* 파싱 결과 - 여러 지문 선택 */}
        {parsedPassages.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                추출된 지문 ({parsedPassages.length}개)
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyPassage}
                  disabled={selectedPassageIndex === null}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  복사하기
                </button>
                {returnUrl && returnUrl !== "/admin/passages" ? (
                  <button
                    onClick={handleUsePassage}
                    disabled={selectedPassageIndex === null}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    선택한 지문 사용하기
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterPassage}
                    disabled={selectedPassageIndex === null}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    지문 등록하기
                  </button>
                )}
              </div>
            </div>

            {/* 지문 목록 */}
            <div className="space-y-4">
              {parsedPassages.map((passage, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedPassageIndex(index)}
                  className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedPassageIndex === index
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPassageIndex === index
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-300"
                        }`}>
                          {selectedPassageIndex === index && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          지문 {passage.number}
                          {passage.title && `: ${passage.title}`}
                        </h3>
                      </div>
                      {passage.source && (
                        <p className="text-sm text-gray-600 ml-8 mb-2">
                          출처: {passage.source}
                        </p>
                      )}
                      {passage.pages && passage.pages.length > 0 && (
                        <p className="text-xs text-gray-500 ml-8">
                          페이지: {passage.pages[0]}{passage.pages.length > 1 ? `~${passage.pages[passage.pages.length - 1]}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* 지문 내용 미리보기 */}
                  <div className="ml-8 mt-3 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                      {passage.content.substring(0, 300)}
                      {passage.content.length > 300 && "..."}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      총 {passage.content.length}자
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ParsePDFPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-6 md:p-10 flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #F0EEEB, #CCD5DA)' }}>
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
    }>
      <ParsePDFContent />
    </Suspense>
  );
}

