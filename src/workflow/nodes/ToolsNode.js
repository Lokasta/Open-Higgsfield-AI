import { drawHeader, handleHeaderClick, handleHeaderMove, getContentY } from '../nodeHeader.js';

export function registerToolsNode() {
  function ToolsNode() {
    this.addInput('image', 'image');
    this.addInput('video', 'video');
    this.addOutput('image', 'image');
    this.addOutput('video', 'video');
    this.properties = {
      effect: 'passthrough',
    };
    this.size = [240, 100];
    this.color = '#1a1a1a';
    this.bgcolor = '#121212';

    this._enums = {
      effect: ['passthrough', 'upscale_2x', 'resize_720p', 'resize_1080p'],
    };
  }

  ToolsNode.title = 'Tools';
  ToolsNode.desc = 'Apply effects and transformations';

  ToolsNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Effect: ${this.properties.effect}`, 10, y0);
  };

  ToolsNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  ToolsNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  ToolsNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  ToolsNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    const image = inputs.image || '';
    const video = inputs.video || '';

    if (this.properties.effect === 'passthrough') {
      return { image, video };
    }

    console.log(`[ToolsNode] Effect "${this.properties.effect}" — passthrough (API dependent)`);
    return { image, video };
  };

  LiteGraph.registerNodeType('utility/tools', ToolsNode);
}
