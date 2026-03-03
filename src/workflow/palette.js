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
    ],
  },
];

export function createPalette(graph, canvas) {
  const el = document.createElement('div');
  el.className = 'workflow-palette no-scrollbar';

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

    el.appendChild(section);
  });

  return el;
}
