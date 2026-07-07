-- =====================================================================
-- Migration 017: Add supervisor-only fields to teams table
-- =====================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS received_date date NULL,
  ADD COLUMN IF NOT EXISTS customer text NULL,
  ADD COLUMN IF NOT EXISTS bg_market text NULL,
  ADD COLUMN IF NOT EXISTS stage text NULL;
