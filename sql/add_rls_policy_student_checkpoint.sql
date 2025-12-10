-- student_checkpoint_record 테이블에 RLS 정책 추가

-- 1. RLS 활성화 (이미 활성화되어 있을 수 있음)
ALTER TABLE public.student_checkpoint_record ENABLE ROW LEVEL SECURITY;

-- 2. 학생이 자신의 체크포인트를 삽입할 수 있는 정책
CREATE POLICY "Students can insert their own checkpoints"
ON public.student_checkpoint_record
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. 학생이 자신의 체크포인트를 조회할 수 있는 정책
CREATE POLICY "Students can view their own checkpoints"
ON public.student_checkpoint_record
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. 학생이 자신의 체크포인트를 수정할 수 있는 정책
CREATE POLICY "Students can update their own checkpoints"
ON public.student_checkpoint_record
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. 선생님(관리자)이 모든 체크포인트를 조회할 수 있는 정책
-- users 테이블에서 role이 'teacher'인 경우
CREATE POLICY "Teachers can view all checkpoints"
ON public.student_checkpoint_record
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- 참고: 
-- - auth.uid()는 현재 로그인한 사용자의 ID를 반환
-- - user_id는 student_checkpoint_record 테이블의 컬럼
-- - 정책이 이미 존재하면 에러가 발생할 수 있으므로, 필요시 DROP POLICY 후 재생성

