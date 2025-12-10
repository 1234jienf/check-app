-- RLS 정책 수정: 선생님이 모든 체크포인트를 볼 수 있도록

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Teachers can view all checkpoints" ON public.student_checkpoint_record;

-- 새로운 정책 생성: 선생님이 모든 체크포인트를 조회할 수 있도록
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

-- 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'student_checkpoint_record';


