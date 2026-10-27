# Infinity Law

> Descrito a partir do código observado (rotas, migrations, schemas). Itens marcados "premissa" não foram confirmados com o dono.

## Problema e objetivo

Sistema de gestão para escritórios de advocacia (SaaS multi-escritório): clientes, processos, agenda, financeiro, comunicação e monitoramento de publicações/intimações. Premissa: objetivo comercial é vender acesso por escritório (existe rota `/planos`).

## Público e papéis

- Escritórios de advocacia (tenant = tabela `escritorios`), com usuários e cargos.
- Controle de acesso por módulo e ação (read/write/delete) com flag de admin (`src/lib/permissions.ts`; tabelas `cargos`, `usuarios`).

## Fluxos observados

- Autenticação: login, cadastro, recuperação de senha, Turnstile (Cloudflare).
- Clientes: lista, busca, cadastro, prontuário, documentos.
- Processos: lista, novo, detalhe (modal interceptado), consulta CNJ/DataJud, movimentações.
- Agenda: calendário, linha do tempo da equipe, eventos com responsável.
- Financeiro: lançamentos, honorários, parcelas.
- Comunicação: WhatsApp (templates, envio, log).
- Intimações: monitoramento DJEN por OAB, publicações.
- Relatórios: exportação Excel e PDF.
- Configurações: usuários, perfil, dados pessoais.

## Fora de escopo deste setup

Mudanças de produto, stack, banco, migrations aplicadas e deploy.

## Requisitos

- Idioma pt-BR. Isolamento de dados por escritório (RLS habilitado nas tabelas de `supabase/migrations`).
- Premissa: dados de clientes são pessoais (LGPD); sem segredos ou dados completos em logs.

## Restrições técnicas

Next.js 14.2.29 App Router, TypeScript, Supabase, npm. Ver `docs/architecture.md`. Migração de stack não aprovada.

## Premissas e decisões pendentes

- Modelo de planos/cobrança: não verificado.
- Ambiente de produção/hosting: não informado.
- Critérios de aceite de produto: não documentados; definir por fluxo antes de novas features.
