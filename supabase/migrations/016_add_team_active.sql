-- =====================================================================
-- Migration 016: Add is_active column to teams table
-- =====================================================================

ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
