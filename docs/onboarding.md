# Onboarding

1. Node 24 e npm 11 (versões observadas). `npm install`.
2. Copiar `.env.example` para `.env.local` e preencher com valores do projeto Supabase de desenvolvimento. Nunca commitar nem colar segredos em chat.
3. `npm run dev` (porta 3000).
4. Supabase CLI é devDependency (`npx supabase`). Migrations só aplicadas com autorização do dono.
5. Verificar: `npm run typecheck && npm run lint && npm test`.
6. Agentes: ler `AGENTS.md`. Plugins necessários na máquina: superpowers, ponytail, caveman (ver `docs/setup.md`).
