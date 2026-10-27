export interface ExistingManualAssociation {
  id: string;
  processoId: string | null;
}

export interface ManualAssociationStore {
  find(): Promise<ExistingManualAssociation | null>;
  insert(): Promise<string | null>;
  assignIfUnassigned(id: string): Promise<string | null>;
}

export type ManualAssociationResult =
  | { status: "inserted"; id: string }
  | { status: "updated"; id: string }
  | { status: "unchanged"; id: string }
  | { status: "conflict" };

/**
 * Concurrency-safe insert-or-claim flow. `insert` must use INSERT (never upsert)
 * and return null only for a unique-key collision; `assignIfUnassigned` must
 * include `processo_id IS NULL` in its UPDATE predicate.
 */
export async function persistManualAssociation(
  store: ManualAssociationStore,
  processoId: string
): Promise<ManualAssociationResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await store.find();

    if (existing) {
      if (existing.processoId === processoId) {
        return { status: "unchanged", id: existing.id };
      }
      if (existing.processoId !== null) return { status: "conflict" };

      const updatedId = await store.assignIfUnassigned(existing.id);
      if (updatedId) return { status: "updated", id: updatedId };
      // Another request claimed the null process_id; re-read before deciding.
      continue;
    }

    const insertedId = await store.insert();
    if (insertedId) return { status: "inserted", id: insertedId };
    // A concurrent INSERT won the unique (escritorio_id, hash) key. Re-read it.
  }

  const latest = await store.find();
  if (latest?.processoId === processoId) return { status: "unchanged", id: latest.id };
  return { status: "conflict" };
}
