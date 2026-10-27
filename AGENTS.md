# Infinity Law

> Instruções compartilhadas para agentes. Detalhes ficam em `PRODUCT.md` e `docs/`.

## Produto e stack

- Produto e escopo: `PRODUCT.md`. Arquitetura: `docs/architecture.md`.
- Stack observada: Next.js 14.2.29 (App Router), React 18.3.1, TypeScript, Tailwind 3, shadcn (style base-nova, `@base-ui/react`), Supabase (Postgres + Auth + Edge Functions), Zod, react-hook-form. Gerenciador: npm (`package-lock.json`). Node 24.
- Setup e evidências: `docs/setup.md`. Qualidade: `docs/quality.md`.

## Comandos canônicos

- Instalar: `npm install`
- Desenvolver: `npm run dev`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Testes: `npm test` (node:test, arquivos listados no script)
- Build: `npm run build`
- Verificação combinada: `npm run typecheck && npm run lint && npm test`
- Regras locais de lint do toolkit: indisponível (não adotado; ver `docs/setup.md`).

Baseline pré-setup com falhas conhecidas: ver `docs/quality.md`.

## Acordos de trabalho

- Ler instruções e código relevante antes de editar. Declarar premissas que afetam comportamento.
- Menor mudança suficiente; reusar padrões, componentes e dependências existentes.
- Preservar validação, tratamento de erro, segurança, acessibilidade e multi-tenancy.
- Não criar abstrações, opções, dependências ou features não pedidas.
- Rodar checks adequados; testar lógica e regressões relevantes.
- Não tratar suposição como fato nem integração pendente como resultado.
- Publicar, enviar mensagens a terceiros (WhatsApp/e-mail), custos, migrations em produção e ações destrutivas exigem autorização explícita.
- Nunca colocar credenciais em arquivos versionados; `.env.local` não é lido nem copiado.
- Sem git neste diretório: antes de editar arquivo existente fora de tarefa trivial, fazer backup ao lado.

## Continuidade

- Bloqueio afeta só tarefas dependentes; concluir o restante autorizado.
- Não repetir tentativa idêntica sem evidência nova.
- Trabalho multi-sessão: handoff curto no registro de plano existente (objetivo, estado verificado, checks, pendências, próxima ação).

## Convenções do projeto

- Idioma de UI e domínio: pt-BR. Docs e comunicação com o dono: pt-BR.
- Rotas em `src/app` (grupos `(auth)`, `(dashboard)`), server actions em `src/app/actions`, APIs em `src/app/api`, componentes por feature em `src/components`, lógica em `src/lib`, schemas Zod em `src/lib/validations`.
- Acesso a dados via clientes em `src/lib/supabase` (`server`, `client`, `admin`). `admin` (service role) só no servidor.
- Permissões por módulo/ação: `src/lib/permissions.ts`, `src/lib/server/required-access.ts`.
- Migrations Supabase em `supabase/migrations`. Não aplicar em ambiente real sem decisão do dono.
- Tipos do banco em `src/types/database.types.ts` (gerado; não editar à mão).

## Ferramentas e estilo

- Ponytail (full), Caveman e Superpowers: plugins instalados na máquina; usar skills proporcionais ao escopo. Código, docs e commits em linguagem normal.
- Context7: consultar docs atuais de Next/Supabase/libs antes de mudar APIs; nunca enviar segredos ou código privado.
- RTK: instalado (`rtk` 1.0.1) mas hook global não confirmado; sem hook ativo, prefixar comandos suportados com `rtk`; `rtk proxy <cmd>` para saída original.
- Graphify: não instalado; não presumir grafo existente.
- Subagentes: só quando isolamento/especialização/paralelismo justificam. Modelo mais leve capaz de cumprir os critérios; mais capacidade para segurança, autorização, dados e migrations. Um escritor por arquivo.

## Skills (instaladas na máquina, escopo usuário)

- Plugins: `superpowers`, `ponytail`, `caveman`, `frontend-design`.
- Skills Vercel (react-best-practices, web-design-guidelines, next-dev-loop, etc.), `supabase-postgres-best-practices`, `differential-review`, `shadcn`: NÃO instaladas; pendentes (ver `docs/setup.md`). Não referenciar como disponíveis.

## Revisão

- Revisão proporcional ao risco e ao diff real. Para código de auth, permissões, RLS, service role ou dados de clientes, revisar com atenção a isolamento por tenant.
- Revisão de segurança: `docs/quality.md` (seção Security review).
