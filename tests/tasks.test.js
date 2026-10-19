import test from "node:test";
import assert from "node:assert/strict";
import { validateTask, createTask, updateTask, deleteTask, isOverdue, stats, filterTasks, sortTasks } from "../js/tasks.js";

const a = createTask({ title: " Write docs ", priority: "low", dueDate: "2026-10-01" });
const b = createTask({ title: "Fix bug", description: "login page", priority: "high", status: "in-progress", dueDate: "2026-10-30" });
const c = createTask({ title: "Ship", status: "done", dueDate: "2026-09-01" });
const all = [a, b, c];

test("validateTask requires a title", () => {
  assert.ok(validateTask({ title: "  " }).title);
  assert.ok(validateTask({ title: "x".repeat(101) }).title);
  assert.deepEqual(validateTask({ title: "ok" }), {});
});
test("createTask trims and applies defaults", () => {
  assert.equal(a.title, "Write docs");
  assert.equal(c.priority, "medium");
  assert.equal(a.status, "todo");
});
test("update and delete do not mutate the original", () => {
  const next = updateTask(all, a.id, { status: "done" });
  assert.equal(next[0].status, "done");
  assert.equal(a.status, "todo");
  assert.equal(deleteTask(all, b.id).length, 2);
  assert.equal(all.length, 3);
});
test("isOverdue ignores finished tasks", () => {
  assert.equal(isOverdue(a, "2026-10-19"), true);
  assert.equal(isOverdue(c, "2026-10-19"), false);
});
test("stats counts correctly", () => {
  assert.deepEqual(stats(all, "2026-10-19"), { total: 3, inProgress: 1, done: 1, overdue: 1 });
});
test("filter by status and query", () => {
  assert.equal(filterTasks(all, { status: "done" }).length, 1);
  assert.deepEqual(filterTasks(all, { query: "LOGIN" }).map((t) => t.id), [b.id]);
});
test("sort by due date and priority", () => {
  assert.deepEqual(sortTasks(all, "due").map((t) => t.id), [c.id, a.id, b.id]);
  assert.equal(sortTasks(all, "priority")[0].id, b.id);
});
