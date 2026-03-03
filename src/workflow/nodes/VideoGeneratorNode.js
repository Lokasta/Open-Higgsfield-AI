import { t2vModels, i2vModels, getAspectRatiosForVideoModel, getDurationsForModel, getResolutionsForVideoModel } from '../../lib/models.js';
import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';
import { drawPreview, handlePreviewClick, handlePreviewMove } from '../nodePreview.js';

export function registerVideoGeneratorNode() {
  function VideoGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addInput('image', 'image');
    this.addOutput('video', 'video');
    this.properties = {
      model: t2vModels[0]?.id || 'wan-2.1-t2v',
      aspect_ratio: '16:9',
      duration: '',
      resolution: '',
    };
    this.size = [280, 140];
    this._defaultSize = [280, 140];
    this.color = '#1a0f2a';
    this.bgcolor = '#120a1e';
    this._previewUrl = '';
    this._previewType = 'video';
    this._previewInfoLines = 2;
    this._videoThumb = null;

    this._modelList = [...t2vModels, ...i2vModels];
    this._enums = {};
    this._updateEnums();
  }

  VideoGeneratorNode.title = 'Video Generator';
  VideoGeneratorNode.desc = 'Generate videos using AI models (t2v/i2v)';

  VideoGeneratorNode.prototype._updateEnums = function() {
    const ars = getAspectRatiosForVideoModel(this.properties.model) || ['16:9', '9:16', '1:1'];
    const durations = getDurationsForModel(this.properties.model);
    const resolutions = getResolutionsForVideoModel(this.properties.model);
    this._enums = { aspect_ratio: ars };
    if (durations && durations.length) this._enums.duration = durations;
    if (resolutions && resolutions.length) this._enums.resolution = resolutions;
  };

  VideoGeneratorNode.prototype.onModelChange = function(modelId) {
    this.properties.model = modelId;
    this._updateEnums();
  };

  VideoGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    const model = this._modelList.find(m => m.id === this.properties.model);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${model?.name || this.properties.model}`, 10, y0);
    ctx.fillText(`AR: ${this.properties.aspect_ratio}`, 10, y0 + 14);

    // Preview with overlay buttons
    drawPreview(ctx, this);
  };

  VideoGeneratorNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
    handlePreviewMove(this, localPos);
  };

  VideoGeneratorNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    if (handlePreviewClick(this, localPos)) return true;
    return false;
  };

  VideoGeneratorNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  VideoGeneratorNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  VideoGeneratorNode.prototype.onWorkflowExecute = async function(inputs, muapi) {
    const prompt = inputs.prompt || '';
    const imageUrl = inputs.image || '';
    const params = {
      model: this.properties.model,
      prompt,
      aspect_ratio: this.properties.aspect_ratio,
    };
    if (this.properties.duration) params.duration = this.properties.duration;
    if (this.properties.resolution) params.resolution = this.properties.resolution;

    let result;
    if (imageUrl) {
      params.image_url = imageUrl;
      result = await muapi.generateI2V(params);
    } else {
      result = await muapi.generateVideo(params);
    }

    if (result.url) {
      this._previewUrl = result.url;
      // Extract first frame as thumbnail using a video element
      this._extractVideoThumb(result.url);
    }

    return { video: result.url || '' };
  };

  VideoGeneratorNode.prototype._extractVideoThumb = function(url) {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    video.onloadeddata = () => {
      video.currentTime = 0.1; // seek to get a good frame
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const vCtx = canvas.getContext('2d');
      vCtx.drawImage(video, 0, 0);

      const thumb = new Image();
      thumb.onload = () => {
        this._videoThumb = thumb;
        this.setDirtyCanvas(true);
      };
      thumb.src = canvas.toDataURL();
      video.remove();
    };

    video.onerror = () => {
      // If video thumb extraction fails, still show a placeholder
      video.remove();
    };

    video.src = url;
  };

  LiteGraph.registerNodeType('generator/video', VideoGeneratorNode);
}
