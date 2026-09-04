-- ============================================================
-- NFI — INTEGRATION DANS LE PROJET SUPABASE NOVACAB
-- ============================================================
-- IMPORTANT :
-- Ce fichier NE crée PAS un projet Supabase NFI et NE recrée PAS
-- les tables profiles / teams / companies de NFI.
--
-- NOVACAB reste la source de vérité pour :
--   auth.users, team, portefeuilles, clients
--
-- NFI stocke uniquement ses données analytiques, rattachées à
-- public.clients.id.
--
-- À exécuter dans le MÊME projet Supabase que NOVACAB.
-- Prérequis : migrations NOVACAB ayant créé `team.portefeuille_id`,
-- `team.auth_user_id`, `team.role`, `team.statut`, `clients.portefeuille_id`,
-- ainsi que les fonctions `current_portefeuille_id()` et `current_team_role()`.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Helpers de sécurité : on s'appuie sur les fonctions NOVACAB
-- existantes lorsqu'elles sont présentes.
-- ------------------------------------------------------------

create or replace function public.nfi_current_team_id()
returns text
language sql stable security definer set search_path=public
as $$
  select t.id::text
  from public.team t
  where t.auth_user_id = auth.uid()
    and coalesce(t.statut,'actif') = 'actif'
  limit 1;
$$;

create or replace function public.nfi_current_role()
returns text
language sql stable security definer set search_path=public
as $$
  select coalesce((
    select t.role from public.team t
    where t.auth_user_id = auth.uid()
      and coalesce(t.statut,'actif') = 'actif'
    limit 1
  ), 'collaborateur');
$$;

create or replace function public.nfi_current_portefeuille_id()
returns text
language sql stable security definer set search_path=public
as $$
  select t.portefeuille_id::text
  from public.team t
  where t.auth_user_id = auth.uid()
    and coalesce(t.statut,'actif') = 'actif'
  limit 1;
$$;

-- EXCEPTION NFI : tous les membres d'un même portefeuille NOVACAB
-- peuvent consulter/analyser tous les dossiers de ce portefeuille.
-- Cela ne change PAS les droits de NOVACAB lui-même : l'exception est
-- appliquée uniquement aux tables/fonctions NFI.
create or replace function public.nfi_can_access_client(p_client_id text)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.clients c
    where c.id::text = p_client_id
      and c.portefeuille_id::text = public.nfi_current_portefeuille_id()
      and exists (
        select 1 from public.team t
        where t.auth_user_id = auth.uid()
          and coalesce(t.statut,'actif') = 'actif'
          and t.portefeuille_id::text = c.portefeuille_id::text
      )
  );
$$;

-- Exception métier NFI : tous les membres actifs d'un portefeuille
-- voient tous les dossiers de leur propre portefeuille.
create or replace function public.nfi_list_clients()
returns table (id text, data jsonb, portefeuille_id text)
language sql stable security definer set search_path=public
as $$
  select c.id::text, c.data, c.portefeuille_id::text
  from public.clients c
  where c.portefeuille_id::text = public.nfi_current_portefeuille_id()
    and exists (
      select 1 from public.team t
      where t.auth_user_id = auth.uid()
        and coalesce(t.statut,'actif') = 'actif'
        and t.portefeuille_id::text = c.portefeuille_id::text
    )
  order by lower(coalesce(c.data->>'nom',c.data->>'raisonSociale',c.data->>'denomination',c.id::text));
$$;

create or replace function public.nfi_get_client(p_client_id text)
returns table (id text, data jsonb, portefeuille_id text)
language sql stable security definer set search_path=public
as $$
  select c.id::text, c.data, c.portefeuille_id::text
  from public.clients c
  where c.id::text = p_client_id and public.nfi_can_access_client(c.id::text);
$$;

create or replace function public.nfi_list_team()
returns table (id text, nom text, email text, role text, statut text, portefeuille_id text, auth_user_id uuid, cabinet_nom text)
language sql stable security definer set search_path=public
as $$
  select t.id::text,t.nom,t.email,t.role,t.statut,t.portefeuille_id::text,t.auth_user_id,t.cabinet_nom
  from public.team t
  where coalesce(t.statut,'actif')='actif'
    and t.portefeuille_id::text=public.nfi_current_portefeuille_id()
  order by lower(coalesce(t.nom,t.email,t.id::text));
$$;

revoke all on function public.nfi_list_clients() from public; grant execute on function public.nfi_list_clients() to authenticated;
revoke all on function public.nfi_get_client(text) from public; grant execute on function public.nfi_get_client(text) to authenticated;
revoke all on function public.nfi_list_team() from public; grant execute on function public.nfi_list_team() to authenticated;

-- Exercices financiers NFI
-- ------------------------------------------------------------
create table if not exists public.nfi_exercises (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  fiscal_year integer not null,
  ca numeric,
  ebe numeric,
  rex numeric,
  value_added numeric,
  net numeric,
  treasury numeric,
  debt numeric,
  bfr numeric,
  frng numeric,
  equity numeric,
  client numeric,
  stock numeric,
  supplier numeric,
  other_operating_receivables numeric,
  other_operating_liabilities numeric,
  current_assets numeric,
  current_liabilities numeric,
  quality jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, fiscal_year)
);

-- ------------------------------------------------------------
-- Historique des imports FEC
-- ------------------------------------------------------------
create table if not exists public.nfi_fec_imports (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  file_name text not null,
  storage_path text,
  row_count integer,
  exercise_count integer,
  quality jsonb not null default '{}'::jsonb,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Accès confidentiel spécifique NFI.
-- Ce n'est PAS une seconde gestion des dossiers : NOVACAB reste maître.
-- ------------------------------------------------------------
create table if not exists public.nfi_confidential_access (
  client_id text not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(client_id,user_id)
);

-- ------------------------------------------------------------
-- Analyses financières persistées
-- ------------------------------------------------------------
create table if not exists public.nfi_financial_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  fiscal_year integer not null,
  score integer,
  ratios jsonb not null default '{}'::jsonb,
  diagnostics jsonb not null default '[]'::jsonb,
  interpretation jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id,fiscal_year)
);

-- ------------------------------------------------------------
-- Prévisions NFI
-- ------------------------------------------------------------
create table if not exists public.nfi_forecasts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.clients(id) on delete cascade,
  base_year integer not null,
  profile text not null,
  assumptions jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Références / benchmarks cabinet ou marché.
-- Aucun lien d'identité n'est stocké ici.
-- ------------------------------------------------------------
create table if not exists public.nfi_market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  sector_key text not null,
  source text,
  source_year integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(sector_key,source_year)
);

-- ------------------------------------------------------------
-- Index
-- ------------------------------------------------------------
create index if not exists idx_nfi_exercises_client_year
  on public.nfi_exercises(client_id,fiscal_year);
create index if not exists idx_nfi_fec_client
  on public.nfi_fec_imports(client_id);
create index if not exists idx_nfi_confidential_client
  on public.nfi_confidential_access(client_id);
create index if not exists idx_nfi_confidential_user
  on public.nfi_confidential_access(user_id);
create index if not exists idx_nfi_analysis_client_year
  on public.nfi_financial_analyses(client_id,fiscal_year);
create index if not exists idx_nfi_forecasts_client
  on public.nfi_forecasts(client_id);
create index if not exists idx_nfi_benchmark_sector
  on public.nfi_market_benchmarks(sector_key);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.nfi_exercises enable row level security;
alter table public.nfi_fec_imports enable row level security;
alter table public.nfi_confidential_access enable row level security;
alter table public.nfi_financial_analyses enable row level security;
alter table public.nfi_forecasts enable row level security;
alter table public.nfi_market_benchmarks enable row level security;



drop policy if exists "nfi_fec_select" on public.nfi_fec_imports;
create policy "nfi_fec_select" on public.nfi_fec_imports
for select to authenticated
using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_fec_write" on public.nfi_fec_imports;
create policy "nfi_fec_write" on public.nfi_fec_imports
for all to authenticated
using (public.nfi_can_access_client(client_id))
with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_confidential_select" on public.nfi_confidential_access;
create policy "nfi_confidential_select" on public.nfi_confidential_access
for select to authenticated
using (
  user_id = auth.uid()
  or public.nfi_current_role() in ('admin','expert','chef_mission')
);

drop policy if exists "nfi_confidential_write" on public.nfi_confidential_access;
create policy "nfi_confidential_write" on public.nfi_confidential_access
for all to authenticated
using (public.nfi_current_role() in ('admin','expert','chef_mission'))
with check (public.nfi_current_role() in ('admin','expert','chef_mission'));

drop policy if exists "nfi_analysis_select" on public.nfi_financial_analyses;
create policy "nfi_analysis_select" on public.nfi_financial_analyses
for select to authenticated
using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_analysis_write" on public.nfi_financial_analyses;
create policy "nfi_analysis_write" on public.nfi_financial_analyses
for all to authenticated
using (public.nfi_can_access_client(client_id))
with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_forecast_select" on public.nfi_forecasts;
create policy "nfi_forecast_select" on public.nfi_forecasts
for select to authenticated
using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_forecast_write" on public.nfi_forecasts;
create policy "nfi_forecast_write" on public.nfi_forecasts
for all to authenticated
using (public.nfi_can_access_client(client_id))
with check (public.nfi_can_access_client(client_id));

-- Politiques CRUD NFI : lecture/écriture courante pour les membres du portefeuille,
-- suppression réservée aux responsables du cabinet.
drop policy if exists "nfi_exercises_select" on public.nfi_exercises;
create policy "nfi_exercises_select" on public.nfi_exercises
for select to authenticated using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_exercises_insert" on public.nfi_exercises;
create policy "nfi_exercises_insert" on public.nfi_exercises
for insert to authenticated with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_exercises_update" on public.nfi_exercises;
create policy "nfi_exercises_update" on public.nfi_exercises
for update to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_exercises_delete" on public.nfi_exercises;
create policy "nfi_exercises_delete" on public.nfi_exercises
for delete to authenticated using (public.nfi_can_access_client(client_id) and public.nfi_current_role() in ('admin','expert','chef_mission'));

drop policy if exists "nfi_fec_imports_select" on public.nfi_fec_imports;
create policy "nfi_fec_imports_select" on public.nfi_fec_imports
for select to authenticated using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_fec_imports_insert" on public.nfi_fec_imports;
create policy "nfi_fec_imports_insert" on public.nfi_fec_imports
for insert to authenticated with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_fec_imports_update" on public.nfi_fec_imports;
create policy "nfi_fec_imports_update" on public.nfi_fec_imports
for update to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_fec_imports_delete" on public.nfi_fec_imports;
create policy "nfi_fec_imports_delete" on public.nfi_fec_imports
for delete to authenticated using (public.nfi_can_access_client(client_id) and public.nfi_current_role() in ('admin','expert','chef_mission'));

drop policy if exists "nfi_financial_analyses_select" on public.nfi_financial_analyses;
create policy "nfi_financial_analyses_select" on public.nfi_financial_analyses
for select to authenticated using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_financial_analyses_insert" on public.nfi_financial_analyses;
create policy "nfi_financial_analyses_insert" on public.nfi_financial_analyses
for insert to authenticated with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_financial_analyses_update" on public.nfi_financial_analyses;
create policy "nfi_financial_analyses_update" on public.nfi_financial_analyses
for update to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_financial_analyses_delete" on public.nfi_financial_analyses;
create policy "nfi_financial_analyses_delete" on public.nfi_financial_analyses
for delete to authenticated using (public.nfi_can_access_client(client_id) and public.nfi_current_role() in ('admin','expert','chef_mission'));

drop policy if exists "nfi_forecasts_select" on public.nfi_forecasts;
create policy "nfi_forecasts_select" on public.nfi_forecasts
for select to authenticated using (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_forecasts_insert" on public.nfi_forecasts;
create policy "nfi_forecasts_insert" on public.nfi_forecasts
for insert to authenticated with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_forecasts_update" on public.nfi_forecasts;
create policy "nfi_forecasts_update" on public.nfi_forecasts
for update to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));

drop policy if exists "nfi_forecasts_delete" on public.nfi_forecasts;
create policy "nfi_forecasts_delete" on public.nfi_forecasts
for delete to authenticated using (public.nfi_can_access_client(client_id) and public.nfi_current_role() in ('admin','expert','chef_mission'));

-- Les benchmarks marché sont non confidentiels.
drop policy if exists "nfi_benchmark_select" on public.nfi_market_benchmarks;
create policy "nfi_benchmark_select" on public.nfi_market_benchmarks
for select to authenticated
using (true);

-- Seuls les responsables peuvent modifier le référentiel.
drop policy if exists "nfi_benchmark_manage" on public.nfi_market_benchmarks;
create policy "nfi_benchmark_manage" on public.nfi_market_benchmarks
for all to authenticated
using (public.nfi_current_role() in ('admin','expert','chef_mission'))
with check (public.nfi_current_role() in ('admin','expert','chef_mission'));

-- ------------------------------------------------------------
-- Nettoyage explicite de l'ancien modèle NFI
-- ------------------------------------------------------------
-- NE PAS exécuter de DROP sur profiles/teams/companies :
-- ces noms peuvent appartenir à une autre application.
-- Le nouveau NFI n'en dépend plus.
--
-- Les anciennes tables NFI (companies, profiles, etc.) ne sont
-- volontairement PAS supprimées automatiquement afin d'éviter
-- toute perte de données. Elles peuvent être archivées après
-- vérification de migration.
-- ============================================================

-- NOTE V3.2+ : les suppressions des données financières sont réservées
-- aux rôles responsables (admin/expert/chef_mission). Les membres actifs
-- du portefeuille peuvent lire et alimenter les données NFI de leur portefeuille.
