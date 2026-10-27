import assert from "node:assert/strict";
import test from "node:test";
import { persistManualAssociation } from "./association-write.ts";

function createStore(initial = null, synchronizeFirstReads = false) {
  let row = initial ? { ...initial } : null;
  let firstReadCount = 0;
  let releaseReads;
  const readsReady = new Promise((resolve) => { releaseReads = resolve; });

  return {
    async find() {
      if (synchronizeFirstReads && row === null && firstReadCount < 2) {
        firstReadCount += 1;
        if (firstReadCount === 2) releaseReads();
        await readsReady;
      }
      return row ? { ...row } : null;
    },
    async insert(processoId) {
      if (row) return null;
      row = { id: "publication-1", processoId };
      return row.id;
    },
    async assignIfUnassigned(id, processoId) {
      if (!row || row.id !== id || row.processoId !== null) return null;
      row = { ...row, processoId };
      return row.id;
    },
    getRow() { return row ? { ...row } : null; },
  };
}

test("concurrent manual choices cannot overwrite the first process claim", async () => {
  const store = createStore(null, true);
  const adapter = (processoId) => ({
    find: () => store.find(),
    insert: () => store.insert(processoId),
    assignIfUnassigned: (id) => store.assignIfUnassigned(id, processoId),
  });

  const results = await Promise.all([
    persistManualAssociation(adapter("process-a"), "process-a"),
    persistManualAssociation(adapter("process-b"), "process-b"),
  ]);

  assert.equal(results.filter((result) => result.status === "conflict").length, 1);
  assert.equal(results.filter((result) => result.status === "inserted").length, 1);
  assert.ok(["process-a", "process-b"].includes(store.getRow()?.processoId ?? ""));
});

test("replay to the same process is idempotent and a different process conflicts", async () => {
  const store = createStore({ id: "publication-1", processoId: "process-a" });
  const adapter = {
    find: () => store.find(),
    insert: () => store.insert("process-a"),
    assignIfUnassigned: (id) => store.assignIfUnassigned(id, "process-a"),
  };

  assert.deepEqual(await persistManualAssociation(adapter, "process-a"), {
    status: "unchanged",
    id: "publication-1",
  });
  assert.deepEqual(await persistManualAssociation(adapter, "process-b"), { status: "conflict" });
});

test("two claims against an unassigned publication cannot replace each other", async () => {
  const store = createStore({ id: "publication-1", processoId: null }, true);
  const adapter = (processoId) => ({
    find: () => store.find(),
    insert: () => store.insert(processoId),
    assignIfUnassigned: (id) => store.assignIfUnassigned(id, processoId),
  });

  const results = await Promise.all([
    persistManualAssociation(adapter("process-a"), "process-a"),
    persistManualAssociation(adapter("process-b"), "process-b"),
  ]);

  assert.equal(results.filter((result) => result.status === "conflict").length, 1);
  assert.equal(results.filter((result) => result.status === "updated").length, 1);
  assert.ok(["process-a", "process-b"].includes(store.getRow()?.processoId ?? ""));
});
