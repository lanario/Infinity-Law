-- Dados de entrada solicitados no cadastro de processos.
-- O CNJ pode ser informado posteriormente, quando o processo ainda estiver em
-- fase de requerimento, negociação ou preparação.
alter table public.processos
  alter column numero_cnj drop not null;

alter table public.processos
  add column grupo_acao text
    check (grupo_acao in ('contencioso', 'consultivo', 'administrativo', 'extrajudicial')),
  add column etapa text,
  add column numero_protocolo text,
  add column processo_originario text,
  add column pasta_caso text,
  add column data_requerimento date,
  add column classe_processual text;

alter table public.processos
  drop constraint if exists processos_fase_check;

alter table public.processos
  add constraint processos_fase_check
    check (fase in (
      'negociacao',
      'extrajudicial',
      'conhecimento',
      'recursal',
      'execucao',
      'cumprimento_sentenca',
      'liquidacao',
      'arquivado'
    ));

-- O percentual e o valor seguem no cadastro financeiro já existente; esta
-- classificação complementa o contrato de honorários do processo.
alter table public.honorarios
  add column contingenciamento text
    check (contingenciamento in ('nao', 'parcial', 'integral'));

create index if not exists idx_honorarios_processo
  on public.honorarios(processo_id)
  where processo_id is not null;
