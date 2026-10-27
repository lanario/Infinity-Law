-- =============================================
-- Migration 0005: Financeiro — Honorários e Parcelas
-- =============================================

-- Contratos de honorários
create table public.honorarios (
  id                  uuid primary key default uuid_generate_v4(),
  escritorio_id       uuid not null references public.escritorios(id) on delete cascade,
  processo_id         uuid references public.processos(id) on delete cascade,
  cliente_id          uuid not null references public.clientes(id),
  tipo                text not null check (tipo in ('fixo', 'exito', 'misto')),
  descricao           text,
  valor_fixo          numeric(15, 2),
  percentual_exito    numeric(5, 2),
  base_calculo_exito  text,
  status              text not null default 'ativo'
                        check (status in ('ativo', 'cancelado', 'encerrado')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint honorarios_id_escritorio_unique unique (id, escritorio_id),
  constraint honorarios_processo_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id),
  constraint honorarios_cliente_tenant_fkey
    foreign key (cliente_id, escritorio_id)
    references public.clientes (id, escritorio_id)
);

alter table public.honorarios enable row level security;

create policy "honorarios_tenant_rls" on public.honorarios
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_honorarios_escritorio on public.honorarios(escritorio_id);
create index idx_honorarios_cliente on public.honorarios(cliente_id);

create trigger set_honorarios_updated_at
  before update on public.honorarios
  for each row execute function public.set_updated_at();

revoke all on table public.honorarios from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.honorarios to authenticated, service_role;

-- Parcelas de honorários
create table public.parcelas (
  id              uuid primary key default uuid_generate_v4(),
  escritorio_id   uuid not null references public.escritorios(id) on delete cascade,
  honorario_id    uuid not null references public.honorarios(id) on delete cascade,
  numero_parcela  integer not null,
  valor           numeric(15, 2) not null,
  vencimento      date not null,
  status          text not null default 'pendente'
                    check (status in ('pendente', 'pago', 'vencido', 'cancelado')),
  data_pagamento  date,
  forma_pagamento text,
  observacoes     text,
  created_at      timestamptz not null default now(),
  constraint parcelas_honorario_tenant_fkey
    foreign key (honorario_id, escritorio_id)
    references public.honorarios (id, escritorio_id)
);

alter table public.parcelas enable row level security;

create policy "parcelas_tenant_rls" on public.parcelas
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_parcelas_honorario on public.parcelas(honorario_id);
create index idx_parcelas_vencimento on public.parcelas(vencimento);
create index idx_parcelas_status_escritorio on public.parcelas(escritorio_id, status, vencimento);

revoke all on table public.parcelas from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.parcelas to authenticated, service_role;

-- Função: criar parcelas em transação atômica
create or replace function public.criar_parcelas(
  p_honorario_id     uuid,
  p_escritorio_id    uuid,
  p_valor_total      numeric,
  p_n_parcelas       integer,
  p_data_primeira    date
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_valor_parcela numeric(15, 2);
  v_resto         numeric(15, 2);
  i               integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuário autenticado é obrigatório'
      using errcode = '42501';
  end if;

  if p_honorario_id is null
    or p_escritorio_id is null
    or p_data_primeira is null
    or not isfinite(p_data_primeira)
    or p_n_parcelas is null
    or p_n_parcelas < 1
    or p_n_parcelas > 600
    or p_valor_total is null
    or p_valor_total <= 0
    or p_valor_total >= 10000000000000::numeric
    or p_valor_total <> round(p_valor_total, 2)
  then
    raise exception 'Parâmetros de parcelamento inválidos'
      using errcode = '22023';
  end if;

  if p_escritorio_id is distinct from (select public.my_escritorio_id())
    or not exists (
      select 1
      from public.usuarios u
      where u.id = (select auth.uid())
        and u.escritorio_id = p_escritorio_id
        and u.ativo = true
    )
  then
    raise exception 'Usuário sem acesso a este escritório'
      using errcode = '42501';
  end if;

  perform 1
  from public.honorarios h
  where h.id = p_honorario_id
    and h.escritorio_id = p_escritorio_id
  for key share;

  if not found then
    raise exception 'Honorário não encontrado neste escritório'
      using errcode = '42501';
  end if;

  v_valor_parcela := round(p_valor_total / p_n_parcelas, 2);
  v_resto := p_valor_total - (v_valor_parcela * (p_n_parcelas - 1));

  for i in 1..p_n_parcelas loop
    insert into public.parcelas (
      escritorio_id,
      honorario_id,
      numero_parcela,
      valor,
      vencimento
    ) values (
      p_escritorio_id,
      p_honorario_id,
      i,
      case when i = p_n_parcelas then v_resto else v_valor_parcela end,
      (p_data_primeira + ((i - 1) * interval '1 month'))::date
    );
  end loop;
end;
$$;

revoke all on function public.criar_parcelas(uuid, uuid, numeric, integer, date)
  from public, anon, authenticated, service_role;
grant execute on function public.criar_parcelas(uuid, uuid, numeric, integer, date)
  to authenticated;
