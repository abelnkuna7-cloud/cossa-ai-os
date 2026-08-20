-- RLS policies call public membership helpers, which safely delegate to
-- SECURITY DEFINER helpers in the non-exposed private schema. Authenticated
-- users need schema USAGE for that internal call chain; no table or function
-- access is granted here.

GRANT USAGE ON SCHEMA private TO authenticated;
