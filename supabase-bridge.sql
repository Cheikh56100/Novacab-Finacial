-- NFI <-> NOVACAB bridge, 2026-09-04
-- NOVACAB remains the source of truth for clients and financial_imports.
-- NFI reads the same clients/FEC and writes new FEC imports back to financial_imports.

create extension if not exists pgcrypto;

create or replace function public.nfi_current_role()
returns text language sql stable security definer set search_path=public as $$
  select coalesce((select t.role from public.team t where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' limit 1),'collaborateur');
$$;

create or replace function public.nfi_current_portefeuille_id()
returns text language sql stable security definer set search_path=public as $$
  select t.portefeuille_id::text from public.team t where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' limit 1;
$$;

create or replace function public.nfi_can_access_client(p_client_id text)
returns boolean
language sql stable security definer set search_path=public
as $$
  -- NOVACAB Insight est la vue financière transversale du cabinet :
  -- tout membre actif d'un portefeuille peut consulter tous les dossiers
  -- de ce même portefeuille. Les autres applications restent soumises
  -- à leurs propres règles d'accès.
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

create or replace function public.nfi_list_clients()
returns table(id text,data jsonb,portefeuille_id text) language sql stable security definer set search_path=public as $$
  select c.id::text,c.data,c.portefeuille_id::text from public.clients c where public.nfi_can_access_client(c.id::text)
  order by lower(coalesce(c.data->>'nom',c.data->>'raisonSociale',c.data->>'denomination',c.id::text));
$$;

create or replace function public.nfi_get_client(p_client_id text)
returns table(id text,data jsonb,portefeuille_id text) language sql stable security definer set search_path=public as $$
  select c.id::text,c.data,c.portefeuille_id::text from public.clients c where c.id::text=p_client_id and public.nfi_can_access_client(c.id::text);
$$;

create or replace function public.nfi_list_team()
returns table(id text,nom text,email text,role text,statut text,portefeuille_id text,auth_user_id uuid,cabinet_nom text)
language sql stable security definer set search_path=public as $$
  select t.id::text,t.nom,t.email,t.role,t.statut,t.portefeuille_id::text,t.auth_user_id,t.cabinet_nom
  from public.team t where coalesce(t.statut,'actif')='actif' and t.portefeuille_id::text=public.nfi_current_portefeuille_id()
  order by lower(coalesce(t.nom,t.email,t.id::text));
$$;

revoke all on function public.nfi_list_clients() from public; grant execute on function public.nfi_list_clients() to authenticated;
revoke all on function public.nfi_get_client(text) from public; grant execute on function public.nfi_get_client(text) to authenticated;
revoke all on function public.nfi_list_team() from public; grant execute on function public.nfi_list_team() to authenticated;

create table if not exists public.nfi_exercises (
 id uuid primary key default gen_random_uuid(), client_id text not null references public.clients(id) on delete cascade, fiscal_year integer not null,
 ca numeric,ebe numeric,rex numeric,value_added numeric,net numeric,treasury numeric,debt numeric,bfr numeric,frng numeric,equity numeric,client numeric,stock numeric,
 supplier numeric,other_operating_receivables numeric,other_operating_liabilities numeric,current_assets numeric,current_liabilities numeric,quality jsonb not null default '{}'::jsonb,
 updated_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(client_id,fiscal_year)
);
create table if not exists public.nfi_fec_imports (
 id uuid primary key default gen_random_uuid(),client_id text not null references public.clients(id) on delete cascade,file_name text not null,storage_path text,row_count integer,exercise_count integer,quality jsonb not null default '{}'::jsonb,imported_by uuid references auth.users(id) on delete set null,imported_at timestamptz not null default now()
);
create table if not exists public.nfi_confidential_access (client_id text not null references public.clients(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(client_id,user_id));
create table if not exists public.nfi_financial_analyses (id uuid primary key default gen_random_uuid(),client_id text not null references public.clients(id) on delete cascade,fiscal_year integer not null,score integer,ratios jsonb not null default '{}'::jsonb,diagnostics jsonb not null default '[]'::jsonb,interpretation jsonb not null default '{}'::jsonb,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(client_id,fiscal_year));
create table if not exists public.nfi_forecasts (id uuid primary key default gen_random_uuid(),client_id text not null references public.clients(id) on delete cascade,base_year integer not null,profile text not null,assumptions jsonb not null default '{}'::jsonb,result jsonb not null default '{}'::jsonb,created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now());
create table if not exists public.nfi_market_benchmarks (id uuid primary key default gen_random_uuid(),sector_key text not null,source text,source_year integer,payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),unique(sector_key,source_year));

create index if not exists nfi_exercises_client_idx on public.nfi_exercises(client_id,fiscal_year desc);
create index if not exists nfi_fec_imports_client_idx on public.nfi_fec_imports(client_id,imported_at desc);

-- NFI lit et écrit les imports FEC NOVACAB. Les données restent dans financial_imports.
alter table public.financial_imports enable row level security;
drop policy if exists "nfi_bridge_financial_imports_select" on public.financial_imports;
create policy "nfi_bridge_financial_imports_select" on public.financial_imports for select to authenticated using (public.nfi_can_access_client(client_id));
drop policy if exists "nfi_bridge_financial_imports_insert" on public.financial_imports;
create policy "nfi_bridge_financial_imports_insert" on public.financial_imports for insert to authenticated with check (public.nfi_can_access_client(client_id));
drop policy if exists "nfi_bridge_financial_imports_update" on public.financial_imports;
create policy "nfi_bridge_financial_imports_update" on public.financial_imports for update to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));

alter table public.nfi_exercises enable row level security;
drop policy if exists "nfi_exercises_access" on public.nfi_exercises;
create policy "nfi_exercises_access" on public.nfi_exercises for all to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));
alter table public.nfi_fec_imports enable row level security;
drop policy if exists "nfi_fec_access" on public.nfi_fec_imports;
create policy "nfi_fec_access" on public.nfi_fec_imports for all to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));
alter table public.nfi_financial_analyses enable row level security;
drop policy if exists "nfi_analysis_access" on public.nfi_financial_analyses;
create policy "nfi_analysis_access" on public.nfi_financial_analyses for all to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));
alter table public.nfi_forecasts enable row level security;
drop policy if exists "nfi_forecast_access" on public.nfi_forecasts;
create policy "nfi_forecast_access" on public.nfi_forecasts for all to authenticated using (public.nfi_can_access_client(client_id)) with check (public.nfi_can_access_client(client_id));
alter table public.nfi_market_benchmarks enable row level security;
drop policy if exists "nfi_benchmark_read" on public.nfi_market_benchmarks;
create policy "nfi_benchmark_read" on public.nfi_market_benchmarks for select to authenticated using (true);
