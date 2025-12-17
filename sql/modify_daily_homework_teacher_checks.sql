-- daily_homework_teacher_checks 테이블을 수정하여 사용
-- 기존 구조를 유지하면서 필요한 컬럼 추가/수정

-- daily_homework_id를 NULL 허용으로 변경 (선생님이 내준 숙제는 daily_homework_id가 필요 없음)
ALTER TABLE public.daily_homework_teacher_checks
ALTER COLUMN daily_homework_id DROP NOT NULL;

-- teacher_id를 NULL 허용으로 변경 (학생이 체크하는 경우 teacher_id가 필요 없음, teacher_homework_id에서 선생님 정보를 가져올 수 있음)
ALTER TABLE public.daily_homework_teacher_checks
ALTER COLUMN teacher_id DROP NOT NULL;

-- checklist_item_id를 NULL 허용으로 변경 (선생님이 내준 숙제는 task_type을 사용하므로 checklist_item_id가 필요 없음)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_homework_teacher_checks' 
        AND column_name = 'checklist_item_id'
    ) THEN
        ALTER TABLE public.daily_homework_teacher_checks
        ALTER COLUMN checklist_item_id DROP NOT NULL;
    END IF;
END $$;

-- teacher_homework_id 컬럼 추가 (기존 daily_homework_id와 함께 사용)
ALTER TABLE public.daily_homework_teacher_checks
ADD COLUMN IF NOT EXISTS teacher_homework_id uuid REFERENCES public.teacher_homework(id) ON DELETE CASCADE;

-- task_type 컬럼 추가 (기존 checklist_item_id 대신 또는 함께 사용)
ALTER TABLE public.daily_homework_teacher_checks
ADD COLUMN IF NOT EXISTS task_type text; -- 'korean', 'vocab', 'sentence', 'passage'

-- student_id 컬럼 추가 (없는 경우)
ALTER TABLE public.daily_homework_teacher_checks
ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- is_checked를 is_completed로 변경 (또는 둘 다 유지)
-- 기존 is_checked가 있으면 그대로 사용, 없으면 is_completed 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_homework_teacher_checks' 
        AND column_name = 'is_completed'
    ) THEN
        ALTER TABLE public.daily_homework_teacher_checks
        ADD COLUMN is_completed boolean DEFAULT false;
        
        -- 기존 is_checked 값이 있으면 is_completed로 복사
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'daily_homework_teacher_checks' 
            AND column_name = 'is_checked'
        ) THEN
            UPDATE public.daily_homework_teacher_checks
            SET is_completed = is_checked
            WHERE is_completed IS NULL;
        END IF;
    END IF;
END $$;

-- UNIQUE 제약조건 추가 (student_id, teacher_homework_id, task_type)
-- 기존 제약조건이 있는지 확인 후 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_homework_teacher_checks_student_homework_task_unique'
    ) THEN
        ALTER TABLE public.daily_homework_teacher_checks
        ADD CONSTRAINT daily_homework_teacher_checks_student_homework_task_unique
        UNIQUE(student_id, teacher_homework_id, task_type);
    END IF;
END $$;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_daily_homework_teacher_checks_student 
ON public.daily_homework_teacher_checks(student_id);

CREATE INDEX IF NOT EXISTS idx_daily_homework_teacher_checks_teacher_homework 
ON public.daily_homework_teacher_checks(teacher_homework_id);

-- updated_at 자동 업데이트 함수 생성 (이미 있으면 교체)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 자동 업데이트 트리거 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_daily_homework_teacher_checks_updated_at'
    ) THEN
        CREATE TRIGGER update_daily_homework_teacher_checks_updated_at
        BEFORE UPDATE ON public.daily_homework_teacher_checks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS 정책 설정
ALTER TABLE public.daily_homework_teacher_checks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Students can view their own homework checks" ON public.daily_homework_teacher_checks;
DROP POLICY IF EXISTS "Students can insert their own homework checks" ON public.daily_homework_teacher_checks;
DROP POLICY IF EXISTS "Students can update their own homework checks" ON public.daily_homework_teacher_checks;
DROP POLICY IF EXISTS "Teachers can view all homework checks" ON public.daily_homework_teacher_checks;

-- 학생은 자신의 체크 상태만 조회/생성/수정 가능
CREATE POLICY "Students can view their own homework checks"
  ON public.daily_homework_teacher_checks FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own homework checks"
  ON public.daily_homework_teacher_checks FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own homework checks"
  ON public.daily_homework_teacher_checks FOR UPDATE
  USING (auth.uid() = student_id);

-- 선생님은 모든 학생의 체크 상태 조회 가능
CREATE POLICY "Teachers can view all homework checks"
  ON public.daily_homework_teacher_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );
