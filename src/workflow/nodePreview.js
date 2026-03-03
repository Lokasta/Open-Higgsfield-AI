/**
 * Shared media preview for generator nodes — Scenario.com-style overlay buttons.
 *
 * Draws a large thumbnail preview inside the node body with overlay action buttons:
 *   [Fullscreen] [Download] [Clear]
 *
 * Usage in a generator node:
 *   import { drawPreview, handlePreviewClick, handlePreviewMove, getPreviewY } from '../nodePreview.js';
 *   // in onDrawForeground: drawPreview(ctx, this);
 *   // in onMouseDown:      if (handlePreviewClick(this, localPos)) return true;
 *   // in onMouseMove:      handlePreviewMove(this, localPos);
 */

const PBTN_SIZE = 22;
const PBTN_GAP = 4;
const PBTN_PAD = 6; // padding from preview edge
const PREVIEW_PAD = 8; // padding around preview image

const PREVIEW_BUTTONS = [
  { id: 'clear',      icon: drawClearIcon,      tooltip: 'Clear' },
  { id: 'download',   icon: drawDownloadIcon,   tooltip: 'Download' },
  { id: 'fullscreen', icon: drawFullscreenIcon, tooltip: 'Fullscreen' },
];

/**
 * Compute where the preview area starts (below model info text).
 */
export function getPreviewY(node, infoLines = 2) {
  const numInputs = node.inputs ? node.inputs.length : 0;
  const numOutputs = node.outputs ? node.outputs.length : 0;
  const maxSlots = Math.max(numInputs, numOutputs);
  const slotEnd = maxSlots * 20 + 26;
  return slotEnd + infoLines * 14 + 4;
}

/**
 * Draw the media preview with overlay buttons.
 * Call this in onDrawForeground after drawing model info.
 */
export function drawPreview(ctx, node) {
  const media = node._img || node._videoThumb;
  const mediaUrl = node._previewUrl || '';
  if (!media || !media.complete || !mediaUrl) return;

  const W = node.size[0];
  const previewY = getPreviewY(node, node._previewInfoLines || 2);
  const maxW = W - PREVIEW_PAD * 2;

  // Calculate proportional height
  const imgW = media.naturalWidth || media.width;
  const imgH = media.naturalHeight || media.height;
  if (!imgW || !imgH) return;

  const scale = Math.min(maxW / imgW, 1);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const maxPreviewH = Math.max(drawH, 80);

  const x = (W - drawW) / 2;
  const y = previewY;

  // Auto-resize node to fit preview
  const neededH = y + maxPreviewH + 12;
  if (node.size[1] < neededH) {
    node.size[1] = neededH;
  }

  // Preview background (dark rounded rect)
  ctx.fillStyle = '#0a0a0a';
  roundRect(ctx, PREVIEW_PAD - 2, y - 2, maxW + 4, maxPreviewH + 4, 6);
  ctx.fill();

  // Draw image
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PREVIEW_PAD - 2, y - 2, maxW + 4, maxPreviewH + 4, 6);
  ctx.clip();
  ctx.drawImage(media, x, y, drawW, drawH);
  ctx.restore();

  // Store preview rect for hit testing
  node._previewRect = { x: PREVIEW_PAD - 2, y: y - 2, w: maxW + 4, h: maxPreviewH + 4 };

  // Overlay buttons (top-right of preview)
  const hover = node._previewHover || null;
  for (let i = 0; i < PREVIEW_BUTTONS.length; i++) {
    const btn = PREVIEW_BUTTONS[i];
    const bx = PREVIEW_PAD + maxW + 2 - PBTN_PAD - (PBTN_SIZE + PBTN_GAP) * (i + 1) + PBTN_GAP;
    const by = y + PBTN_PAD;
    const isHover = hover === btn.id;

    // Button background
    ctx.fillStyle = isHover ? '#000000cc' : '#00000088';
    roundRect(ctx, bx, by, PBTN_SIZE, PBTN_SIZE, 5);
    ctx.fill();

    // Border on hover
    if (isHover) {
      ctx.strokeStyle = '#ffffff30';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, PBTN_SIZE, PBTN_SIZE, 5);
      ctx.stroke();
    }

    // Icon
    const color = isHover ? '#ffffff' : '#ffffffaa';
    btn.icon(ctx, bx, by, PBTN_SIZE, color);
  }
}

/**
 * Handle mouse move over preview area — updates hover state for overlay buttons.
 */
export function handlePreviewMove(node, localPos) {
  const rect = node._previewRect;
  if (!rect) {
    if (node._previewHover) {
      node._previewHover = null;
      node.setDirtyCanvas(true);
    }
    return;
  }

  let newHover = null;
  const maxW = rect.w - 4;

  for (let i = 0; i < PREVIEW_BUTTONS.length; i++) {
    const bx = rect.x + 2 + maxW + 2 - PBTN_PAD - (PBTN_SIZE + PBTN_GAP) * (i + 1) + PBTN_GAP;
    const by = rect.y + 2 + PBTN_PAD;
    if (localPos[0] >= bx && localPos[0] <= bx + PBTN_SIZE &&
        localPos[1] >= by && localPos[1] <= by + PBTN_SIZE) {
      newHover = PREVIEW_BUTTONS[i].id;
      break;
    }
  }

  if (node._previewHover !== newHover) {
    node._previewHover = newHover;
    node.setDirtyCanvas(true);
  }
}

/**
 * Handle click on preview overlay buttons.
 * Returns true if a button was clicked.
 */
export function handlePreviewClick(node, localPos) {
  const rect = node._previewRect;
  if (!rect) return false;

  const maxW = rect.w - 4;

  for (let i = 0; i < PREVIEW_BUTTONS.length; i++) {
    const btn = PREVIEW_BUTTONS[i];
    const bx = rect.x + 2 + maxW + 2 - PBTN_PAD - (PBTN_SIZE + PBTN_GAP) * (i + 1) + PBTN_GAP;
    const by = rect.y + 2 + PBTN_PAD;
    if (localPos[0] >= bx && localPos[0] <= bx + PBTN_SIZE &&
        localPos[1] >= by && localPos[1] <= by + PBTN_SIZE) {

      if (btn.id === 'fullscreen') {
        openFullscreen(node);
        return true;
      }
      if (btn.id === 'download') {
        downloadMedia(node);
        return true;
      }
      if (btn.id === 'clear') {
        clearPreview(node);
        return true;
      }
    }
  }

  return false;
}

// ═══════════════ ACTIONS ═══════════════

function openFullscreen(node) {
  const url = node._previewUrl;
  if (!url) return;

  const isVideo = node._previewType === 'video';

  // Create fullscreen overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.92); display: flex;
    align-items: center; justify-content: center;
    cursor: zoom-out;
  `;

  if (isVideo) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.style.cssText = 'max-width: 90vw; max-height: 90vh; border-radius: 8px;';
    overlay.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain;';
    overlay.appendChild(img);
  }

  // Close button
  const close = document.createElement('div');
  close.style.cssText = `
    position: absolute; top: 20px; right: 20px;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.1); display: flex;
    align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; color: #fff;
    transition: background 0.15s;
  `;
  close.textContent = '\u00d7';
  close.onmouseenter = () => close.style.background = 'rgba(255,255,255,0.2)';
  close.onmouseleave = () => close.style.background = 'rgba(255,255,255,0.1)';
  overlay.appendChild(close);

  const dismiss = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay || e.target === close) dismiss(); };
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', handler); }
  });

  document.body.appendChild(overlay);
}

function downloadMedia(node) {
  const url = node._previewUrl;
  if (!url) return;

  const a = document.createElement('a');
  a.href = url;
  const ext = node._previewType === 'video' ? 'mp4' : 'png';
  a.download = `${node.title || 'output'}_${Date.now()}.${ext}`;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function clearPreview(node) {
  node._img = null;
  node._videoThumb = null;
  node._previewUrl = '';
  node._previewRect = null;
  node._previewHover = null;
  node._wfStatus = 'idle';
  node._wfData = null;
  node._wfOutputs = null;

  // Reset node size to default
  if (node._defaultSize) {
    node.size[1] = node._defaultSize[1];
  }

  node.setDirtyCanvas(true, true);
}

// ═══════════════ ICON DRAWERS ═══════════════

function drawFullscreenIcon(ctx, x, y, size, color) {
  const m = 6; // margin from edge of button
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Top-right corner arrows
  ctx.beginPath();
  ctx.moveTo(x + size - m - 4, y + m);
  ctx.lineTo(x + size - m, y + m);
  ctx.lineTo(x + size - m, y + m + 4);
  ctx.stroke();
  // Bottom-left corner arrows
  ctx.beginPath();
  ctx.moveTo(x + m + 4, y + size - m);
  ctx.lineTo(x + m, y + size - m);
  ctx.lineTo(x + m, y + size - m - 4);
  ctx.stroke();
  // Diagonal lines
  ctx.beginPath();
  ctx.moveTo(x + size - m, y + m);
  ctx.lineTo(x + size / 2 + 1, y + size / 2 - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + m, y + size - m);
  ctx.lineTo(x + size / 2 - 1, y + size / 2 + 1);
  ctx.stroke();
}

function drawDownloadIcon(ctx, x, y, size, color) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Arrow down
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx, cy + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 3, cy - 1);
  ctx.lineTo(cx, cy + 2);
  ctx.lineTo(cx + 3, cy - 1);
  ctx.stroke();
  // Bottom line
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 5);
  ctx.lineTo(cx + 5, cy + 5);
  ctx.stroke();
}

function drawClearIcon(ctx, x, y, size, color) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
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
