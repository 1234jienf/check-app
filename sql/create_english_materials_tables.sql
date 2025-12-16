-- 영어 자료실 테이블 생성
-- 단어장, 문장 예제, 지문 해체 자료를 관리

-- 1. 영어 단어장 테이블
CREATE TABLE IF NOT EXISTS public.english_vocabulary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  words text NOT NULL, -- 단어 목록 (텍스트, 줄바꿈으로 구분)
  word_count integer DEFAULT 0, -- 단어 개수
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 문장 예제 테이블
CREATE TABLE IF NOT EXISTS public.english_sentence_examples (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  pattern text NOT NULL, -- 문장 패턴 (예: S+V, S+V+O 등)
  sentences text NOT NULL, -- 문장 예제 목록 (텍스트, 줄바꿈으로 구분)
  sentence_count integer DEFAULT 0, -- 문장 개수
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 지문 해체 테이블
CREATE TABLE IF NOT EXISTS public.english_passage_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  passage_text text NOT NULL, -- 지문 원문
  analysis text NOT NULL, -- 해체/분석 내용
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_english_vocabulary_teacher 
ON public.english_vocabulary(teacher_id);

CREATE INDEX IF NOT EXISTS idx_english_sentence_examples_teacher 
ON public.english_sentence_examples(teacher_id);

CREATE INDEX IF NOT EXISTS idx_english_passage_analysis_teacher 
ON public.english_passage_analysis(teacher_id);

-- RLS 활성화
ALTER TABLE public.english_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.english_sentence_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.english_passage_analysis ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 선생님은 자신의 자료만 관리, 학생은 조회만 가능
-- 단어장
CREATE POLICY "Teachers can manage their own vocabulary"
ON public.english_vocabulary
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_vocabulary.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_vocabulary.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view vocabulary"
ON public.english_vocabulary
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
    AND users.approved = true
    AND (
      users.subjects IS NULL OR
      'english' = ANY(COALESCE(users.subjects, ARRAY['korean']::text[]))
    )
  )
);

-- 문장 예제
CREATE POLICY "Teachers can manage their own sentence examples"
ON public.english_sentence_examples
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_sentence_examples.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_sentence_examples.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view sentence examples"
ON public.english_sentence_examples
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
    AND users.approved = true
    AND (
      users.subjects IS NULL OR
      'english' = ANY(COALESCE(users.subjects, ARRAY['korean']::text[]))
    )
  )
);

-- 지문 해체
CREATE POLICY "Teachers can manage their own passage analysis"
ON public.english_passage_analysis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_passage_analysis.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND english_passage_analysis.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view passage analysis"
ON public.english_passage_analysis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'student'
    AND users.approved = true
    AND (
      users.subjects IS NULL OR
      'english' = ANY(COALESCE(users.subjects, ARRAY['korean']::text[]))
    )
  )
);

