-- Estado privado ao backend para percorrer todos os processos elegíveis em páginas.
-- O cursor avança mesmo quando um processo falha; erros recentes recebem cooldown
-- consultando cnj_sync_errors, e uma lease evita duas execuções simultâneas.
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.cnj_sync_state (
  id text primary key check (id = 'automatic'),
  cursor_processo_id uuid,
  lease_token uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.cnj_sync_state (id)
values ('automatic')
on conflict (id) do nothing;

alter table public.cnj_sync_state enable row level security;
revoke all on table public.cnj_sync_state from public, anon, authenticated;
grant select, update on table public.cnj_sync_state to service_role;

comment on table public.cnj_sync_state is
  'Cursor e lease do sync CNJ automático; acessível somente ao service_role.';
comment on column public.cnj_sync_state.cursor_processo_id is
  'Último processo considerado; keyset traversal continua na próxima execução.';
comment on column public.cnj_sync_state.lease_until is
  'Expiração da lease para recuperar execuções interrompidas.';

-- Requer no Vault os nomes supabase_project_url, supabase_publishable_key e
-- cnj_sync_cron_secret. Se algum ainda não existir, o job não envia a chamada.
-- A chave publicável apenas identifica o projeto; a função valida o segredo de cron
-- e usa a service role configurada na Edge Function somente no backend.
select cron.schedule(
  'cnj-sync-every-five-minutes',
  '*/5 * * * *',
  $cron_command$
    with secrets as (
      select
        max(decrypted_secret) filter (where name = 'supabase_project_url') as project_url,
        max(decrypted_secret) filter (where name = 'supabase_publishable_key') as publishable_key,
        max(decrypted_secret) filter (where name = 'cnj_sync_cron_secret') as cron_secret
      from vault.decrypted_secrets
      where name in (
        'supabase_project_url',
        'supabase_publishable_key',
        'cnj_sync_cron_secret'
      )
    )
    select net.http_post(
      url := secrets.project_url || '/functions/v1/cnj-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', secrets.publishable_key,
        'X-Cron-Secret', secrets.cron_secret
      ),
      body := jsonb_build_object('triggered_at', now()),
      timeout_milliseconds := 120000
    )
    from secrets
    where nullif(secrets.project_url, '') is not null
      and nullif(secrets.publishable_key, '') is not null
      and nullif(secrets.cron_secret, '') is not null;
  $cron_command$
);
