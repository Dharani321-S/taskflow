// Pure task logic (no DOM, no storage): easy to test. Functions never mutate their input.
export const STATUSES = ["todo", "in-progress", "done"];
export const PRIORITIES = ["low", "medium", "high"];
const RANK = { high: 0, medium: 1, low: 2 };
const todayISO = () => new Date().toISOString().slice(0, 10);

export function validateTask({ title = "" }) {
  const errors = {};
  if (!title.trim()) errors.title = "Enter a task title";
  else if (title.trim().length > 100) errors.title = "Title must be 100 characters or fewer";
  return errors;
}
export const createTask = (f) => ({
  id: crypto.randomUUID(), title: f.title.trim(), description: (f.description || "").trim(),
  priority: PRIORITIES.includes(f.priority) ? f.priority : "medium",
  status: STATUSES.includes(f.status) ? f.status : "todo", dueDate: f.dueDate || "", createdAt: Date.now(),
});
export const updateTask = (tasks, id, patch) =>
  tasks.map((t) => (t.id === id ? { ...t, ...patch, title: (patch.title ?? t.title).trim() } : t));
export const deleteTask = (tasks, id) => tasks.filter((t) => t.id !== id);
export const isOverdue = (t, today = todayISO()) => Boolean(t.dueDate) && t.status !== "done" && t.dueDate < today;

export function stats(tasks, today = todayISO()) {
  return {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };
}
export function filterTasks(tasks, { status = "all", query = "" } = {}) {
  const q = query.trim().toLowerCase();
  return tasks.filter((t) => (status === "all" || t.status === status) &&
    (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)));
}
export function sortTasks(tasks, sort = "due") {
  const copy = [...tasks];
  if (sort === "priority") return copy.sort((a, b) => RANK[a.priority] - RANK[b.priority]);
  if (sort === "newest") return copy.sort((a, b) => b.createdAt - a.createdAt);
  return copy.sort((a, b) => (a.dueDate || "9999") .localeCompare(b.dueDate || "9999"));
}
