import { SLOT_COLORS } from './theme.js';

const NODE_CATEGORIES = [
  {
    title: 'Input',
    nodes: [
      { type: 'input/text', label: 'Text', color: SLOT_COLORS.string },
      { type: 'input/image', label: 'Image', color: SLOT_COLORS.image },
      { type: 'input/video', label: 'Video', color: SLOT_COLORS.video },
      { type: 'input/audio', label: 'Audio', color: SLOT_COLORS.audio },
      { type: 'input/3d_model', label: '3D Model', color: SLOT_COLORS.model3d },
    ],
  },
  {
    title: 'Generators',
    nodes: [
      { type: 'generator/image', label: 'Image Generator', color: SLOT_COLORS.image },
      { type: 'generator/video', label: 'Video Generator', color: SLOT_COLORS.video },
      { type: 'generator/3d', label: '3D Generator', color: SLOT_COLORS.model3d },
      { type: 'generator/audio', label: 'Audio Generator', color: SLOT_COLORS.audio },
      { type: 'generator/llm', label: 'LLM', color: SLOT_COLORS.string },
    ],
  },
  {
    title: 'Utilities',
    nodes: [
      { type: 'utility/prompt_builder', label: 'Prompt Builder', color: SLOT_COLORS.string },
      { type: 'utility/tools', label: 'Tools', color: '#a1a1aa' },
      { type: 'utility/group_assets', label: 'Group Assets', color: SLOT_COLORS.collection },
      { type: 'utility/if_else', label: 'If / Else', color: '#a1a1aa' },
      { type: 'utility/scene_splitter', label: 'Scene Splitter', color: '#4ade80' },
    ],
  },
];

export function createPalette(graph, canvas) {
  const el = document.createElement('div');
  el.className = 'workflow-palette';

  // ── Tab bar ──
  const tabBar = document.createElement('div');
  tabBar.className = 'palette-tabs';

  const nodesTab = document.createElement('button');
  nodesTab.className = 'palette-tab active';
  nodesTab.textContent = 'Nodes';

  const assetsTab = document.createElement('button');
  assetsTab.className = 'palette-tab';
  assetsTab.textContent = 'Assets';

  tabBar.appendChild(nodesTab);
  tabBar.appendChild(assetsTab);
  el.appendChild(tabBar);

  // ── Nodes panel ──
  const nodesPanel = document.createElement('div');
  nodesPanel.className = 'palette-panel no-scrollbar';

  NODE_CATEGORIES.forEach(cat => {
    const section = document.createElement('div');
    section.className = 'palette-category';

    const title = document.createElement('div');
    title.className = 'palette-category-title';
    title.textContent = cat.title;
    section.appendChild(title);

    cat.nodes.forEach(nodeDef => {
      const item = document.createElement('div');
      item.className = 'palette-node';
      item.draggable = true;

      const dot = document.createElement('span');
      dot.className = 'palette-node-dot';
      dot.style.background = nodeDef.color;
      item.appendChild(dot);

      const label = document.createElement('span');
      label.textContent = nodeDef.label;
      item.appendChild(label);

      // Drag to add
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('litegraph/nodetype', nodeDef.type);
        e.dataTransfer.effectAllowed = 'copy';
      });

      // Double-click to add at center
      item.addEventListener('dblclick', () => {
        const center = canvas.convertOffsetToCanvas([
          canvas.canvas.width / 2,
          canvas.canvas.height / 2,
        ]);
        const node = LiteGraph.createNode(nodeDef.type);
        if (node) {
          node.pos = [center[0] - node.size[0] / 2, center[1] - node.size[1] / 2];
          graph.add(node);
          canvas.selectNode(node);
        }
      });

      section.appendChild(item);
    });

    nodesPanel.appendChild(section);
  });

  el.appendChild(nodesPanel);

  // ── Assets panel ──
  const assetsPanel = document.createElement('div');
  assetsPanel.className = 'palette-panel no-scrollbar';
  assetsPanel.style.display = 'none';
  el.appendChild(assetsPanel);

  // Tab switching
  nodesTab.onclick = () => {
    nodesTab.classList.add('active');
    assetsTab.classList.remove('active');
    nodesPanel.style.display = '';
    assetsPanel.style.display = 'none';
  };

  assetsTab.onclick = () => {
    assetsTab.classList.add('active');
    nodesTab.classList.remove('active');
    assetsPanel.style.display = '';
    nodesPanel.style.display = 'none';
    refreshAssets();
  };

  // ── Asset scanning ──
  function collectAssets() {
    const assets = [];
    const seen = new Set();

    if (!graph._nodes) return assets;

    for (const node of graph._nodes) {
      // Generator nodes with preview
      if (node._previewUrl && !seen.has(node._previewUrl)) {
        seen.add(node._previewUrl);
        const type = node._previewType || (node.type === 'generator/video' ? 'video' : 'image');
        assets.push({
          url: node._previewUrl,
          type,
          source: node.title || node.type,
          nodeId: node.id,
        });
      }

      // Input image nodes
      if (node.properties?.urls && Array.isArray(node.properties.urls)) {
        for (const url of node.properties.urls) {
          if (url && !seen.has(url)) {
            seen.add(url);
            const type = node.type === 'input/video' ? 'video'
              : node.type === 'input/audio' ? 'audio'
              : 'image';
            assets.push({
              url,
              type,
              source: node.title || node.type,
              nodeId: node.id,
            });
          }
        }
      }

      // Input nodes with single url property
      if (node.properties?.url && !seen.has(node.properties.url)) {
        seen.add(node.properties.url);
        const type = node.type?.includes('video') ? 'video'
          : node.type?.includes('audio') ? 'audio'
          : node.type?.includes('3d') ? 'model3d'
          : 'image';
        assets.push({
          url: node.properties.url,
          type,
          source: node.title || node.type,
          nodeId: node.id,
        });
      }

      // Workflow outputs that contain URLs
      if (node._wfOutputs) {
        for (const [key, val] of Object.entries(node._wfOutputs)) {
          if (typeof val === 'string' && val.startsWith('http') && !seen.has(val)) {
            seen.add(val);
            const type = key === 'video' ? 'video'
              : key === 'audio' ? 'audio'
              : key === 'model3d' ? 'model3d'
              : 'image';
            assets.push({
              url: val,
              type,
              source: node.title || node.type,
              nodeId: node.id,
            });
          }
          // Array outputs (like images collection)
          if (Array.isArray(val)) {
            for (const item of val) {
              if (typeof item === 'string' && item.startsWith('http') && !seen.has(item)) {
                seen.add(item);
                assets.push({
                  url: item,
                  type: 'image',
                  source: node.title || node.type,
                  nodeId: node.id,
                });
              }
            }
          }
        }
      }
    }

    return assets;
  }

  function refreshAssets() {
    assetsPanel.innerHTML = '';
    const assets = collectAssets();

    if (assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'assets-empty';
      empty.textContent = 'No assets yet. Run your workflow or add images to input nodes.';
      assetsPanel.appendChild(empty);
      return;
    }

    // Group by type
    const grouped = {};
    for (const a of assets) {
      const label = a.type === 'video' ? 'Videos'
        : a.type === 'audio' ? 'Audio'
        : a.type === 'model3d' ? '3D Models'
        : 'Images';
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(a);
    }

    for (const [label, items] of Object.entries(grouped)) {
      const section = document.createElement('div');
      section.className = 'palette-category';

      const title = document.createElement('div');
      title.className = 'palette-category-title';
      title.textContent = `${label} (${items.length})`;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'assets-grid';

      for (const asset of items) {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.draggable = true;
        card.title = `${asset.source}\n${asset.url}`;

        // Drag to drop onto input nodes
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/uri-list', asset.url);
          e.dataTransfer.setData('workflow/asset-url', asset.url);
          e.dataTransfer.setData('workflow/asset-type', asset.type);
          e.dataTransfer.effectAllowed = 'copy';
        });

        // Click to select the source node
        card.addEventListener('click', () => {
          const node = graph.getNodeById(asset.nodeId);
          if (node) {
            canvas.selectNode(node);
            canvas.centerOnNode(node);
            canvas.setDirty(true, true);
          }
        });

        if (asset.type === 'image') {
          const img = document.createElement('img');
          img.src = asset.url;
          img.loading = 'lazy';
          img.alt = asset.source;
          card.appendChild(img);
        } else if (asset.type === 'video') {
          const videoWrap = document.createElement('div');
          videoWrap.className = 'asset-video-wrap';
          const badge = document.createElement('span');
          badge.className = 'asset-badge video';
          badge.textContent = 'VIDEO';
          videoWrap.appendChild(badge);
          card.appendChild(videoWrap);
        } else if (asset.type === 'audio') {
          const audioWrap = document.createElement('div');
          audioWrap.className = 'asset-placeholder audio';
          const badge = document.createElement('span');
          badge.className = 'asset-badge audio';
          badge.textContent = 'AUDIO';
          audioWrap.appendChild(badge);
          card.appendChild(audioWrap);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'asset-placeholder';
          const badge = document.createElement('span');
          badge.className = 'asset-badge';
          badge.textContent = '3D';
          placeholder.appendChild(badge);
          card.appendChild(placeholder);
        }

        const info = document.createElement('div');
        info.className = 'asset-info';
        info.textContent = asset.source;
        card.appendChild(info);

        grid.appendChild(card);
      }

      section.appendChild(grid);
      assetsPanel.appendChild(section);
    }
  }

  // Auto-refresh assets when tab is visible and graph changes
  let refreshTimer = null;
  const scheduleRefresh = () => {
    if (assetsPanel.style.display === 'none') return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshAssets, 500);
  };

  // Listen for graph changes
  const origAdd = graph.add.bind(graph);
  graph.add = function(node) {
    const result = origAdd(node);
    scheduleRefresh();
    return result;
  };

  const origRemove = graph.remove.bind(graph);
  graph.remove = function(node) {
    const result = origRemove(node);
    scheduleRefresh();
    return result;
  };

  return el;
}
