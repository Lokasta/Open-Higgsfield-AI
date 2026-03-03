import { muapi } from '../../lib/muapi.js';
import { drawHeader, handleHeaderClick, handleHeaderMove } from '../nodeHeader.js';

export function registerInputVideoNode() {
  function InputVideoNode() {
    this.addOutput('video', 'video');
    this.properties = { url: '', filename: '' };
    this.size = [240, 80];
    this.color = '#1a0f2a';
    this.bgcolor = '#120a1e';
  }

  InputVideoNode.title = 'Video Input';
  InputVideoNode.desc = 'Upload a video file';

  InputVideoNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    ctx.fillStyle = '#52525b';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.properties.filename || 'Double-click to upload', this.size[0] / 2, this.size[1] / 2 + 5);
    ctx.textAlign = 'left';
  };

  InputVideoNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  InputVideoNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  InputVideoNode.prototype.onDblClick = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      this.properties.filename = file.name;
      this.setDirtyCanvas(true);
      try {
        const url = await muapi.uploadFile(file);
        this.properties.url = url;
        this.setDirtyCanvas(true);
      } catch (e) {
        console.error('[InputVideoNode] Upload failed:', e);
        this.properties.filename = 'Upload failed';
        this.setDirtyCanvas(true);
      }
    };
    input.click();
  };

  InputVideoNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  InputVideoNode.prototype.onWorkflowExecute = function() {
    return { video: this.properties.url || '' };
  };

  // ═══════════════ CONFIGURE (persistence) ═══════════════

  InputVideoNode.prototype.onConfigure = function(data) {
    if (this.properties.url) {
      this._wfOutputs = { video: this.properties.url };
    }
  };

  LiteGraph.registerNodeType('input/video', InputVideoNode);
}
