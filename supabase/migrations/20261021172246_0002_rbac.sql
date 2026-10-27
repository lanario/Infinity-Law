-- =============================================
-- Migration 0002: RBAC — cargos, usuarios, permissoes
-- =============================================

-- Cargos (papéis com permissões granulares)
-- permissoes: {"clientes": {"read": true, "write": true, "delete": false}, ...}
create table public.cargos (
  id            uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  nome          text not null,
  permissoes    jsonb not null default '{}',
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint cargos_id_escritorio_unique unique (id, escritorio_id)
);

alter table public.cargos enable row level security;

create policy "cargos_tenant_rls" on public.cargos
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_cargos_escritorio on public.cargos(escritorio_id);

revoke all on table public.cargos from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.cargos to authenticated, service_role;

-- Usuários (espelho de auth.users com dados de negócio)
create table public.usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  cargo_id      uuid references public.cargos(id) on delete set null,
  nome          text not null,
  email         text not null,
  ativo         boolean not null default true,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint usuarios_id_escritorio_unique unique (id, escritorio_id),
  constraint usuarios_cargo_tenant_fkey
    foreign key (cargo_id, escritorio_id)
    references public.cargos (id, escritorio_id)
);

alter table public.usuarios enable row level security;

create policy "usuarios_tenant_rls" on public.usuarios
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_usuarios_escritorio on public.usuarios(escritorio_id);

create trigger set_usuarios_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

-- O tenant de um usuário não pode ser alterado por uma sessão pública: o helper
-- de tenant deriva o escritório deste vínculo. Provisionamento confiável pode
-- fazer mudanças usando o backend privilegiado.
create or replace function public.protect_usuario_tenant()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.escritorio_id is distinct from old.escritorio_id
    and current_user in ('anon', 'authenticated')
  then
    raise exception 'O escritório do usuário só pode ser alterado pelo backend confiável'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_usuario_tenant() from public, anon, authenticated, service_role;

create trigger protect_usuarios_tenant
  before update of escritorio_id on public.usuarios
  for each row execute function public.protect_usuario_tenant();

revoke all on table public.usuarios from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.usuarios to authenticated, service_role;

-- Login attempts (rate limiting)
create table public.login_attempts (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null,
  ip_address text,
  tentativas integer not null default 1,
  bloqueado_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_login_attempts_email on public.login_attempts(email);

-- Tentativas de login são internas ao backend. RLS sem policies impede acesso
-- via Data API de usuários; os handlers usam exclusivamente service_role.
alter table public.login_attempts enable row level security;
revoke all on table public.login_attempts from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.login_attempts to service_role;

-- O escritório é derivado do vínculo confiável em usuarios, não de metadata
-- editável pelo usuário. SECURITY DEFINER evita recursão na policy de usuarios.
create or replace function public.my_escritorio_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select u.escritorio_id
  from public.usuarios as u
  where u.id = (select auth.uid())
    and u.ativo = true
  limit 1;
$$;

revoke all on function public.my_escritorio_id() from public, anon, authenticated, service_role;
grant execute on function public.my_escritorio_id() to authenticated;

-- has_permission: verifica se usuário logado tem permissão no módulo/ação
create or replace function public.has_permission(modulo text, acao text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    (
      select
        case
          when c.is_admin then true
          else coalesce((c.permissoes -> modulo ->> acao) = 'true', false)
        end
      from public.usuarios u
      join public.cargos c on c.id = u.cargo_id
      where u.id = (select auth.uid())
        and u.escritorio_id = (select public.my_escritorio_id())
        and c.escritorio_id = u.escritorio_id
        and u.ativo = true
    ),
    false
  );
$$;

revoke all on function public.has_permission(text, text) from public, anon, authenticated, service_role;
grant execute on function public.has_permission(text, text) to authenticated;
