-- DJEN OAB monitoring. The CNJ API is queried only by authenticated server routes.
-- Tenant isolation remains in RLS; writes from the app use service_role only after
-- deriving the tenant from public.my_escritorio_id().

create table public.djen_oab_monitoramentos (
  id uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  numero_oab text not null,
  numero_oab_chave text generated always as (lower(numero_oab)) stored,
  uf_oab text not null,
  ativo boolean not null default true,
  ultima_tentativa_em timestamptz,
  ultima_sincronizacao_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint djen_oab_monitoramentos_id_escritorio_unique unique (id, escritorio_id),
  constraint djen_oab_monitoramentos_numero_valido
    check (
      numero_oab = btrim(numero_oab)
      and char_length(numero_oab) between 1 and 40
      and numero_oab !~ '[[:cntrl:]]'
    ),
  constraint djen_oab_monitoramentos_uf_valida
    check (uf_oab in (
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    )),
  constraint djen_oab_monitoramentos_escritorio_oab_unique
    unique (escritorio_id, numero_oab_chave, uf_oab)
);

create index idx_djen_oab_monitoramentos_tenant_ativo
  on public.djen_oab_monitoramentos (escritorio_id, ativo, created_at desc);

create trigger set_djen_oab_monitoramentos_updated_at
  before update on public.djen_oab_monitoramentos
  for each row execute function public.set_updated_at();

alter table public.djen_oab_monitoramentos enable row level security;

create policy "djen_oab_monitoramentos_tenant_read"
  on public.djen_oab_monitoramentos
  for select
  to authenticated
  using (
    escritorio_id = (select public.my_escritorio_id())
    and (select public.has_permission('comunicacao', 'read'))
  );

revoke all on table public.djen_oab_monitoramentos from public, anon, authenticated, service_role;
grant select on table public.djen_oab_monitoramentos to authenticated;
grant all on table public.djen_oab_monitoramentos to service_role;

create table public.djen_publicacoes (
  id uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  hash text not null,
  processo_id uuid,
  numero_processo text,
  numero_processo_com_mascara text,
  data_disponibilizacao date,
  tribunal text,
  tipo_comunicacao text,
  orgao text,
  texto text,
  meio text,
  meio_completo text,
  link text,
  tipo_documento text,
  nome_classe text,
  codigo_classe text,
  numero_comunicacao bigint,
  comunicacao_ativa boolean,
  destinatarios jsonb not null default '[]'::jsonb,
  destinatario_advogados jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint djen_publicacoes_id_escritorio_unique unique (id, escritorio_id),
  constraint djen_publicacoes_hash_valido check (char_length(hash) between 1 and 255),
  constraint djen_publicacoes_escritorio_hash_unique unique (escritorio_id, hash),
  constraint djen_publicacoes_processo_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id)
    on delete set null (processo_id),
  constraint djen_publicacoes_destinatarios_array
    check (jsonb_typeof(destinatarios) = 'array'),
  constraint djen_publicacoes_advogados_array
    check (jsonb_typeof(destinatario_advogados) = 'array')
);

create index idx_djen_publicacoes_tenant_data
  on public.djen_publicacoes (escritorio_id, data_disponibilizacao desc nulls last, created_at desc);
create index idx_djen_publicacoes_processo_tenant
  on public.djen_publicacoes (processo_id, escritorio_id);

create trigger set_djen_publicacoes_updated_at
  before update on public.djen_publicacoes
  for each row execute function public.set_updated_at();

alter table public.djen_publicacoes enable row level security;

create policy "djen_publicacoes_tenant_read"
  on public.djen_publicacoes
  for select
  to authenticated
  using (
    escritorio_id = (select public.my_escritorio_id())
    and (select public.has_permission('comunicacao', 'read'))
  );

revoke all on table public.djen_publicacoes from public, anon, authenticated, service_role;
grant select on table public.djen_publicacoes to authenticated;
grant all on table public.djen_publicacoes to service_role;

create table public.djen_publicacoes_monitoramentos (
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  publicacao_id uuid not null,
  monitoramento_id uuid not null,
  encontrada_em timestamptz not null default now(),
  primary key (escritorio_id, publicacao_id, monitoramento_id),
  constraint djen_publicacoes_monitoramentos_publicacao_tenant_fkey
    foreign key (publicacao_id, escritorio_id)
    references public.djen_publicacoes (id, escritorio_id)
    on delete cascade,
  constraint djen_publicacoes_monitoramentos_monitoramento_tenant_fkey
    foreign key (monitoramento_id, escritorio_id)
    references public.djen_oab_monitoramentos (id, escritorio_id)
    on delete cascade
);

create index idx_djen_publicacoes_monitoramentos_publicacao_tenant
  on public.djen_publicacoes_monitoramentos (publicacao_id, escritorio_id);
create index idx_djen_publicacoes_monitoramentos_monitoramento_tenant
  on public.djen_publicacoes_monitoramentos (monitoramento_id, escritorio_id);

alter table public.djen_publicacoes_monitoramentos enable row level security;

create policy "djen_publicacoes_monitoramentos_tenant_read"
  on public.djen_publicacoes_monitoramentos
  for select
  to authenticated
  using (
    escritorio_id = (select public.my_escritorio_id())
    and (select public.has_permission('comunicacao', 'read'))
  );

revoke all on table public.djen_publicacoes_monitoramentos from public, anon, authenticated, service_role;
grant select on table public.djen_publicacoes_monitoramentos to authenticated;
grant all on table public.djen_publicacoes_monitoramentos to service_role;
