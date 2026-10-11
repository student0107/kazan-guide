-- Выполните в Supabase SQL Editor после создания проекта

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Новый диалог',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  poi_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (timezone('Europe/Moscow', now()))::date,
  message_count int not null default 0,
  primary key (user_id, date)
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);
create index if not exists chat_messages_session_id_idx on public.chat_messages (session_id);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.usage_daily enable row level security;

create policy "Users manage own sessions"
  on public.chat_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage messages in own sessions"
  on public.chat_messages
  for all
  using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

create policy "Users manage own usage"
  on public.usage_daily
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
