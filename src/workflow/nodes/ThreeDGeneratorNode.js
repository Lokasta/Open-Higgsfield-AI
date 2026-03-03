import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';

export function registerThreeDGeneratorNode() {
  function ThreeDGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addInput('image', 'image');
    this.addOutput('model3d', 'model3d');
    this.properties = {
      model: 'hunyuan3d',
    };
    this.size = [260, 100];
    this.color = '#2a0f1e';
    this.bgcolor = '#1e0a16';

    this._modelList = [
      { id: 'hunyuan3d', name: 'Hunyuan 3D' },
      { id: 'meshy', name: 'Meshy' },
      { id: 'trellis', name: 'Trellis' },
    ];
    this._enums = {};
  }

  ThreeDGeneratorNode.title = '3D Generator';
  ThreeDGeneratorNode.desc = 'Generate 3D models (stub - API dependent)';

  ThreeDGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${this.properties.model}`, 10, y0);
    ctx.fillStyle = '#52525b';
    ctx.fillText('Stub — awaiting API', 10, y0 + 14);
  };

  ThreeDGeneratorNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  ThreeDGeneratorNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  ThreeDGeneratorNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  ThreeDGeneratorNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  ThreeDGeneratorNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    console.warn('[ThreeDGenerator] Stub node — no API endpoint yet');
    return { model3d: '' };
  };

  ThreeDGeneratorNode.prototype.onSerialize = function(data) {
    if (this._wfOutputs) data._wfOutputs = this._wfOutputs;
  };

  ThreeDGeneratorNode.prototype.onConfigure = function(data) {
    if (data._wfOutputs) {
      this._wfOutputs = data._wfOutputs;
      this._wfStatus = 'complete';
    }
  };

  LiteGraph.registerNodeType('generator/3d', ThreeDGeneratorNode);
}
