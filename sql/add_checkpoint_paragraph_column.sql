-- checkpoints 테이블에 paragraph 컬럼 추가
ALTER TABLE public.checkpoints
ADD COLUMN IF NOT EXISTS paragraph integer;

-- paragraph 컬럼에 대한 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_checkpoints_paragraph ON public.checkpoints(paragraph);

