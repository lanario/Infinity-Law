-- Lançamentos avulsos de receita e despesa do escritório.
create table public.lancamentos_financeiros (
  id            uuid primary key default uuid_generate_v4(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  tipo          text not null check (tipo in ('receita', 'despesa')),
  descricao     text not null check (char_length(trim(descricao)) between 2 and 160),
  categoria     text not null check (char_length(trim(categoria)) between 2 and 60),
  valor         numeric(15, 2) not null check (valor > 0),
  vencimento    date not null,
  status        text not null default 'pendente'
                  check (status in ('pendente', 'pago', 'vencido', 'cancelado')),
  data_pagamento date,
  cliente_id    uuid references public.clientes(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint lancamentos_financeiros_cliente_tenant_fkey
    foreign key (cliente_id, escritorio_id)
    references public.clientes (id, escritorio_id)
);

alter table public.lancamentos_financeiros enable row level security;

create policy "lancamentos_financeiros_tenant_rls"
  on public.lancamentos_financeiros
  for all
  to authenticated
  using (escritorio_id = (select public.my_escritorio_id()))
  with check (escritorio_id = (select public.my_escritorio_id()));

create index idx_lancamentos_financeiros_periodo
  on public.lancamentos_financeiros (escritorio_id, tipo, vencimento, status);
create index idx_lancamentos_financeiros_cliente
  on public.lancamentos_financeiros (cliente_id)
  where cliente_id is not null;

create trigger set_lancamentos_financeiros_updated_at
  before update on public.lancamentos_financeiros
  for each row execute function public.set_updated_at();

revoke all on table public.lancamentos_financeiros from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.lancamentos_financeiros to authenticated, service_role;
