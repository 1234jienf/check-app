-- passages 테이블에 opening_chapter 필드 추가 및 지문별 Opening 챕터 정보 입력
-- 지문이 Opening 교재의 어느 챕터에 수록되어 있는지 표시하는 필드

-- 1. opening_chapter 필드 추가
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS opening_chapter text;

-- opening_chapter 필드에 대한 코멘트 추가
COMMENT ON COLUMN public.passages.opening_chapter IS 'Opening 교재 챕터 정보 (예: Opening(0), Opening(1), Opening(2) 등)';

-- 인덱스 추가 (Opening 챕터별 지문 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_passages_opening_chapter 
ON public.passages(opening_chapter) 
WHERE opening_chapter IS NOT NULL;

-- 2. 지문별 Opening 챕터 정보 입력 (제목 기준으로 업데이트)
-- 실제 데이터에 맞게 수정 필요

-- Opening(0)
UPDATE public.passages SET opening_chapter = 'Opening(0)' WHERE title LIKE '%개화의 개념%';
UPDATE public.passages SET opening_chapter = 'Opening(0)' WHERE title LIKE '%볼테르의 역사관%';
UPDATE public.passages SET opening_chapter = 'Opening(0)' WHERE title LIKE '%데이터 통신과 네트워킹%';
UPDATE public.passages SET opening_chapter = 'Opening(0)' WHERE title LIKE '%기초대사량과 체중%';

-- Opening(1)
UPDATE public.passages SET opening_chapter = 'Opening(1)' WHERE title LIKE '%법 해석과 보증%' OR title LIKE '%법해석과 보증%';
UPDATE public.passages SET opening_chapter = 'Opening(1)' WHERE title LIKE '%인격 동일성%' OR title LIKE '%인격의 동일성%';
UPDATE public.passages SET opening_chapter = 'Opening(1)' WHERE title LIKE '%이중차분법%';

-- Opening(2)
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%연소%';
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%칸트의 미학%' OR title LIKE '%가디머%';
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%공적 공간%';
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%쇼펜하우어%' OR title LIKE '%가브리엘%';
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%영화를 보는 시선%';
UPDATE public.passages SET opening_chapter = 'Opening(2)' WHERE title LIKE '%그레고리력%';

-- Opening(3)
UPDATE public.passages SET opening_chapter = 'Opening(3)' WHERE title LIKE '%열팽창%';
UPDATE public.passages SET opening_chapter = 'Opening(3)' WHERE title LIKE '%주식회사의 자산%' OR title LIKE '%법인의 자산 운용%';
UPDATE public.passages SET opening_chapter = 'Opening(3)' WHERE title LIKE '%연합형 게임%';
UPDATE public.passages SET opening_chapter = 'Opening(3)' WHERE title LIKE '%범죄에 대한 법경제학적 접근%';

-- Opening(4)
UPDATE public.passages SET opening_chapter = 'Opening(4)' WHERE title LIKE '%저널리즘%';
UPDATE public.passages SET opening_chapter = 'Opening(4)' WHERE title LIKE '%플라스틱의 화학 결합%';
UPDATE public.passages SET opening_chapter = 'Opening(4)' WHERE title LIKE '%자가 유변 유체%';
UPDATE public.passages SET opening_chapter = 'Opening(4)' WHERE title LIKE '%비타민 K의 기능%';
UPDATE public.passages SET opening_chapter = 'Opening(4)' WHERE title LIKE '%전기화학식 가스 센서%';

-- Opening(5)
UPDATE public.passages SET opening_chapter = 'Opening(5)' WHERE title LIKE '%소리 저장%';
UPDATE public.passages SET opening_chapter = 'Opening(5)' WHERE title LIKE '%공정거래법과 표시광고법%';
UPDATE public.passages SET opening_chapter = 'Opening(5)' WHERE title LIKE '%데이터 이동권%';
UPDATE public.passages SET opening_chapter = 'Opening(5)' WHERE title LIKE '%반자유의지 논증%';

-- 참고: 실제 지문 제목은 데이터베이스에서 확인 후 수정 필요
-- 아래 쿼리로 현재 지문들의 제목을 확인할 수 있습니다:
-- SELECT id, title, category, year, source FROM passages WHERE subject = 'korean' ORDER BY year DESC, source;
