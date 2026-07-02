-- =====================================================================
-- Migration 010: Add Labs table, Supervisor role, and multi-lab support
-- =====================================================================

-- 1. Extend users.role CHECK to include 'supervisor'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'member', 'supervisor'));

-- 2. Create labs table
CREATE TABLE IF NOT EXISTS public.labs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

-- 3. Create lab_admins join table (which admin manages which lab)
CREATE TABLE IF NOT EXISTS public.lab_admins (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id  uuid REFERENCES public.labs(id)  ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(lab_id, user_id)
);
ALTER TABLE public.lab_admins ENABLE ROW LEVEL SECURITY;

-- 4. Add lab_id to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS lab_id uuid REFERENCES public.labs(id) ON DELETE SET NULL;

-- 5. Seed Lab 2 and assign all existing teams to it
DO $$
DECLARE
  lab2_id uuid;
BEGIN
  INSERT INTO public.labs (name, description)
  VALUES ('Lab 2', 'Original TeamTrack workspace')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO lab2_id FROM public.labs WHERE name = 'Lab 2';

  UPDATE public.teams SET lab_id = lab2_id WHERE lab_id IS NULL;
END $$;

-- 6. Promote akila.hr.demo@gmail.com to supervisor
UPDATE public.users
SET role = 'supervisor'
WHERE email = 'akila.hr.demo@gmail.com';

-- 7. Update is_admin() to include supervisors
--    (This makes all existing RLS policies automatically grant supervisors full access)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role IN ('admin', 'supervisor') FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create is_supervisor() helper function
CREATE OR REPLACE FUNCTION public.is_supervisor() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'supervisor' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS policies for labs
CREATE POLICY "Supervisors have full access to labs"
  ON public.labs FOR ALL
  USING (is_supervisor())
  WITH CHECK (is_supervisor());

CREATE POLICY "Admins can view their assigned labs"
  ON public.labs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_admins
      WHERE lab_admins.lab_id = labs.id
        AND lab_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view labs of their teams"
  ON public.labs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      JOIN public.team_members ON team_members.team_id = teams.id
      WHERE teams.lab_id = labs.id
        AND team_members.user_id = auth.uid()
    )
  );

-- 10. RLS policies for lab_admins
CREATE POLICY "Supervisors have full access to lab_admins"
  ON public.lab_admins FOR ALL
  USING (is_supervisor())
  WITH CHECK (is_supervisor());

CREATE POLICY "Admins can view their own lab assignments"
  ON public.lab_admins FOR SELECT
  USING (user_id = auth.uid());
