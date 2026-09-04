create table if not exists public.nfi_sso_handoffs (
 id uuid primary key default gen_random_uuid(), code_hash text not null unique,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 portefeuille_id text, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_nfi_sso_handoffs_expiry on public.nfi_sso_handoffs(expires_at);
alter table public.nfi_sso_handoffs enable row level security;
revoke all on public.nfi_sso_handoffs from anon, authenticated;
