-- Luvora Serverless Database Schema for Supabase
-- Paste and run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/fkvfwfmytwtykxwfoytx/sql

-- 1. Enable UUID and cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('owner', 'customer', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Owner / Admin Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  user_id text PRIMARY KEY,
  role text DEFAULT 'owner',
  profile jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  rooms jsonb DEFAULT '[]'::jsonb,
  rent_records jsonb DEFAULT '{}'::jsonb,
  deposits jsonb DEFAULT '{}'::jsonb,
  transactions jsonb DEFAULT '[]'::jsonb,
  notifications jsonb DEFAULT '[]'::jsonb,
  staff jsonb DEFAULT '[]'::jsonb,
  initialized boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 4. Customer / Tenant Workspaces Table
CREATE TABLE IF NOT EXISTS public.customer_workspaces (
  user_id text PRIMARY KEY,
  workspace_data jsonb DEFAULT '{}'::jsonb,
  initialized boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_workspaces ENABLE ROW LEVEL SECURITY;

-- 6. Grant Table Privileges to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.workspaces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customer_workspaces TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 7. RLS Policies (Allow full access to manage records)
DROP POLICY IF EXISTS "Public access user_roles" ON public.user_roles;
CREATE POLICY "Public access user_roles" ON public.user_roles
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access workspaces" ON public.workspaces;
CREATE POLICY "Public access workspaces" ON public.workspaces
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access customer_workspaces" ON public.customer_workspaces;
CREATE POLICY "Public access customer_workspaces" ON public.customer_workspaces
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_workspaces;
