import { drawHeader, handleHeaderClick, handleHeaderMove, getContentY } from '../nodeHeader.js';

export function registerGroupAssetsNode() {
  function GroupAssetsNode() {
    this.addInput('item_1', '*');
    this.addInput('item_2', '*');
    this.addInput('item_3', '*');
    this.addInput('item_4', '*');
    this.addOutput('collection', 'collection');
    this.properties = {};
    this.size = [200, 120];
    this.color = '#1a1a2a';
    this.bgcolor = '#0f0f1e';
  }

  GroupAssetsNode.title = 'Group Assets';
  GroupAssetsNode.desc = 'Collect multiple outputs into a collection';

  GroupAssetsNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    const count = this._wfData?.count || 0;
    ctx.fillText(`Items: ${count}`, 10, y0);
  };

  GroupAssetsNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  GroupAssetsNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  GroupAssetsNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  GroupAssetsNode.prototype.onWorkflowExecute = function(inputs) {
    const items = [];
    for (const key of ['item_1', 'item_2', 'item_3', 'item_4']) {
      const val = inputs[key];
      if (!val) continue;
      // Flatten arrays (e.g. an InputImage's "images" output is already an array of URLs)
      if (Array.isArray(val)) {
        items.push(...val);
      } else {
        items.push(val);
      }
    }
    return { collection: items, count: items.length };
  };

  LiteGraph.registerNodeType('utility/group_assets', GroupAssetsNode);
}
