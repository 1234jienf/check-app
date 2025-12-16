-- Daily 숙제 시험 결과 저장 테이블

-- 1. 영단어 시험 결과
CREATE TABLE IF NOT EXISTS public.daily_vocabulary_test (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  teacher_homework_id uuid REFERENCES public.teacher_homework(id) ON DELETE CASCADE NOT NULL,
  vocabulary_id uuid REFERENCES public.english_vocabulary(id) ON DELETE CASCADE NOT NULL,
  test_date date NOT NULL,
  answers jsonb NOT NULL, -- { "word1": "뜻1", "word2": "뜻2", ... }
  correct_count integer DEFAULT 0,
  total_count integer DEFAULT 0,
  score integer DEFAULT 0, -- 점수 (0-100)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. 구문 해석 시험 결과
CREATE TABLE IF NOT EXISTS public.daily_sentence_test (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  teacher_homework_id uuid REFERENCES public.teacher_homework(id) ON DELETE CASCADE NOT NULL,
  sentence_example_id uuid REFERENCES public.english_sentence_examples(id) ON DELETE CASCADE NOT NULL,
  test_date date NOT NULL,
  answers jsonb NOT NULL, -- { "sentence1": "해석1", "sentence2": "해석2", ... }
  teacher_score integer DEFAULT NULL, -- 선생님이 매긴 점수 (0-100)
  teacher_feedback text DEFAULT NULL,
  graded_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. 지문 해석 시험 결과
CREATE TABLE IF NOT EXISTS public.daily_passage_test (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  teacher_homework_id uuid REFERENCES public.teacher_homework(id) ON DELETE CASCADE NOT NULL,
  passage_analysis_id uuid REFERENCES public.english_passage_analysis(id) ON DELETE CASCADE NOT NULL,
  test_date date NOT NULL,
  answer text NOT NULL, -- 학생이 작성한 답변
  teacher_score integer DEFAULT NULL, -- 선생님이 매긴 점수 (0-100)
  teacher_feedback text DEFAULT NULL,
  graded_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_daily_vocabulary_test_student 
ON public.daily_vocabulary_test(student_id, test_date);

CREATE INDEX IF NOT EXISTS idx_daily_vocabulary_test_homework 
ON public.daily_vocabulary_test(teacher_homework_id);

CREATE INDEX IF NOT EXISTS idx_daily_sentence_test_student 
ON public.daily_sentence_test(student_id, test_date);

CREATE INDEX IF NOT EXISTS idx_daily_sentence_test_homework 
ON public.daily_sentence_test(teacher_homework_id);

CREATE INDEX IF NOT EXISTS idx_daily_passage_test_student 
ON public.daily_passage_test(student_id, test_date);

CREATE INDEX IF NOT EXISTS idx_daily_passage_test_homework 
ON public.daily_passage_test(teacher_homework_id);

-- RLS 정책
ALTER TABLE public.daily_vocabulary_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sentence_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_passage_test ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 시험 결과만 조회/생성 가능
CREATE POLICY "Students can view their own vocabulary test results"
  ON public.daily_vocabulary_test FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own vocabulary test results"
  ON public.daily_vocabulary_test FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own vocabulary test results"
  ON public.daily_vocabulary_test FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can view their own sentence test results"
  ON public.daily_sentence_test FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own sentence test results"
  ON public.daily_sentence_test FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own passage test results"
  ON public.daily_passage_test FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own passage test results"
  ON public.daily_passage_test FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- 선생님은 모든 시험 결과 조회/수정 가능
CREATE POLICY "Teachers can view all vocabulary test results"
  ON public.daily_vocabulary_test FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can view all sentence test results"
  ON public.daily_sentence_test FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update sentence test results"
  ON public.daily_sentence_test FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can view all passage test results"
  ON public.daily_passage_test FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update passage test results"
  ON public.daily_passage_test FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

