-- 현재 사용자의 역할을 teacher로 변경
-- 사용자 ID: 491356a3-d9fc-440b-bbc4-a2a1548c997f

UPDATE public.users
SET role = 'teacher'
WHERE id = '491356a3-d9fc-440b-bbc4-a2a1548c997f';

-- 확인
SELECT id, name, email, role 
FROM public.users 
WHERE id = '491356a3-d9fc-440b-bbc4-a2a1548c997f';


