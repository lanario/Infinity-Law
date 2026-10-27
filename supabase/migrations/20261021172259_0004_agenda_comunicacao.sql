-- =============================================
-- Migration 0004: Agenda e Comunicação WhatsApp
-- =============================================

-- Eventos de agenda
create table public.eventos (
  id             uuid primary key default uuid_generate_v4(),
  escritorio_id  uuid not null references public.escritorios(id) on delete cascade,
  titulo         text not null,
  tipo           text not null
                   check (tipo in ('audiencia', 'reuniao', 'prazo', 'compromisso')),
  descricao      text,
  inicio         timestamptz not null,
  fim            timestamptz,
  dia_inteiro    boolean not null default false,
  processo_id    uuid references public.processos(id) on delete set null,
  cliente_id     uuid references public.clientes(id) on delete set null,
  criado_por     uuid not null references public.usuarios(id),
  local          text,
  link_videoconf text,
  cor            text,
  created_at     timestamptz not null default now(),
  constraint eventos_processo_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id),
  constraint eventos_cliente_tenant_fkey
    foreign key (cliente_id, escritorio_id)
    references public.clientes (id, escritorio_id),
  constraint eventos_criado_por_tenant_fkey
    foreign key (criado_por, escritorio_id)
    references public.usuarios (id, escritorio_id)
);

alter table public.eventos enable row level security;

create policy "eventos_tenant_rls" on public.eventos
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_eventos_escritorio on public.eventos(escritorio_id);
create index idx_eventos_inicio on public.eventos(escritorio_id, inicio);
create index idx_eventos_processo on public.eventos(processo_id);

revoke all on table public.eventos from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.eventos to authenticated, service_role;

-- Templates de mensagem WhatsApp
-- Variáveis marcadas como {{nome_variavel}} no corpo
create table public.whatsapp_templates (
  id            uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  nome          text not null,
  categoria     text,
  corpo         text not null,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint whatsapp_templates_id_escritorio_unique unique (id, escritorio_id)
);

alter table public.whatsapp_templates enable row level security;

create policy "templates_tenant_rls" on public.whatsapp_templates
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

revoke all on table public.whatsapp_templates from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.whatsapp_templates to authenticated, service_role;

-- Log de comunicações (canal WhatsApp, futuramente outros)
create table public.comunicacoes_log (
  id            uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  canal         text not null default 'whatsapp',
  destinatario  text not null,  -- número de telefone
  cliente_id    uuid references public.clientes(id) on delete set null,
  processo_id   uuid references public.processos(id) on delete set null,
  template_id   uuid references public.whatsapp_templates(id) on delete set null,
  mensagem      text not null,
  status        text not null default 'iniciado',
  enviado_por   uuid references public.usuarios(id),
  enviado_em    timestamptz not null default now(),
  constraint comunicacoes_log_cliente_tenant_fkey
    foreign key (cliente_id, escritorio_id)
    references public.clientes (id, escritorio_id),
  constraint comunicacoes_log_processo_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id),
  constraint comunicacoes_log_template_tenant_fkey
    foreign key (template_id, escritorio_id)
    references public.whatsapp_templates (id, escritorio_id),
  constraint comunicacoes_log_enviado_por_tenant_fkey
    foreign key (enviado_por, escritorio_id)
    references public.usuarios (id, escritorio_id)
);

alter table public.comunicacoes_log enable row level security;

create policy "comunicacoes_log_tenant_rls" on public.comunicacoes_log
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_comunicacoes_escritorio on public.comunicacoes_log(escritorio_id, enviado_em desc);

revoke all on table public.comunicacoes_log from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.comunicacoes_log to authenticated, service_role;

-- Seed: templates padrão (aplicados pelo escritório na Fase 3)
-- Não inserir aqui pois escritorio_id é obrigatório e não existe ainda
