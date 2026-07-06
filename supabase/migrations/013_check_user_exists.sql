-- =====================================================================
-- Migration 013: Add check_user_exists security definer RPC function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_user_exists(p_email text, p_employee_id text)
RETURNS TABLE (email_exists boolean, employee_id_exists boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(p_email)) AS email_exists,
    EXISTS (SELECT 1 FROM public.users WHERE employee_id = p_employee_id) AS employee_id_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_user_exists(text, text) TO anon, authenticated;
