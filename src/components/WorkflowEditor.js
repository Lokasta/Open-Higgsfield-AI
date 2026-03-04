import { LiteGraph, LGraph, LGraphCanvas } from 'litegraph.js';
import 'litegraph.js/css/litegraph.css';
import { applyDarkTheme, SLOT_COLORS } from '../workflow/theme.js';
import { createPalette } from '../workflow/palette.js';
import { createInspector } from '../workflow/inspector.js';
import { WorkflowEngine } from '../workflow/engine.js';
import { saveWorkflow, loadWorkflow, deleteWorkflow, listWorkflows, saveSession, loadSession, clearSession } from '../workflow/persistence.js';

let nodesRegistered = false;

// Ensure LiteGraph is globally available for node registration
if (typeof window !== 'undefined') {
  window.LiteGraph = LiteGraph;
  window.LGraph = LGraph;
  window.LGraphCanvas = LGraphCanvas;
}

export async function WorkflowEditor() {
  // Register node types once (dynamic import to ensure LiteGraph global is set first)
  if (!nodesRegistered) {
    const { registerAllNodes } = await import('../workflow/nodes/index.js');
    registerAllNodes();
    nodesRegistered = true;
  }

  const container = document.createElement('div');
  container.className = 'workflow-editor';

  // -- State --
  let currentWorkflowId = null;
  let currentWorkflowName = 'Untitled Workflow';
  let engine = null;

  // ============ TOOLBAR ============
  const toolbar = document.createElement('div');
  toolbar.className = 'workflow-toolbar';

  // Workflow name input
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = currentWorkflowName;
  nameInput.oninput = () => { currentWorkflowName = nameInput.value; };

  // Save button
  const saveBtn = createToolbarBtn('Save', () => {
    const entry = saveWorkflow(graph, currentWorkflowName, currentWorkflowId);
    currentWorkflowId = entry.id;
    saveSession(graph, currentWorkflowName);
    showToast('Workflow saved');
  });

  // Load button (with dropdown)
  const loadWrap = document.createElement('div');
  loadWrap.style.position = 'relative';
  const loadBtn = createToolbarBtn('Load', () => {
    toggleLoadDropdown();
  });
  loadWrap.appendChild(loadBtn);

  const loadDropdown = document.createElement('div');
  loadDropdown.className = 'workflow-load-dropdown';
  loadDropdown.style.display = 'none';
  loadWrap.appendChild(loadDropdown);

  function toggleLoadDropdown() {
    const isOpen = loadDropdown.style.display !== 'none';
    if (isOpen) {
      loadDropdown.style.display = 'none';
      return;
    }
    loadDropdown.innerHTML = '';
    const workflows = listWorkflows();
    if (workflows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'workflow-load-item';
      empty.textContent = 'No saved workflows';
      empty.style.color = '#52525b';
      empty.style.cursor = 'default';
      loadDropdown.appendChild(empty);
    } else {
      workflows.forEach(w => {
        const item = document.createElement('div');
        item.className = 'workflow-load-item';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = w.name;
        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = new Date(w.updatedAt).toLocaleDateString();
        item.appendChild(nameSpan);
        item.appendChild(dateSpan);
        item.onclick = () => {
          const entry = loadWorkflow(graph, w.id);
          if (entry) {
            currentWorkflowId = entry.id;
            currentWorkflowName = entry.name;
            nameInput.value = entry.name;
            saveSession(graph, entry.name);
            showToast(`Loaded: ${entry.name}`);
          }
          loadDropdown.style.display = 'none';
        };
        loadDropdown.appendChild(item);
      });
    }
    loadDropdown.style.display = 'block';
  }

  // Delete button
  const deleteBtn = createToolbarBtn('Delete', () => {
    if (!currentWorkflowId) return;
    if (!confirm(`Delete "${currentWorkflowName}"?`)) return;
    deleteWorkflow(currentWorkflowId);
    currentWorkflowId = null;
    graph.clear();
    clearSession();
    showToast('Workflow deleted');
  });

  const sep1 = document.createElement('div');
  sep1.className = 'toolbar-sep';

  // Zoom controls
  const zoomInBtn = createToolbarBtn('+', () => {
    if (lgCanvas) lgCanvas.ds.changeScale(1.1, [lgCanvas.canvas.width / 2, lgCanvas.canvas.height / 2]);
  });
  const zoomOutBtn = createToolbarBtn('-', () => {
    if (lgCanvas) lgCanvas.ds.changeScale(0.9, [lgCanvas.canvas.width / 2, lgCanvas.canvas.height / 2]);
  });
  const fitBtn = createToolbarBtn('Fit', () => {
    if (lgCanvas) lgCanvas.ds.reset();
  });

  const sep2 = document.createElement('div');
  sep2.className = 'toolbar-sep';

  // Execute button
  const executeBtn = document.createElement('button');
  executeBtn.className = 'btn-execute';
  executeBtn.textContent = 'Execute';
  executeBtn.onclick = async () => {
    if (engine && engine.running) {
      engine.abort();
      executeBtn.textContent = 'Execute';
      executeBtn.classList.remove('running');
      return;
    }

    executeBtn.textContent = 'Stop';
    executeBtn.classList.add('running');

    try {
      engine = new WorkflowEngine(graph);
      engine.onNodeStatus = () => lgCanvas.setDirty(true, true);
      await engine.execute();
      showToast('Workflow complete');
    } catch (e) {
      if (e.message !== 'API key required') {
        showToast(`Error: ${e.message}`, true);
      }
    } finally {
      executeBtn.textContent = 'Execute';
      executeBtn.classList.remove('running');
    }
  };

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.flex = '1';

  toolbar.appendChild(nameInput);
  toolbar.appendChild(saveBtn);
  toolbar.appendChild(loadWrap);
  toolbar.appendChild(deleteBtn);
  toolbar.appendChild(sep1);
  toolbar.appendChild(zoomInBtn);
  toolbar.appendChild(zoomOutBtn);
  toolbar.appendChild(fitBtn);
  toolbar.appendChild(sep2);
  toolbar.appendChild(spacer);
  toolbar.appendChild(executeBtn);

  container.appendChild(toolbar);

  // ============ BODY (palette + canvas + inspector) ============
  const body = document.createElement('div');
  body.className = 'workflow-body';

  // Create graph
  const graph = new LGraph();

  // Canvas wrapper
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'workflow-canvas-wrap';

  const canvasEl = document.createElement('canvas');
  canvasWrap.appendChild(canvasEl);

  // Create LGraphCanvas after adding to DOM
  let lgCanvas = null;

  // Palette (left)
  // We'll create after lgCanvas is ready, but need placeholder
  const palettePlaceholder = document.createElement('div');
  palettePlaceholder.className = 'workflow-palette';
  body.appendChild(palettePlaceholder);

  body.appendChild(canvasWrap);

  // Inspector placeholder (right)
  const inspectorPlaceholder = document.createElement('div');
  inspectorPlaceholder.className = 'workflow-inspector';
  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'inspector-empty';
  emptyMsg.textContent = 'Select a node to inspect';
  inspectorPlaceholder.appendChild(emptyMsg);
  body.appendChild(inspectorPlaceholder);

  container.appendChild(body);

  // ============ INIT CANVAS AFTER DOM ============
  requestAnimationFrame(() => {
    const rect = canvasWrap.getBoundingClientRect();
    canvasEl.width = rect.width;
    canvasEl.height = rect.height;

    lgCanvas = new LGraphCanvas(canvasEl, graph);
    applyDarkTheme(lgCanvas);

    // Expose for debugging / testing
    window._wfGraph = graph;
    window._wfCanvas = lgCanvas;

    // Replace palette placeholder
    const palette = createPalette(graph, lgCanvas);
    body.replaceChild(palette, palettePlaceholder);

    // Replace inspector placeholder
    const inspector = createInspector(lgCanvas);
    body.replaceChild(inspector, inspectorPlaceholder);

    // Drop handler for palette drag
    canvasEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvasEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const pos = lgCanvas.convertEventToCanvasOffset(e);

      // Check if files were dropped (images onto nodes)
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        // Find the node under the cursor
        const node = graph.getNodeOnPos(pos[0], pos[1]);
        if (node && typeof node.onDropFile === 'function') {
          files.forEach(f => node.onDropFile(f));
          return;
        }
        // If dropped on empty canvas with image files, create an Image Input node
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          const newNode = LiteGraph.createNode('input/image');
          if (newNode) {
            newNode.pos = [pos[0], pos[1]];
            if (imageFiles.length > 1) newNode.properties.multi = true;
            graph.add(newNode);
            // Give it a frame to initialize, then add files
            requestAnimationFrame(() => newNode._addFiles(imageFiles));
          }
          return;
        }
      }

      // Asset library drag: drop asset URL onto a node or create input node
      const assetUrl = e.dataTransfer.getData('workflow/asset-url');
      if (assetUrl) {
        const assetType = e.dataTransfer.getData('workflow/asset-type') || 'image';
        const targetNode = graph.getNodeOnPos(pos[0], pos[1]);

        // If dropped on an input node that accepts this type, add to it
        if (targetNode && targetNode.type === 'input/image' && assetType === 'image') {
          if (!targetNode.properties.multi) {
            targetNode.properties.urls = [assetUrl];
            targetNode.properties.filenames = ['asset'];
            targetNode._imgs = [];
          } else {
            targetNode.properties.urls.push(assetUrl);
            targetNode.properties.filenames.push('asset');
          }
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => targetNode.setDirtyCanvas(true);
          img.src = assetUrl;
          const idx = targetNode.properties.urls.length - 1;
          targetNode._imgs[idx] = img;
          targetNode.setDirtyCanvas(true);
          return;
        }

        // Drop on empty canvas: create appropriate input node
        const nodeTypeMap = { image: 'input/image', video: 'input/video', audio: 'input/audio' };
        const newNodeType = nodeTypeMap[assetType];
        if (newNodeType) {
          const newNode = LiteGraph.createNode(newNodeType);
          if (newNode) {
            newNode.pos = [pos[0], pos[1]];
            graph.add(newNode);
            if (assetType === 'image') {
              newNode.properties.urls = [assetUrl];
              newNode.properties.filenames = ['asset'];
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => newNode.setDirtyCanvas(true);
              img.src = assetUrl;
              newNode._imgs = [img];
            } else if (newNode.properties) {
              newNode.properties.url = assetUrl;
            }
          }
        }
        return;
      }

      // Palette drag: create node by type
      const nodeType = e.dataTransfer.getData('litegraph/nodetype');
      if (!nodeType) return;
      const node = LiteGraph.createNode(nodeType);
      if (node) {
        node.pos = [pos[0], pos[1]];
        graph.add(node);
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const r = canvasWrap.getBoundingClientRect();
      canvasEl.width = r.width;
      canvasEl.height = r.height;
      lgCanvas.resize();
    });
    resizeObserver.observe(canvasWrap);

    // Keyboard shortcuts
    canvasEl.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = lgCanvas.selected_nodes;
        if (selected) {
          Object.values(selected).forEach(n => graph.remove(n));
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveBtn.click();
        }
        if (e.key === 'z') {
          // LiteGraph doesn't have built-in undo, but prevent default
        }
      }
    });

    // Close load dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!loadWrap.contains(e.target)) {
        loadDropdown.style.display = 'none';
      }
    });

    // Start graph
    graph.start();

    // Auto-restore last session
    const session = loadSession();
    if (session && session.data) {
      try {
        graph.configure(session.data);
        if (session.name) {
          currentWorkflowName = session.name;
          nameInput.value = session.name;
        }
        lgCanvas.setDirty(true, true);
      } catch (e) {
        console.warn('[Workflow] Session restore failed:', e);
      }
    }

    // Auto-save session every 10 seconds
    setInterval(() => {
      saveSession(graph, currentWorkflowName);
    }, 10000);

    // Also save session on beforeunload
    window.addEventListener('beforeunload', () => {
      saveSession(graph, currentWorkflowName);
    });
  });

  // ============ TOAST ============
  function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      padding: 8px 16px; border-radius: 8px; font-size: 13px; z-index: 1000;
      background: ${isError ? '#7f1d1d' : '#1a1a1a'}; color: ${isError ? '#fca5a5' : '#e4e4e7'};
      border: 1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: fade-in-up 0.3s ease-out;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  return container;
}

function createToolbarBtn(label, onclick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.onclick = onclick;
  return btn;
}
