-- 중복된 체크포인트 삭제 SQL
-- 같은 학생, 같은 지문, 같은 문단, 같은 차수, 같은 카테고리, 같은 내용의 체크포인트 중 하나만 남기고 나머지 삭제

-- ============================================
-- 1단계: 중복 확인 (실행 전 반드시 확인!)
-- ============================================
-- 아래 쿼리를 먼저 실행해서 어떤 중복이 있는지 확인하세요
SELECT 
  user_id,
  passage_id,
  paragraph,
  attempt_number,
  category,
  checkpoint_text,
  created_at::date as date,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY id) as ids
FROM student_checkpoint_record
WHERE checkpoint_text IS NOT NULL 
  AND checkpoint_text != ''
GROUP BY user_id, passage_id, paragraph, attempt_number, category, checkpoint_text, created_at::date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, created_at::date DESC;

-- ============================================
-- 2단계: 중복된 체크포인트 삭제
-- ============================================
-- 위 쿼리로 확인한 후, 아래 쿼리를 실행하세요
-- 같은 user_id, passage_id, paragraph, attempt_number, category, checkpoint_text, created_at 날짜를 가진 레코드 중
-- 가장 오래된 것(id가 가장 작은 것) 하나만 남기고 나머지 삭제

DELETE FROM student_checkpoint_record
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY 
          user_id, 
          passage_id, 
          paragraph, 
          attempt_number, 
          COALESCE(category, ''), -- category가 NULL일 수도 있으므로 COALESCE 사용
          checkpoint_text, 
          created_at::date
        ORDER BY id ASC
      ) as row_num
    FROM student_checkpoint_record
    WHERE checkpoint_text IS NOT NULL 
      AND checkpoint_text != ''
  ) AS ranked
  WHERE row_num > 1
);

-- ============================================
-- 3단계: 삭제 후 확인
-- ============================================
-- 삭제 후 다시 중복이 있는지 확인하세요
SELECT 
  user_id,
  passage_id,
  paragraph,
  attempt_number,
  category,
  checkpoint_text,
  created_at::date as date,
  COUNT(*) as remaining_count
FROM student_checkpoint_record
WHERE checkpoint_text IS NOT NULL 
  AND checkpoint_text != ''
GROUP BY user_id, passage_id, paragraph, attempt_number, category, checkpoint_text, created_at::date
HAVING COUNT(*) > 1
ORDER BY remaining_count DESC;
