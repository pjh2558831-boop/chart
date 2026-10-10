-- Chart Vision AI ownership and RLS hardening migration.
-- IMPORTANT: Do not run blindly against production. Review in Supabase SQL Editor first.
-- This migration does not drop tables or destroy data.
--
-- Security model:
-- - plan, role, usage limits, and subscription state are backend-owned.
-- - SUPABASE_SERVICE_ROLE_KEY must stay backend-only because it bypasses RLS.
-- - Frontend clients must not mutate plan, role, usage_limit, or subscription_status.

begin;

-- Profiles: users can see and maintain only safe profile fields for themselves.
-- The plan column remains backend-owned through service role operations.
alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, email, created_at, updated_at) on table public.profiles to authenticated;
grant update (email, updated_at) on table public.profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'chartvision_profiles_select_own'
  ) then
    create policy chartvision_profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'chartvision_profiles_insert_own_safe_fields'
  ) then
    create policy chartvision_profiles_insert_own_safe_fields
      on public.profiles
      for insert
      to authenticated
      with check (id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'chartvision_profiles_update_own_safe_fields'
  ) then
    create policy chartvision_profiles_update_own_safe_fields
      on public.profiles
      for update
      to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;
end
$$;

-- Users: local mirror of account/plan state. Read-only for the owning user;
-- writes are backend-owned.
alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select on table public.users to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'chartvision_users_select_own'
  ) then
    create policy chartvision_users_select_own
      on public.users
      for select
      to authenticated
      using (id = (select auth.uid())::text);
  end if;
end
$$;

-- Subscriptions: backend-owned billing/plan state. Users can read their own
-- subscription rows, but cannot write plan/status from the browser.
alter table public.subscriptions enable row level security;

revoke all on table public.subscriptions from anon, authenticated;
grant select on table public.subscriptions to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'chartvision_subscriptions_select_own'
  ) then
    create policy chartvision_subscriptions_select_own
      on public.subscriptions
      for select
      to authenticated
      using (user_id = (select auth.uid())::text);
  end if;
end
$$;

-- Usage logs: direct frontend writes are disabled. Backend writes with the
-- service role after server-side usage checks.
alter table public.usage_logs enable row level security;

revoke all on table public.usage_logs from anon, authenticated;
grant select on table public.usage_logs to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'usage_logs'
      and policyname = 'chartvision_usage_logs_select_own'
  ) then
    create policy chartvision_usage_logs_select_own
      on public.usage_logs
      for select
      to authenticated
      using (user_id = (select auth.uid())::text);
  end if;
end
$$;

-- Analysis logs: users can read only their own authenticated analysis history.
-- Guest history and cache rows stay backend-only.
alter table public.analysis_logs enable row level security;

revoke all on table public.analysis_logs from anon, authenticated;
grant select on table public.analysis_logs to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analysis_logs'
      and policyname = 'chartvision_analysis_logs_select_own'
  ) then
    create policy chartvision_analysis_logs_select_own
      on public.analysis_logs
      for select
      to authenticated
      using (user_id = (select auth.uid())::text);
  end if;
end
$$;

-- Feedback logs: authenticated users may insert feedback for their own
-- analysis only. Other writes remain backend-owned.
alter table public.feedback_logs enable row level security;

revoke all on table public.feedback_logs from anon, authenticated;
grant select on table public.feedback_logs to authenticated;
grant insert (user_id, analysis_id, rating, correct_signal, correct_pattern, comment, created_at)
  on table public.feedback_logs to authenticated;

do $$
begin
  if to_regclass('public.feedback_logs_id_seq') is not null then
    grant usage on sequence public.feedback_logs_id_seq to authenticated;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_logs'
      and policyname = 'chartvision_feedback_logs_select_own'
  ) then
    create policy chartvision_feedback_logs_select_own
      on public.feedback_logs
      for select
      to authenticated
      using (user_id = (select auth.uid())::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_logs'
      and policyname = 'chartvision_feedback_logs_insert_own_analysis'
  ) then
    create policy chartvision_feedback_logs_insert_own_analysis
      on public.feedback_logs
      for insert
      to authenticated
      with check (
        user_id = (select auth.uid())::text
        and exists (
          select 1
          from public.analysis_logs
          where analysis_logs.id = feedback_logs.analysis_id
            and analysis_logs.user_id = (select auth.uid())::text
        )
      );
  end if;
end
$$;

commit;

-- Manual review query after applying:
-- select schemaname, tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('profiles', 'users', 'subscriptions', 'usage_logs', 'analysis_logs', 'feedback_logs')
-- order by tablename, policyname;
