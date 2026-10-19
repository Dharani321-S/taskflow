import test from "node:test";
import assert from "node:assert/strict";

const data = new Map();
globalThis.localStorage = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
const { signUp, logIn, logOut, currentUser, validateCredentials, hash } = await import("../js/auth.js");

test("validateCredentials explains how to fix each field", () => {
  const e = validateCredentials({ name: "", email: "nope", password: "123" }, { signup: true });
  assert.ok(e.name && e.email && e.password);
  assert.deepEqual(validateCredentials({ email: "a@b.co", password: "12345678" }, { signup: false }), {});
});
test("password is stored hashed, never in plain text", async () => {
  const { user } = await signUp({ name: "Asha", email: "Asha@Example.com", password: "secret123" });
  assert.equal(user.email, "asha@example.com");
  assert.equal(user.passwordHash, await hash("secret123"));
  assert.ok(!JSON.stringify([...data.values()]).includes("secret123"));
});
test("duplicate email is rejected", async () => {
  const res = await signUp({ name: "Other", email: "asha@example.com", password: "secret123" });
  assert.ok(res.errors.email);
});
test("login succeeds with correct password and fails otherwise", async () => {
  logOut();
  assert.equal(currentUser(), null);
  assert.ok((await logIn({ email: "asha@example.com", password: "wrongpass1" })).errors.form);
  const ok = await logIn({ email: "ASHA@example.com", password: "secret123" });
  assert.equal(ok.user.name, "Asha");
  assert.equal(currentUser().id, ok.user.id);
});
