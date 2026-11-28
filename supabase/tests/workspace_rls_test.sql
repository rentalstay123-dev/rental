BEGIN;
SELECT plan(24);

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'owner@example.test', '{"role":"owner"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'customer@example.test', '{"role":"customer"}'::jsonb);

SELECT is(
  (SELECT role FROM public.user_roles WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  'owner',
  'signup trigger assigns owner role'
);
SELECT is(
  (SELECT role FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  'customer',
  'signup trigger assigns customer role'
);

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.user_roles$$, '42501', NULL, 'anon cannot read roles');
SELECT throws_ok($$SELECT * FROM public.workspaces$$, '42501', NULL, 'anon cannot read owner workspaces');
SELECT throws_ok($$SELECT * FROM public.customer_workspaces$$, '42501', NULL, 'anon cannot read customer workspaces');
SELECT throws_ok($$INSERT INTO public.user_roles (user_id, role) VALUES ('33333333-3333-3333-3333-333333333333', 'owner')$$, '42501', NULL, 'anon cannot create roles');
SELECT throws_ok($$INSERT INTO public.workspaces (user_id) VALUES ('33333333-3333-3333-3333-333333333333')$$, '42501', NULL, 'anon cannot create workspaces');
SELECT throws_ok($$INSERT INTO public.customer_workspaces (user_id) VALUES ('33333333-3333-3333-3333-333333333333')$$, '42501', NULL, 'anon cannot create customer workspaces');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT results_eq($$SELECT role FROM public.user_roles WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, ARRAY['owner'::text], 'user reads own role');
SELECT is_empty($$SELECT * FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'$$, 'user cannot read another role');
SELECT results_eq($$INSERT INTO public.workspaces (user_id) VALUES ('11111111-1111-1111-1111-111111111111') RETURNING user_id$$, ARRAY['11111111-1111-1111-1111-111111111111'::text], 'owner creates own workspace');
SELECT throws_ok($$INSERT INTO public.workspaces (user_id) VALUES ('22222222-2222-2222-2222-222222222222')$$, '42501', NULL, 'owner cannot create another workspace');
SELECT throws_ok($$INSERT INTO public.customer_workspaces (user_id) VALUES ('11111111-1111-1111-1111-111111111111')$$, '42501', NULL, 'owner cannot create customer workspace');
SELECT throws_ok($$INSERT INTO public.customer_workspaces (user_id) VALUES ('22222222-2222-2222-2222-222222222222')$$, '42501', NULL, 'owner cannot create another customer workspace');
SELECT throws_ok($$UPDATE public.user_roles SET role = 'customer' WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, '42501', NULL, 'client cannot change role');
SELECT throws_ok($$INSERT INTO public.user_roles (user_id, role) VALUES ('33333333-3333-3333-3333-333333333333', 'owner')$$, '42501', NULL, 'client cannot create roles');

SET LOCAL request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT results_eq($$INSERT INTO public.customer_workspaces (user_id) VALUES ('22222222-2222-2222-2222-222222222222') RETURNING user_id$$, ARRAY['22222222-2222-2222-2222-222222222222'::text], 'customer creates own workspace');
SELECT throws_ok($$INSERT INTO public.workspaces (user_id) VALUES ('22222222-2222-2222-2222-222222222222')$$, '42501', NULL, 'customer cannot create owner workspace');
SELECT is_empty($$SELECT * FROM public.workspaces WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, 'other user cannot read owner workspace');
SELECT is_empty($$SELECT * FROM public.customer_workspaces WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, 'other user cannot read customer workspace');
SELECT is_empty($$UPDATE public.workspaces SET profile = '{}'::jsonb WHERE user_id = '11111111-1111-1111-1111-111111111111' RETURNING user_id$$, 'other user cannot update owner workspace');
SELECT is_empty($$UPDATE public.customer_workspaces SET workspace_data = '{}'::jsonb WHERE user_id = '11111111-1111-1111-1111-111111111111' RETURNING user_id$$, 'other user cannot update customer workspace');
SELECT throws_ok($$DELETE FROM public.workspaces WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, '42501', NULL, 'authenticated clients cannot delete workspaces');
SELECT throws_ok($$DELETE FROM public.customer_workspaces WHERE user_id = '11111111-1111-1111-1111-111111111111'$$, '42501', NULL, 'authenticated clients cannot delete customer workspaces');

SELECT * FROM finish();
ROLLBACK;
