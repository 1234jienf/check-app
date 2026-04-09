-- users 테이블에 academy 필드 추가 및 학생별 학원 정보 입력
-- 학생이 어느 학원에 속해있는지 표시하는 필드

-- 1. academy 필드 추가
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS academy text;

-- academy 필드에 대한 코멘트 추가
COMMENT ON COLUMN public.users.academy IS '학생이 속한 학원 이름 (예: 샤인 동작, 샤인 금천, 피스톤 등)';

-- 인덱스 추가 (학원별 학생 조회를 위해)
CREATE INDEX IF NOT EXISTS idx_users_academy 
ON public.users(academy) 
WHERE academy IS NOT NULL;

-- 2. 학생별 학원 정보 입력 (이름 기준으로 업데이트)
-- 이름으로 매칭하여 학원 정보 입력

-- 샤인 동작 (고3)
UPDATE public.users SET academy = '샤인 동작 (고3)' WHERE name = '강민겸' AND role = 'student';
UPDATE public.users SET academy = '샤인 동작 (고3)' WHERE name = '강성현' AND role = 'student';
UPDATE public.users SET academy = '샤인 동작 (고3)' WHERE name = '방승한' AND role = 'student';
UPDATE public.users SET academy = '샤인 동작 (고3)' WHERE name = '김준성' AND role = 'student';

-- 샤인 금천 (고3)
UPDATE public.users SET academy = '샤인 금천 (고3)' WHERE name = '서준호' AND role = 'student';
UPDATE public.users SET academy = '샤인 금천 (고3)' WHERE name = '곽진성' AND role = 'student';
UPDATE public.users SET academy = '샤인 금천 (고3)' WHERE name = '민채원' AND role = 'student';

-- 샤인 동작 (고2)
UPDATE public.users SET academy = '샤인 동작 (고2)' WHERE name = '박민준' AND role = 'student';
UPDATE public.users SET academy = '샤인 동작 (고2)' WHERE name = '전태양' AND role = 'student';

-- 피스톤 (고3)
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '권대혁' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '김기민' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '김민주' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '전수민' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '최현우' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '나동건' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '김영택' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '김재훈' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '김강우' AND role = 'student';
UPDATE public.users SET academy = '피스톤 (고3)' WHERE name = '곽종현' AND role = 'student';

-- 참고: 이름으로 매칭하므로 정확한 이름이 필요합니다
-- 아래 쿼리로 현재 학생들의 이름을 확인할 수 있습니다:
-- SELECT id, name, email FROM users WHERE role = 'student' AND approved = true ORDER BY name;
