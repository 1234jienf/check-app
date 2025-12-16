-- teacher_homework 테이블을 자료 선택 방식으로 변경

-- 파일 URL 필드 제거하고 자료 ID 필드 추가
ALTER TABLE public.teacher_homework
DROP COLUMN IF EXISTS vocabulary_file_url,
DROP COLUMN IF EXISTS sentences_file_url,
DROP COLUMN IF EXISTS vocabulary_count,
DROP COLUMN IF EXISTS sentences_count;

-- 자료 ID 필드 추가
ALTER TABLE public.teacher_homework
ADD COLUMN IF NOT EXISTS vocabulary_id uuid REFERENCES public.english_vocabulary(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sentence_example_id uuid REFERENCES public.english_sentence_examples(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS passage_analysis_id uuid REFERENCES public.english_passage_analysis(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_teacher_homework_vocabulary 
ON public.teacher_homework(vocabulary_id);

CREATE INDEX IF NOT EXISTS idx_teacher_homework_sentence 
ON public.teacher_homework(sentence_example_id);

CREATE INDEX IF NOT EXISTS idx_teacher_homework_passage 
ON public.teacher_homework(passage_analysis_id);

