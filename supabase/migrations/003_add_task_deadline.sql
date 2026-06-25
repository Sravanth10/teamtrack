-- Add deadline column to public.tasks (safe for existing rows)
alter table public.tasks add column if not exists deadline timestamp with time zone;
