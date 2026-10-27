-- Detalhes de movimentações do processo (aditivo e idempotente; sem mudança de RLS ou índices).
alter table public.processo_movimentacoes
  add column if not exists data_hora timestamptz,
  add column if not exists complementos jsonb,
  add column if not exists visto_em timestamptz;

comment on column public.processo_movimentacoes.data_hora is 'Data e hora do movimento informadas pelo DataJud (dataHora).';
comment on column public.processo_movimentacoes.complementos is 'Complementos tabelados do movimento: [{nome, descricao?}].';
comment on column public.processo_movimentacoes.visto_em is 'Quando o escritório viu o movimento; null = novo.';
