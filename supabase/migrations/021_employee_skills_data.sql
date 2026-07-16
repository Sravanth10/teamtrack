-- =====================================================================
-- Migration 021: Employee Skills Data table, soft-linked to users on
-- employee_id (imported from Employee_Skills_Data_Cleaned.xlsx)
-- =====================================================================
-- This is a "soft" link, not a hard foreign key: many employee_ids in the
-- source roster belong to people who have not registered in TeamTrack yet,
-- so a strict FK would reject importing those rows. employee_id is instead
-- a unique, indexed column meant to be JOINed against users.employee_id,
-- with a `status` column tracking whether a matching user account exists.

-- 1. Table
CREATE TABLE IF NOT EXISTS public.employee_skills_data (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id          text NOT NULL UNIQUE,
  skill_level          text,
  individual_category  text,
  sub_team             text,
  status               text CHECK (status IN ('registered', 'allocated')) NOT NULL DEFAULT 'allocated',
  created_at           timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at           timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employee_skills_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to employee_skills_data" ON public.employee_skills_data;
CREATE POLICY "Admins have full access to employee_skills_data"
  ON public.employee_skills_data FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view their own employee skills data" ON public.employee_skills_data;
CREATE POLICY "Users can view their own employee skills data"
  ON public.employee_skills_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.employee_id = employee_skills_data.employee_id
    )
  );

-- 2. Keep employee_skills_data in sync whenever a new user registers:
--    - If their employee_id already has an "allocated" (pre-existing, unregistered)
--      row here, flip it to "registered".
--    - If their employee_id has no row at all (a completely new employee not in
--      the original roster), create one now, marked "registered".
CREATE OR REPLACE FUNCTION public.sync_employee_skills_data()
RETURNS trigger AS $$
BEGIN
  IF NEW.employee_id IS NULL OR trim(NEW.employee_id) = '' THEN
    RETURN NEW;
  END IF;

  UPDATE public.employee_skills_data
  SET status = 'registered', updated_at = timezone('utc'::text, now())
  WHERE employee_id = NEW.employee_id;

  IF NOT FOUND THEN
    INSERT INTO public.employee_skills_data (employee_id, status)
    VALUES (NEW.employee_id, 'registered')
    ON CONFLICT (employee_id) DO UPDATE
      SET status = 'registered', updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_insert_sync_employee_skills ON public.users;
CREATE TRIGGER on_user_insert_sync_employee_skills
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.sync_employee_skills_data();

-- 3. Seed data (the 75-row import from Employee_Skills_Data_Cleaned.xlsx) is
--    intentionally NOT included in this file — it contains real employee IDs
--    and is run locally against Supabase directly, never committed to git.
