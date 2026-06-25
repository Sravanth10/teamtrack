-- 1. Enable pgcrypto extension for cryptographically secure HMAC calculations
create extension if not exists "pgcrypto";

-- 2. Add experience, skills, and totp_secret as nullable columns to public.users (safe for existing rows)
alter table public.users add column if not exists experience text;
alter table public.users add column if not exists skills text[] default '{}';
alter table public.users add column if not exists totp_secret text;

-- 3. Add approved_status defaulting to 'approved' (so existing users are auto-approved)
alter table public.users add column if not exists approved_status text check (approved_status in ('pending', 'approved', 'rejected')) default 'approved' not null;

-- 4. Change default for future signups to 'pending'
alter table public.users alter column approved_status set default 'pending';

-- 5. Update user trigger to handle metadata parameters from signup and auto-approval details
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

  insert into public.users (id, email, name, role, experience, skills, totp_secret, approved_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', default_role),
    (new.raw_user_meta_data->>'experience')::text,
    coalesce(string_to_array(new.raw_user_meta_data->>'skills', ','), '{}'),
    (new.raw_user_meta_data->>'totp_secret')::text,
    default_status
  );

  -- Link newly registered user's ID to any pending team invites matching their email
  update public.team_members
  set user_id = new.id
  where lower(email) = lower(new.email);

  return new;
end;
$$ language plpgsql security definer;

-- 6. Helper function to calculate a 6-digit TOTP code inside the database (RFC 6238/4226)
create or replace function public.calculate_totp(key bytea, time_step bigint) 
returns text as $$ 
declare 
    c bytea;
    mac bytea;
    trunc_offset int;
    bin_code int;
    otp_code int;
begin 
    -- Convert time_step to an 8-byte big-endian bytea
    c := decode(lpad(to_hex(time_step), 16, '0'), 'hex');
    -- Calculate HMAC-SHA1
    mac := hmac(c, key, 'sha1');
    -- Dynamic Truncation
    trunc_offset := get_byte(mac, 19) & 15;
    bin_code := ((get_byte(mac, trunc_offset) & 127) << 24) | 
                ((get_byte(mac, trunc_offset + 1) & 255) << 16) | 
                ((get_byte(mac, trunc_offset + 2) & 255) << 8) | 
                ((get_byte(mac, trunc_offset + 3) & 255));
    otp_code := bin_code % 1000000;
    return lpad(otp_code::text, 6, '0');
end; 
$$ language plpgsql;

-- 7. Main function to verify a TOTP code securely on the server
create or replace function public.verify_totp_code(user_uuid uuid, code text)
returns boolean as $$
declare
  user_totp_secret text;
  current_epoch bigint;
  time_step bigint;
  i integer;
  calculated_code text;
  secret_bytes bytea;
begin
  -- Get the user's hex TOTP secret from users table
  select totp_secret into user_totp_secret
  from public.users
  where id = user_uuid;

  if user_totp_secret is null then
    return false;
  end if;

  -- Decode hex string to raw bytes
  secret_bytes := decode(user_totp_secret, 'hex');
  current_epoch := floor(extract(epoch from now()))::bigint;

  -- Check current time, 30s before, and 30s after to allow for clock drift
  for i in -1..1 loop
    time_step := (current_epoch / 30) + i;
    calculated_code := public.calculate_totp(secret_bytes, time_step);
    if calculated_code = code then
      return true;
    end if;
  end loop;

  return false;
end;
$$ language plpgsql security definer;
