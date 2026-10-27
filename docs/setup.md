# Setup e evidências

## Fonte e contexto

- Data: 2026-10-26. Toolkit: vibe-coding-toolkit, revisão `790a895` (2026-10-18), cópia local em `~/vibe-toolkit-src/vibe-coding-toolkit`. Atualização da cópia não verificada (frescor não confirmado).
- Prompt aplicado: `docs/prompts/12-existing-project-setup.md`, em modo aditivo (somente docs; `src/` intocado). Projeto sem git; nenhum arquivo existente foi editado, logo não houve backup necessário.
- Cliente: Claude Code. Subagente de setup com modelo Sonnet 5.5 (herdado da sessão). Sem custos estimados.
- Docs criados: `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `PRODUCT.md`, `README.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, `docs/setup.md`. Nenhum documento prévio equivalente existia.

## Decisões

- Stack preservada (Next 14.2.29, Supabase, Zod, npm). Padrões do toolkit Drizzle/Pino/Vitest não adotados: incompatíveis com o projeto atual; registrado como exceção em `docs/architecture.md`.
- Regras ESLint do toolkit (`templates/eslint`, 350 linhas, no-direct-console etc.) não copiadas: há violações legadas (4 arquivos > 350 linhas, 16 com `console.*`) e a medição por regra ainda não foi feita. Próximo passo proposto: medir e adotar em `warn`.
- Hooks Git, bloqueio de main, branch obrigatória: não adicionados (por regra do toolkit).
- Hooks de cliente: nenhum adicionado (nenhum necessário/testado).

## Matriz de cobertura

| Componente | Decisão | Estado |
|---|---|---|
| Superpowers | Reusar plugin global | Instalado (`superpowers@claude-plugins-official`); carregamento em sessão nova não observado |
| Ponytail | Reusar plugin global | Instalado (`ponytail@ponytail`); ativo nesta sessão |
| Caveman | Reusar plugin global | Instalado (`caveman@caveman`); ativo nesta sessão |
| frontend-design | Reusar (extra) | Instalado (`frontend-design@claude-plugins-official`) |
| RTK | Pendente de hook | Binário `rtk 1.0.1` no PATH; `~/.claude/settings.json` sem menção a rtk, hook global não confirmado. Comando: `rtk init --global` (altera settings do sistema; não executado) |
| Context7 | Usar via MCP | Ferramentas `mcp__context7__*` disponíveis na sessão; consulta real não executada neste setup |
| Graphify | Bloqueado | Não instalado. `uv` existe. Comando: `uv tool install graphifyy` e depois `graphify install` |
| agent-browser | Bloqueado/opcional | Não instalado. Ver `docs/tools/11-agent-browser.md` do toolkit |
| Chrome DevTools MCP | Opcional | Não configurado. Existe ferramenta de navegador na sessão para fluxos de UI |
| Skills Vercel (react-best-practices, web-design-guidelines, composition-patterns, etc.) | Aplicável (Next/React) | Não instaladas; requer rede e `npx skills` (ver `docs/tools/16-vercel-skills.md`) |
| next-dev-loop | Aplicável a Next compatível | Pendente (depende de agent-browser/MCP de runtime). Next 14 pode ser incompatível; verificar guia 17 |
| next-bundle-optimizer | Parcial | Pendente; verificar compatibilidade com Next 14.2 / webpack |
| supabase-postgres-best-practices | Aplicável (Postgres/Supabase) | Pendente de instalação local |
| gh-fix-ci | Inaplicável agora | Sem git/GitHub Actions no projeto |
| differential-review | Aplicável (segurança) | Pendente de instalação; fallback: revisão manual (`docs/quality.md`) |
| shadcn skill | Aplicável (shadcn adotado) | Pendente de instalação; não trocar UI |
| Sentry MCP | Não adotado | Sem serviço Sentry escolhido; decisão do dono |
| Harness2 / prompt 14-15 | Documentado | Smoke cases não executados |
| Security review (prompt 13) | Referenciado | Fonte e invocação em `docs/quality.md`; não executado |
| Memória em camadas | Reusar memória nativa do Claude Code | Índice em memória do cliente; `AGENTS.md` é o índice versionado |
| Artifact skills / skill-creator / aia-harness / plugins oficiais extras | Não necessários | Sem necessidade do projeto; revisitar sob demanda |

## Checks

Ver baseline em `docs/quality.md`. Antes e depois do setup são idênticos porque `src/` e config não mudaram.

| Item | Estado | Evidência |
|---|---|---|
| typecheck | FALHA pré-existente | 2 erros TS2339 em `clientes/[id]/page.tsx` |
| lint | FALHA pré-existente | 1 erro `UserRound` não usado em `agenda-workspace-views.tsx` |
| test | Validado | 46 pass, 0 fail |
| Validações do toolkit | Ver relatório | `validate-docs`: PASS; `validate-docs.test`: 9/9; `validate-harness.test`: 2/2. `validate-harness.mjs` (fixture deliberadamente insegura) e `validate-next.mjs`/`check-eslint.mjs` (validam scaffold descartável do toolkit) não se aplicam a este projeto |

## Memória e harness

- Memória: nativa do Claude Code (global do usuário) + `AGENTS.md`/`docs/*` versionáveis. Recuperação em contexto limpo não observada.
- Smoke cases de harness: não executados.

## Pendências e próxima entrega

1. Decidir correção das falhas pré-existentes (typecheck/lint) e do `npm audit` (zod 4 é breaking).
2. Decidir instalação de skills de projeto (comandos acima) e `rtk init --global`.
3. Medir violações por regra e adotar regras de qualidade em `warn`.
4. Rodar security review baseline (RLS, service role, rotas api).
5. Reaplicar este setup: pedir ao agente o prompt 12 do toolkit; preservar customizações e atualizar este arquivo.
