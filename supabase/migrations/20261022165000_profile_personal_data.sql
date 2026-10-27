-- Keep sensitive personal profile data separate from tenant-readable user records.
create table public.perfis_dados_pessoais (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  data_nascimento date,
  sexo text,
  cpf text,
  telefone text,
  constraint perfis_dados_pessoais_sexo_check
    check (sexo is null or sexo in ('masculino', 'feminino', 'outro')),
  constraint perfis_dados_pessoais_cpf_check
    check (cpf is null or cpf ~ '^[0-9]{11}$'),
  constraint perfis_dados_pessoais_telefone_check
    check (telefone is null or telefone ~ '^[0-9]{10,11}$')
);

alter table public.perfis_dados_pessoais enable row level security;

create policy "perfis_dados_pessoais_owner_rls" on public.perfis_dados_pessoais
  for all
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke all on table public.perfis_dados_pessoais from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.perfis_dados_pessoais to authenticated, service_role;

create or replace function public.salvar_dados_pessoais_perfil(
  p_nome text,
  p_data_nascimento date,
  p_sexo text,
  p_cpf text,
  p_telefone text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_usuario_id uuid := auth.uid();
begin
  if v_usuario_id is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;

  if p_nome is null or char_length(trim(p_nome)) < 2 or char_length(trim(p_nome)) > 120 then
    raise exception 'Nome inválido' using errcode = '22023';
  end if;

  if p_data_nascimento > current_date then
    raise exception 'Data de nascimento inválida' using errcode = '22023';
  end if;

  if p_sexo is not null and p_sexo not in ('masculino', 'feminino', 'outro') then
    raise exception 'Sexo inválido' using errcode = '22023';
  end if;

  if p_cpf is not null and p_cpf !~ '^[0-9]{11}$' then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;

  if p_telefone is not null and p_telefone !~ '^[0-9]{10,11}$' then
    raise exception 'Telefone inválido' using errcode = '22023';
  end if;

  update public.usuarios
  set nome = trim(p_nome)
  where id = v_usuario_id;

  if not found then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  insert into public.perfis_dados_pessoais (usuario_id, data_nascimento, sexo, cpf, telefone)
  values (v_usuario_id, p_data_nascimento, p_sexo, p_cpf, p_telefone)
  on conflict (usuario_id) do update
  set data_nascimento = excluded.data_nascimento,
      sexo = excluded.sexo,
      cpf = excluded.cpf,
      telefone = excluded.telefone;
end;
$$;

revoke all on function public.salvar_dados_pessoais_perfil(text, date, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.salvar_dados_pessoais_perfil(text, date, text, text, text) to authenticated;
