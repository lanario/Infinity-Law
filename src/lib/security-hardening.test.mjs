import assert from "node:assert/strict";
import test from "node:test";
import { eventoSchema, toSafeVideoconfHref } from "./validations/evento.schema.ts";
import { mensagemDeErroAuth } from "./auth-errors.ts";
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

test("auth errors map to safe pt-BR messages", () => {
  const login = (e) => mensagemDeErroAuth(e, "login");
  assert.match(login({ code: "invalid_credentials", message: "Invalid login credentials" }), /incorretos/);
  assert.match(login({ code: "email_not_confirmed", message: "x" }), /Confirme seu e-mail/);
  assert.match(login({ code: "over_request_rate_limit", message: "x", status: 429 }), /Muitas tentativas/);
  assert.match(login({ code: "user_banned", message: "x" }), /bloqueado/);
  assert.match(login({ name: "AuthRetryableFetchError", message: "fetch failed", status: 0 }), /indisponível/);
  assert.match(login(new Error("SUPABASE_ENV_AUSENTE: variáveis ausentes: X")), /não está configurado/);
  assert.equal(login(new Error("boom: select * from secret")), "Não foi possível entrar agora. Tente novamente em instantes.");
  assert.match(mensagemDeErroAuth({ code: "email_exists", message: "x" }, "signup"), /Já existe uma conta/);
  assert.doesNotMatch(login({ code: "email_exists", message: "x" }), /Já existe/);
  assert.match(mensagemDeErroAuth(null, "recuperacao"), /link/);
});
