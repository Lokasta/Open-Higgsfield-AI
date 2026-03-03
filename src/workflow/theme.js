import { LGraphCanvas } from 'litegraph.js';

const SLOT_COLORS = {
  string: '#d9ff00',
  image: '#22d3ee',
  video: '#a855f7',
  audio: '#f97316',
  model3d: '#ec4899',
  collection: '#6366f1',
  '*': '#a1a1aa',
};

export function applyDarkTheme(canvas) {
  // Canvas appearance
  canvas.background_image = null;
  canvas.clear_background_color = '#0a0a0a';
  canvas.default_connection_color_byType = { ...SLOT_COLORS };
  canvas.render_connections_border = false;
  canvas.render_curved_connections = true;
  canvas.render_connection_arrows = false;
  canvas.connections_width = 2.5;
  canvas.highquality_render = true;
  canvas.render_shadows = false;

  // Double-click on node title → rename instead of default panel
  canvas.onShowNodePanel = (node) => {
    if (node && typeof node.onTitleDblClick === 'function') {
      node.onTitleDblClick();
      return false; // prevent default panel
    }
  };

  // LiteGraph global defaults
  const LG = LGraphCanvas;
  LG.DEFAULT_BACKGROUND_IMAGE = null;

  LG.node_colors = {
    red: { color: '#3a1a1a', bgcolor: '#2a0f0f', groupcolor: '#ef4444' },
    green: { color: '#1a3a1a', bgcolor: '#0f2a0f', groupcolor: '#22c55e' },
    blue: { color: '#1a1a3a', bgcolor: '#0f0f2a', groupcolor: '#3b82f6' },
    cyan: { color: '#1a3a3a', bgcolor: '#0f2a2a', groupcolor: '#22d3ee' },
    purple: { color: '#2a1a3a', bgcolor: '#1a0f2a', groupcolor: '#a855f7' },
    yellow: { color: '#3a3a1a', bgcolor: '#2a2a0f', groupcolor: '#d9ff00' },
  };
}

export function applyNodeDefaults() {
  // Register slot colors by type globally
  if (typeof LiteGraph !== 'undefined') {
    Object.entries(SLOT_COLORS).forEach(([type, color]) => {
      LiteGraph.registered_slot_out_types[type] = { color };
      LiteGraph.registered_slot_in_types[type] = { color };
    });
  }
}

export { SLOT_COLORS };
