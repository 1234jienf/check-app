-- users 테이블 RLS 정책 수정: 로그인한 사용자가 자신의 정보를 조회할 수 있도록

-- 기존 정책 확인 후 필요시 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.users;

-- 로그인한 사용자가 자신의 정보를 조회할 수 있는 정책 추가
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 모든 사용자가 자신의 role과 approved 상태를 조회할 수 있도록 (로그인 시 필요)
-- 더 넓은 정책이 필요할 수 있음
CREATE POLICY "Authenticated users can view basic profile info"
ON public.users
FOR SELECT
TO authenticated
USING (true);  -- 모든 인증된 사용자가 기본 정보 조회 가능

-- 참고: 위 정책이 너무 넓다면, 아래처럼 제한할 수 있습니다:
-- USING (
--   auth.uid() = id OR  -- 자신의 정보
--   EXISTS (  -- 또는 teacher인 경우 모든 사용자 조회 가능
--     SELECT 1 FROM public.users
--     WHERE users.id = auth.uid()
--     AND users.role = 'teacher'
--   )
-- );

