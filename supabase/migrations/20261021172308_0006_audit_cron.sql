-- =============================================
-- Migration 0006: Audit Log, CNJ sync errors, pg_cron
-- =============================================

-- Audit log — append-only para LGPD
create table public.audit_log (
  id                bigserial primary key,
  escritorio_id     uuid not null,
  usuario_id        uuid,
  tabela            text not null,
  registro_id       uuid,
  acao              text not null check (acao in ('select', 'insert', 'update', 'delete')),
  dados_anteriores  jsonb,
  dados_novos       jsonb,
  ip_address        text,
  user_agent        text,
  created_at        timestamptz not null default now(),
  constraint audit_log_escritorio_fkey
    foreign key (escritorio_id) references public.escritorios(id),
  constraint audit_log_usuario_tenant_fkey
    foreign key (usuario_id, escritorio_id)
    references public.usuarios (id, escritorio_id)
    on delete set null (usuario_id)
);

-- Registros de auditoria são escritos e lidos somente pelo backend confiável.
alter table public.audit_log enable row level security;
revoke all on table public.audit_log from public, anon, authenticated, service_role;
grant select, insert on public.audit_log to service_role;
revoke all on sequence public.audit_log_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.audit_log_id_seq to service_role;

create index idx_audit_escritorio on public.audit_log(escritorio_id, created_at desc);
create index idx_audit_usuario on public.audit_log(usuario_id, created_at desc);
create index idx_audit_tabela on public.audit_log(tabela, registro_id);

-- CNJ sync errors
create table public.cnj_sync_errors (
  id         uuid primary key default uuid_generate_v4(),
  tribunal   text,
  numero_cnj text,
  http_status integer,
  mensagem   text,
  created_at timestamptz not null default now()
);

create index idx_cnj_errors_created on public.cnj_sync_errors(created_at desc);

-- Erros de integração não são tenant-facing e não têm escritorio_id. RLS sem
-- policies e ACL service_role-only mantêm os registros internos ao backend.
alter table public.cnj_sync_errors enable row level security;
revoke all on table public.cnj_sync_errors from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.cnj_sync_errors to service_role;

-- Cron é requisito do fluxo financeiro para marcar parcelas vencidas. A criação
-- explícita falha claramente se pg_cron não estiver disponível no projeto.
create extension if not exists pg_cron;

-- O nome estável torna o agendamento idempotente: cron.schedule substitui o job
-- existente com o mesmo nome em vez de criar duplicatas.
select cron.schedule(
  'mark-overdue-parcelas',
  '0 4 * * *',
  $cron_command$
    update public.parcelas
    set status = 'vencido'
    where status = 'pendente'
      and vencimento < current_date;
  $cron_command$
);
