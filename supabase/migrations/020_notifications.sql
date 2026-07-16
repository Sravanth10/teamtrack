-- =====================================================================
-- Migration 020: Progress-tracking notifications (missed day alerts)
-- =====================================================================

-- 1. Supervisor-granted flag controlling whether a Lead Admin gets the
--    notifications feature at all (members always have it implicitly).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notifications_access boolean DEFAULT false;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id    uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type            text CHECK (type IN ('missed_progress_self', 'missed_progress_admin')) NOT NULL,
  related_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  related_date    date NOT NULL,
  message         text NOT NULL,
  is_read         boolean DEFAULT false NOT NULL,
  created_at      timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (recipient_id, type, related_user_id, related_date)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications as read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to notifications" ON public.notifications;
CREATE POLICY "Admins have full access to notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Lazily backfills "missed progress" notifications. Called client-side
--    on-demand (there is no scheduled job / pg_cron in this project) whenever
--    any authenticated user loads the app. Idempotent: each member's scan
--    resumes from the day after their last generated notification, so repeat
--    calls are cheap once the initial backfill has run.
CREATE OR REPLACE FUNCTION public.generate_missed_progress_notifications()
RETURNS void AS $$
DECLARE
  member_rec RECORD;
  admin_rec RECORD;
  check_date date;
  loop_start date;
  loop_end date := (CURRENT_DATE - INTERVAL '1 day')::date;
  earliest_allowed date := (CURRENT_DATE - INTERVAL '90 days')::date;
  has_activity boolean;
  has_leave boolean;
  is_weekend boolean;
  last_notified date;
  lab_ids uuid[];
BEGIN
  FOR member_rec IN
    SELECT id, name, email, created_at::date AS created_date
    FROM public.users
    WHERE role = 'member' AND approved_status = 'approved'
  LOOP
    SELECT MAX(related_date) INTO last_notified
    FROM public.notifications
    WHERE recipient_id = member_rec.id AND type = 'missed_progress_self';

    loop_start := COALESCE(last_notified + 1, member_rec.created_date + 1);
    IF loop_start < earliest_allowed THEN
      loop_start := earliest_allowed;
    END IF;

    check_date := loop_start;
    WHILE check_date <= loop_end LOOP
      is_weekend := EXTRACT(DOW FROM check_date) IN (0, 6);

      IF NOT is_weekend THEN
        -- Any leave applied that day (Leave / WFO Exception / Holiday) exempts it
        SELECT EXISTS (
          SELECT 1 FROM public.tasks
          WHERE created_by = member_rec.id
            AND title = 'Leave'
            AND created_at::date = check_date
        ) INTO has_leave;

        IF NOT has_leave THEN
          -- Any task or progress-note activity across ANY of the member's teams that day
          SELECT (
            EXISTS (
              SELECT 1 FROM public.tasks
              WHERE created_by = member_rec.id
                AND title <> 'Leave'
                AND created_at::date = check_date
            ) OR EXISTS (
              SELECT 1 FROM public.task_updates
              WHERE user_id = member_rec.id
                AND created_at::date = check_date
            )
          ) INTO has_activity;

          IF NOT has_activity THEN
            INSERT INTO public.notifications (recipient_id, type, related_user_id, related_date, message)
            VALUES (
              member_rec.id,
              'missed_progress_self',
              member_rec.id,
              check_date,
              'You did not log any task activity or progress notes on ' || to_char(check_date, 'FMMonth FMDD, YYYY') || '.'
            )
            ON CONFLICT (recipient_id, type, related_user_id, related_date) DO NOTHING;

            SELECT ARRAY_AGG(DISTINCT t.lab_id) INTO lab_ids
            FROM public.team_members tm
            JOIN public.teams t ON t.id = tm.team_id
            WHERE tm.user_id = member_rec.id AND t.lab_id IS NOT NULL;

            IF lab_ids IS NOT NULL THEN
              FOR admin_rec IN
                SELECT DISTINCT u.id
                FROM public.lab_admins la
                JOIN public.users u ON u.id = la.user_id
                WHERE la.lab_id = ANY(lab_ids)
                  AND u.notifications_access = true
              LOOP
                INSERT INTO public.notifications (recipient_id, type, related_user_id, related_date, message)
                VALUES (
                  admin_rec.id,
                  'missed_progress_admin',
                  member_rec.id,
                  check_date,
                  COALESCE(member_rec.name, member_rec.email) || ' did not log any progress on ' || to_char(check_date, 'FMMonth FMDD, YYYY') || '.'
                )
                ON CONFLICT (recipient_id, type, related_user_id, related_date) DO NOTHING;
              END LOOP;
            END IF;
          END IF;
        END IF;
      END IF;

      check_date := check_date + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_missed_progress_notifications() TO authenticated;
