-- Arquivos privados vinculados às fichas de clientes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cliente-documentos',
  'cliente-documentos',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain'
  ]
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cliente_documents_read_in_office"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cliente-documentos'
  and (storage.foldername(name))[1] = (select public.my_escritorio_id())::text
  and exists (
    select 1
    from public.clientes c
    where c.id::text = (storage.foldername(name))[2]
      and c.escritorio_id = (select public.my_escritorio_id())
  )
  and (select public.has_permission('clientes', 'read'))
);

create policy "cliente_documents_upload_in_office"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cliente-documentos'
  and (storage.foldername(name))[1] = (select public.my_escritorio_id())::text
  and exists (
    select 1
    from public.clientes c
    where c.id::text = (storage.foldername(name))[2]
      and c.escritorio_id = (select public.my_escritorio_id())
  )
  and (select public.has_permission('clientes', 'write'))
);

create policy "cliente_documents_delete_in_office"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cliente-documentos'
  and (storage.foldername(name))[1] = (select public.my_escritorio_id())::text
  and exists (
    select 1
    from public.clientes c
    where c.id::text = (storage.foldername(name))[2]
      and c.escritorio_id = (select public.my_escritorio_id())
  )
  and (select public.has_permission('clientes', 'write'))
);
