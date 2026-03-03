import { muapi } from '../../lib/muapi.js';
import { drawHeader, handleHeaderClick, handleHeaderMove } from '../nodeHeader.js';

export function registerInputAudioNode() {
  function InputAudioNode() {
    this.addOutput('audio', 'audio');
    this.properties = { url: '', filename: '' };
    this.size = [240, 80];
    this.color = '#2a1a0a';
    this.bgcolor = '#1e1208';
  }

  InputAudioNode.title = 'Audio Input';
  InputAudioNode.desc = 'Upload an audio file';

  InputAudioNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    ctx.fillStyle = '#52525b';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.properties.filename || 'Double-click to upload', this.size[0] / 2, this.size[1] / 2 + 5);
    ctx.textAlign = 'left';
  };

  InputAudioNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  InputAudioNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  InputAudioNode.prototype.onDblClick = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
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
        console.error('[InputAudioNode] Upload failed:', e);
        this.properties.filename = 'Upload failed';
        this.setDirtyCanvas(true);
      }
    };
    input.click();
  };

  InputAudioNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  InputAudioNode.prototype.onWorkflowExecute = function() {
    return { audio: this.properties.url || '' };
  };

  // ═══════════════ CONFIGURE (persistence) ═══════════════

  InputAudioNode.prototype.onConfigure = function(data) {
    if (this.properties.url) {
      this._wfOutputs = { audio: this.properties.url };
    }
  };

  LiteGraph.registerNodeType('input/audio', InputAudioNode);
}
