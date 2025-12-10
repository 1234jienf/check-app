-- passages 테이블에 카테고리 관련 컬럼 추가

-- 1. EBS 타입 (수특/수완) - EBS에만 사용
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS ebs_type text; -- '수특' or '수완' (EBS일 때만 값 있음)

-- 2. LEET 타입 (추리논증/언어이해) - LEET에만 사용
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS leet_type text; -- '추리논증' or '언어이해' (LEET일 때만 값 있음)

-- 3. 평가원 시험 타입 (6월/9월/수능) - 평가원에만 사용
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS exam_type text; -- '6월', '9월', '수능' (평가원일 때만 값 있음)

-- 4. 문학/비문학 구분 (모든 카테고리에서 사용)
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS literary_type text; -- '문학' or '비문학'

-- 5. 세부 카테고리 (모든 카테고리에서 사용)
-- 비문학: '인문', '사회', '과학', '기술', '예술', '복합', '융합'
-- 문학: '현대시', '고전시가', '현대소설', '고전소설', '수필', '희곡' 등
ALTER TABLE public.passages
ADD COLUMN IF NOT EXISTS sub_category text;

-- 6. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_passages_category_year ON public.passages(category, year);
CREATE INDEX IF NOT EXISTS idx_passages_ebs_type ON public.passages(ebs_type) WHERE category = 'EBS';
CREATE INDEX IF NOT EXISTS idx_passages_leet_type ON public.passages(leet_type) WHERE category = 'LEET';
CREATE INDEX IF NOT EXISTS idx_passages_exam_type ON public.passages(exam_type) WHERE category = '기출';
CREATE INDEX IF NOT EXISTS idx_passages_literary_type ON public.passages(literary_type);
CREATE INDEX IF NOT EXISTS idx_passages_sub_category ON public.passages(sub_category);

