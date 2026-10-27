-- Índices de apoio a consultas frequentes (dashboard, listagens, agenda, notificações).
-- Aditiva e idempotente: não altera tabelas, policies nem RLS.
-- Sem CONCURRENTLY de propósito: migrations rodam dentro de uma transação, e
-- CREATE INDEX CONCURRENTLY não pode ser executado em transação. Em tabelas muito
-- grandes, considere criar os índices manualmente com CONCURRENTLY antes de aplicar.

-- Movimentações recentes do escritório (radar do dashboard)
create index if not exists idx_movimentacoes_tenant_data
  on public.processo_movimentacoes (escritorio_id, data_movimento desc);

-- Prazos/audiências por janela de datas (dashboard, notificações)
create index if not exists idx_eventos_tenant_tipo_inicio
  on public.eventos (escritorio_id, tipo, inicio);

-- Processos de um cliente (PK atual é processo_id, cliente_id)
create index if not exists idx_processo_clientes_cliente
  on public.processo_clientes (cliente_id);

-- Publicações recentes do DJEN (notificações)
create index if not exists idx_djen_publicacoes_tenant_created
  on public.djen_publicacoes (escritorio_id, created_at desc);

-- Recebimentos por data de pagamento (gráfico do dashboard)
create index if not exists idx_parcelas_tenant_status_pagamento
  on public.parcelas (escritorio_id, status, data_pagamento);

-- Listagem de processos mais recentes
create index if not exists idx_processos_tenant_created
  on public.processos (escritorio_id, created_at desc);

-- Listagem de clientes ordenada por nome, filtrando ativos
create index if not exists idx_clientes_tenant_ativo_nome
  on public.clientes (escritorio_id, ativo, nome);
