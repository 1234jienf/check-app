"use client";

export default function SettingsPage() {
  return (
    <div className="p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">세팅</h1>

      <div className="bg-white border rounded p-6">
        <h2 className="text-lg font-semibold mb-4">지문 카테고리 관리</h2>
        <p className="text-gray-600 mb-4">
          지문은 카테고리별로 분리되어 관리됩니다.
        </p>

        <div className="space-y-3">
          <div className="border p-4 rounded">
            <h3 className="font-semibold text-blue-600 mb-2">EBS</h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 수능특강 (수특)</li>
              <li>• 수능완성 (수완)</li>
              <li>• 비문학 구분 가능</li>
            </ul>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold text-green-600 mb-2">기출</h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 연도별 관리</li>
              <li>• 출처 정보 입력</li>
            </ul>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold text-purple-600 mb-2">LEET</h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 연도별 관리</li>
              <li>• 출처 정보 입력</li>
            </ul>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold text-gray-600 mb-2">기타</h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• 기타 지문 관리</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">지문 추가 방법</h2>
        <ol className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
          <li>지문 관리 페이지에서 카테고리 선택</li>
          <li>각 카테고리별 입력 폼 작성</li>
          <li>지문 내용 붙여넣기 (빈 줄로 문단 자동 구분)</li>
          <li>저장 후 학생이 체크포인트 작성 가능</li>
        </ol>
      </div>
    </div>
  );
}

