-- Campos jurídicos adicionais em processos (aditivo e idempotente; sem mudança de RLS).
-- Já existiam: comarca, valor_causa, vara, uf, tribunal, classe_processual, data_distribuicao.
-- O polo do cliente já é guardado em processo_clientes.papel (autor/reu/terceiro).
alter table public.processos
  add column if not exists assunto text,
  add column if not exists assunto_codigo text,
  add column if not exists classe_codigo text,
  add column if not exists grau text,
  add column if not exists sistema text,
  add column if not exists nivel_sigilo smallint not null default 0 check (nivel_sigilo >= 0),
  add column if not exists datajud_atualizado_em timestamptz,
  add column if not exists codigo_municipio_ibge text,
  add column if not exists parte_contraria text,
  add column if not exists advogado_parte_contraria text;

comment on column public.processos.assunto is 'Assunto principal do processo (DataJud ou manual).';
comment on column public.processos.assunto_codigo is 'Código do assunto na TPU/CNJ.';
comment on column public.processos.classe_codigo is 'Código da classe processual na TPU/CNJ.';
comment on column public.processos.grau is 'Grau de jurisdição informado pelo DataJud (ex.: G1, G2, JE).';
comment on column public.processos.sistema is 'Sistema processual do tribunal (PJe, eproc, e-SAJ...).';
comment on column public.processos.nivel_sigilo is 'Nível de sigilo (0 = público). Acima de 0, tratar com cautela.';
comment on column public.processos.datajud_atualizado_em is 'Data/hora da última atualização do processo no DataJud.';
comment on column public.processos.codigo_municipio_ibge is 'Código IBGE do município do órgão julgador.';
comment on column public.processos.parte_contraria is 'Nome da parte contrária (informado manualmente).';
comment on column public.processos.advogado_parte_contraria is 'Advogado da parte contrária (informado manualmente).';
