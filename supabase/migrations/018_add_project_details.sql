-- =====================================================================
-- Migration 018: Add project details columns to teams table
-- =====================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS domain text NULL,
  ADD COLUMN IF NOT EXISTS ai_value_chain text NULL,
  ADD COLUMN IF NOT EXISTS brief text NULL,
  ADD COLUMN IF NOT EXISTS business_need text NULL,
  ADD COLUMN IF NOT EXISTS rapid_build_solution text NULL,
  ADD COLUMN IF NOT EXISTS agents_details text NULL,
  ADD COLUMN IF NOT EXISTS tech_stack text NULL,
  ADD COLUMN IF NOT EXISTS ai_interventions text NULL,
  ADD COLUMN IF NOT EXISTS agents text NULL,
  ADD COLUMN IF NOT EXISTS rapid_builds text NULL;
