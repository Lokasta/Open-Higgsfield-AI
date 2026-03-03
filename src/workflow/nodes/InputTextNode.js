import { drawHeader, handleHeaderClick, handleHeaderMove } from '../nodeHeader.js';

export function registerInputTextNode() {
  function InputTextNode() {
    this.addOutput('text', 'string');
    this.properties = { text: '' };
    this.size = [240, 120];
    this.color = '#2a2a0f';
    this.bgcolor = '#1a1a08';

    this._textarea = null;
  }

  InputTextNode.title = 'Text Input';
  InputTextNode.desc = 'Enter text or prompt';

  InputTextNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '11px Inter, system-ui, sans-serif';
    const text = this.properties.text || '(empty)';
    const lines = text.split('\n').slice(0, 4);
    lines.forEach((line, i) => {
      ctx.fillText(line.slice(0, 35), 10, 40 + i * 14);
    });
  };

  InputTextNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  InputTextNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  InputTextNode.prototype.onDblClick = function() {
    const val = prompt('Enter text:', this.properties.text || '');
    if (val !== null) this.properties.text = val;
  };

  InputTextNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  InputTextNode.prototype.onWorkflowExecute = function() {
    return { text: this.properties.text || '' };
  };

  InputTextNode.prototype.onInspector = function() {
    const wrap = document.createElement('div');
    wrap.className = 'inspector-field';
    const label = document.createElement('div');
    label.className = 'inspector-label';
    label.textContent = 'Text';
    wrap.appendChild(label);
    const ta = document.createElement('textarea');
    ta.value = this.properties.text || '';
    ta.rows = 5;
    ta.oninput = () => { this.properties.text = ta.value; this.setDirtyCanvas(true); };
    wrap.appendChild(ta);
    return wrap;
  };

  // ═══════════════ CONFIGURE (persistence) ═══════════════

  InputTextNode.prototype.onConfigure = function(data) {
    if (this.properties.text) {
      this._wfOutputs = { text: this.properties.text };
    }
  };

  LiteGraph.registerNodeType('input/text', InputTextNode);
}
