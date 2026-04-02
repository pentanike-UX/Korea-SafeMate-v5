-- /api/chat — Gemini 여행 챗 대화 저장 (사용자별 최근 맥락)
-- sender_type: 'user' | 'assistant' (Gemini history 매핑 시 assistant → role "model")

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  sender_type text not null check (sender_type in ('user', 'assistant')),
  created_at timestamptz not null default now()
);

create index if not exists chats_user_id_created_at_desc
  on public.chats (user_id, created_at desc);

alter table public.chats enable row level security;

create policy "chats_select_own"
  on public.chats
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "chats_insert_own"
  on public.chats
  for insert
  to authenticated
  with check (auth.uid() = user_id);
