-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create public.users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text,
  role text check (role in ('admin', 'member')) default 'member' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create public.teams table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create public.team_members table
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade, -- Nullable to allow pre-invitation
  email text not null, -- Stores the invited email directly
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, email) -- Ensures an email is only added once per team
);

-- 4. Create public.tasks table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  title text not null,
  description text,
  status text check (status in ('To Do', 'In Progress', 'Done', 'Blocked')) default 'To Do' not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create public.task_updates table
create table public.task_updates (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  note text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_updates enable row level security;

-- Helper functions for RLS checks (using security definer to run with owner privileges and bypass RLS nested checks)
create or replace function public.is_admin()
returns boolean as $$
begin
  return coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_team_member(team_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.team_members
    where team_members.team_id = is_team_member.team_id
    and team_members.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- RLS Policies

-- USERS Policies
create policy "Admins have full access to users" on public.users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can view all profiles" on public.users
  for select to authenticated
  using (true);

create policy "Users can update own profile" on public.users
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- TEAMS Policies
create policy "Admins have full access to teams" on public.teams
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Members can view their teams" on public.teams
  for select to authenticated
  using (public.is_team_member(id));

-- TEAM_MEMBERS Policies
create policy "Admins have full access to team_members" on public.team_members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Members can view team members of their team" on public.team_members
  for select to authenticated
  using (public.is_team_member(team_id));

-- TASKS Policies
create policy "Admins have full access to tasks" on public.tasks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Members can view tasks in their team" on public.tasks
  for select to authenticated
  using (public.is_team_member(team_id));

create policy "Members can insert tasks in their team" on public.tasks
  for insert to authenticated
  with check (public.is_team_member(team_id));

create policy "Members can update tasks in their team" on public.tasks
  for update to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));

create policy "Members can delete tasks in their team" on public.tasks
  for delete to authenticated
  using (public.is_team_member(team_id));

-- TASK_UPDATES Policies
create policy "Admins have full access to task updates" on public.task_updates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Members can view updates of tasks in their team" on public.task_updates
  for select to authenticated
  using (exists (
    select 1 from public.tasks
    where tasks.id = task_updates.task_id
    and public.is_team_member(tasks.team_id)
  ));

create policy "Members can insert updates for tasks in their team" on public.task_updates
  for insert to authenticated
  with check (exists (
    select 1 from public.tasks
    where tasks.id = task_updates.task_id
    and public.is_team_member(tasks.team_id)
  ));

-- AUTOMATED TRIGGER FOR USER CREATION ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  default_role text;
begin
  -- Check if this is the first user registering, if so make them admin, otherwise member
  select not exists (select 1 from public.users) into is_first_user;
  if is_first_user then
    default_role := 'admin';
  else
    default_role := 'member';
  end if;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', default_role)
  );

  -- Link newly registered user's ID to any pending team invites matching their email
  update public.team_members
  set user_id = new.id
  where lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
