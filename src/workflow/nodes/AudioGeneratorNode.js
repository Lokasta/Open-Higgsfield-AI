import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';

export function registerAudioGeneratorNode() {
  function AudioGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addOutput('audio', 'audio');
    this.properties = {
      model: 'elevenlabs-tts',
    };
    this.size = [260, 100];
    this.color = '#2a1a0a';
    this.bgcolor = '#1e1208';

    this._modelList = [
      { id: 'elevenlabs-tts', name: 'ElevenLabs TTS' },
    ];
    this._enums = {};
  }

  AudioGeneratorNode.title = 'Audio Generator';
  AudioGeneratorNode.desc = 'Generate audio (stub - API dependent)';

  AudioGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${this.properties.model}`, 10, y0);
    ctx.fillStyle = '#52525b';
    ctx.fillText('Stub — awaiting API', 10, y0 + 14);
  };

  AudioGeneratorNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  AudioGeneratorNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  AudioGeneratorNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  AudioGeneratorNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  AudioGeneratorNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    console.warn('[AudioGenerator] Stub node — no API endpoint yet');
    return { audio: '' };
  };

  LiteGraph.registerNodeType('generator/audio', AudioGeneratorNode);
}
