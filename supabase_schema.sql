-- Luvora database schema: tables, row level security, and database-owned role assignment.
-- Idempotent: safe to run against an existing project.

create extension if not exists "uuid-ossp";

-- 1. Tables
create table if not exists public.user_roles (
  user_id text primary key,
  role text not null check (role in ('owner', 'customer', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workspaces (
  user_id text primary key,
  role text default 'owner',
  profile jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,
  rooms jsonb default '[]'::jsonb,
  rent_records jsonb default '{}'::jsonb,
  deposits jsonb default '{}'::jsonb,
  transactions jsonb default '[]'::jsonb,
  notifications jsonb default '[]'::jsonb,
  staff jsonb default '[]'::jsonb,
  initialized boolean default true,
  updated_at timestamptz default now()
);

create table if not exists public.customer_workspaces (
  user_id text primary key,
  workspace_data jsonb default '{}'::jsonb,
  initialized boolean default true,
  updated_at timestamptz default now()
);

-- 2. Row level security
alter table public.user_roles enable row level security;
alter table public.workspaces enable row level security;
alter table public.customer_workspaces enable row level security;

-- 3. Remove any legacy policies, including old permissive "Public access" ones
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('user_roles', 'workspaces', 'customer_workspaces')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4. Privileges: deny anonymous access, grant only what the app needs
revoke all on table public.user_roles from public, anon, authenticated;
revoke all on table public.workspaces from public, anon, authenticated;
revoke all on table public.customer_workspaces from public, anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select on table public.user_roles to authenticated;
grant select, insert, update on table public.workspaces to authenticated;
grant select, insert, update on table public.customer_workspaces to authenticated;
grant all on table public.user_roles, public.workspaces, public.customer_workspaces to service_role;

-- 5. Private helpers
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select role from public.user_roles where user_id = (select auth.uid()::text)
$$;
revoke all on function private.current_user_role() from public, anon, authenticated;
grant execute on function private.current_user_role() to authenticated;

-- 6. Per-user policies
create policy "Users read own role" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()::text));

create policy "Owners read own workspace" on public.workspaces
  for select to authenticated
  using (user_id = (select auth.uid()::text) and (select private.current_user_role()) in ('owner', 'admin'));
create policy "Owners insert own workspace" on public.workspaces
  for insert to authenticated
  with check (user_id = (select auth.uid()::text) and (select private.current_user_role()) in ('owner', 'admin'));
create policy "Owners update own workspace" on public.workspaces
  for update to authenticated
  using (user_id = (select auth.uid()::text) and (select private.current_user_role()) in ('owner', 'admin'))
  with check (user_id = (select auth.uid()::text) and (select private.current_user_role()) in ('owner', 'admin'));

create policy "Customers read own workspace" on public.customer_workspaces
  for select to authenticated
  using (user_id = (select auth.uid()::text) and (select private.current_user_role()) = 'customer');
create policy "Customers insert own workspace" on public.customer_workspaces
  for insert to authenticated
  with check (user_id = (select auth.uid()::text) and (select private.current_user_role()) = 'customer');
create policy "Customers update own workspace" on public.customer_workspaces
  for update to authenticated
  using (user_id = (select auth.uid()::text) and (select private.current_user_role()) = 'customer')
  with check (user_id = (select auth.uid()::text) and (select private.current_user_role()) = 'customer');

-- 7. Database-owned role assignment on signup
create or replace function private.assign_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  assigned_role := case when new.raw_user_meta_data ->> 'role' = 'customer' then 'customer' else 'owner' end;
  insert into public.user_roles (user_id, role)
  values (new.id::text, assigned_role)
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function private.assign_user_role() from public, anon, authenticated;

drop trigger if exists assign_user_role_after_signup on auth.users;
create trigger assign_user_role_after_signup
  after insert on auth.users
  for each row execute function private.assign_user_role();

-- 8. Backfill roles for pre-existing users
insert into public.user_roles (user_id, role)
select
  u.id::text,
  case
    when u.raw_user_meta_data ->> 'role' = 'customer'
      or exists (select 1 from public.customer_workspaces cw where cw.user_id = u.id::text)
      then 'customer'
    else 'owner'
  end
from auth.users u
on conflict (user_id) do nothing;

-- 9. Realtime replication (respects RLS)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'workspaces'
  ) then
    alter publication supabase_realtime add table public.workspaces;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_workspaces'
  ) then
    alter publication supabase_realtime add table public.customer_workspaces;
  end if;
end $$;
