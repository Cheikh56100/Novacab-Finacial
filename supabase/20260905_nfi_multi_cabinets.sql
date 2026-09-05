-- NOVACAB Insight — multi-cabinets
-- Un même utilisateur peut être membre actif de plusieurs portefeuilles/cabinets.
-- Insight agrège uniquement les cabinets présents dans public.team pour auth.uid().
-- Les autres applications NOVACAB ne sont pas modifiées par cette migration.

create or replace function public.nfi_list_portfolios()
returns table (id text, name text, role text, team_id text)
language sql stable security definer set search_path=public
as $$
  select distinct on (t.portefeuille_id::text) t.portefeuille_id::text,
    coalesce(nullif(t.cabinet_nom,''),'Cabinet '||t.portefeuille_id::text), t.role, t.id::text
  from public.team t
  where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' and t.portefeuille_id is not null
  order by t.portefeuille_id::text, t.cabinet_nom nulls last, t.id;
$$;

create or replace function public.nfi_current_portefeuille_id()
returns text language sql stable security definer set search_path=public as $$
  select t.portefeuille_id::text from public.team t
  where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' and t.portefeuille_id is not null
  order by t.cabinet_nom nulls last, t.id limit 1;
$$;

create or replace function public.nfi_can_access_client(p_client_id text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.clients c where c.id::text=p_client_id and c.portefeuille_id::text in (
    select t.portefeuille_id::text from public.team t where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' and t.portefeuille_id is not null
  ));
$$;

create or replace function public.nfi_list_clients()
returns table (id text, data jsonb, portefeuille_id text)
language sql stable security definer set search_path=public as $$
  select c.id::text,c.data,c.portefeuille_id::text from public.clients c
  where c.portefeuille_id::text in (select t.portefeuille_id::text from public.team t where t.auth_user_id=auth.uid() and coalesce(t.statut,'actif')='actif' and t.portefeuille_id is not null)
  order by lower(coalesce(c.data->>'nom',c.data->>'raisonSociale',c.data->>'denomination',c.id::text));
$$;

create or replace function public.nfi_list_team()
returns table (id text, nom text, email text, role text, statut text, portefeuille_id text, auth_user_id uuid, cabinet_nom text)
language sql stable security definer set search_path=public as $$
  select t.id::text,t.nom,t.email,t.role,t.statut,t.portefeuille_id::text,t.auth_user_id,t.cabinet_nom from public.team t
  where coalesce(t.statut,'actif')='actif' and t.portefeuille_id::text in (select x.portefeuille_id::text from public.team x where x.auth_user_id=auth.uid() and coalesce(x.statut,'actif')='actif' and x.portefeuille_id is not null)
  order by t.portefeuille_id::text,lower(coalesce(t.nom,t.email,t.id::text));
$$;

revoke all on function public.nfi_list_portfolios() from public; grant execute on function public.nfi_list_portfolios() to authenticated;
revoke all on function public.nfi_list_clients() from public; grant execute on function public.nfi_list_clients() to authenticated;
revoke all on function public.nfi_list_team() from public; grant execute on function public.nfi_list_team() to authenticated;
