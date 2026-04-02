-- Wayly: 일별 API 사용량(서버 RPC로만 증가) + Stripe 연동 메타

create table if not exists public.wayly_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  gemini_generations int not null default 0,
  gemini_est_input_tokens bigint not null default 0,
  gemini_est_output_tokens bigint not null default 0,
  routing_live_calls int not null default 0,
  routing_naver_live_calls int not null default 0,
  unique (user_id, usage_date)
);

create index if not exists wayly_usage_daily_user_date_desc
  on public.wayly_usage_daily (user_id, usage_date desc);

alter table public.wayly_usage_daily enable row level security;

create policy "wayly_usage_daily_select_own"
  on public.wayly_usage_daily
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.wayly_record_usage(
  p_gemini_generations int default 0,
  p_gemini_est_in bigint default 0,
  p_gemini_est_out bigint default 0,
  p_routing_live int default 0,
  p_naver_live int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_date date := (timezone('utc', now()))::date;
begin
  if v_uid is null then
    return;
  end if;
  if coalesce(p_gemini_generations, 0) = 0
     and coalesce(p_gemini_est_in, 0) = 0
     and coalesce(p_gemini_est_out, 0) = 0
     and coalesce(p_routing_live, 0) = 0
     and coalesce(p_naver_live, 0) = 0 then
    return;
  end if;

  insert into public.wayly_usage_daily (
    user_id,
    usage_date,
    gemini_generations,
    gemini_est_input_tokens,
    gemini_est_output_tokens,
    routing_live_calls,
    routing_naver_live_calls
  )
  values (
    v_uid,
    v_date,
    coalesce(p_gemini_generations, 0),
    coalesce(p_gemini_est_in, 0),
    coalesce(p_gemini_est_out, 0),
    coalesce(p_routing_live, 0),
    coalesce(p_naver_live, 0)
  )
  on conflict (user_id, usage_date) do update set
    gemini_generations =
      public.wayly_usage_daily.gemini_generations + excluded.gemini_generations,
    gemini_est_input_tokens =
      public.wayly_usage_daily.gemini_est_input_tokens + excluded.gemini_est_input_tokens,
    gemini_est_output_tokens =
      public.wayly_usage_daily.gemini_est_output_tokens + excluded.gemini_est_output_tokens,
    routing_live_calls =
      public.wayly_usage_daily.routing_live_calls + excluded.routing_live_calls,
    routing_naver_live_calls =
      public.wayly_usage_daily.routing_naver_live_calls + excluded.routing_naver_live_calls;
end;
$$;

grant execute on function public.wayly_record_usage(int, bigint, bigint, int, int) to authenticated;

-- Stripe / 플랜 (웹훅이 service role로 upsert)
create table if not exists public.wayly_billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  plan_tier text not null default 'free'
    check (plan_tier in ('free', 'plus', 'past_due', 'canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists wayly_billing_customers_stripe_customer
  on public.wayly_billing_customers (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.wayly_billing_customers enable row level security;

create policy "wayly_billing_select_own"
  on public.wayly_billing_customers
  for select
  to authenticated
  using (auth.uid() = user_id);
