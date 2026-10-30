-- Reserva por processo compartilhada entre o cron e a consulta manual.
-- ultima_tentativa_em aplica o limite de 24h inclusive quando o DataJud falha.
create table if not exists public.cnj_sync_process_claims (
  processo_id uuid primary key,
  escritorio_id uuid not null,
  lease_token uuid,
  lease_until timestamptz,
  ultima_tentativa_em timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint cnj_sync_process_claims_lease_pair_check
    check ((lease_token is null) = (lease_until is null)),
  constraint cnj_sync_process_claims_process_tenant_fkey
    foreign key (processo_id, escritorio_id)
    references public.processos (id, escritorio_id)
    on delete cascade
);

alter table public.cnj_sync_process_claims enable row level security;
revoke all on table public.cnj_sync_process_claims from public, anon, authenticated;
grant select, insert, update on table public.cnj_sync_process_claims to service_role;

comment on table public.cnj_sync_process_claims is
  'Reserva e última tentativa CNJ por processo; acessível somente ao backend.';
comment on column public.cnj_sync_process_claims.ultima_tentativa_em is
  'Início da última tentativa; impede nova consulta por 24h, inclusive após falha.';

create or replace function public.claim_cnj_sync_process(
  p_processo_id uuid,
  p_escritorio_id uuid,
  p_lease_token uuid,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_process_id uuid;
begin
  if p_processo_id is null or p_escritorio_id is null or p_lease_token is null then
    raise exception 'Missing CNJ sync claim argument';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'Invalid CNJ sync lease duration';
  end if;

  insert into public.cnj_sync_process_claims as claim (
    processo_id,
    escritorio_id,
    lease_token,
    lease_until,
    ultima_tentativa_em,
    updated_at
  )
  select
    processo.id,
    processo.escritorio_id,
    p_lease_token,
    clock_timestamp() + (p_lease_seconds * interval '1 second'),
    clock_timestamp(),
    clock_timestamp()
  from public.processos as processo
  where processo.id = p_processo_id
    and processo.escritorio_id = p_escritorio_id
    and processo.status = 'ativo'
    and (
      processo.ultima_sync_cnj is null
      or processo.ultima_sync_cnj <= clock_timestamp() - interval '24 hours'
    )
  on conflict (processo_id) do update
  set escritorio_id = excluded.escritorio_id,
      lease_token = excluded.lease_token,
      lease_until = excluded.lease_until,
      ultima_tentativa_em = excluded.ultima_tentativa_em,
      updated_at = excluded.updated_at
  where claim.escritorio_id = excluded.escritorio_id
    and (claim.lease_until is null or claim.lease_until <= clock_timestamp())
    and claim.ultima_tentativa_em <= clock_timestamp() - interval '24 hours'
  returning claim.processo_id into claimed_process_id;

  return claimed_process_id is not null;
end;
$$;

create or replace function public.release_cnj_sync_process(
  p_processo_id uuid,
  p_escritorio_id uuid,
  p_lease_token uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with released as (
    update public.cnj_sync_process_claims
    set lease_token = null,
        lease_until = null,
        updated_at = clock_timestamp()
    where processo_id = p_processo_id
      and escritorio_id = p_escritorio_id
      and lease_token = p_lease_token
    returning 1
  )
  select exists (select 1 from released);
$$;

revoke all on function public.claim_cnj_sync_process(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_cnj_sync_process(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_cnj_sync_process(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.release_cnj_sync_process(uuid, uuid, uuid) to service_role;
