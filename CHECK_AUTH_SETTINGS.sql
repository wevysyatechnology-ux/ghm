-- ============================================
-- CHECK SUPABASE AUTH SETTINGS
-- ============================================

-- Check recent auth audit logs for signup errors
SELECT 
  id,
  created_at,
  ip_address,
  (payload->>'action')::text as action,
  (payload->>'error')::text as error_message,
  (payload->>'email')::text as email
FROM auth.audit_log_entries
WHERE payload->>'action' IN ('user_signedup', 'user_signup_failed')
ORDER BY created_at DESC
LIMIT 20;

-- Check all recent auth events
SELECT 
  created_at,
  payload->>'action' as action,
  payload
FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 10;
