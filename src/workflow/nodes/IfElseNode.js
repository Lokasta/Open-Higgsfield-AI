import { drawHeader, handleHeaderClick, handleHeaderMove, getContentY } from '../nodeHeader.js';

export function registerIfElseNode() {
  function IfElseNode() {
    this.addInput('value', '*');
    this.addOutput('true', '*');
    this.addOutput('false', '*');
    this.properties = {
      condition: 'not_empty',
      compare_value: '',
    };
    this.size = [240, 100];
    this.color = '#1a1a1a';
    this.bgcolor = '#121212';

    this._enums = {
      condition: ['not_empty', 'equals', 'contains', 'greater_than', 'less_than'],
    };
  }

  IfElseNode.title = 'If / Else';
  IfElseNode.desc = 'Route data based on a condition';

  IfElseNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Condition: ${this.properties.condition}`, 10, y0);
    if (this.properties.compare_value) {
      ctx.fillText(`Compare: "${this.properties.compare_value}"`, 10, y0 + 14);
    }
  };

  IfElseNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  IfElseNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  IfElseNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  IfElseNode.prototype.onWorkflowExecute = function(inputs) {
    const value = inputs.value;
    let result = false;

    switch (this.properties.condition) {
      case 'not_empty':
        result = value != null && value !== '' && value !== false;
        break;
      case 'equals':
        result = String(value) === this.properties.compare_value;
        break;
      case 'contains':
        result = String(value || '').includes(this.properties.compare_value);
        break;
      case 'greater_than':
        result = Number(value) > Number(this.properties.compare_value);
        break;
      case 'less_than':
        result = Number(value) < Number(this.properties.compare_value);
        break;
    }

    return {
      true: result ? value : undefined,
      false: result ? undefined : value,
    };
  };

  LiteGraph.registerNodeType('utility/if_else', IfElseNode);
}
