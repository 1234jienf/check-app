-- RLS 정책 단순화: 선생님은 모든 데이터를 볼 수 있도록

-- 1. student_checkpoint_record 테이블 정책 단순화
DROP POLICY IF EXISTS "Students can insert their own checkpoints" ON public.student_checkpoint_record;
DROP POLICY IF EXISTS "Students can view their own checkpoints" ON public.student_checkpoint_record;
DROP POLICY IF EXISTS "Students can update their own checkpoints" ON public.student_checkpoint_record;
DROP POLICY IF EXISTS "Teachers can view all checkpoints" ON public.student_checkpoint_record;

-- RLS 활성화
ALTER TABLE public.student_checkpoint_record ENABLE ROW LEVEL SECURITY;

-- 학생: 자신의 데이터만 INSERT, SELECT, UPDATE 가능
CREATE POLICY "Students manage own checkpoints"
ON public.student_checkpoint_record
FOR ALL
TO authenticated
USING (
  -- SELECT, UPDATE, DELETE: 자신의 데이터만
  auth.uid() = user_id
  OR
  -- 선생님은 모든 데이터 접근 가능
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
)
WITH CHECK (
  -- INSERT, UPDATE: 자신의 데이터만
  auth.uid() = user_id
  OR
  -- 선생님은 모든 데이터 수정 가능
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- 2. passages 테이블 정책 (선생님은 모든 지문 조회 가능)
-- passages 테이블에 RLS가 활성화되어 있다면
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'passages'
  ) THEN
    -- RLS 활성화
    ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
    
    -- 기존 정책 삭제
    DROP POLICY IF EXISTS "Anyone can view passages" ON public.passages;
    DROP POLICY IF EXISTS "Teachers can manage passages" ON public.passages;
    
    -- 모든 인증된 사용자가 지문을 볼 수 있음
    CREATE POLICY "Authenticated users can view passages"
    ON public.passages
    FOR SELECT
    TO authenticated
    USING (true);
    
    -- 선생님만 지문을 생성/수정/삭제 가능
    CREATE POLICY "Teachers can manage passages"
    ON public.passages
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
      )
    );
  END IF;
END $$;

-- 3. checkpoints 테이블 정책
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'checkpoints'
  ) THEN
    ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Anyone can view checkpoints" ON public.checkpoints;
    DROP POLICY IF EXISTS "Teachers can manage checkpoints" ON public.checkpoints;
    
    -- 모든 인증된 사용자가 체크포인트를 볼 수 있음
    CREATE POLICY "Authenticated users can view checkpoints"
    ON public.checkpoints
    FOR SELECT
    TO authenticated
    USING (true);
    
    -- 선생님만 체크포인트를 관리 가능
    CREATE POLICY "Teachers can manage checkpoints"
    ON public.checkpoints
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'teacher'
      )
    );
  END IF;
END $$;

-- 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('student_checkpoint_record', 'passages', 'checkpoints')
ORDER BY tablename, policyname;

