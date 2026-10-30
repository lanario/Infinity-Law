# Integrações CNJ (DataJud) e DJEN

## DataJud

Código: `src/lib/cnj/tribunais.ts` (tabela J.TR, fonte única), `cnj-validator.ts`, `datajud-search.mjs` (URL, busca, retry, erros), `DataJudAdapter.ts`, `datajud-error.mjs` (mensagens). Edge function `supabase/functions/cnj-sync/index.ts` mantém uma cópia da tabela (Deno não importa de `src`): alterar as duas juntas.

Corrigido:
- URL agora é `<base>/api_publica_<alias>/_search` (antes `/api_publica/<alias>/_search`); barras finais da base são normalizadas.
- Busca por `numeroProcesso` com 20 dígitos sem máscara.
- 404/401/403/429/5xx, timeout e resposta inválida viram erro explícito (`DataJudError`) com mensagem amigável; só HTTP 200 com hits vazios significa "processo não encontrado". Timeout/retry (429, orçamento 9 s) e `maxDuration` preservados.
- DF = `tjdft`; edge function: mapa eleitoral corrigido (a ordem TR dos TREs é a mesma dos TJs, ex.: MG=13, MT=11), retry 429 usa a resposta nova, timeout de 10 s.

Cobertura (J.TR): TJs 8.01-27 (DF=tjdft), TRF 4.01-06, TRT 5.01-24, TST 5.00, TRE 6.01-27 (`tre-<uf>`, DF=`tre-dft`), TSE 6.00, STJ 3.00, STM 7.00-12 (índice único `stm`), TJMMG 9.13, TJMRS 9.21, TJMSP 9.26. Sem alias (retorna "não encontrado"): STF (J=1), CNJ (J=2).

## Sincronização diária de processos CNJ

- O cron dispara a Edge Function a cada cinco minutos; a função percorre em lotes os processos `ativos` com formato CNJ válido cuja última sincronização tenha pelo menos 24 horas. Processos sem CNJ ficam fora da fila e não bloqueiam o cursor.
- A consulta automática e a manual usam a mesma reserva atômica por processo e escritório. O início de cada tentativa também grava `ultima_tentativa_em`; erros e respostas sem hit ficam em cooldown por 24 horas. Reservas são liberadas no fim e expiram automaticamente após 10 minutos em caso de interrupção.
- O cooldown começa quando uma tentativa é reservada, inclusive em falha do DataJud ou erro de persistência. `ultima_sync_cnj` só avança após persistir as movimentações (ou uma resposta válida sem movimentações); se a persistência falhar, os dados ainda podem levar até 24 horas para uma nova consulta automática.
- A consulta manual de um caso já cadastrado exige `processoId` validado no escritório e aproveita o cache de 24 horas. Chamadas sem `processoId` são pré-consultas de preenchimento do formulário: não persistem resultado nem entram no cooldown diário por processo.
- A sincronização manual só atualiza `ultima_sync_cnj` depois de persistir as movimentações. Uma resposta válida sem movimentações também conclui a sincronização diária.
- A migration `20261030181411_daily_cnj_sync.sql` agenda o cron; `20261030192024_process_cnj_sync_claims.sql` cria as reservas e RPCs restritos a `service_role`. `supabase/config.toml` desativa a verificação JWT de gateway somente para `cnj-sync`; a própria função exige `X-Cron-Secret` antes de acessar dados.
- Para ativar em outro ambiente, cadastrar no Vault `supabase_project_url`, `supabase_publishable_key` e `cnj_sync_cron_secret`; configurar o secret `CNJ_SYNC_CRON_SECRET` na Edge Function com o mesmo valor; aplicar as migrations e fazer deploy da função. O cron manda apenas a chave publicável no header `apikey`; não transmite service role pelo `pg_net`.
- Migrations e deploy não são aplicados à produção por esta alteração local.

## DJEN (`/api/djen/sync`)

- Consulta paginada (`pagina`, `itensPorPagina=100`) até acumular `count`, com tetos: 20 páginas / 2000 itens, 40 s de rede, `maxDuration = 60`, 20 s por chamada. `count` agora é o total da consulta (não exige igualar os itens da página).
- Página vazia antes do total, ou página sem item novo (API ignorando `pagina`), é erro 502 sem marcar nada.
- 429 em qualquer página retorna 429 com cabeçalhos de rate limit; nada é gravado antes de todas as páginas serem lidas.
- Se bater nos tetos: grava o que veio (idempotente), responde `truncado: true` e NÃO atualiza `ultima_sincronizacao_em`.
- Preservados: tenant, upsert idempotente por hash, janela máxima de 30 dias.

## Exclusão de monitoramento por OAB

- `DELETE /api/djen/oabs/[id]` exige a permissão `comunicacao.delete` e filtra a exclusão pelo ID do monitoramento e pelo escritório derivado da sessão autenticada. Um ID de outro escritório retorna como não encontrado.
- Excluir um monitoramento remove os vínculos daquela OAB em `djen_publicacoes_monitoramentos` pela chave estrangeira com `ON DELETE CASCADE`. As linhas de `djen_publicacoes` não dependem do monitoramento e permanecem no histórico; associações com outras OABs também permanecem.
- A confirmação da interface comunica esse efeito antes da exclusão. Nenhuma migration ou alteração remota é necessária.

## Variáveis de ambiente (somente nomes)

`CNJ_DATAJUD_API_KEY`, `CNJ_DATAJUD_BASE_URL` (ex.: origem do host, sem `/api_publica...`).

## Só confirmável com chave e rede reais

- Aliases TRE (`tre-xx`, `tre-dft`), TST, TSE, STM, TJMs e `tjdft` contra a lista oficial (wiki do DataJud estava com 403 na leitura).
- Que `numeroProcesso` com 20 dígitos casa com `match` (fonte secundária indica que sim).
- `pagina` / `itensPorPagina=100` no DJEN (swagger oficial inacessível; fontes secundárias: valores aceitos 5 ou 100, até 10.000 resultados, limite por IP, 429 → esperar 1 min) e a semântica de `count` (assumido: total da consulta).
- Edge function precisa de deploy manual (não feito).
