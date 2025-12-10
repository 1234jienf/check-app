-- 선생 댓글 테이블 생성
-- 기존 테이블이 있으면 삭제 (타입 불일치 해결을 위해)
DROP TABLE IF EXISTS public.teacher_comments CASCADE;

CREATE TABLE public.teacher_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_submission_id bigint REFERENCES public.student_checkpoint_record(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.teacher_comments ENABLE ROW LEVEL SECURITY;

-- 선생만 댓글 작성 가능
CREATE POLICY "Teachers can insert comments"
ON public.teacher_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- 선생은 모든 댓글 조회 가능
CREATE POLICY "Teachers can view all comments"
ON public.teacher_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  )
);

-- 학생은 자신의 제출에 달린 댓글만 조회 가능
CREATE POLICY "Students can view comments on their submissions"
ON public.teacher_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.student_checkpoint_record
    WHERE student_checkpoint_record.id = teacher_comments.student_submission_id
    AND student_checkpoint_record.user_id = auth.uid()
  )
);

-- 선생은 자신이 작성한 댓글만 수정/삭제 가능
CREATE POLICY "Teachers can update their own comments"
ON public.teacher_comments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND teacher_comments.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete their own comments"
ON public.teacher_comments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND teacher_comments.teacher_id = auth.uid()
  )
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_teacher_comments_submission_id ON public.teacher_comments(student_submission_id);
CREATE INDEX IF NOT EXISTS idx_teacher_comments_teacher_id ON public.teacher_comments(teacher_id);

