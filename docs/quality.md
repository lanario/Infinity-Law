# Qualidade

## Comandos

- `npm run typecheck` (tsc --noEmit).
- `npm run lint` (next lint; `.eslintrc.json`: next/core-web-vitals, next/typescript, no-explicit-any=error, no-unused-vars=error).
- `npm test` (node --test; 10 arquivos listados no script. Nova suíte exige adicionar o arquivo ao script).
- `npm run build`.

## Baseline antes do setup (2026-10-26, Node 24.16.0)

| Check | Resultado |
|---|---|
| typecheck | FALHA: 2 erros em `src/app/(dashboard)/clientes/[id]/page.tsx` (83,38) e (86,33): `Property 'nome' does not exist on type 'never'` |
| lint | FALHA: 1 erro em `src/components/agenda/agenda-workspace-views.tsx` 11:3, import `UserRound` não usado |
| test | OK: 46 pass, 0 fail |
| build | não executado (evita sobrescrever `.next` e depender de env) |
| npm audit --omit=dev | 6 vulnerabilidades (2 moderate, 3 high, 1 critical); inclui zod 3.x (GHSA-mrhx-c7xc-m3w5; correção exige zod 4, breaking). Não corrigido. |

Falhas acima são anteriores ao setup e não foram corrigidas (`src/` intocado).

## Regras

- Referência: 350 linhas por arquivo. Excedem hoje: `novo-processo-form.tsx` (836), `sidebar.tsx` (685), `agenda-workspace-views.tsx` (646), `perfil-workspace.tsx` (617). Regras de lint do toolkit (`quality/*`) não adotadas; ver `docs/setup.md`.
- 16 arquivos usam `console.*` direto; não há logger estruturado. Proposta futura, não aplicada.

## Estratégia de testes

Testes cobrem validação DJEN, segurança, estado de erro de query, filtros de processos, formulário de processo, erro DataJud e agenda. Não há testes de UI, E2E nem de RLS. Cada correção deve ter teste de regressão quando viável.

## Security review

Prompt versionado: `docs/prompts/13-security-review.md` do toolkit (cópia local `~/vibe-toolkit-src/vibe-coding-toolkit`, revisão 790a895). Invocação: pedir ao agente que execute o bloco "Prompt" desse arquivo neste projeto (baseline do repositório ou diff). Somente leitura; relatório privado e redigido, fora de área versionável. Áreas prioritárias: RLS e isolamento por escritório, uso do cliente `admin`, rotas `api/*` (whatsapp, cnj, djen, relatorios), server actions, bypass de Turnstile em dev, headers. Não executada neste setup.

## Revisão

Escopo proporcional ao risco e ao diff. Revisão independente para mudanças não triviais quando disponível; registrar alvo, achados e riscos residuais.
