-- =====================================================================
-- Migration 014: Rename Lab 1 to swift and Lab 2 to stride
-- =====================================================================

-- Rename existing labs in public.labs table
UPDATE public.labs SET name = 'stride' WHERE name = 'Lab 2';
UPDATE public.labs SET name = 'swift' WHERE name = 'Lab 1';
