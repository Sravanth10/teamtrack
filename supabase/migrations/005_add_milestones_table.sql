-- Create milestones table
create table if not exists public.milestones (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  task_update_id uuid references public.task_updates(id) on delete cascade unique,
  milestone_description text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.milestones enable row level security;

-- Admins full access policy
create policy "Admins have full access to milestones" on public.milestones
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
