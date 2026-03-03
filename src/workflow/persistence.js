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

  // Strip runtime outputs from nodes before saving
  if (data.nodes) {
    data.nodes.forEach(n => {
      delete n._outputData;
      delete n._status;
    });
  }

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
