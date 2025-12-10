-- student_checkpoint_record 테이블에서 추가한 컬럼 삭제

-- 1. Unique constraint 삭제
ALTER TABLE public.student_checkpoint_record
DROP CONSTRAINT IF EXISTS student_checkpoint_record_passage_id_student_id_paragraph_key;

-- 2. 추가한 컬럼들 삭제
ALTER TABLE public.student_checkpoint_record
DROP COLUMN IF EXISTS student_id;

ALTER TABLE public.student_checkpoint_record
DROP COLUMN IF EXISTS answer;

ALTER TABLE public.student_checkpoint_record
DROP COLUMN IF EXISTS checkpoint_text;

ALTER TABLE public.student_checkpoint_record
DROP COLUMN IF EXISTS paragraph;

ALTER TABLE public.student_checkpoint_record
DROP COLUMN IF EXISTS passage_id;

