-- =============================================
-- Migration 0003: Clientes e Processos
-- =============================================

-- Seed: Áreas do Direito
create table public.areas_direito (
  id   serial primary key,
  nome text not null unique
);

insert into public.areas_direito (nome) values
  ('Cível'),
  ('Trabalhista'),
  ('Criminal'),
  ('Família'),
  ('Previdenciário'),
  ('Tributário'),
  ('Empresarial'),
  ('Ambiental'),
  ('Consumidor'),
  ('Imobiliário'),
  ('Administrativo'),
  ('Eleitoral');

alter table public.areas_direito enable row level security;

create policy "areas_direito_select_authenticated" on public.areas_direito
  for select
  to authenticated
  using (true);

revoke all on table public.areas_direito from public, anon, authenticated, service_role;
revoke all on sequence public.areas_direito_id_seq from public, anon, authenticated, service_role;
grant select on public.areas_direito to authenticated, service_role;

-- Clientes
create table public.clientes (
  id            uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  tipo          text not null check (tipo in ('pf', 'pj')),
  nome          text not null,
  cpf_cnpj      text,          -- somente dígitos, sem formatação
  email         text,
  telefone      text,          -- somente dígitos
  cep           text,
  logradouro    text,
  numero        text,
  complemento   text,
  bairro        text,
  cidade        text,
  estado        char(2),
  observacoes   text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint clientes_id_escritorio_unique unique (id, escritorio_id)
);

alter table public.clientes enable row level security;

create policy "clientes_tenant_rls" on public.clientes
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_clientes_escritorio on public.clientes(escritorio_id);
create index idx_clientes_cpf_cnpj on public.clientes(cpf_cnpj);
create index idx_clientes_nome_trgm on public.clientes using gin(nome gin_trgm_ops);

create trigger set_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

revoke all on table public.clientes from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.clientes to authenticated, service_role;

-- Processos
create table public.processos (
  id                uuid primary key default uuid_generate_v4(),
  escritorio_id     uuid not null references public.escritorios(id) on delete cascade,
  numero_cnj        text not null,  -- NNNNNNN-DD.AAAA.J.TT.OOOO
  numero_cnj_raw    text,
  area_direito_id   integer references public.areas_direito(id),
  tipo_acao         text,
  fase              text check (fase in ('conhecimento', 'recursal', 'execucao', 'arquivado')),
  status            text not null default 'ativo'
                      check (status in ('ativo', 'suspenso', 'arquivado', 'encerrado')),
  tribunal          text,
  vara              text,
  comarca           text,
  uf                char(2),
  valor_causa       numeric(15, 2),
  data_distribuicao date,
  advogado_id       uuid references public.usuarios(id) on delete set null,
  observacoes       text,
  ultima_sync_cnj   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint processos_id_escritorio_unique unique (id, escritorio_id),
  constraint processos_advogado_tenant_fkey
    foreign key (advogado_id, escritorio_id)
    references public.usuarios (id, escritorio_id)
);

alter table public.processos enable row level security;

create policy "processos_tenant_rls" on public.processos
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_processos_escritorio on public.processos(escritorio_id);
create index idx_processos_numero_cnj on public.processos(numero_cnj);
create index idx_processos_advogado on public.processos(advogado_id);
create index idx_processos_status on public.processos(escritorio_id, status);

create trigger set_processos_updated_at
  before update on public.processos
  for each row execute function public.set_updated_at();

revoke all on table public.processos from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.processos to authenticated, service_role;

-- N:N Processos <-> Clientes
create table public.processo_clientes (
  processo_id uuid not null references public.processos(id) on delete cascade,
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  papel       text not null default 'autor'
                check (papel in ('autor', 'reu', 'terceiro')),
  primary key (processo_id, cliente_id)
);

alter table public.processo_clientes enable row level security;

create policy "processo_clientes_rls" on public.processo_clientes
  for all
  to authenticated
  using (
    exists (
      select 1 from public.processos p
      where p.id = processo_clientes.processo_id
        and p.escritorio_id = (select public.my_escritorio_id())
    )
    and exists (
      select 1 from public.clientes c
      where c.id = processo_clientes.cliente_id
        and c.escritorio_id = (select public.my_escritorio_id())
    )
  )
  with check (
    exists (
      select 1 from public.processos p
      where p.id = processo_clientes.processo_id
        and p.escritorio_id = (select public.my_escritorio_id())
    )
    and exists (
      select 1 from public.clientes c
      where c.id = processo_clientes.cliente_id
        and c.escritorio_id = (select public.my_escritorio_id())
    )
  );

revoke all on table public.processo_clientes from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.processo_clientes to authenticated, service_role;

-- Cache de movimentações do DataJud
create table public.processo_movimentacoes (
  id             uuid primary key default uuid_generate_v4(),
  processo_id    uuid not null references public.processos(id) on delete cascade,
  escritorio_id  uuid not null references public.escritorios(id) on delete cascade,
  data_movimento date not null,
  descricao      text not null,
  codigo_cnj     text,
  fonte          text not null default 'datajud',
  synced_at      timestamptz not null default now()
);

alter table public.processo_movimentacoes enable row level security;

alter table public.processo_movimentacoes
  add constraint processo_movimentacoes_processo_tenant_fkey
  foreign key (processo_id, escritorio_id)
  references public.processos (id, escritorio_id);

create policy "movimentacoes_tenant_rls" on public.processo_movimentacoes
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_movimentacoes_processo on public.processo_movimentacoes(processo_id, data_movimento desc);
create unique index idx_movimentacoes_upsert_identity
  on public.processo_movimentacoes(processo_id, data_movimento, descricao);

revoke all on table public.processo_movimentacoes from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.processo_movimentacoes to authenticated, service_role;
