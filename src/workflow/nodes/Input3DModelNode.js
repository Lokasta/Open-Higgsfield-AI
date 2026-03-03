import { muapi } from '../../lib/muapi.js';
import { drawHeader, handleHeaderClick, handleHeaderMove } from '../nodeHeader.js';

export function registerInput3DModelNode() {
  function Input3DModelNode() {
    this.addOutput('model3d', 'model3d');
    this.properties = { url: '', filename: '' };
    this.size = [240, 80];
    this.color = '#2a0f1e';
    this.bgcolor = '#1e0a16';
  }

  Input3DModelNode.title = '3D Model Input';
  Input3DModelNode.desc = 'Upload a 3D model file';

  Input3DModelNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    ctx.fillStyle = '#52525b';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.properties.filename || 'Double-click to upload', this.size[0] / 2, this.size[1] / 2 + 5);
    ctx.textAlign = 'left';
  };

  Input3DModelNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  Input3DModelNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  Input3DModelNode.prototype.onDblClick = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf,.obj,.fbx,.stl';
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
        console.error('[Input3DModelNode] Upload failed:', e);
        this.properties.filename = 'Upload failed';
        this.setDirtyCanvas(true);
      }
    };
    input.click();
  };

  Input3DModelNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  Input3DModelNode.prototype.onWorkflowExecute = function() {
    return { model3d: this.properties.url || '' };
  };

  LiteGraph.registerNodeType('input/3d_model', Input3DModelNode);
}
