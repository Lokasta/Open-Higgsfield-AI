import {
  t2iModels, t2vModels, i2iModels, i2vModels,
  getAspectRatiosForModel, getAspectRatiosForVideoModel,
  getResolutionsForModel, getResolutionsForVideoModel,
  getQualityFieldForModel,
} from '../lib/models.js';

export function createInspector(canvas) {
  const el = document.createElement('div');
  el.className = 'workflow-inspector no-scrollbar';

  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'inspector-empty';
  emptyMsg.textContent = 'Select a node to inspect';
  el.appendChild(emptyMsg);

  let currentNode = null;

  function render(node) {
    el.innerHTML = '';
    currentNode = node;

    if (!node) {
      el.appendChild(emptyMsg);
      return;
    }

    const title = document.createElement('div');
    title.className = 'inspector-title';
    title.textContent = node.title || node.type;
    el.appendChild(title);

    // Show node properties via its custom inspector or generic widgets
    if (typeof node.onInspector === 'function') {
      const custom = node.onInspector();
      if (custom) el.appendChild(custom);
      return;
    }

    // Generic: render widgets from node.properties
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, value]) => {
        const field = createField(key, value, node);
        if (field) el.appendChild(field);
      });
    }
  }

  function createField(key, value, node) {
    const wrap = document.createElement('div');
    wrap.className = 'inspector-field';

    const label = document.createElement('div');
    label.className = 'inspector-label';
    label.textContent = key.replace(/_/g, ' ');
    wrap.appendChild(label);

    // Model selector fields
    if (key === 'model' && node._modelList) {
      const select = createSearchableSelect(node._modelList, value, (v) => {
        node.properties[key] = v;
        // Trigger model change callback
        if (typeof node.onModelChange === 'function') node.onModelChange(v);
        render(node);
      });
      wrap.appendChild(select);
      return wrap;
    }

    // Enum fields
    if (node._enums && node._enums[key]) {
      const select = document.createElement('select');
      node._enums[key].forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === value) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = () => { node.properties[key] = select.value; };
      wrap.appendChild(select);
      return wrap;
    }

    // Boolean
    if (typeof value === 'boolean') {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = value;
      cb.onchange = () => { node.properties[key] = cb.checked; };
      wrap.appendChild(cb);
      return wrap;
    }

    // Number
    if (typeof value === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.value = value;
      input.onchange = () => { node.properties[key] = parseFloat(input.value) || 0; };
      wrap.appendChild(input);
      return wrap;
    }

    // Multiline text
    if (typeof value === 'string' && (key.includes('prompt') || key.includes('text') || value.length > 60)) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.rows = 3;
      ta.oninput = () => { node.properties[key] = ta.value; };
      wrap.appendChild(ta);
      return wrap;
    }

    // Default string
    if (typeof value === 'string') {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value;
      input.oninput = () => { node.properties[key] = input.value; };
      wrap.appendChild(input);
      return wrap;
    }

    return null;
  }

  // Hook into canvas selection
  const origSelect = canvas.processNodeSelected;
  canvas.processNodeSelected = function(node) {
    if (origSelect) origSelect.call(this, node);
    render(node);
  };

  // Also update on deselect
  const origDeselect = canvas.processNodeDeselected;
  canvas.processNodeDeselected = function(node) {
    if (origDeselect) origDeselect.call(this, node);
    render(null);
  };

  return el;
}

function createSearchableSelect(models, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';

  const input = document.createElement('input');
  input.type = 'text';
  const current = models.find(m => m.id === currentValue);
  input.value = current?.name || currentValue || '';
  input.placeholder = 'Search models...';
  wrap.appendChild(input);

  const dropdown = document.createElement('div');
  dropdown.className = 'workflow-load-dropdown';
  dropdown.style.display = 'none';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '100%';
  dropdown.style.left = '0';
  dropdown.style.right = '0';
  dropdown.style.maxHeight = '200px';
  wrap.appendChild(dropdown);

  function renderList(filter) {
    dropdown.innerHTML = '';
    const filtered = filter
      ? models.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()))
      : models;

    filtered.slice(0, 50).forEach(m => {
      const item = document.createElement('div');
      item.className = 'workflow-load-item';
      item.textContent = m.name;
      item.onclick = () => {
        input.value = m.name;
        dropdown.style.display = 'none';
        onChange(m.id);
      };
      dropdown.appendChild(item);
    });
  }

  input.onfocus = () => {
    input.select();
    renderList('');
    dropdown.style.display = 'block';
  };

  input.oninput = () => {
    renderList(input.value);
    dropdown.style.display = 'block';
  };

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) dropdown.style.display = 'none';
  });

  return wrap;
}
