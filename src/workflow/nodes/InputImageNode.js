import { muapi } from '../../lib/muapi.js';
import { saveUpload, generateThumbnail } from '../../lib/uploadHistory.js';
import { drawHeader, handleHeaderClick, handleHeaderMove } from '../nodeHeader.js';

const THUMB_SIZE = 64;
const THUMB_GAP = 6;
const THUMB_PAD = 10;
const HEADER_H = 30; // space for title bar + mode toggle
const DROP_ZONE_H = 32;
const BTN_ROW_H = 28;

export function registerInputImageNode() {
  function InputImageNode() {
    this.addOutput('image', 'image');
    this.addOutput('images', 'collection');
    this.properties = {
      urls: [],       // array of uploaded URLs
      filenames: [],  // parallel array of names
      multi: false,   // single vs multi mode
    };
    this.size = [260, 180];
    this.color = '#0f2a2a';
    this.bgcolor = '#081a1a';
    this._imgs = [];       // loaded Image objects
    this._uploading = 0;   // upload counter
    this._hoverBtn = null; // track hover for buttons
    this._hoverThumb = -1; // track hover for X on thumbs
    this._setupDone = false;
  }

  InputImageNode.title = 'Image Input';
  InputImageNode.desc = 'Upload, paste, or drag & drop images';

  // ═══════════════ RENDERING ═══════════════

  InputImageNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;
    const W = this.size[0];
    const urls = this.properties.urls;
    const multi = this.properties.multi;
    let y = HEADER_H;

    // ── Mode toggle pill (top-right) ──
    const pillW = 56, pillH = 18, pillX = W - pillW - 8, pillY = 6;
    ctx.fillStyle = multi ? '#22d3ee20' : '#d9ff0020';
    roundRect(ctx, pillX, pillY, pillW, pillH, 9);
    ctx.fill();
    ctx.strokeStyle = multi ? '#22d3ee60' : '#d9ff0060';
    ctx.lineWidth = 1;
    roundRect(ctx, pillX, pillY, pillW, pillH, 9);
    ctx.stroke();
    ctx.fillStyle = multi ? '#22d3ee' : '#d9ff00';
    ctx.font = '600 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(multi ? 'MULTI' : 'SINGLE', pillX + pillW / 2, pillY + 12.5);
    ctx.textAlign = 'left';

    // ── Thumbnail grid ──
    if (urls.length > 0) {
      const cols = Math.floor((W - THUMB_PAD * 2 + THUMB_GAP) / (THUMB_SIZE + THUMB_GAP));
      const rows = Math.ceil(urls.length / cols);

      for (let i = 0; i < urls.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const tx = THUMB_PAD + col * (THUMB_SIZE + THUMB_GAP);
        const ty = y + row * (THUMB_SIZE + THUMB_GAP);

        // Background
        ctx.fillStyle = '#141414';
        roundRect(ctx, tx, ty, THUMB_SIZE, THUMB_SIZE, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffffff10';
        ctx.lineWidth = 1;
        roundRect(ctx, tx, ty, THUMB_SIZE, THUMB_SIZE, 6);
        ctx.stroke();

        // Image
        const img = this._imgs[i];
        if (img && img.complete && img.naturalWidth) {
          ctx.save();
          roundRect(ctx, tx, ty, THUMB_SIZE, THUMB_SIZE, 6);
          ctx.clip();
          const scale = Math.max(THUMB_SIZE / img.width, THUMB_SIZE / img.height);
          const sw = img.width * scale;
          const sh = img.height * scale;
          ctx.drawImage(img, tx + (THUMB_SIZE - sw) / 2, ty + (THUMB_SIZE - sh) / 2, sw, sh);
          ctx.restore();
        } else {
          // Loading spinner placeholder
          ctx.fillStyle = '#52525b';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('...', tx + THUMB_SIZE / 2, ty + THUMB_SIZE / 2 + 3);
          ctx.textAlign = 'left';
        }

        // Remove X button (top-right of thumb)
        if (this._hoverThumb === i) {
          ctx.fillStyle = '#ef4444cc';
          ctx.beginPath();
          ctx.arc(tx + THUMB_SIZE - 4, ty + 4, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('x', tx + THUMB_SIZE - 4, ty + 8);
          ctx.textAlign = 'left';
        }
      }

      y += rows * (THUMB_SIZE + THUMB_GAP) + 4;
    }

    // ── Drop zone / empty state ──
    const dropY = urls.length > 0 ? y : y + 10;
    const dropH = urls.length > 0 ? DROP_ZONE_H : THUMB_SIZE;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#ffffff18';
    ctx.lineWidth = 1;
    roundRect(ctx, THUMB_PAD, dropY, W - THUMB_PAD * 2, dropH, 6);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#52525b';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const hint = this._uploading > 0
      ? `Uploading ${this._uploading}...`
      : '+ Drag & drop or paste';
    ctx.fillText(hint, W / 2, dropY + dropH / 2 + 4);
    ctx.textAlign = 'left';
    y = dropY + dropH + 6;

    // ── Action buttons row ──
    const btnW = (W - THUMB_PAD * 2 - 6) / 2;
    // Upload btn
    drawActionBtn(ctx, THUMB_PAD, y, btnW, BTN_ROW_H, 'Upload', this._hoverBtn === 'upload');
    // Clear btn (only if images exist)
    if (urls.length > 0) {
      drawActionBtn(ctx, THUMB_PAD + btnW + 6, y, btnW, BTN_ROW_H, 'Clear All', this._hoverBtn === 'clear', true);
    }
    y += BTN_ROW_H + 8;

    // ── Resize node to fit content ──
    const targetH = Math.max(180, y);
    if (Math.abs(this.size[1] - targetH) > 2) {
      this.size[1] = targetH;
    }

    drawStatus(ctx, this);
  };

  // ═══════════════ MOUSE HANDLING ═══════════════

  InputImageNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
    const W = this.size[0];
    const urls = this.properties.urls;
    const multi = this.properties.multi;

    // Check hover on mode toggle pill
    const pillW = 56, pillH = 18, pillX = W - pillW - 8, pillY = 6;
    this._hoverBtn = null;
    this._hoverThumb = -1;

    // Check thumb hover for X buttons
    if (urls.length > 0) {
      const cols = Math.floor((W - THUMB_PAD * 2 + THUMB_GAP) / (THUMB_SIZE + THUMB_GAP));
      for (let i = 0; i < urls.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const tx = THUMB_PAD + col * (THUMB_SIZE + THUMB_GAP);
        const ty = HEADER_H + row * (THUMB_SIZE + THUMB_GAP);
        if (localPos[0] >= tx && localPos[0] <= tx + THUMB_SIZE &&
            localPos[1] >= ty && localPos[1] <= ty + THUMB_SIZE) {
          this._hoverThumb = i;
          break;
        }
      }
    }

    // Check hover on action buttons
    const rows = urls.length > 0 ? Math.ceil(urls.length / Math.floor((W - THUMB_PAD * 2 + THUMB_GAP) / (THUMB_SIZE + THUMB_GAP))) : 0;
    const dropH = urls.length > 0 ? DROP_ZONE_H : THUMB_SIZE;
    const btnY = HEADER_H + (urls.length > 0 ? rows * (THUMB_SIZE + THUMB_GAP) + 4 : 10) + dropH + 6;
    const btnW = (W - THUMB_PAD * 2 - 6) / 2;

    if (localPos[1] >= btnY && localPos[1] <= btnY + BTN_ROW_H) {
      if (localPos[0] >= THUMB_PAD && localPos[0] <= THUMB_PAD + btnW) {
        this._hoverBtn = 'upload';
      } else if (localPos[0] >= THUMB_PAD + btnW + 6 && localPos[0] <= W - THUMB_PAD) {
        this._hoverBtn = 'clear';
      }
    }

    this.setDirtyCanvas(true);
  };

  InputImageNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    const W = this.size[0];
    const urls = this.properties.urls;

    // Mode toggle pill click
    const pillW = 56, pillH = 18, pillX = W - pillW - 8, pillY = 6;
    if (localPos[0] >= pillX && localPos[0] <= pillX + pillW &&
        localPos[1] >= pillY && localPos[1] <= pillY + pillH) {
      this.properties.multi = !this.properties.multi;
      // In single mode, keep only first image
      if (!this.properties.multi && urls.length > 1) {
        this.properties.urls = [urls[0]];
        this.properties.filenames = [this.properties.filenames[0]];
        this._imgs = [this._imgs[0]];
      }
      this.setDirtyCanvas(true);
      return true;
    }

    // Thumb X click (remove image)
    if (this._hoverThumb >= 0 && this._hoverThumb < urls.length) {
      // Check if click is in the X button area (top-right corner of thumb)
      const cols = Math.floor((W - THUMB_PAD * 2 + THUMB_GAP) / (THUMB_SIZE + THUMB_GAP));
      const col = this._hoverThumb % cols;
      const row = Math.floor(this._hoverThumb / cols);
      const tx = THUMB_PAD + col * (THUMB_SIZE + THUMB_GAP);
      const ty = HEADER_H + row * (THUMB_SIZE + THUMB_GAP);
      if (localPos[0] >= tx + THUMB_SIZE - 12 && localPos[1] <= ty + 12) {
        this._removeImage(this._hoverThumb);
        return true;
      }
    }

    // Upload button click
    if (this._hoverBtn === 'upload') {
      this._triggerFileUpload();
      return true;
    }

    // Clear button click
    if (this._hoverBtn === 'clear') {
      this.properties.urls = [];
      this.properties.filenames = [];
      this._imgs = [];
      this.setDirtyCanvas(true);
      return true;
    }

    return false;
  };

  // ═══════════════ DOUBLE-CLICK: file picker ═══════════════

  InputImageNode.prototype.onDblClick = function() {
    this._triggerFileUpload();
  };

  // ═══════════════ FILE UPLOAD ═══════════════

  InputImageNode.prototype._triggerFileUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = this.properties.multi;
    input.onchange = () => {
      const files = Array.from(input.files);
      if (!files.length) return;
      this._addFiles(files);
    };
    input.click();
  };

  InputImageNode.prototype._addFiles = async function(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      // In single mode, replace; in multi, append
      if (!this.properties.multi) {
        this.properties.urls = [];
        this.properties.filenames = [];
        this._imgs = [];
      }

      const idx = this.properties.urls.length;
      this.properties.filenames.push(file.name);
      this.properties.urls.push(''); // placeholder
      this._imgs.push(null);
      this._uploading++;
      this.setDirtyCanvas(true);

      try {
        // Create local preview immediately
        const localUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => this.setDirtyCanvas(true);
        img.src = localUrl;
        this._imgs[idx] = img;

        // Upload to API
        const url = await muapi.uploadFile(file);
        this.properties.urls[idx] = url;

        // Replace local preview with remote URL
        const remoteImg = new Image();
        remoteImg.crossOrigin = 'anonymous';
        remoteImg.onload = () => {
          URL.revokeObjectURL(localUrl);
          this.setDirtyCanvas(true);
        };
        remoteImg.src = url;
        this._imgs[idx] = remoteImg;

        // Save to upload history
        const thumbnail = await generateThumbnail(file);
        saveUpload({
          id: crypto.randomUUID(),
          name: file.name,
          uploadedUrl: url,
          thumbnail,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('[InputImageNode] Upload failed:', e);
        this.properties.filenames[idx] = 'Failed';
      } finally {
        this._uploading--;
        this.setDirtyCanvas(true);
      }
    }
  };

  InputImageNode.prototype._removeImage = function(idx) {
    this.properties.urls.splice(idx, 1);
    this.properties.filenames.splice(idx, 1);
    this._imgs.splice(idx, 1);
    this.setDirtyCanvas(true);
  };

  // ═══════════════ PASTE (Ctrl+V) ═══════════════

  InputImageNode.prototype.onAdded = function() {
    if (this._setupDone) return;
    this._setupDone = true;

    // Global paste handler — only acts when this node is selected
    this._pasteHandler = async (e) => {
      // Check if this node is selected in any canvas
      const canvasEl = document.querySelector('canvas.lgraphcanvas');
      if (!canvasEl || !canvasEl.data) return;
      const lgCanvas = canvasEl.data;
      const selected = lgCanvas.selected_nodes;
      if (!selected || !selected[this.id]) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        this._addFiles(files);
      }
    };
    document.addEventListener('paste', this._pasteHandler);
  };

  InputImageNode.prototype.onRemoved = function() {
    if (this._pasteHandler) {
      document.removeEventListener('paste', this._pasteHandler);
      this._pasteHandler = null;
    }
  };

  // ═══════════════ DRAG & DROP ═══════════════
  // Handled via the canvas drop event in WorkflowEditor.js
  // We expose a method that the editor can call when files are dropped on this node.

  InputImageNode.prototype.onDropFile = function(file) {
    if (file && file.type.startsWith('image/')) {
      this._addFiles([file]);
      return true;
    }
    return false;
  };

  InputImageNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  // ═══════════════ EXECUTE ═══════════════

  InputImageNode.prototype.onWorkflowExecute = function() {
    const urls = this.properties.urls.filter(u => u);
    return {
      image: urls[0] || '',
      images: urls,
    };
  };

  // ═══════════════ INSPECTOR ═══════════════

  InputImageNode.prototype.onInspector = function() {
    const wrap = document.createElement('div');

    // Mode toggle
    const modeField = document.createElement('div');
    modeField.className = 'inspector-field';
    const modeLabel = document.createElement('div');
    modeLabel.className = 'inspector-label';
    modeLabel.textContent = 'Mode';
    modeField.appendChild(modeLabel);
    const modeSelect = document.createElement('select');
    ['single', 'multi'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m === 'single' ? 'Single Image' : 'Multiple Images';
      if ((m === 'multi') === this.properties.multi) opt.selected = true;
      modeSelect.appendChild(opt);
    });
    modeSelect.onchange = () => {
      this.properties.multi = modeSelect.value === 'multi';
      this.setDirtyCanvas(true);
    };
    modeField.appendChild(modeSelect);
    wrap.appendChild(modeField);

    // Image count
    const countField = document.createElement('div');
    countField.className = 'inspector-field';
    const countLabel = document.createElement('div');
    countLabel.className = 'inspector-label';
    countLabel.textContent = 'Images';
    countField.appendChild(countLabel);
    const countVal = document.createElement('div');
    countVal.style.cssText = 'color:#a1a1aa;font-size:12px;padding:4px 0;';
    countVal.textContent = `${this.properties.urls.filter(u => u).length} uploaded`;
    countField.appendChild(countVal);
    wrap.appendChild(countField);

    return wrap;
  };

  // ═══════════════ SERIALIZE / CONFIGURE (persistence) ═══════════════

  InputImageNode.prototype.onSerialize = function(data) {
    if (this._wfOutputs) data._wfOutputs = this._wfOutputs;
  };

  InputImageNode.prototype.onConfigure = function(data) {
    // Re-create Image objects from saved URLs
    this._imgs = [];
    if (this.properties.urls && this.properties.urls.length > 0) {
      this.properties.urls.forEach((url, i) => {
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => this.setDirtyCanvas(true);
          img.src = url;
          this._imgs[i] = img;
        }
      });
    }
    // Restore workflow outputs so downstream nodes can read them
    if (this.properties.urls && this.properties.urls.some(u => u)) {
      this._wfOutputs = {
        image: this.properties.urls.filter(u => u)[0] || '',
        images: this.properties.urls.filter(u => u),
      };
    }
    // Restore saved _wfOutputs if present in serialized data
    if (data._wfOutputs) this._wfOutputs = data._wfOutputs;
  };

  LiteGraph.registerNodeType('input/image', InputImageNode);
}

// ═══════════════ HELPERS ═══════════════

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawActionBtn(ctx, x, y, w, h, label, hover, danger) {
  ctx.fillStyle = hover
    ? (danger ? '#ef444430' : '#ffffff12')
    : '#ffffff08';
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = hover
    ? (danger ? '#ef444460' : '#ffffff20')
    : '#ffffff0a';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();
  ctx.fillStyle = hover
    ? (danger ? '#fca5a5' : '#e4e4e7')
    : '#71717a';
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  ctx.textAlign = 'left';
}

function drawStatus(ctx, node) {
  if (!node._wfStatus || node._wfStatus === 'idle') return;
  const colors = { running: '#facc15', complete: '#22c55e', error: '#ef4444' };
  ctx.fillStyle = colors[node._wfStatus] || '#a1a1aa';
  ctx.beginPath();
  ctx.arc(node.size[0] - 14, 14, 5, 0, Math.PI * 2);
  ctx.fill();
}
