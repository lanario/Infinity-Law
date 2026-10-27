# Arquitetura

## Estrutura (observada)

- `src/app/(auth)`: login, signup, esqueci/recuperar senha.
- `src/app/(dashboard)`: dashboard, clientes, processos (+ `@modal`), agenda, financeiro, comunicacao, intimacoes, relatorios, configuracoes, perfil, planos.
- `src/app/actions/*.ts`: server actions por domínio.
- `src/app/api/*`: `cnj/consulta`, `djen/{clientes,oabs,sync}`, `notificacoes`, `relatorios/{excel,pdf}`, `whatsapp/send`.
- `src/middleware.ts`: renova sessão Supabase (`src/lib/supabase/middleware.ts`).
- `src/components/<feature>` e `src/components/ui` (shadcn, style base-nova).
- `src/lib`: `supabase/{server,client,admin}`, `permissions`, `server/*` (acesso requerido, estado de erro de query), `validations/*.schema.ts` (Zod), `cnj`, `djen`, `agenda`, `processos`, `whatsapp`, `turnstile`, `audit`.
- `supabase/migrations` (16 arquivos) e `supabase/functions/cnj-sync` (Edge Function).
- Tipos do banco: `src/types/database.types.ts`.

## Dados e segurança

- Tenant: `escritorios`. RLS habilitado nas tabelas das migrations.
- Cliente `admin` (service role) é só servidor. `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `CNJ_DATAJUD_API_KEY`, `WEBHOOK_SECRET` nunca com `NEXT_PUBLIC_`.
- Headers de segurança em `next.config.mjs`.

## Decisões

- Stack Supabase (sem Drizzle/Pino): o padrão do toolkit foi preservado como exceção. Revisitar só por decisão do dono.
- Divergência conhecida: `components.json` aponta `tailwind.config.ts`; o arquivo real é `tailwind.config.js`.
