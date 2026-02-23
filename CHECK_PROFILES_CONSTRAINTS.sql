-- ============================================
-- CHECK PROFILES TABLE CONSTRAINTS
-- ============================================

-- Check all constraints on profiles table
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE 
    WHEN con.contype = 'p' THEN 'PRIMARY KEY'
    WHEN con.contype = 'f' THEN 'FOREIGN KEY'
    WHEN con.contype = 'u' THEN 'UNIQUE'
    WHEN con.contype = 'c' THEN 'CHECK'
    ELSE con.contype::text
  END AS type_description,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles';

-- Check if email column has unique constraint
SELECT 
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null
FROM pg_attribute a
WHERE a.attrelid = 'profiles'::regclass
AND a.attnum > 0
AND NOT a.attisdropped
AND a.attname IN ('id', 'email', 'full_name', 'mobile', 'role', 'approval_status')
ORDER BY a.attnum;

-- Check unique indexes
SELECT
  i.relname as index_name,
  ix.indisunique as is_unique,
  a.attname as column_name
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'profiles'
AND ix.indisunique = true;
