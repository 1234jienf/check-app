-- daily_vocabulary_test 테이블에 test_mode 컬럼 추가

ALTER TABLE public.daily_vocabulary_test
ADD COLUMN IF NOT EXISTS test_mode text; -- 'word-to-meaning', 'meaning-to-word', 'mixed'

-- 기존 데이터는 word-to-meaning으로 기본값 설정
UPDATE public.daily_vocabulary_test
SET test_mode = 'word-to-meaning'
WHERE test_mode IS NULL;

