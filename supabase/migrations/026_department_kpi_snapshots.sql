-- =====================================================================
-- Migration 026: Department KPI snapshots (Jul-26 onward)
-- =====================================================================
-- Mar-26 through Jun-26 stay as the existing hardcoded constants in
-- SupervisorDashboard.jsx (frontend, unchanged). Starting Jul-26, monthly
-- KPI values are computed from employee_skills_data and stored here so the
-- "Calculate Current KPI" button and the month-end freeze both read/write
-- the same place the UI displays.
--
-- Lifecycle per month_key:
--   live snapshot (is_frozen = false, as_of_date set) -- recalculated on
--   every button click during that calendar month
--     -> frozen snapshot (is_frozen = true, as_of_date = null) -- permanent,
--        never recalculated again.
--
-- There is no cron/scheduled job in this project (confirmed with the user —
-- manual trigger only, no new infra). Freezing a month that has rolled over
-- happens lazily: calculate_department_kpi() always freezes any stale
-- unfrozen row for a past month before touching the current month's column.

CREATE TABLE IF NOT EXISTS public.department_kpi_snapshots (
  id                          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month_key                   text NOT NULL UNIQUE, -- 'YYYY-MM', e.g. '2026-07'
  month_label                 text NOT NULL,          -- 'Jul-26'
  total_department_count      integer NOT NULL DEFAULT 0,
  pct_billability              integer NOT NULL DEFAULT 0,
  pct_gtm                      integer NOT NULL DEFAULT 0,
  pct_core                     integer NOT NULL DEFAULT 0,
  pct_future_ready             integer NOT NULL DEFAULT 0,
  pct_moving_future_ready      integer NOT NULL DEFAULT 0,
  pct_ce                       integer NOT NULL DEFAULT 0,
  is_frozen                   boolean NOT NULL DEFAULT false,
  as_of_date                  date,                    -- set while live, null once frozen
  calculated_at                timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.department_kpi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors have full access to department_kpi_snapshots" ON public.department_kpi_snapshots;
CREATE POLICY "Supervisors have full access to department_kpi_snapshots"
  ON public.department_kpi_snapshots FOR ALL
  TO authenticated
  USING (public.is_supervisor())
  WITH CHECK (public.is_supervisor());

-- Freezes any snapshot whose month has already ended (month_key < the
-- month passed in) and is not yet frozen. Recalculates one final time
-- before freezing, per the "month-end value" requirement.
CREATE OR REPLACE FUNCTION public.freeze_past_kpi_months(current_month_key text)
RETURNS void AS $$
DECLARE
  stale RECORD;
  dept_count integer;
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Only supervisors can freeze department KPIs';
  END IF;

  FOR stale IN
    SELECT month_key FROM public.department_kpi_snapshots
    WHERE is_frozen = false AND month_key < current_month_key
  LOOP
    SELECT GREATEST(COUNT(*) - 1, 0) INTO dept_count FROM public.employee_skills_data;

    UPDATE public.department_kpi_snapshots
    SET
      total_department_count = dept_count,
      pct_billability = CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Billable') / dept_count
      ) END,
      pct_gtm = CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'GTM') / dept_count
      ) END,
      pct_core = CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Core') / dept_count
      ) END,
      pct_future_ready = CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Future Ready') / dept_count
      ) END,
      pct_moving_future_ready = CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(
        100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Training') / dept_count
      ) END,
      pct_ce = 0,
      is_frozen = true,
      as_of_date = null,
      calculated_at = timezone('utc'::text, now())
    WHERE month_key = stale.month_key;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Computes and upserts the live snapshot for target_month_key (defaults to
-- the current calendar month). Refuses to touch an already-frozen month.
-- Always freezes any older stale live month first.
CREATE OR REPLACE FUNCTION public.calculate_department_kpi(target_month_key text DEFAULT NULL)
RETURNS public.department_kpi_snapshots AS $$
DECLARE
  month_key_val text;
  month_label_val text;
  dept_count integer;
  result public.department_kpi_snapshots;
BEGIN
  IF NOT public.is_supervisor() THEN
    RAISE EXCEPTION 'Only supervisors can calculate department KPIs';
  END IF;

  month_key_val := COALESCE(target_month_key, to_char(timezone('utc', now()), 'YYYY-MM'));
  month_label_val := to_char(to_date(month_key_val || '-01', 'YYYY-MM-DD'), 'Mon-YY');

  PERFORM public.freeze_past_kpi_months(month_key_val);

  IF EXISTS (SELECT 1 FROM public.department_kpi_snapshots WHERE month_key = month_key_val AND is_frozen = true) THEN
    RAISE EXCEPTION 'Month % is already frozen and cannot be recalculated', month_key_val;
  END IF;

  SELECT GREATEST(COUNT(*) - 1, 0) INTO dept_count FROM public.employee_skills_data;

  INSERT INTO public.department_kpi_snapshots (
    month_key, month_label, total_department_count,
    pct_billability, pct_gtm, pct_core, pct_future_ready, pct_moving_future_ready, pct_ce,
    is_frozen, as_of_date, calculated_at
  )
  VALUES (
    month_key_val, month_label_val, dept_count,
    CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Billable') / dept_count) END,
    CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'GTM') / dept_count) END,
    CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Core') / dept_count) END,
    CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Future Ready') / dept_count) END,
    CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Training') / dept_count) END,
    0,
    false, (timezone('utc', now()))::date, timezone('utc'::text, now())
  )
  ON CONFLICT (month_key) DO UPDATE SET
    total_department_count = EXCLUDED.total_department_count,
    pct_billability = EXCLUDED.pct_billability,
    pct_gtm = EXCLUDED.pct_gtm,
    pct_core = EXCLUDED.pct_core,
    pct_future_ready = EXCLUDED.pct_future_ready,
    pct_moving_future_ready = EXCLUDED.pct_moving_future_ready,
    pct_ce = EXCLUDED.pct_ce,
    as_of_date = EXCLUDED.as_of_date,
    calculated_at = EXCLUDED.calculated_at
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- One-time back-fill: Jul-26 is already a completed month, so compute it
-- now from current employee_skills_data and freeze it immediately (no live
-- "as of" state for it, ever).
DO $$
DECLARE
  dept_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.department_kpi_snapshots WHERE month_key = '2026-07') THEN
    SELECT GREATEST(COUNT(*) - 1, 0) INTO dept_count FROM public.employee_skills_data;

    INSERT INTO public.department_kpi_snapshots (
      month_key, month_label, total_department_count,
      pct_billability, pct_gtm, pct_core, pct_future_ready, pct_moving_future_ready, pct_ce,
      is_frozen, as_of_date
    )
    VALUES (
      '2026-07', 'Jul-26', dept_count,
      CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Billable') / dept_count) END,
      CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'GTM') / dept_count) END,
      CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Core') / dept_count) END,
      CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Future Ready') / dept_count) END,
      CASE WHEN dept_count = 0 THEN 0 ELSE ROUND(100.0 * (SELECT COUNT(*) FROM public.employee_skills_data WHERE individual_category ILIKE 'Training') / dept_count) END,
      0,
      true, null
    );
  END IF;
END $$;
