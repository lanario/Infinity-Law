-- Provisiona o primeiro operador autorizado sem depender de metadata editável
-- do Auth. O bloco DO é uma única instrução transacional; qualquer falha reverte
-- todas as inserções/atualizações desta migration.
do $$
declare
  v_user_count integer;
  v_user_id    uuid;
  v_user_email text;
  v_office_count integer;
  v_office_id  uuid;
  v_role_count integer;
  v_role_id    uuid;
begin
  -- Serializa reexecuções/concorrência deste provisionamento, já que as tabelas
  -- não têm unicidade natural por nome para escritórios ou cargos.
  perform pg_advisory_xact_lock(
    hashtext('infinity-law'),
    hashtext('bootstrap-initial-admin')
  );

  select count(*)
    into v_user_count
    from auth.users
   where lower(email) = lower('alanbarros.dev15@gmail.com');

  if v_user_count = 0 then
    raise exception 'Provisionamento do administrador interrompido: alanbarros.dev15@gmail.com não existe em auth.users.'
      using errcode = 'P0002';
  elsif v_user_count > 1 then
    raise exception 'Provisionamento do administrador interrompido: mais de um usuário corresponde a alanbarros.dev15@gmail.com em auth.users.'
      using errcode = '21000';
  end if;

  select id, email
    into v_user_id, v_user_email
    from auth.users
   where lower(email) = lower('alanbarros.dev15@gmail.com')
   for key share;

  if v_user_id is null or v_user_email is null then
    raise exception 'Provisionamento do administrador interrompido: o usuário alanbarros.dev15@gmail.com não possui um e-mail válido em auth.users.'
      using errcode = 'P0002';
  end if;

  select count(*)
    into v_office_count
    from public.escritorios
   where lower(btrim(nome)) = lower('Infinity Law');

  if v_office_count > 1 then
    raise exception 'Provisionamento do administrador interrompido: há mais de um escritório chamado Infinity Law.'
      using errcode = '21000';
  elsif v_office_count = 0 then
    insert into public.escritorios (nome, plano, ativo)
    values ('Infinity Law', 'starter', true)
    returning id into v_office_id;
  else
    select id
      into v_office_id
      from public.escritorios
     where lower(btrim(nome)) = lower('Infinity Law');

    update public.escritorios
       set nome = 'Infinity Law',
           plano = 'starter',
           ativo = true
     where id = v_office_id
       and (nome is distinct from 'Infinity Law'
         or plano is distinct from 'starter'
         or ativo is distinct from true);
  end if;

  select count(*)
    into v_role_count
    from public.cargos
   where escritorio_id = v_office_id
     and lower(btrim(nome)) = lower('Administrador');

  if v_role_count > 1 then
    raise exception 'Provisionamento do administrador interrompido: há mais de um cargo Administrador no escritório Infinity Law.'
      using errcode = '21000';
  elsif v_role_count = 0 then
    insert into public.cargos (escritorio_id, nome, permissoes, is_admin)
    values (v_office_id, 'Administrador', '{}'::jsonb, true)
    returning id into v_role_id;
  else
    select id
      into v_role_id
      from public.cargos
     where escritorio_id = v_office_id
       and lower(btrim(nome)) = lower('Administrador');

    update public.cargos
       set nome = 'Administrador',
           is_admin = true
     where id = v_role_id
       and escritorio_id = v_office_id
       and (nome is distinct from 'Administrador' or is_admin is distinct from true);
  end if;

  insert into public.usuarios (
    id,
    escritorio_id,
    cargo_id,
    nome,
    email,
    ativo
  )
  values (
    v_user_id,
    v_office_id,
    v_role_id,
    'Alan Barros',
    v_user_email,
    true
  )
  on conflict (id) do update
     set escritorio_id = excluded.escritorio_id,
         cargo_id = excluded.cargo_id,
         nome = excluded.nome,
         email = excluded.email,
         ativo = excluded.ativo
   where (public.usuarios.escritorio_id,
          public.usuarios.cargo_id,
          public.usuarios.nome,
          public.usuarios.email,
          public.usuarios.ativo)
         is distinct from
         (excluded.escritorio_id,
          excluded.cargo_id,
          excluded.nome,
          excluded.email,
          excluded.ativo);
end;
$$;
