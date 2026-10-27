import assert from "node:assert/strict";
import test from "node:test";
import { eventoSchema, toSafeVideoconfHref } from "./validations/evento.schema.ts";
import { verificarTurnstile } from "./turnstile.ts";
import { runWithRequiredAccess } from "./server/required-access.ts";

const validEvent = {
  titulo: "Audiência",
  tipo: "audiencia",
  inicio: "2026-10-21T14:00:00.000Z",
};

test("videoconference URLs allow only HTTP(S) in schema and rendered href helper", () => {
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "https://meet.example.com/room" }).success, true);
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "http://meet.example.com/room" }).success, true);
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "javascript:alert(1)" }).success, false);
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "data:text/html,unsafe" }).success, false);
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "ftp://meet.example.com/room" }).success, false);
  assert.equal(toSafeVideoconfHref("javascript:alert(1)"), null);
  assert.equal(toSafeVideoconfHref("https://meet.example.com/room"), "https://meet.example.com/room");
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: "" }).success, true);
  assert.equal(eventoSchema.safeParse({ ...validEvent, link_videoconf: null }).success, true);
});

async function withTurnstileEnv(values, callback) {
  const keys = ["NODE_ENV", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const key of keys) {
    if (Object.hasOwn(values, key)) process.env[key] = values[key];
    else delete process.env[key];
  }

  try {
    await callback();
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test("Turnstile bypass and mock tokens fail closed outside explicit development", async () => {
  await withTurnstileEnv({ NODE_ENV: "production" }, async () => {
    assert.equal(await verificarTurnstile(undefined, "login"), false);
    assert.equal(await verificarTurnstile("dev-mock-test", "login"), false);
  });

  await withTurnstileEnv({}, async () => {
    assert.equal(await verificarTurnstile(undefined, "login"), false);
  });
});

test("Turnstile bypass and mock tokens remain available in explicit development only", async () => {
  await withTurnstileEnv({ NODE_ENV: "development" }, async () => {
    assert.equal(await verificarTurnstile(undefined, "login"), true);
    assert.equal(await verificarTurnstile("dev-mock-test", "login"), true);
  });
});

test("protected process write returns denial without invoking persistence", async () => {
  let writeCount = 0;
  const result = await runWithRequiredAccess(
    async () => ({ ok: false, error: "Seu perfil não tem permissão para esta ação." }),
    (error) => ({ error }),
    async () => {
      writeCount += 1;
      return { processoId: "process-1" };
    },
  );

  assert.deepEqual(result, { error: "Seu perfil não tem permissão para esta ação." });
  assert.equal(writeCount, 0);
});

test("protected process write invokes persistence for an authorized tenant", async () => {
  let writeCount = 0;
  const authorizedAccess = {
    ok: true,
    supabase: { mock: true },
    user: { id: "user-1" },
    escritorioId: "office-1",
  };

  const result = await runWithRequiredAccess(
    async () => authorizedAccess,
    (error) => ({ error }),
    async (access) => {
      assert.equal(access, authorizedAccess);
      assert.equal(access.escritorioId, "office-1");
      writeCount += 1;
      return { processoId: "process-1" };
    },
  );

  assert.deepEqual(result, { processoId: "process-1" });
  assert.equal(writeCount, 1);
});
