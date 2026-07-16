-- =====================================================================
-- Migration 022: Backfill employee_skills_data for already-registered
-- users, and default new unmatched employees to the 'Training' category
-- =====================================================================

-- 1. For every already-registered user (registered before employee_skills_data
--    existed, so the on-insert sync trigger never ran for them):
--      - If their employee_id already has a row (from the Excel import),
--        just mark it 'registered' — keep its existing category as-is.
--      - If their employee_id has no row at all, create one now with the
--        default individual_category of 'Training'.
DO $$
DECLARE
  user_rec RECORD;
BEGIN
  FOR user_rec IN
    SELECT id, employee_id
    FROM public.users
    WHERE employee_id IS NOT NULL AND trim(employee_id) <> ''
  LOOP
    UPDATE public.employee_skills_data
    SET status = 'registered', updated_at = timezone('utc'::text, now())
    WHERE employee_id = user_rec.employee_id;

    IF NOT FOUND THEN
      INSERT INTO public.employee_skills_data (employee_id, individual_category, status)
      VALUES (user_rec.employee_id, 'Training', 'registered')
      ON CONFLICT (employee_id) DO UPDATE
        SET status = 'registered', updated_at = timezone('utc'::text, now());
    END IF;
  END LOOP;
END $$;

-- 2. Going forward, a brand-new employee (not in the original roster) should
--    default to 'Training' too, for consistency with the backfill above.
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
    INSERT INTO public.employee_skills_data (employee_id, individual_category, status)
    VALUES (NEW.employee_id, 'Training', 'registered')
    ON CONFLICT (employee_id) DO UPDATE
      SET status = 'registered', updated_at = timezone('utc'::text, now());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
