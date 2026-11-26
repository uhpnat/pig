-- Piggy Duo – core schema. Run with the Supabase CLI: `supabase db push`.
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.savings_journeys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references public.users(id),
  goal_amount bigint not null check (goal_amount >= 1000000),
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  fairness_mode text not null default 'proportional' check (fairness_mode in ('proportional','equal','custom')),
  custom_pct_a numeric(5,2) not null default 50 check (custom_pct_a between 1 and 99),
  savings_percentage numeric(5,2) check (savings_percentage is null or savings_percentage between 0 and 100),
  pig_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date)
);

-- slot 'a' = owner seat, 'b' = partner seat. user_id is null until the invitation is accepted.
create table public.journey_members (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  user_id uuid references public.users(id),
  slot text not null check (slot in ('a','b')),
  display_name text not null,
  avatar text,
  role text not null default 'member' check (role in ('owner','member')),
  monthly_income bigint not null default 0 check (monthly_income >= 0),
  income_percentage numeric(5,2) not null default 50,
  joined_at timestamptz,
  status text not null default 'invited' check (status in ('invited','active','left')),
  unique (journey_id, slot),
  unique (journey_id, user_id)
);
create index on public.journey_members (user_id) where status = 'active';

create table public.journey_settings (
  journey_id uuid primary key references public.savings_journeys(id) on delete cascade,
  daily_minimum bigint not null default 20000 check (daily_minimum >= 0),
  daily_maximum bigint check (daily_maximum is null or daily_maximum >= daily_minimum),
  monthly_budget bigint check (monthly_budget is null or monthly_budget > 0),
  require_member_confirmation boolean not null default true,
  reveal_enabled boolean not null default true,
  notification_settings jsonb not null default '{}'::jsonb,
  animation_settings jsonb not null default '{}'::jsonb
);

create table public.daily_reveals (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  reveal_date date not null,
  initiated_by uuid not null references public.users(id),
  result_status text not null default 'revealed' check (result_status in ('revealed','void')),
  game_animation_type text not null default 'slot',
  result_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- one reveal per journey per day: the heart of idempotency
  unique (journey_id, reveal_date)
);

create table public.daily_reveal_amounts (
  id uuid primary key default gen_random_uuid(),
  daily_reveal_id uuid not null references public.daily_reveals(id) on delete cascade,
  member_id uuid not null references public.journey_members(id),
  amount bigint not null check (amount >= 0),
  confirmation_status text not null default 'pending' check (confirmation_status in ('pending','confirmed')),
  confirmed_at timestamptz,
  unique (daily_reveal_id, member_id)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  member_id uuid not null references public.journey_members(id),
  daily_reveal_id uuid references public.daily_reveals(id),
  amount bigint not null check (amount > 0),
  contribution_date date not null,
  status text not null default 'pending' check (status in ('pending','confirmed','voided')),
  notes text check (notes is null or char_length(notes) <= 200),
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contributions_one_per_reveal_member on public.contributions (daily_reveal_id, member_id) where daily_reveal_id is not null;
create index on public.contributions (journey_id, contribution_date);

create table public.contribution_confirmations (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  member_id uuid not null references public.journey_members(id),
  confirmation_status text not null default 'confirmed' check (confirmation_status in ('confirmed','rejected')),
  confirmed_at timestamptz not null default now(),
  unique (contribution_id, member_id)
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  title text not null,
  description text,
  challenge_type text not null,
  target numeric not null,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  reward_type text,
  reward_metadata jsonb not null default '{}'::jsonb
);

create table public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid references public.journey_members(id),
  progress numeric not null default 0,
  status text not null default 'active',
  updated_at timestamptz not null default now(),
  unique (challenge_id, member_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  achievement_type text not null,
  title text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (journey_id, achievement_type)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  journey_id uuid references public.savings_journeys(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.savings_journeys(id) on delete cascade,
  invitation_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  invited_by uuid not null references public.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  status text not null default 'pending' check (status in ('pending','accepted','declined','expired','revoked'))
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  journey_id uuid references public.savings_journeys(id) on delete set null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (journey_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
