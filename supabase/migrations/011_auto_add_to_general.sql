-- Auto Add to General Team Trigger Function
CREATE OR REPLACE FUNCTION public.auto_add_to_general_team()
RETURNS TRIGGER AS $$
DECLARE
  v_lab_id uuid;
  v_general_team_id uuid;
  v_user_email text;
BEGIN
  -- If we're updating, check if user_id was set (transitioned from NULL to a value)
  IF TG_OP = 'UPDATE' AND (NEW.user_id IS NULL OR OLD.user_id IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  -- 1. Find the lab_id of the team being joined
  SELECT lab_id INTO v_lab_id FROM public.teams WHERE id = NEW.team_id;

  -- If team has no lab, or if this team itself is the General team, do nothing
  IF v_lab_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_general_team_id 
  FROM public.teams 
  WHERE lab_id = v_lab_id AND category = 'general'
  LIMIT 1;

  -- If this is already the General team, do nothing
  IF NEW.team_id = v_general_team_id THEN
    RETURN NEW;
  END IF;

  -- If there is no General team in this lab, do nothing
  IF v_general_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user's email if not present in NEW
  IF NEW.email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM public.users WHERE id = NEW.user_id;
  ELSE
    v_user_email := NEW.email;
  END IF;

  -- If email is available, check if the user/email is already in the General team
  IF v_user_email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = v_general_team_id 
      AND (lower(email) = lower(v_user_email) OR user_id = NEW.user_id)
    ) THEN
      -- Auto add to the General team
      INSERT INTO public.team_members (team_id, user_id, email)
      VALUES (v_general_team_id, NEW.user_id, lower(v_user_email));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_team_member_added ON public.team_members;

-- Create trigger for INSERT or UPDATE of user_id
CREATE TRIGGER on_team_member_added
  AFTER INSERT OR UPDATE OF user_id ON public.team_members
  FOR EACH ROW EXECUTE PROCEDURE public.auto_add_to_general_team();
