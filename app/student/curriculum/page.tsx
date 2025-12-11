"use client";

export default function CurriculumPage() {
  const steps = [
    {
      step: 0,
      title: "오프닝",
      type: "opening",
    },
    {
      step: 1,
      title: "Rook - Look",
      subtitle: "보는법 강의",
      type: "main",
      piece: "rook",
      description: "앞을 보는 직선적 사고 정리",
      weekly: {
        title: "Knight - Night",
        subtitle: "밤마다 공부하라고",
      }
    },
    {
      step: 2,
      title: "Bishop - B's Hop",
      subtitle: "실력 상승 껑충",
      type: "main",
      piece: "bishop",
      description: "통찰 / 패턴 읽기 [고난도의 읽는 방법]",
      ebs: {
        title: "En Ba Ssant",
        subtitle: "순간 표착. 핵심 스킬 캐치",
        description: "(앙파상 단어의 의미가 찰나에 이동)",
      }
    },
    {
      step: 3,
      title: "Queen's - Habit",
      subtitle: "막판 행동강령을 통해 마무리 단계",
      type: "main",
      piece: "queen",
    },
    {
      step: 4,
      title: "King Maker",
      subtitle: "파이널 모고",
      type: "main",
      piece: "king",
    }
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 상단 헤더 - 이미지 스타일 */}
        <div className="mb-12">
          <div className="w-full h-px bg-black mb-6"></div>
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 border-2 border-black rounded-full flex items-center justify-center bg-white">
              <span className="text-4xl">♞</span>
            </div>
          </div>
          <div className="w-full h-px bg-black"></div>
        </div>

        {/* 메인 타이틀 */}
        <div className="text-center mb-20">
          <h1 className="text-7xl md:text-8xl font-bold text-black mb-6 tracking-tighter">
            커리큘럼
          </h1>
        </div>

        {/* 각 스텝 */}
        <div className="space-y-24 mb-24">
          {steps.map((step, idx) => (
            <div key={step.step} className="relative">
              {/* 추상 그래픽 영역 - 이미지 스타일 */}
              <div className="border border-black mb-8 p-12 bg-white relative" style={{ minHeight: '400px' }}>
                <div className="absolute inset-0 overflow-hidden">
                  {/* 큰 검은 원들 */}
                  <div className="absolute top-12 left-12 w-28 h-28 bg-black rounded-full"></div>
                  <div className="absolute top-20 right-20 w-40 h-40 bg-black rounded-full opacity-90"></div>
                  <div className="absolute bottom-16 left-1/3 w-24 h-24 bg-black rounded-full"></div>
                  
                  {/* 체스 기물 실루엣 (큰 크기, 투명도 낮음) */}
                  {step.piece && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="text-[200px] opacity-10">
                        {step.piece === 'rook' && '♜'}
                        {step.piece === 'knight' && '♞'}
                        {step.piece === 'bishop' && '♝'}
                        {step.piece === 'queen' && '♛'}
                        {step.piece === 'king' && '♚'}
                      </div>
                    </div>
                  )}
                  
                  {/* 검은 사각형 */}
                  <div className="absolute bottom-12 right-12 w-20 h-20 bg-black"></div>
                  
                  {/* 수직/수평 선들 */}
                  <div className="absolute top-1/2 left-12 w-px h-40 bg-black"></div>
                  <div className="absolute top-1/3 right-16 w-40 h-px bg-black"></div>
                  <div className="absolute bottom-1/4 left-1/4 w-32 h-px bg-black"></div>
                  
                  {/* 동심원 패턴 */}
                  <div className="absolute bottom-20 left-1/3">
                    <div className="w-24 h-24 border-4 border-black rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 border-2 border-black rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full"></div>
                  </div>
                  
                  {/* 작은 원들 */}
                  <div className="absolute top-32 right-1/4 w-6 h-6 bg-black rounded-full"></div>
                  <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-black rounded-full"></div>
                </div>
              </div>

              {/* 스텝 정보 - 미니멀한 스타일 */}
              <div className="border-t-2 border-b-2 border-black py-8">
                <div className="flex items-baseline gap-4 mb-6">
                  <div className="text-xl font-bold text-black">Step {step.step}</div>
                  {step.type === "main" && (
                    <span className="text-[10px] px-2 py-1 bg-black text-white font-bold tracking-wider">[본 수업]</span>
                  )}
                </div>
                
                <h2 className="text-5xl md:text-6xl font-bold text-black mb-3 leading-tight">
                  {step.title}
                </h2>
                
                {step.subtitle && (
                  <p className="text-base text-black/80 mb-6">{step.subtitle}</p>
                )}
                
                {step.description && (
                  <p className="text-sm text-black/70 mb-8 leading-relaxed">
                    &gt; {step.description}
                  </p>
                )}

                {/* 주간지 */}
                {step.weekly && (
                  <div className="mt-8 pt-8 border-t border-black">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-[10px] px-2 py-1 bg-black text-white font-bold tracking-wider">[주간지]</span>
                      <span className="text-3xl">♞</span>
                      <h3 className="text-3xl font-bold text-black">{step.weekly.title}</h3>
                    </div>
                    <p className="text-sm text-black/70">{step.weekly.subtitle}</p>
                  </div>
                )}

                {/* EBS 수업 */}
                {step.ebs && (
                  <div className="mt-8 pt-8 border-t border-black">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-[10px] px-2 py-1 bg-black text-white font-bold tracking-wider">[EBS 수업]</span>
                      <span className="text-2xl">♟</span>
                      <h3 className="text-2xl font-bold text-black">{step.ebs.title}</h3>
                    </div>
                    <p className="text-sm text-black/70 mb-2">{step.ebs.subtitle}</p>
                    {step.ebs.description && (
                      <p className="text-xs text-black/60 italic">{step.ebs.description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 정보 테이블 - 이미지 스타일 */}
        <div className="border-t-2 border-black pt-6">
          <div className="grid grid-cols-3 gap-0 border-b border-black">
            <div className="border-r border-black pr-4 pb-6">
              <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-tight">MUST BE DONE</div>
            </div>
            <div className="border-r border-black pr-4 pb-6">
              <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-tight">DECEMBER</div>
              <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-tight">2025</div>
            </div>
            <div className="pb-6">
              <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-tight">AT 09.00</div>
              <div className="text-[10px] font-bold text-black uppercase tracking-widest leading-tight">P.M-10 P.M</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
