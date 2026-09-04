-- NFI — espaces personnels indépendants de NOVACAB
-- À exécuter dans Supabase SQL Editor (uniquement ce fichier).

create table if not exists public.nfi_personal_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  siren text,
  naf text,
  sector text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nfi_personal_exercises (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.nfi_personal_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  fiscal_year integer not null,
  ca numeric, ebe numeric, rex numeric, value_added numeric, net numeric,
  treasury numeric, debt numeric, bfr numeric, frng numeric, equity numeric,
  client numeric, stock numeric, other_operating_receivables numeric,
  other_operating_liabilities numeric, current_assets numeric, supplier numeric,
  current_liabilities numeric, quality jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, fiscal_year)
);

create index if not exists idx_nfi_personal_companies_user on public.nfi_personal_companies(user_id);
create index if not exists idx_nfi_personal_exercises_user on public.nfi_personal_exercises(user_id);
create index if not exists idx_nfi_personal_exercises_company on public.nfi_personal_exercises(company_id);

alter table public.nfi_personal_companies enable row level security;
alter table public.nfi_personal_exercises enable row level security;

revoke all on public.nfi_personal_companies from anon;
revoke all on public.nfi_personal_exercises from anon;

drop policy if exists "personal companies own rows" on public.nfi_personal_companies;
create policy "personal companies own rows" on public.nfi_personal_companies
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "personal exercises own rows" on public.nfi_personal_exercises;
create policy "personal exercises own rows" on public.nfi_personal_exercises
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Garantit qu'un utilisateur ne puisse rattacher un exercice qu'à sa propre société.
create or replace function public.nfi_personal_exercise_owner()
returns trigger language plpgsql security invoker as $$
begin
  if not exists (
    select 1 from public.nfi_personal_companies c
    where c.id = new.company_id and c.user_id = auth.uid()
  ) then
    raise exception 'Société personnelle inaccessible';
  end if;
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_nfi_personal_exercise_owner on public.nfi_personal_exercises;
create trigger trg_nfi_personal_exercise_owner
before insert or update on public.nfi_personal_exercises
for each row execute function public.nfi_personal_exercise_owner();
