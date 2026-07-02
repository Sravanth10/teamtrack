-- =====================================================================
-- Migration 012: Add Sticky Notes table for Track Pad feature
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sticky_notes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id     uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  content     text NOT NULL,
  note_type   text CHECK (note_type IN ('informational', 'action items', 'dependencies')) NOT NULL,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Team members and admins can view sticky notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Admins and supervisors can manage sticky notes" ON public.sticky_notes;

-- 1. SELECT Policy (visible to team members and admins/supervisors)
CREATE POLICY "Team members and admins can view sticky notes"
  ON public.sticky_notes FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = sticky_notes.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- 2. ALL Policy (insert/update/delete restricted to admins/supervisors)
CREATE POLICY "Admins and supervisors can manage sticky notes"
  ON public.sticky_notes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
