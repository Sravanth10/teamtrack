-- =====================================================================
-- Migration 015: Add skill_level column and enforce business rules
-- =====================================================================

-- 1. Add skill_level column with constraints
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'foundation' 
  CHECK (skill_level IN ('foundation', 'intermediate', 'advanced', 'management'));

-- 2. Update existing users according to their role
UPDATE public.users 
  SET skill_level = 'management' 
  WHERE role = 'supervisor';

UPDATE public.users 
  SET skill_level = 'foundation' 
  WHERE role IN ('admin', 'member') AND (skill_level IS NULL OR skill_level = 'management');

-- 3. Create a trigger to enforce skill_level automatically
CREATE OR REPLACE FUNCTION public.enforce_user_skill_level()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'supervisor' THEN
    NEW.skill_level := 'management';
  ELSE
    -- If new user OR if skill level is set to management or is null for admin/member
    IF NEW.skill_level IS NULL OR NEW.skill_level = 'management' THEN
      NEW.skill_level := 'foundation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_user_skill_level ON public.users;
CREATE TRIGGER trg_enforce_user_skill_level
  BEFORE INSERT OR UPDATE OF role, skill_level
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_skill_level();
