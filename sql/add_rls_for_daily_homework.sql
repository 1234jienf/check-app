-- daily_homework 테이블에 RLS 정책 추가
-- 학생은 자신의 숙제만 조회/생성/수정 가능
-- 선생님은 모든 학생의 숙제 조회 가능

-- RLS 활성화
ALTER TABLE public.daily_homework ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Students can view their own daily homework" ON public.daily_homework;
DROP POLICY IF EXISTS "Students can insert their own daily homework" ON public.daily_homework;
DROP POLICY IF EXISTS "Students can update their own daily homework" ON public.daily_homework;
DROP POLICY IF EXISTS "Students can delete their own daily homework" ON public.daily_homework;
DROP POLICY IF EXISTS "Teachers can view all daily homework" ON public.daily_homework;

-- 학생은 자신의 숙제만 조회/생성/수정/삭제 가능
CREATE POLICY "Students can view their own daily homework"
  ON public.daily_homework FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own daily homework"
  ON public.daily_homework FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own daily homework"
  ON public.daily_homework FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own daily homework"
  ON public.daily_homework FOR DELETE
  USING (auth.uid() = student_id);

-- 선생님은 모든 학생의 숙제 조회 가능
CREATE POLICY "Teachers can view all daily homework"
  ON public.daily_homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );
