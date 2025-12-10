-- checkpoints 테이블에 하이라이트 관련 컬럼 추가
ALTER TABLE public.checkpoints
ADD COLUMN IF NOT EXISTS highlighted_text text,
ADD COLUMN IF NOT EXISTS highlight_start integer,
ADD COLUMN IF NOT EXISTS highlight_end integer;

