-- student_checkpoint_record 테이블에 category 컬럼 추가
-- 학생이 작성한 체크포인트의 거시/미시 분류를 저장하기 위한 컬럼

ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS category text;

-- category 컬럼에 대한 코멘트 추가
COMMENT ON COLUMN public.student_checkpoint_record.category IS '체크포인트 카테고리: 거시 또는 미시 (국어 지문만 해당, 영어는 NULL)';
