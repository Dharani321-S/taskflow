// SIMULATED authentication for the capstone demo: accounts live in this browser's localStorage.
// Passwords are SHA-256 hashed so they are never stored in plain text, but this is NOT production security.
import { db } from "./storage.js";
import { createTask } from "./tasks.js";

export async function hash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function validateCredentials({ name = "", email = "", password = "" }, { signup }) {
  const e = {};
  if (signup && !name.trim()) e.name = "Enter your name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter an email address in the correct format, like name@example.com";
  if (password.length < 8) e.password = "Password must be at least 8 characters";
  return e;
}
export async function signUp(fields) {
  const errors = validateCredentials(fields, { signup: true });
  if (Object.keys(errors).length) return { errors };
  const email = fields.email.trim().toLowerCase();
  const users = db.users();
  if (users.some((u) => u.email === email)) return { errors: { email: "An account with this email already exists. Log in instead." } };
  const user = { id: crypto.randomUUID(), name: fields.name.trim(), email, passwordHash: await hash(fields.password) };
  db.saveUsers([...users, user]);
  db.saveSession({ userId: user.id });
  return { user };
}
export async function logIn(fields) {
  const errors = validateCredentials(fields, { signup: false });
  if (Object.keys(errors).length) return { errors };
  const email = fields.email.trim().toLowerCase();
  const user = db.users().find((u) => u.email === email);
  if (!user || user.passwordHash !== (await hash(fields.password))) return { errors: { form: "Email or password is incorrect." } };
  db.saveSession({ userId: user.id });
  return { user };
}
export const currentUser = () => { const s = db.session(); return s ? db.users().find((u) => u.id === s.userId) || null : null; };
export const logOut = () => db.clearSession();

export async function enterDemo() {
  const email = "demo@taskflow.app";
  let user = db.users().find((u) => u.email === email);
  if (!user) {
    user = { id: crypto.randomUUID(), name: "Demo User", email, passwordHash: await hash("demo12345") };
    db.saveUsers([...db.users(), user]);
    const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    db.saveTasks(user.id, [
      createTask({ title: "Prepare sprint review", description: "Slides and demo script", priority: "high", status: "in-progress", dueDate: day(2) }),
      createTask({ title: "Fix login bug #214", description: "Users with plus signs in email cannot sign in", priority: "high", status: "todo", dueDate: day(-1) }),
      createTask({ title: "Write release notes", priority: "medium", status: "todo", dueDate: day(5) }),
      createTask({ title: "Update onboarding docs", priority: "low", status: "done", dueDate: day(-3) }),
      createTask({ title: "Review pull requests", description: "Three PRs waiting", priority: "medium", status: "in-progress", dueDate: day(1) }),
    ]);
  }
  db.saveSession({ userId: user.id });
  return user;
}
