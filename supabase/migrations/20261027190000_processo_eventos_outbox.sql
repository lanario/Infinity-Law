-- Eventos duráveis para atualizações de processos e novas movimentações.
-- O texto exibido é controlado pela trigger; dados brutos do processo/movimento
-- não são copiados para o feed de notificações.
create table if not exists public.processo_eventos (
  id uuid primary key default uuid_generate_v4(),
  processo_id uuid not null,
  escritorio_id uuid not null,
  tipo text not null check (tipo in ('atualizacao_processo', 'nova_movimentacao')),
  titulo text not null,
  descricao text not null,
  data_evento timestamptz not null default clock_timestamp(),
  chave_origem text not null,
  constraint processo_eventos_processo_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id)
    on delete cascade
);

comment on table public.processo_eventos is 'Outbox durável de notificações de processos, isolado por escritório.';
comment on column public.processo_eventos.chave_origem is 'Identificador idempotente do evento de origem.';

create unique index if not exists idx_processo_eventos_origem_unica
  on public.processo_eventos (chave_origem);
create index if not exists idx_processo_eventos_tenant_data
  on public.processo_eventos (escritorio_id, data_evento desc);

alter table public.processo_eventos enable row level security;
drop policy if exists processo_eventos_read_tenant on public.processo_eventos;
create policy processo_eventos_read_tenant
  on public.processo_eventos
  for select
  to authenticated
  using (
    escritorio_id = (select public.my_escritorio_id())
    and (select public.has_permission('processos', 'read'))
  );

revoke all on table public.processo_eventos from public, anon, authenticated, service_role;
grant select on table public.processo_eventos to authenticated;

-- Uma transação pode atualizar o mesmo processo mais de uma vez; o txid coalesce
-- essas mudanças em um único evento, e a chave única protege contra repetição.
create or replace function public.emitir_evento_atualizacao_processo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  valores_anteriores jsonb;
  valores_atuais jsonb;
begin
  -- Metadados operacionais e identificadores não representam alteração de negócio.
  valores_anteriores := to_jsonb(old) - array[
    'id', 'escritorio_id', 'created_at', 'updated_at',
    'ultima_sync_cnj', 'datajud_atualizado_em'
  ]::text[];
  valores_atuais := to_jsonb(new) - array[
    'id', 'escritorio_id', 'created_at', 'updated_at',
    'ultima_sync_cnj', 'datajud_atualizado_em'
  ]::text[];

  if valores_atuais is not distinct from valores_anteriores then
    return new;
  end if;

  insert into public.processo_eventos (
    processo_id,
    escritorio_id,
    tipo,
    titulo,
    descricao,
    data_evento,
    chave_origem
  ) values (
    new.id,
    new.escritorio_id,
    'atualizacao_processo',
    'Processo atualizado',
    'As informações do processo foram atualizadas.',
    clock_timestamp(),
    format('atualizacao:%s:%s', new.id, txid_current())
  )
  on conflict (chave_origem) do nothing;

  return new;
end;
$$;

create or replace function public.emitir_evento_nova_movimentacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  -- A primeira carga do DataJud define visto_em; movimentações vistas não alertam.
  if new.visto_em is not null then
    return new;
  end if;

  insert into public.processo_eventos (
    processo_id,
    escritorio_id,
    tipo,
    titulo,
    descricao,
    data_evento,
    chave_origem
  ) values (
    new.processo_id,
    new.escritorio_id,
    'nova_movimentacao',
    'Nova movimentação processual',
    'Uma nova movimentação foi registrada neste processo.',
    clock_timestamp(),
    format('movimentacao:%s', new.id)
  )
  on conflict (chave_origem) do nothing;

  return new;
end;
$$;

drop trigger if exists processo_eventos_apos_atualizacao on public.processos;
create trigger processo_eventos_apos_atualizacao
  after update on public.processos
  for each row execute function public.emitir_evento_atualizacao_processo();

drop trigger if exists processo_eventos_apos_nova_movimentacao on public.processo_movimentacoes;
create trigger processo_eventos_apos_nova_movimentacao
  after insert on public.processo_movimentacoes
  for each row execute function public.emitir_evento_nova_movimentacao();
