-- ============================================
-- QR ATTENDANCE - DATABASE SCHEMA
-- Phase 3: Database Design
-- ============================================


-- ============================================
-- 1. PROFILES
-- ============================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'student'
             check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================
-- 2. EVENTS
-- ============================================

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  event_code  text not null unique,
  title       text not null,
  start_time  timestamptz,
  end_time    timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);


-- ============================================
-- 3. ATTENDANCE
-- ============================================

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references auth.users (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  scanned_at  timestamptz not null default now(),

  -- Prevent duplicate attendance
  unique (student_id, event_id)
);


-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;


-- ============================================
-- 5. REMOVE OLD POLICIES
-- This makes the script safe to run again.
-- ============================================

drop policy if exists "Profiles are viewable by owner"
on public.profiles;

drop policy if exists "Users can insert their own profile"
on public.profiles;

drop policy if exists "Users can update their own profile"
on public.profiles;

drop policy if exists "Teachers can view profiles of their attendees"
on public.profiles;


drop policy if exists "Events are readable by any authenticated user"
on public.events;

drop policy if exists "Users can insert events"
on public.events;

drop policy if exists "Users can update their own events"
on public.events;


drop policy if exists "Students can view their own attendance"
on public.attendance;

drop policy if exists "Students can insert their own attendance"
on public.attendance;

drop policy if exists "Teachers can view attendance for their events"
on public.attendance;


-- ============================================
-- 6. PROFILES POLICIES
-- ============================================

-- Users can view their own profile
create policy "Profiles are viewable by owner"
on public.profiles
for select
using (auth.uid() = id);


-- Users can create their own profile
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);


-- Users can update their own profile
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);


-- Teachers can view profiles of students
-- who attended their events
create policy "Teachers can view profiles of their attendees"
on public.profiles
for select
using (
  exists (
    select 1
    from public.attendance a
    join public.events e
      on e.id = a.event_id
    where a.student_id = profiles.id
      and e.created_by = auth.uid()
  )
);


-- ============================================
-- 7. EVENTS POLICIES
-- ============================================

-- Any logged-in user can read events
create policy "Events are readable by any authenticated user"
on public.events
for select
using (auth.uid() is not null);


-- Any logged-in user can create an event
-- and created_by must be their own user ID
create policy "Users can insert events"
on public.events
for insert
with check (auth.uid() = created_by);


-- Users can update events they created
create policy "Users can update their own events"
on public.events
for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);


-- ============================================
-- 8. ATTENDANCE POLICIES
-- ============================================

-- Students can view their own attendance
create policy "Students can view their own attendance"
on public.attendance
for select
using (auth.uid() = student_id);


-- Students can insert attendance for themselves
create policy "Students can insert their own attendance"
on public.attendance
for insert
with check (auth.uid() = student_id);


-- Teachers can view attendance
-- for events they created
create policy "Teachers can view attendance for their events"
on public.attendance
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);


-- ============================================
-- 9. AUTOMATIC PROFILE CREATION
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.profiles (id, email)
  values (new.id, new.email);

  return new;

end;
$$;


-- ============================================
-- 10. USER SIGNUP TRIGGER
-- ============================================

drop trigger if exists on_auth_user_created
on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();


-- ============================================
-- DATABASE COMPLETE
-- ============================================
