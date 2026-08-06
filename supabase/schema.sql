create extension if not exists pgcrypto;

create table if not exists public.therapy_users (
  id text primary key,
  name text,
  preferences jsonb not null default '{}'::jsonb,
  session_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.therapy_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.therapy_memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  memory_type text not null default 'experience'
    check (memory_type in ('emotion', 'preference', 'experience', 'critical', 'note')),
  content text not null,
  importance integer not null default 5 check (importance between 1 and 10),
  last_accessed timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.therapy_mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  session_id text not null,
  message text not null,
  mood text not null,
  confidence numeric(4,3) not null default 0.5,
  sentiment_score numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.therapy_crisis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  session_id text not null,
  message text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index if not exists therapy_messages_session_idx
  on public.therapy_messages (session_id, created_at);
create index if not exists therapy_memories_user_idx
  on public.therapy_memories (user_id, importance desc, last_accessed desc);
create index if not exists therapy_memories_expiry_idx
  on public.therapy_memories (expires_at)
  where expires_at is not null;
create index if not exists therapy_mood_logs_user_idx
  on public.therapy_mood_logs (user_id, created_at desc);
create index if not exists therapy_crisis_logs_user_idx
  on public.therapy_crisis_logs (user_id, created_at desc);

alter table public.therapy_users enable row level security;
alter table public.therapy_messages enable row level security;
alter table public.therapy_memories enable row level security;
alter table public.therapy_mood_logs enable row level security;
alter table public.therapy_crisis_logs enable row level security;

-- The Vercel server-side API uses the service-role key and therefore bypasses RLS.
-- Never expose the service-role key in React/browser code or commit it to GitHub.
