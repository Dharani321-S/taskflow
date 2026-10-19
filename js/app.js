// UI controller: wires auth, task logic, storage and the DOM together.
import { signUp, logIn, logOut, currentUser, enterDemo } from "./auth.js";
import { db } from "./storage.js";
import { STATUSES, validateTask, createTask, updateTask, deleteTask, isOverdue, stats, filterTasks, sortTasks } from "./tasks.js";

const $ = (id) => document.getElementById(id);
const LABEL = { todo: "To do", "in-progress": "In progress", done: "Done" };
const state = { user: null, tasks: [], view: { status: "all", query: "", sort: "due" }, mode: "login", editingId: null, pendingDelete: null, opener: null };

const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const announce = (msg) => { $("live").textContent = ""; setTimeout(() => ($("live").textContent = msg), 50); };
const setError = (inputId, msg) => {
  const err = $(`${inputId}-error`), input = $(inputId);
  err.textContent = msg || ""; err.hidden = !msg;
  if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
};

/* ---------- Auth ---------- */
function setMode(mode) {
  state.mode = mode;
  const signup = mode === "signup";
  $("auth-title").textContent = signup ? "Create your account" : "Log in";
  $("auth-submit").textContent = signup ? "Sign up" : "Log in";
  $("name-field").hidden = !signup;
  $("password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "New here?";
  $("auth-switch").textContent = signup ? "Log in" : "Create an account";
  clearAuthErrors();
}
function clearAuthErrors() {
  ["name", "email", "password"].forEach((f) => setError(f, ""));
  $("auth-error").hidden = true;
}
function showAuthErrors(errors) {
  clearAuthErrors();
  ["name", "email", "password"].forEach((f) => errors[f] && setError(f, errors[f]));
  if (errors.form) { $("auth-error").textContent = errors.form; $("auth-error").hidden = false; }
  const first = ["name", "email", "password"].find((f) => errors[f]);
  if (first) $(first).focus();
}
function enterApp(user) {
  state.user = user;
  state.tasks = db.tasks(user.id);
  $("auth-view").hidden = true;
  $("app-view").hidden = false;
  $("user-bar").hidden = false;
  $("user-name").textContent = user.name;
  render();
  $("app-heading").focus();
}
function leaveApp() {
  logOut();
  state.user = null;
  $("auth-form").reset();
  setMode("login");
  $("app-view").hidden = true;
  $("user-bar").hidden = true;
  $("auth-view").hidden = false;
  $("auth-title").focus();
}

/* ---------- Tasks ---------- */
function commit(tasks, message) {
  state.tasks = tasks;
  if (!db.saveTasks(state.user.id, tasks)) announce("Warning: your changes could not be saved in this browser.");
  else if (message) announce(message);
  render();
}
function render() {
  const today = new Date().toISOString().slice(0, 10);
  const s = stats(state.tasks, today);
  $("stat-total").textContent = s.total; $("stat-progress").textContent = s.inProgress;
  $("stat-done").textContent = s.done; $("stat-overdue").textContent = s.overdue;
  document.querySelectorAll("[data-status]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.status === state.view.status)));
  const visible = sortTasks(filterTasks(state.tasks, state.view), state.view.sort);
  $("task-count").textContent = `${visible.length} task${visible.length === 1 ? "" : "s"} shown`;
  $("task-list").replaceChildren(...visible.map((t) => taskItem(t, today)));
  $("empty").hidden = visible.length > 0;
}
function taskItem(t, today) {
  const status = el("select", {}, ...STATUSES.map((s) => el("option", { value: s, selected: s === t.status }, LABEL[s])));
  status.setAttribute("aria-label", `Status of ${t.title}`);
  status.addEventListener("change", () => commit(updateTask(state.tasks, t.id, { status: status.value }), `${t.title} marked ${LABEL[status.value]}`));
  const edit = el("button", { type: "button", className: "btn btn-secondary" }, "Edit");
  edit.setAttribute("aria-label", `Edit ${t.title}`);
  edit.addEventListener("click", () => openTaskDialog(t, edit));
  const del = el("button", { type: "button", className: "btn btn-secondary" }, "Delete");
  del.setAttribute("aria-label", `Delete ${t.title}`);
  del.addEventListener("click", () => {
    state.pendingDelete = t.id; state.opener = del;
    $("confirm-text").textContent = `“${t.title}” will be permanently removed.`;
    $("confirm-dialog").returnValue = "";
    $("confirm-dialog").showModal();
  });
  const due = t.dueDate ? el("span", { className: isOverdue(t, today) ? "due overdue" : "due" }, `Due ${t.dueDate}${isOverdue(t, today) ? " (overdue)" : ""}`) : el("span", { className: "due" }, "No due date");
  return el("li", { className: `task priority-${t.priority}${t.status === "done" ? " is-done" : ""}` },
    el("h2", { className: "task-title" }, t.title),
    t.description ? el("p", {}, t.description) : "",
    el("p", { className: "meta" }, el("span", { className: "badge" }, `${t.priority} priority`), " ", due),
    el("div", { className: "task-actions" }, status, edit, del));
}
function openTaskDialog(task, opener) {
  state.editingId = task ? task.id : null; state.opener = opener;
  $("task-dialog-title").textContent = task ? "Edit task" : "Add task";
  $("t-title").value = task?.title ?? ""; $("t-desc").value = task?.description ?? "";
  $("t-priority").value = task?.priority ?? "medium"; $("t-status").value = task?.status ?? "todo"; $("t-due").value = task?.dueDate ?? "";
  setError("t-title", "");
  $("task-dialog").showModal();
}

/* ---------- Events ---------- */
$("auth-switch").addEventListener("click", () => setMode(state.mode === "login" ? "signup" : "login"));
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fields = { name: $("name").value, email: $("email").value, password: $("password").value };
  const res = state.mode === "signup" ? await signUp(fields) : await logIn(fields);
  if (res.errors) return showAuthErrors(res.errors);
  enterApp(res.user);
});
$("demo-btn").addEventListener("click", async () => enterApp(await enterDemo()));
$("logout").addEventListener("click", leaveApp);

$("add-task").addEventListener("click", (e) => openTaskDialog(null, e.currentTarget));
$("task-cancel").addEventListener("click", () => $("task-dialog").close());
$("task-dialog").addEventListener("close", () => state.opener?.focus());
$("task-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = { title: $("t-title").value, description: $("t-desc").value, priority: $("t-priority").value, status: $("t-status").value, dueDate: $("t-due").value };
  const errors = validateTask(f);
  setError("t-title", errors.title);
  if (errors.title) return $("t-title").focus();
  if (state.editingId) commit(updateTask(state.tasks, state.editingId, { ...f, title: f.title }), "Task updated");
  else commit([...state.tasks, createTask(f)], "Task added");
  $("task-dialog").close();
});
$("confirm-dialog").addEventListener("close", () => {
  if ($("confirm-dialog").returnValue === "confirm") { commit(deleteTask(state.tasks, state.pendingDelete), "Task deleted"); $("add-task").focus(); }
  else state.opener?.focus();
});
$("search").addEventListener("input", (e) => { state.view.query = e.target.value; render(); });
$("sort").addEventListener("change", (e) => { state.view.sort = e.target.value; render(); });
document.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => { state.view.status = b.dataset.status; render(); }));

/* ---------- Start ---------- */
const existing = currentUser();
if (existing) enterApp(existing); else setMode("login");
