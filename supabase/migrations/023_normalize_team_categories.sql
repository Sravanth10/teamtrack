-- =====================================================================
-- Migration 023: Reset all team categories to the default option
-- =====================================================================
-- The team category field moved from free text to a fixed 6-option dropdown
-- (General (Internal) / Paid / Prototype / GTM (CoS) / Staff / Assignment) in
-- the app. Rather than guess a mapping for existing free-text values, every
-- team is reset to the default 'general' category here — an admin/supervisor
-- then reassigns each team to its correct category manually via the new
-- dropdown in the Edit Team modal.

UPDATE public.teams
SET category = 'general';
