// Single place that touches localStorage. Every call is guarded (storage can be blocked or full).
const read = (k, f) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const db = {
  users: () => read("taskflow.users", []),
  saveUsers: (u) => write("taskflow.users", u),
  session: () => read("taskflow.session", null),
  saveSession: (s) => write("taskflow.session", s),
  clearSession: () => { try { localStorage.removeItem("taskflow.session"); } catch { /* ignore */ } },
  tasks: (uid) => read(`taskflow.tasks.${uid}`, []),
  saveTasks: (uid, t) => write(`taskflow.tasks.${uid}`, t),
};
