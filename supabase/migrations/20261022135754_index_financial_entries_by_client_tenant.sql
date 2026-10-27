drop index if exists public.idx_lancamentos_financeiros_cliente;

create index idx_lancamentos_financeiros_cliente_tenant
  on public.lancamentos_financeiros (cliente_id, escritorio_id);
