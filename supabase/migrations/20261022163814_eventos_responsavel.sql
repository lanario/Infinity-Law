-- Adds an optional scheduling owner for each agenda event.
-- Existing events remain unassigned; criado_por continues to mean author only.
alter table public.eventos
  add column responsavel_id uuid;

alter table public.eventos
  add constraint eventos_responsavel_tenant_fkey
  foreign key (responsavel_id, escritorio_id)
  references public.usuarios (id, escritorio_id)
  on delete set null (responsavel_id);

-- Supports FK checks and filtering/grouping the agenda by assigned user.
create index idx_eventos_responsavel_tenant
  on public.eventos (responsavel_id, escritorio_id);
