const STORAGE_KEY = 'muapi_workflows';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setAll(workflows) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

export function saveWorkflow(graph, name, existingId) {
  const workflows = getAll();
  const data = graph.serialize();

  const now = Date.now();

  if (existingId) {
    const idx = workflows.findIndex(w => w.id === existingId);
    if (idx >= 0) {
      workflows[idx].name = name;
      workflows[idx].data = data;
      workflows[idx].updatedAt = now;
      setAll(workflows);
      return workflows[idx];
    }
  }

  const entry = {
    id: crypto.randomUUID(),
    name,
    data,
    createdAt: now,
    updatedAt: now,
  };
  workflows.unshift(entry);
  setAll(workflows);
  return entry;
}

export function loadWorkflow(graph, id) {
  const workflows = getAll();
  const entry = workflows.find(w => w.id === id);
  if (!entry) return null;
  graph.configure(entry.data);
  return entry;
}

export function deleteWorkflow(id) {
  const workflows = getAll().filter(w => w.id !== id);
  setAll(workflows);
}

export function listWorkflows() {
  return getAll().map(({ id, name, createdAt, updatedAt }) => ({ id, name, createdAt, updatedAt }));
}

const SESSION_KEY = 'muapi_workflow_session';

export function saveSession(graph, name) {
  try {
    const data = graph.serialize();
    const session = { name, data, savedAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('[Workflow] Session save failed:', e);
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
