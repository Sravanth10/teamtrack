-- =====================================================================
-- Migration 019: Add logo_url column to labs table
-- =====================================================================

ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS logo_url text NULL;
