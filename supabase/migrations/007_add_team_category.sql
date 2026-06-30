-- Alter public.teams: add category column with default 'general'
alter table public.teams add column if not exists category text default 'general';
