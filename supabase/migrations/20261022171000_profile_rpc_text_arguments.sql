-- Use text parameters for optional profile values, since PostgREST's generated
-- client types do not represent nullable PostgreSQL function arguments.
drop function public.salvar_dados_pessoais_perfil(text, date, text, text, text);

create function public.salvar_dados_pessoais_perfil(
  p_nome text,
  p_data_nascimento text,
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
  v_nome text := trim(p_nome);
  v_data_nascimento date := nullif(trim(p_data_nascimento), '')::date;
  v_sexo text := nullif(trim(p_sexo), '');
  v_cpf text := nullif(trim(p_cpf), '');
  v_telefone text := nullif(trim(p_telefone), '');
begin
  if v_usuario_id is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;

  if v_nome is null or char_length(v_nome) < 2 or char_length(v_nome) > 120 then
    raise exception 'Nome inválido' using errcode = '22023';
  end if;

  if v_data_nascimento > current_date then
    raise exception 'Data de nascimento inválida' using errcode = '22023';
  end if;

  if v_sexo is not null and v_sexo not in ('masculino', 'feminino', 'outro') then
    raise exception 'Sexo inválido' using errcode = '22023';
  end if;

  if v_cpf is not null and v_cpf !~ '^[0-9]{11}$' then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;

  if v_telefone is not null and v_telefone !~ '^[0-9]{10,11}$' then
    raise exception 'Telefone inválido' using errcode = '22023';
  end if;

  update public.usuarios
  set nome = v_nome
  where id = v_usuario_id;

  if not found then
    raise exception 'Perfil não encontrado' using errcode = 'P0002';
  end if;

  insert into public.perfis_dados_pessoais (usuario_id, data_nascimento, sexo, cpf, telefone)
  values (v_usuario_id, v_data_nascimento, v_sexo, v_cpf, v_telefone)
  on conflict (usuario_id) do update
  set data_nascimento = excluded.data_nascimento,
      sexo = excluded.sexo,
      cpf = excluded.cpf,
      telefone = excluded.telefone;
end;
$$;

revoke all on function public.salvar_dados_pessoais_perfil(text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.salvar_dados_pessoais_perfil(text, text, text, text, text) to authenticated;
