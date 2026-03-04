import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';

const DEFAULT_SYSTEM_PROMPT = `You are a cinematography assistant. Given a scene description, split it into exactly 3 parts and respond ONLY with valid JSON (no markdown, no explanation):

{
  "first_frame": "Detailed visual description of the opening frame — subject pose, expression, lighting, background, colors. This will be used to generate a still image, so describe it as a photograph.",
  "last_frame": "Detailed visual description of the final frame — how the subject/scene looks at the end. Describe as a photograph.",
  "motion": "Detailed description of what happens between the frames — camera movements (pan, tilt, dolly, zoom), subject motion, transitions, pacing, and any audio/atmospheric cues."
}

Rules:
- first_frame and last_frame must be pure visual descriptions (no motion words)
- motion must focus on movement, camera work, and transitions
- Keep each part concise but detailed enough for AI generation
- Preserve the creative intent and mood of the original scene`;

const LLM_MODELS = [
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', endpoint: 'gpt-5-mini' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', endpoint: 'gpt-5-nano' },
  { id: 'openrouter-vision', name: 'OpenRouter Vision', endpoint: 'openrouter-vision' },
];

const OUTPUT_KEYS = [
  { output: 'first frame', json: 'first_frame', label: 'First Frame', color: '#3b82f6' },
  { output: 'last frame',  json: 'last_frame',  label: 'Last Frame',  color: '#a855f7' },
  { output: 'motion',      json: 'motion',      label: 'Motion',      color: '#f59e0b' },
];

export function registerSceneSplitterNode() {
  function SceneSplitterNode() {
    this.addInput('scene', 'string');
    this.addOutput('first frame', 'string');
    this.addOutput('last frame', 'string');
    this.addOutput('motion', 'string');
    this.properties = {
      model: 'gpt-5-mini',
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.7,
    };
    this.size = [280, 160];
    this._defaultSize = [280, 160];
    this.color = '#1a2a0f';
    this.bgcolor = '#101a08';

    this._modelList = LLM_MODELS;
    this._enums = {};
    this._parsedOutputs = null;
  }

  SceneSplitterNode.title = 'Scene Splitter';
  SceneSplitterNode.desc = 'Split a scene description into first frame, last frame, and motion prompts using an LLM';

  SceneSplitterNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    const model = this._modelList.find(m => m.id === this.properties.model);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${model?.name || this.properties.model}`, 10, y0);

    if (this._parsedOutputs) {
      // Show truncated preview of each output
      let py = y0 + 16;
      for (const def of OUTPUT_KEYS) {
        const val = this._parsedOutputs[def.json] || '';
        if (!val) continue;
        ctx.fillStyle = def.color;
        ctx.font = 'bold 9px Inter, system-ui, sans-serif';
        ctx.fillText(def.label + ':', 10, py);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '9px Inter, system-ui, sans-serif';
        const preview = val.length > 35 ? val.slice(0, 35) + '...' : val;
        ctx.fillText(preview, 10 + ctx.measureText(def.label + ': ').width, py);
        py += 13;
      }
    } else {
      ctx.fillStyle = '#52525b';
      ctx.fillText('scene \u2192 first frame + last frame + motion', 10, y0 + 14);
    }
  };

  SceneSplitterNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
  };

  SceneSplitterNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    return false;
  };

  SceneSplitterNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  SceneSplitterNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  SceneSplitterNode.prototype.onInspector = function() {
    const node = this;
    const wrap = document.createElement('div');

    // Model selector
    const modelField = document.createElement('div');
    modelField.className = 'inspector-field';
    const modelLabel = document.createElement('div');
    modelLabel.className = 'inspector-label';
    modelLabel.textContent = 'Model';
    modelField.appendChild(modelLabel);
    const modelSelect = document.createElement('select');
    this._modelList.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === this.properties.model) opt.selected = true;
      modelSelect.appendChild(opt);
    });
    modelSelect.onchange = () => { this.properties.model = modelSelect.value; };
    modelField.appendChild(modelSelect);
    wrap.appendChild(modelField);

    // System prompt
    const sysField = document.createElement('div');
    sysField.className = 'inspector-field';
    const sysLabel = document.createElement('div');
    sysLabel.className = 'inspector-label';
    sysLabel.textContent = 'System Prompt';
    sysField.appendChild(sysLabel);
    const sysTa = document.createElement('textarea');
    sysTa.value = this.properties.system_prompt;
    sysTa.rows = 4;
    sysTa.oninput = () => { this.properties.system_prompt = sysTa.value; };
    sysField.appendChild(sysTa);
    wrap.appendChild(sysField);

    // Temperature
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

    // ── Outputs section (editable) ──
    const outputsTitle = document.createElement('div');
    outputsTitle.className = 'inspector-label';
    outputsTitle.style.marginTop = '12px';
    outputsTitle.style.paddingTop = '8px';
    outputsTitle.style.borderTop = '1px solid rgba(255,255,255,0.06)';
    outputsTitle.textContent = this._parsedOutputs ? 'OUTPUTS (editable)' : 'OUTPUTS (run to generate)';
    wrap.appendChild(outputsTitle);

    for (const def of OUTPUT_KEYS) {
      const field = document.createElement('div');
      field.className = 'inspector-field';

      const label = document.createElement('div');
      label.className = 'inspector-label';
      label.style.color = def.color;
      label.textContent = def.label;
      field.appendChild(label);

      const ta = document.createElement('textarea');
      ta.rows = 3;
      ta.placeholder = `Run the node to generate ${def.label.toLowerCase()} prompt...`;

      if (this._parsedOutputs) {
        ta.value = this._parsedOutputs[def.json] || '';
      } else if (this._wfOutputs) {
        ta.value = this._wfOutputs[def.output] || '';
      } else {
        ta.value = '';
        ta.disabled = true;
      }

      // When user edits, update both _parsedOutputs and _wfOutputs
      // so changes flow downstream immediately
      ta.oninput = () => {
        if (!node._parsedOutputs) node._parsedOutputs = {};
        node._parsedOutputs[def.json] = ta.value;
        if (!node._wfOutputs) node._wfOutputs = {};
        node._wfOutputs[def.output] = ta.value;
        node.setDirtyCanvas(true);
      };

      field.appendChild(ta);
      wrap.appendChild(field);
    }

    return wrap;
  };

  SceneSplitterNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    const scene = inputs.scene || '';

    if (!scene.trim()) {
      this._parsedOutputs = null;
      return { 'first frame': '', 'last frame': '', motion: '' };
    }

    // Wrap the scene in an explicit JSON-requesting prompt so the model can't miss it
    const wrappedPrompt = `Scene description:\n"""\n${scene}\n"""\n\nSplit this scene into exactly 3 parts. Respond with ONLY a raw JSON object, no markdown, no explanation, no code fences:\n{"first_frame": "...", "last_frame": "...", "motion": "..."}`;

    const modelInfo = this._modelList.find(m => m.id === this.properties.model);
    const result = await muapi.generateChat({
      model: this.properties.model,
      endpoint: modelInfo?.endpoint || this.properties.model,
      prompt: wrappedPrompt,
      system_prompt: this.properties.system_prompt,
      temperature: this.properties.temperature,
    });

    const raw = result.text || '';
    console.log('[SceneSplitter] Raw result.text type:', typeof raw, 'value:', typeof raw === 'string' ? raw.slice(0, 300) : JSON.stringify(raw).slice(0, 300));

    // If the API returned an object directly, use it
    let parsed;
    if (typeof raw === 'object' && raw !== null) {
      parsed = raw;
    } else {
      const text = String(raw);
      // Strip markdown code fences and try to parse JSON
      try {
        const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('[SceneSplitter] Failed to parse JSON directly, trying regex extraction:', text.slice(0, 200));
        // Try to extract the first JSON object from the text
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (e2) {
            throw new Error('LLM did not return valid JSON. Response: ' + text.slice(0, 200));
          }
        } else {
          throw new Error('LLM did not return valid JSON. Response: ' + text.slice(0, 200));
        }
      }
    }

    console.log('[SceneSplitter] Parsed output:', parsed);

    this._parsedOutputs = parsed;
    this.setDirtyCanvas(true);

    return {
      'first frame': parsed.first_frame || '',
      'last frame': parsed.last_frame || '',
      motion: parsed.motion || '',
    };
  };

  SceneSplitterNode.prototype.onSerialize = function(data) {
    if (this._parsedOutputs) data._parsedOutputs = this._parsedOutputs;
    if (this._wfOutputs) data._wfOutputs = this._wfOutputs;
  };

  SceneSplitterNode.prototype.onConfigure = function(data) {
    if (data._parsedOutputs) this._parsedOutputs = data._parsedOutputs;
    if (data._wfOutputs) {
      this._wfOutputs = data._wfOutputs;
      this._wfStatus = 'complete';
    }
  };

  LiteGraph.registerNodeType('utility/scene_splitter', SceneSplitterNode);
}
