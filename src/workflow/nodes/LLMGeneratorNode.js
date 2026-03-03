import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';

export function registerLLMGeneratorNode() {
  function LLMGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addInput('context', 'string');
    this.addOutput('text', 'string');
    this.properties = {
      model: 'gpt-4o',
      system_prompt: 'You are a helpful assistant.',
      temperature: 0.7,
    };
    this.size = [280, 160];
    this.color = '#2a2a0f';
    this.bgcolor = '#1a1a08';

    this._modelList = [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'gemini-flash', name: 'Gemini Flash' },
      { id: 'claude-sonnet', name: 'Claude Sonnet' },
    ];
    this._enums = {};
    this._outputText = '';
  }

  LLMGeneratorNode.title = 'LLM';
  LLMGeneratorNode.desc = 'Generate text with LLM models';

  LLMGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    const model = this._modelList.find(m => m.id === this.properties.model);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${model?.name || this.properties.model}`, 10, y0);
    ctx.fillText(`Temp: ${this.properties.temperature}`, 10, y0 + 14);

    if (this._outputText) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px Inter, system-ui, sans-serif';
      const lines = this._outputText.split('\n').slice(0, 4);
      lines.forEach((line, i) => {
        ctx.fillText(line.slice(0, 40), 10, y0 + 32 + i * 13);
      });
    }
  };

  LLMGeneratorNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  LLMGeneratorNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  LLMGeneratorNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  LLMGeneratorNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  LLMGeneratorNode.prototype.onInspector = function() {
    const wrap = document.createElement('div');

    const sysField = document.createElement('div');
    sysField.className = 'inspector-field';
    const sysLabel = document.createElement('div');
    sysLabel.className = 'inspector-label';
    sysLabel.textContent = 'System Prompt';
    sysField.appendChild(sysLabel);
    const sysTa = document.createElement('textarea');
    sysTa.value = this.properties.system_prompt;
    sysTa.rows = 3;
    sysTa.oninput = () => { this.properties.system_prompt = sysTa.value; };
    sysField.appendChild(sysTa);
    wrap.appendChild(sysField);

    const tempField = document.createElement('div');
    tempField.className = 'inspector-field';
    const tempLabel = document.createElement('div');
    tempLabel.className = 'inspector-label';
    tempLabel.textContent = 'Temperature';
    tempField.appendChild(tempLabel);
    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.min = '0';
    tempInput.max = '2';
    tempInput.step = '0.1';
    tempInput.value = this.properties.temperature;
    tempInput.onchange = () => { this.properties.temperature = parseFloat(tempInput.value) || 0.7; };
    tempField.appendChild(tempInput);
    wrap.appendChild(tempField);

    return wrap;
  };

  LLMGeneratorNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    const prompt = inputs.prompt || '';
    const context = inputs.context || '';
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    console.log('[LLMGenerator] Would call LLM with:', { model: this.properties.model, prompt: fullPrompt });
    this._outputText = fullPrompt;
    this.setDirtyCanvas(true);

    return { text: fullPrompt };
  };

  LiteGraph.registerNodeType('generator/llm', LLMGeneratorNode);
}
