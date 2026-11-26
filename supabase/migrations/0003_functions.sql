-- Server-side financial operations. Clients call these through supabase.rpc(...).
-- NOTE: written to mirror src/domain/engine.ts (bounded-v1). Review/test against a real database before production.

create or replace function public.reveal_today(p_journey_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_me journey_members;
  v_j savings_journeys;
  v_s journey_settings;
  v_date date;
  v_reveal daily_reveals;
  v_members journey_members[];
  m journey_members;
  v_budget numeric; v_share numeric; v_month_budget numeric; v_used numeric; v_goal_left numeric;
  v_days_left int; v_rem numeric; v_avg numeric; v_lo numeric; v_hi numeric; v_low numeric; v_up numeric; v_v numeric;
  v_amounts jsonb := '{}'::jsonb; v_meta jsonb := '{}'::jsonb; v_total_income numeric; v_committed numeric;
  v_amount_id uuid;
begin
  select * into v_me from journey_members where journey_id = p_journey_id and user_id = auth.uid() and status = 'active';
  if not found then raise exception 'not_a_member' using errcode = '42501'; end if;

  select * into v_j from savings_journeys where id = p_journey_id;
  select * into v_s from journey_settings where journey_id = p_journey_id;
  if not v_s.reveal_enabled then raise exception 'reveal_disabled'; end if;
  v_date := (now() at time zone v_j.timezone)::date;

  -- Serialize concurrent presses for the same journey/day, then re-check.
  perform pg_advisory_xact_lock(hashtextextended(p_journey_id::text || v_date::text, 0));
  select * into v_reveal from daily_reveals where journey_id = p_journey_id and reveal_date = v_date;
  if found then
    return jsonb_build_object('created', false, 'reveal_id', v_reveal.id);
  end if;

  select coalesce(sum(amount), 0) into v_committed from contributions where journey_id = p_journey_id and status <> 'voided';
  if v_committed >= v_j.goal_amount then raise exception 'goal_reached'; end if;
  v_goal_left := v_j.goal_amount - v_committed;

  select coalesce(sum(monthly_income), 0) into v_total_income from journey_members where journey_id = p_journey_id;
  v_budget := coalesce(v_s.monthly_budget,
                case when v_j.savings_percentage > 0 then round(v_total_income * v_j.savings_percentage / 100)
                     else round(v_j.goal_amount / greatest(1, (extract(year from age(v_j.end_date, v_j.start_date)) * 12 + extract(month from age(v_j.end_date, v_j.start_date))))) end);
  v_days_left := greatest(1, least(
      (date_trunc('month', v_date) + interval '1 month' - interval '1 day')::date - v_date + 1,
      v_j.end_date - v_date + 1));

  insert into daily_reveals (journey_id, reveal_date, initiated_by, result_metadata)
  values (p_journey_id, v_date, auth.uid(), '{}'::jsonb) returning * into v_reveal;

  for m in select * from journey_members where journey_id = p_journey_id order by slot loop
    v_share := case v_j.fairness_mode
      when 'equal' then 0.5
      when 'custom' then case when m.slot = 'a' then v_j.custom_pct_a / 100 else 1 - v_j.custom_pct_a / 100 end
      else case when v_total_income > 0 then m.monthly_income / v_total_income else 0.5 end end;
    v_month_budget := round(v_budget * v_share);
    select coalesce(sum(a.amount), 0) into v_used from daily_reveal_amounts a join daily_reveals r on r.id = a.daily_reveal_id
      where r.journey_id = p_journey_id and a.member_id = m.id and date_trunc('month', r.reveal_date) = date_trunc('month', v_date) and r.reveal_date <> v_date;
    v_rem := greatest(0, least(v_month_budget - v_used, v_goal_left * v_share));
    v_avg := v_rem / v_days_left;
    v_lo := least(v_s.daily_minimum * v_share, v_rem);
    v_hi := greatest(coalesce(v_s.daily_maximum * v_share, greatest(v_avg * 2.5, v_lo)), v_lo);
    v_low := greatest(v_lo, v_rem - v_hi * (v_days_left - 1));
    v_up  := least(v_hi, v_rem - v_lo * (v_days_left - 1));
    if v_rem <= 0 then v_v := 0;
    elsif v_days_left = 1 then v_v := least(v_rem, v_hi);
    elsif v_low <= v_up then v_v := least(v_up, greatest(v_low, v_avg * (0.4 + 1.2 * (get_byte(gen_random_bytes(1), 0) / 256.0))));
    else v_v := least(v_rem, v_hi); end if;
    v_v := round(v_v / 1000) * 1000;
    if v_rem - v_v < 1000 then v_v := v_rem; end if;
    v_v := greatest(0, least(v_v, v_rem));

    insert into daily_reveal_amounts (daily_reveal_id, member_id, amount, confirmation_status, confirmed_at)
    values (v_reveal.id, m.id, v_v, case when v_s.require_member_confirmation then 'pending' else 'confirmed' end, case when v_s.require_member_confirmation then null else now() end)
    returning id into v_amount_id;
    if v_v > 0 then
      insert into contributions (journey_id, member_id, daily_reveal_id, amount, contribution_date, status)
      values (p_journey_id, m.id, v_reveal.id, v_v, v_date, case when v_s.require_member_confirmation then 'pending' else 'confirmed' end);
    end if;
    v_amounts := v_amounts || jsonb_build_object(m.slot, v_v);
    v_meta := v_meta || jsonb_build_object(m.slot, jsonb_build_object('remaining', v_rem, 'low', v_low, 'up', v_up));
  end loop;

  update daily_reveals set result_metadata = jsonb_build_object('algorithm', 'bounded-v1', 'source', 'server', 'daysLeft', v_days_left, 'members', v_meta) where id = v_reveal.id;
  insert into audit_logs (journey_id, actor_id, action, entity_type, entity_id, new_values)
  values (p_journey_id, auth.uid(), 'reveal', 'daily_reveals', v_reveal.id, v_amounts);

  return jsonb_build_object('created', true, 'reveal_id', v_reveal.id, 'amounts', v_amounts);
end $$;

-- A member confirms THEIR OWN contribution.
create or replace function public.confirm_contribution(p_contribution_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c contributions; m journey_members;
begin
  select * into c from contributions where id = p_contribution_id for update;
  if not found then raise exception 'not_found'; end if;
  select * into m from journey_members where id = c.member_id;
  if m.user_id is distinct from auth.uid() then raise exception 'only_owner_of_contribution_can_confirm' using errcode = '42501'; end if;
  if c.status <> 'pending' then return; end if;
  update contributions set status = 'confirmed', updated_at = now() where id = c.id;
  insert into contribution_confirmations (contribution_id, member_id) values (c.id, m.id) on conflict do nothing;
  update daily_reveal_amounts set confirmation_status = 'confirmed', confirmed_at = now() where daily_reveal_id = c.daily_reveal_id and member_id = m.id;
  insert into audit_logs (journey_id, actor_id, action, entity_type, entity_id, new_values) values (c.journey_id, auth.uid(), 'confirm', 'contributions', c.id, jsonb_build_object('amount', c.amount));
end $$;

create or replace function public.accept_invitation(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare i invitations;
begin
  select * into i from invitations where invitation_code = upper(p_code) for update;
  if not found or i.status <> 'pending' or i.expires_at < now() then raise exception 'invalid_or_expired_invitation'; end if;
  update journey_members set user_id = auth.uid(), status = 'active', joined_at = now() where journey_id = i.journey_id and slot = 'b' and user_id is null;
  if not found then raise exception 'journey_full'; end if;
  update invitations set status = 'accepted' where id = i.id;
  insert into audit_logs (journey_id, actor_id, action, entity_type, entity_id) values (i.journey_id, auth.uid(), 'accept_invitation', 'invitations', i.id);
  return i.journey_id;
end $$;

revoke all on function public.reveal_today(uuid), public.confirm_contribution(uuid), public.accept_invitation(text) from public;
grant execute on function public.reveal_today(uuid), public.confirm_contribution(uuid), public.accept_invitation(text) to authenticated;

-- Audit trail for shared-rule changes
create or replace function public.audit_journey_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  insert into audit_logs (journey_id, actor_id, action, entity_type, entity_id, old_values, new_values)
  values (new.id, auth.uid(), 'update_rules', 'savings_journeys', new.id, to_jsonb(old), to_jsonb(new));
  return new;
end $$;
create trigger journey_audit before update on public.savings_journeys for each row execute function public.audit_journey_update();
