-- english_passage_analysis 테이블에서 analysis 컬럼 제거
-- 원문만 입력하도록 변경

ALTER TABLE public.english_passage_analysis
DROP COLUMN IF EXISTS analysis;

