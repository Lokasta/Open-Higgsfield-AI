/**
 * Shared header bar for generator nodes — Scenario.com-style action buttons.
 *
 * Draws a row of icon buttons in the node title area:
 *   [Run] [Collapse]
 * Plus an editable title on the left side.
 *
 * Usage in a node:
 *   import { drawHeader, handleHeaderClick, HEADER_HEIGHT } from '../nodeHeader.js';
 *   // in onDrawForeground:  drawHeader(ctx, this);
 *   // in onMouseDown:       if (handleHeaderClick(this, localPos, e)) return true;
 */

import { muapi } from '../lib/muapi.js';

// LiteGraph draws the title bar above y=0 in onDrawForeground.
// NODE_TITLE_HEIGHT defaults to 30 — buttons sit inside that area.
export const HEADER_HEIGHT = 0; // body content starts at y=0

const BTN_SIZE = 20;
const BTN_GAP = 4;
const TITLE_H = 30; // LiteGraph.NODE_TITLE_HEIGHT
const BTN_Y = -TITLE_H + (TITLE_H - BTN_SIZE) / 2; // center vertically in title bar

// Button definitions (right-aligned). 'generatorOnly' buttons only show on generator nodes.
const BUTTONS = [
  { id: 'collapse', icon: drawChevron, tooltip: 'Collapse', generatorOnly: false },
  { id: 'run',      icon: drawPlay,    tooltip: 'Run This Node', generatorOnly: true },
];

function getVisibleButtons(node) {
  // When collapsed, only show the expand chevron
  if (node.flags.collapsed) {
    return BUTTONS.filter(b => b.id === 'collapse');
  }
  const isGenerator = node.type?.startsWith('generator/');
  return BUTTONS.filter(b => !b.generatorOnly || isGenerator);
}

function getNodeWidth(node) {
  if (node.flags.collapsed) {
    const cw = node._collapsed_width || node.computeSize?.()?.[0] || 140;
    const needed = cw + BTN_SIZE + BTN_GAP * 2;
    // Expand the node's collapsed width so LiteGraph renders it wide enough
    if (node._collapsed_width < needed) {
      node._collapsed_width = needed;
    }
    return needed;
  }
  return node.size[0];
}

// ═══════════════ DRAW ═══════════════

export function drawHeader(ctx, node) {
  const W = getNodeWidth(node);
  const hover = node._headerHover || null;
  const visible = getVisibleButtons(node);

  // ── Buttons (right-aligned in title bar) ──
  for (let i = 0; i < visible.length; i++) {
    const btn = visible[i];
    const bx = W - (BTN_SIZE + BTN_GAP) * (i + 1);
    const by = BTN_Y;
    const isHover = hover === btn.id;
    const isRunning = btn.id === 'run' && node._wfStatus === 'running';

    const isCollapsed = node.flags.collapsed;

    // Background — more visible when collapsed
    ctx.fillStyle = isRunning ? '#facc1530' : (isHover ? '#ffffff14' : (isCollapsed ? '#ffffff10' : '#ffffff08'));
    roundRect(ctx, bx, by, BTN_SIZE, BTN_SIZE, 5);
    ctx.fill();

    // Border on hover or when collapsed (always show border for expand button)
    if (isHover || isRunning || isCollapsed) {
      ctx.strokeStyle = isRunning ? '#facc1560' : (isHover ? '#ffffff20' : '#ffffff15');
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, BTN_SIZE, BTN_SIZE, 5);
      ctx.stroke();
    }

    // Icon — brighter when collapsed
    const color = isRunning ? '#facc15' : (isHover ? '#e4e4e7' : (isCollapsed ? '#a1a1aa' : '#71717a'));
    btn.icon(ctx, bx, by, BTN_SIZE, color, node);
  }

  // ── Status indicator (left of buttons, only when expanded) ──
  if (!node.flags.collapsed) {
    drawStatusDot(ctx, node);
  }

  // ── Tooltip ──
  if (hover) {
    const btn = visible.find(b => b.id === hover);
    if (btn) {
      const idx = visible.indexOf(btn);
      const bx = W - (BTN_SIZE + BTN_GAP) * (idx + 1);
      drawTooltip(ctx, bx + BTN_SIZE / 2, BTN_Y + BTN_SIZE + 6, btn.tooltip);
    }
  }
}

// ═══════════════ MOUSE ═══════════════

export function handleHeaderMove(node, localPos) {
  const W = getNodeWidth(node);
  const visible = getVisibleButtons(node);
  let newHover = null;

  for (let i = 0; i < visible.length; i++) {
    const bx = W - (BTN_SIZE + BTN_GAP) * (i + 1);
    if (localPos[0] >= bx && localPos[0] <= bx + BTN_SIZE &&
        localPos[1] >= BTN_Y && localPos[1] <= BTN_Y + BTN_SIZE) {
      newHover = visible[i].id;
      break;
    }
  }

  if (node._headerHover !== newHover) {
    node._headerHover = newHover;
    node.setDirtyCanvas(true);
  }
}

export function handleHeaderClick(node, localPos, e) {
  const W = getNodeWidth(node);
  const visible = getVisibleButtons(node);

  for (let i = 0; i < visible.length; i++) {
    const btn = visible[i];
    const bx = W - (BTN_SIZE + BTN_GAP) * (i + 1);
    if (localPos[0] >= bx && localPos[0] <= bx + BTN_SIZE &&
        localPos[1] >= BTN_Y && localPos[1] <= BTN_Y + BTN_SIZE) {

      if (btn.id === 'run') {
        runSingleNode(node);
        return true;
      }
      if (btn.id === 'collapse') {
        node.flags.collapsed = !node.flags.collapsed;
        node.setDirtyCanvas(true, true);
        return true;
      }
    }
  }

  return false;
}

/**
 * Handle double-click on title area for renaming.
 * Returns true if the click was on the title (handled), false otherwise.
 */
export function handleTitleDblClick(node, localPos) {
  // Title area spans y = -TITLE_H to y = 0, excluding button zone on the right
  const btnZoneWidth = (BTN_SIZE + BTN_GAP) * BUTTONS.length + BTN_GAP;
  if (localPos[1] >= -TITLE_H && localPos[1] <= 0 && localPos[0] < getNodeWidth(node) - btnZoneWidth) {
    const newTitle = prompt('Rename node:', node.title);
    if (newTitle !== null && newTitle.trim()) {
      node.title = newTitle.trim();
      node.setDirtyCanvas(true, true);
    }
    return true;
  }
  return false;
}

/**
 * Helper to compute Y offset below all input/output slots.
 * LiteGraph draws slots starting at ~y=6 with ~22px per slot.
 * We add extra padding so our text doesn't overlap the last slot label.
 */
export function getContentY(node) {
  const numInputs = node.inputs ? node.inputs.length : 0;
  const numOutputs = node.outputs ? node.outputs.length : 0;
  const maxSlots = Math.max(numInputs, numOutputs);
  // LiteGraph slots: first at ~y=26, then +20px each. Add 16px padding after last slot.
  return maxSlots * 20 + 26;
}

// ═══════════════ RUN SINGLE NODE ═══════════════

async function runSingleNode(node) {
  if (node._wfStatus === 'running') return;

  // Check API key
  const key = localStorage.getItem('muapi_key');
  if (!key) {
    const { AuthModal } = await import('../components/AuthModal.js');
    document.body.appendChild(AuthModal());
    return;
  }

  const graph = node.graph;
  if (!graph) return;

  // First, gather inputs by running upstream input-type nodes
  // (the ones that just return their stored data, no API calls)
  const upstreamToRun = [];
  collectUpstream(graph, node, upstreamToRun);

  // Run upstream input nodes to populate their _wfOutputs
  for (const upstream of upstreamToRun) {
    if (typeof upstream.onWorkflowExecute !== 'function') continue;
    // Only auto-run "cheap" nodes (inputs, utilities) — not other generators
    if (upstream.type.startsWith('generator/') && upstream !== node) continue;
    try {
      upstream._wfStatus = 'running';
      upstream.setDirtyCanvas(true, true);
      const outputs = await upstream.onWorkflowExecute(
        gatherInputs(graph, upstream), muapi, new AbortController().signal
      );
      if (outputs && typeof outputs === 'object') {
        upstream._wfOutputs = outputs;
      }
      upstream._wfStatus = 'complete';
      upstream.setDirtyCanvas(true, true);
    } catch (e) {
      upstream._wfStatus = 'error';
      upstream._wfData = { message: e.message };
      upstream.setDirtyCanvas(true, true);
    }
  }

  // Now run the target node
  const inputs = gatherInputs(graph, node);

  node._wfStatus = 'running';
  node.setDirtyCanvas(true, true);

  try {
    const outputs = await node.onWorkflowExecute(inputs, muapi, new AbortController().signal);
    if (outputs && typeof outputs === 'object') {
      node._wfOutputs = outputs;
    }
    node._wfStatus = 'complete';
    node._wfData = outputs;
  } catch (e) {
    node._wfStatus = 'error';
    node._wfData = { message: e.message };
    console.error('[RunSingleNode]', e);
  }

  node.setDirtyCanvas(true, true);
}

function gatherInputs(graph, node) {
  const inputs = {};
  if (!node.inputs) return inputs;
  for (let i = 0; i < node.inputs.length; i++) {
    const input = node.inputs[i];
    const link = graph.links[input.link];
    if (link) {
      const sourceNode = graph.getNodeById(link.origin_id);
      if (sourceNode && sourceNode._wfOutputs) {
        const slotName = sourceNode.outputs?.[link.origin_slot]?.name || link.origin_slot;
        inputs[input.name] = sourceNode._wfOutputs[slotName];
      }
    }
  }
  return inputs;
}

function collectUpstream(graph, node, collected, visited = new Set()) {
  if (visited.has(node.id)) return;
  visited.add(node.id);

  if (!node.inputs) return;
  for (let i = 0; i < node.inputs.length; i++) {
    const input = node.inputs[i];
    const link = graph.links[input.link];
    if (link) {
      const sourceNode = graph.getNodeById(link.origin_id);
      if (sourceNode) {
        collectUpstream(graph, sourceNode, collected, visited);
        if (!collected.includes(sourceNode)) {
          collected.push(sourceNode);
        }
      }
    }
  }
}

// ═══════════════ ICON DRAWERS ═══════════════

function drawPlay(ctx, x, y, size, color, node) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (node._wfStatus === 'running') {
    // Stop icon (square)
    const s = 6;
    ctx.fillStyle = color;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  } else {
    // Play triangle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 5);
    ctx.lineTo(cx - 3, cy + 5);
    ctx.lineTo(cx + 5, cy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawChevron(ctx, x, y, size, color, node) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (node.flags.collapsed) {
    ctx.moveTo(cx - 3, cy - 3);
    ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx - 3, cy + 3);
  } else {
    ctx.moveTo(cx - 3, cy - 2);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx + 3, cy - 2);
  }
  ctx.stroke();
}

// ═══════════════ HELPERS ═══════════════

function drawStatusDot(ctx, node) {
  if (!node._wfStatus || node._wfStatus === 'idle') return;
  const colors = { running: '#facc15', complete: '#22c55e', error: '#ef4444' };
  const btnZoneWidth = (BTN_SIZE + BTN_GAP) * BUTTONS.length + BTN_GAP;
  const dx = node.size[0] - btnZoneWidth - 12;
  const dy = BTN_Y + BTN_SIZE / 2;
  ctx.fillStyle = colors[node._wfStatus] || '#a1a1aa';
  ctx.beginPath();
  ctx.arc(dx, dy, 4, 0, Math.PI * 2);
  ctx.fill();

  if (node._wfStatus === 'running') {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    const t = (Date.now() % 1000) / 1000;
    ctx.beginPath();
    ctx.arc(dx, dy, 7, t * Math.PI * 2, t * Math.PI * 2 + Math.PI * 1.4);
    ctx.stroke();
  }
}

function drawTooltip(ctx, x, y, text) {
  ctx.font = '10px Inter, system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 10;
  const th = 18;
  const tx = x - tw / 2;

  ctx.fillStyle = '#1a1a1a';
  roundRect(ctx, tx, y, tw, th, 4);
  ctx.fill();
  ctx.strokeStyle = '#ffffff18';
  ctx.lineWidth = 1;
  roundRect(ctx, tx, y, tw, th, 4);
  ctx.stroke();

  ctx.fillStyle = '#e4e4e7';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 12.5);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
