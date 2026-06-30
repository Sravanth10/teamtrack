-- Alter public.users: add phone_number, drop tcs_joining_date and tcs_experience
alter table public.users add column if not exists phone_number text;
alter table public.users drop column if exists tcs_joining_date;
alter table public.users drop column if exists tcs_experience;

-- Update the new user creation handler trigger function
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first_user boolean;
  default_role text;
  default_status text;
begin
  -- Check if this is the first user registering, if so make them admin and approved, otherwise member and pending
  select not exists (select 1 from public.users) into is_first_user;
  if is_first_user then
    default_role := 'admin';
    default_status := 'approved';
  else
    default_role := 'member';
    default_status := 'pending';
  end if;

  insert into public.users (
    id, 
    email, 
    name, 
    role, 
    skills, 
    totp_secret, 
    approved_status,
    rapid_joining_date,
    work_location,
    employee_id,
    rapid_experience,
    phone_number
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', default_role),
    coalesce(string_to_array(new.raw_user_meta_data->>'skills', ','), '{}'),
    (new.raw_user_meta_data->>'totp_secret')::text,
    default_status,
    (new.raw_user_meta_data->>'rapid_joining_date')::date,
    (new.raw_user_meta_data->>'work_location')::text,
    (new.raw_user_meta_data->>'employee_id')::text,
    (new.raw_user_meta_data->>'rapid_experience')::text,
    (new.raw_user_meta_data->>'phone_number')::text
  );

  -- Link newly registered user's ID to any pending team invites matching their email
  update public.team_members
  set user_id = new.id
  where lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer;
