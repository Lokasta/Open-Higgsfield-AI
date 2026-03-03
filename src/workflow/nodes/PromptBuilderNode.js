import { drawHeader, handleHeaderClick, handleHeaderMove, getContentY } from '../nodeHeader.js';

export function registerPromptBuilderNode() {
  function PromptBuilderNode() {
    this.addInput('text_1', 'string');
    this.addInput('text_2', 'string');
    this.addInput('text_3', 'string');
    this.addOutput('prompt', 'string');
    this.properties = {
      separator: ', ',
      prefix: '',
      suffix: '',
    };
    this.size = [240, 120];
    this.color = '#2a2a0f';
    this.bgcolor = '#1a1a08';
  }

  PromptBuilderNode.title = 'Prompt Builder';
  PromptBuilderNode.desc = 'Combine multiple text inputs into one prompt';

  PromptBuilderNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    const y0 = getContentY(this);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Sep: "${this.properties.separator}"`, 10, y0);
    if (this.properties.prefix) ctx.fillText(`Prefix: ${this.properties.prefix.slice(0, 25)}`, 10, y0 + 14);
    if (this.properties.suffix) ctx.fillText(`Suffix: ${this.properties.suffix.slice(0, 25)}`, 10, y0 + 28);
  };

  PromptBuilderNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  PromptBuilderNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  PromptBuilderNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  PromptBuilderNode.prototype.onWorkflowExecute = function(inputs) {
    const parts = [];
    if (inputs.text_1) parts.push(inputs.text_1);
    if (inputs.text_2) parts.push(inputs.text_2);
    if (inputs.text_3) parts.push(inputs.text_3);

    let result = parts.join(this.properties.separator);
    if (this.properties.prefix) result = this.properties.prefix + result;
    if (this.properties.suffix) result = result + this.properties.suffix;

    return { prompt: result };
  };

  LiteGraph.registerNodeType('utility/prompt_builder', PromptBuilderNode);
}
