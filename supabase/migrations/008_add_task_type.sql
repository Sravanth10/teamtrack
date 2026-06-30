-- Alter public.tasks: add task_type column with default 'exploration/other'
alter table public.tasks add column if not exists task_type text default 'exploration/other';
