-- student_checkpoint_record 테이블에 필요한 컬럼 추가

-- 1. passage_id 컬럼 추가 (passages 테이블 참조)
-- passages.id가 uuid인지 int8인지 확인 필요 (보통 uuid)
ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS passage_id uuid REFERENCES public.passages(id);

-- 2. paragraph 컬럼 추가 (문단 번호)
ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS paragraph integer;

-- 3. checkpoint_text 컬럼 추가 (학생이 작성한 체크포인트)
ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS checkpoint_text text;

-- 4. answer 컬럼 추가 (답변, 선택적)
ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS answer text;

-- 5. student_id 컬럼 추가 (user_id와 별도로 사용할 경우)
-- 또는 user_id를 student_id로 사용하려면 컬럼명을 변경해야 함
-- 코드에서 student_id를 사용하므로 별도 컬럼 추가
ALTER TABLE public.student_checkpoint_record
ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id);

-- 6. Unique constraint 추가 (passage_id, student_id, paragraph 조합으로 중복 방지)
-- 기존 unique constraint가 있으면 먼저 삭제
ALTER TABLE public.student_checkpoint_record
DROP CONSTRAINT IF EXISTS student_checkpoint_record_passage_id_student_id_paragraph_key;

ALTER TABLE public.student_checkpoint_record
ADD CONSTRAINT student_checkpoint_record_passage_id_student_id_paragraph_key 
UNIQUE (passage_id, student_id, paragraph);

-- 참고: 
-- - user_id는 기존 컬럼이 있을 수 있음
-- - student_id는 새로 추가한 컬럼 (코드에서 사용)
-- - passages.id가 int8이면 passage_id도 int8로 변경 필요

