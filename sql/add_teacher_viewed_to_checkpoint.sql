-- student_checkpoint_record 테이블에 teacher_viewed 필드 추가
-- 선생님이 학생의 체크포인트를 확인했는지 표시하는 필드

ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS teacher_viewed boolean DEFAULT false;

-- teacher_viewed 필드에 대한 코멘트 추가
COMMENT ON COLUMN public.student_checkpoint_record.teacher_viewed IS '선생님이 해당 체크포인트를 확인했는지 여부';

-- 인덱스 추가 (선생님이 확인하지 않은 체크포인트를 빠르게 조회하기 위해)
CREATE INDEX IF NOT EXISTS idx_student_checkpoint_record_teacher_viewed 
ON public.student_checkpoint_record(teacher_viewed) 
WHERE teacher_viewed = false;


