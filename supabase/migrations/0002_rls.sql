-- Row Level Security. Clients may READ what they belong to; financial writes go through SECURITY DEFINER functions (0003).
create or replace function public.is_journey_member(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from journey_members m where m.journey_id = j and m.user_id = auth.uid() and m.status = 'active');
$$;

create or replace function public.is_journey_owner(j uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from savings_journeys s where s.id = j and s.owner_id = auth.uid());
$$;

alter table public.users enable row level security;
alter table public.savings_journeys enable row level security;
alter table public.journey_members enable row level security;
alter table public.journey_settings enable row level security;
alter table public.daily_reveals enable row level security;
alter table public.daily_reveal_amounts enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_confirmations enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.notifications enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.push_subscriptions enable row level security;

-- users: own profile + profiles of people you share a journey with
create policy users_select on public.users for select using (
  id = auth.uid() or exists (
    select 1 from journey_members a join journey_members b on a.journey_id = b.journey_id
    where a.user_id = auth.uid() and b.user_id = users.id and a.status = 'active'));
create policy users_insert on public.users for insert with check (id = auth.uid());
create policy users_update on public.users for update using (id = auth.uid()) with check (id = auth.uid());

-- journeys
create policy journeys_select on public.savings_journeys for select using (public.is_journey_member(id));
create policy journeys_insert on public.savings_journeys for insert with check (owner_id = auth.uid());
create policy journeys_update_owner on public.savings_journeys for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy journeys_delete_owner on public.savings_journeys for delete using (owner_id = auth.uid());

create policy members_select on public.journey_members for select using (public.is_journey_member(journey_id));
create policy members_insert_owner on public.journey_members for insert with check (public.is_journey_owner(journey_id));
create policy members_update_self_or_owner on public.journey_members for update using (user_id = auth.uid() or public.is_journey_owner(journey_id));

create policy settings_select on public.journey_settings for select using (public.is_journey_member(journey_id));
create policy settings_insert_owner on public.journey_settings for insert with check (public.is_journey_owner(journey_id));
create policy settings_update_owner on public.journey_settings for update using (public.is_journey_owner(journey_id));

-- reveals / amounts / contributions: read-only for members. NO insert/update policies => only RPC can write.
create policy reveals_select on public.daily_reveals for select using (public.is_journey_member(journey_id));
create policy reveal_amounts_select on public.daily_reveal_amounts for select using (
  exists (select 1 from daily_reveals r where r.id = daily_reveal_id and public.is_journey_member(r.journey_id)));
create policy contributions_select on public.contributions for select using (public.is_journey_member(journey_id));
create policy confirmations_select on public.contribution_confirmations for select using (
  exists (select 1 from contributions c where c.id = contribution_id and public.is_journey_member(c.journey_id)));

create policy challenges_all on public.challenges for all using (public.is_journey_member(journey_id)) with check (public.is_journey_member(journey_id));
create policy challenge_progress_select on public.challenge_progress for select using (
  exists (select 1 from challenges c where c.id = challenge_id and public.is_journey_member(c.journey_id)));
create policy achievements_select on public.achievements for select using (public.is_journey_member(journey_id));

create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy invitations_select on public.invitations for select using (public.is_journey_member(journey_id));
create policy invitations_insert on public.invitations for insert with check (public.is_journey_owner(journey_id) and invited_by = auth.uid());
create policy invitations_update_owner on public.invitations for update using (public.is_journey_owner(journey_id));

create policy audit_select on public.audit_logs for select using (public.is_journey_member(journey_id));
-- audit_logs: no write policies. Rows are inserted by triggers / SECURITY DEFINER functions only.

create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime honours RLS, so members only receive rows they may select.
alter publication supabase_realtime add table public.daily_reveals, public.daily_reveal_amounts, public.contributions, public.notifications, public.audit_logs;

-- Profile row on signup
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
