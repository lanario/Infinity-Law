-- =============================================
-- Migration 0001: Foundation
-- Extensões, escritorios, helpers base
-- =============================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- O Data API exige privilégios explícitos para tabelas novas a partir do rollout
-- de 2026-10-30. As tabelas abaixo recebem grants específicos por papel.
grant usage on schema public to authenticated, service_role;

-- Escritórios (tenants)
create table public.escritorios (
  id         uuid primary key default uuid_generate_v4(),
  nome       text not null,
  cnpj       text unique,
  plano      text not null default 'starter'
               check (plano in ('starter', 'profissional', 'enterprise')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.escritorios enable row level security;

-- Helper provisório para a policy da tabela base. A migration 0002 o substitui
-- por uma consulta ao vínculo ativo em public.usuarios; até lá, falha fechado.
create or replace function public.my_escritorio_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select null::uuid;
$$;

revoke all on function public.my_escritorio_id() from public, anon, authenticated, service_role;
grant execute on function public.my_escritorio_id() to authenticated;

-- Política: só admin via service role pode ver/editar escritórios
-- Usuários autenticados só veem o próprio
create policy "escritorios_select_own" on public.escritorios
  for select
  to authenticated
  using (id = (select public.my_escritorio_id()));

revoke all on table public.escritorios from public, anon, authenticated, service_role;
grant select on public.escritorios to authenticated;
grant select, insert, update, delete on public.escritorios to service_role;

-- Trigger genérico set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;

create trigger set_escritorios_updated_at
  before update on public.escritorios
  for each row execute function public.set_updated_at();
