import {
  t2vModels, i2vModels,
  getAspectRatiosForVideoModel, getDurationsForModel, getResolutionsForVideoModel, getQualityOptionsForVideoModel,
  getI2VModelById, getAspectRatiosForI2VModel, getDurationsForI2VModel, getResolutionsForI2VModel, getQualityOptionsForI2VModel,
  getMaxImagesForI2VModel, getExtraInputsForI2VModel, getTailImageFieldForI2VModel,
} from '../../lib/models.js';
import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';
import { drawPreview, handlePreviewClick, handlePreviewMove } from '../nodePreview.js';

export function registerVideoGeneratorNode() {
  function VideoGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addInput('image', 'image');
    this.addInput('images', 'collection');
    this.addInput('last frame', 'image');
    this.addOutput('video', 'video');
    this.properties = {
      model: t2vModels[0]?.id || 'wan-2.1-t2v',
      aspect_ratio: '16:9',
      duration: '',
      resolution: '',
      quality: '',
      extras: {},
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
    this._extraInputDefs = {};
    this._updateEnums();
  }

  VideoGeneratorNode.title = 'Video Generator';
  VideoGeneratorNode.desc = 'Generate videos using AI models (t2v/i2v)';

  // Update enums and extra fields when model changes
  VideoGeneratorNode.prototype._updateEnums = function() {
    const modelId = this.properties.model;
    const isI2V = !!getI2VModelById(modelId);

    // --- Enums ---
    if (isI2V) {
      const ars = getAspectRatiosForI2VModel(modelId);
      const durations = getDurationsForI2VModel(modelId);
      const resolutions = getResolutionsForI2VModel(modelId);
      const qualities = getQualityOptionsForI2VModel(modelId);
      this._enums = {};
      if (ars && ars.length) this._enums.aspect_ratio = ars;
      if (durations && durations.length) this._enums.duration = durations;
      if (resolutions && resolutions.length) this._enums.resolution = resolutions;
      if (qualities && qualities.length) this._enums.quality = qualities;
    } else {
      const ars = getAspectRatiosForVideoModel(modelId) || ['16:9', '9:16', '1:1'];
      const durations = getDurationsForModel(modelId);
      const resolutions = getResolutionsForVideoModel(modelId);
      const qualities = getQualityOptionsForVideoModel(modelId);
      this._enums = { aspect_ratio: ars };
      if (durations && durations.length) this._enums.duration = durations;
      if (resolutions && resolutions.length) this._enums.resolution = resolutions;
      if (qualities && qualities.length) this._enums.quality = qualities;
    }

    // --- Extra model-specific inputs (e.g. camera_fixed) ---
    this._extraInputDefs = isI2V ? getExtraInputsForI2VModel(modelId) : {};

    // Init extra properties
    for (const [key, def] of Object.entries(this._extraInputDefs)) {
      if (this.properties.extras[key] === undefined) {
        this.properties.extras[key] = def.default !== undefined ? def.default : '';
      }
    }

    // --- Capabilities summary ---
    const hasTailImage = !!getTailImageFieldForI2VModel(modelId);
    const maxImages = isI2V ? getMaxImagesForI2VModel(modelId) : 1;
    this._capabilities = { isI2V, hasTailImage, maxImages };
  };

  VideoGeneratorNode.prototype.onModelChange = function(modelId) {
    this.properties.model = modelId;
    // Reset extras for new model
    this.properties.extras = {};
    this._updateEnums();
    // Ensure aspect_ratio is valid for the new model
    if (this._enums.aspect_ratio && !this._enums.aspect_ratio.includes(this.properties.aspect_ratio)) {
      this.properties.aspect_ratio = this._enums.aspect_ratio[0] || '16:9';
    }
  };

  VideoGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    const model = this._modelList.find(m => m.id === this.properties.model);

    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${model?.name || this.properties.model}`, 10, y0);

    let infoLine = `AR: ${this.properties.aspect_ratio}`;
    const caps = this._capabilities;
    if (caps) {
      if (caps.hasTailImage) infoLine += ' | Start+End Frame';
      else if (caps.maxImages > 1) infoLine += ` | Refs: up to ${caps.maxImages}`;
      if (!caps.isI2V) infoLine += ' | T2V';
    }
    ctx.fillText(infoLine, 10, y0 + 14);

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
    const promptText = inputs.prompt || '';
    const imageUrl = inputs.image || '';
    const imagesList = inputs.images || [];
    const tailImageUrl = inputs['last frame'] || '';
    const isI2V = !!getI2VModelById(this.properties.model);

    console.log('[VideoGen] Inputs:', {
      prompt: promptText?.slice(0, 50),
      image: imageUrl ? imageUrl.slice(0, 60) + '...' : '(none)',
      images: imagesList.length,
      lastFrame: tailImageUrl ? tailImageUrl.slice(0, 60) + '...' : '(none)',
      model: this.properties.model,
      isI2V,
    });

    const params = {
      model: this.properties.model,
      prompt: promptText,
      aspect_ratio: this.properties.aspect_ratio,
    };
    if (this.properties.duration) params.duration = this.properties.duration;
    if (this.properties.resolution) params.resolution = this.properties.resolution;
    if (this.properties.quality) params.quality = this.properties.quality;

    // Collect all reference images
    const allImages = [];
    if (imagesList.length > 0) {
      allImages.push(...imagesList);
    } else if (imageUrl) {
      allImages.push(imageUrl);
    }

    // Determine if we should use the I2V path
    const hasImages = allImages.length > 0;
    const hasTail = !!tailImageUrl;
    const needsI2V = isI2V || hasImages || hasTail;

    let result;
    if (needsI2V) {
      // Find or resolve I2V model
      let i2vModel = getI2VModelById(params.model);
      if (!i2vModel) {
        const variants = [
          params.model.replace('-t2v', '-i2v'),
          params.model + '-i2v',
        ];
        for (const v of variants) {
          if (getI2VModelById(v)) {
            i2vModel = getI2VModelById(v);
            params.model = v;
            break;
          }
        }
      }

      console.log('[VideoGen] I2V resolution:', {
        originalModel: this.properties.model,
        resolvedModel: params.model,
        i2vFound: !!i2vModel,
        hasImages,
        hasTail,
        tailImageField: i2vModel?.tailImageField,
      });

      if (i2vModel && (hasImages || hasTail)) {
        if (allImages.length > 1) {
          params.images_list = allImages;
        } else if (allImages.length === 1) {
          params.image_url = allImages[0];
        }
        // Pass tail/end frame image
        if (hasTail) params.tail_image_url = tailImageUrl;
        // Pass extra model-specific params
        if (Object.keys(this.properties.extras).length > 0) {
          params.extras = this.properties.extras;
        }
        result = await muapi.generateI2V(params);
      } else if (hasImages) {
        // No i2v variant found, pass image to t2v endpoint (some support it)
        params.image_url = allImages[0];
        result = await muapi.generateVideo(params);
      } else {
        // I2V model selected but no images at all — fall back to t2v
        result = await muapi.generateVideo(params);
      }
    } else {
      result = await muapi.generateVideo(params);
    }

    if (result.url) {
      this._previewUrl = result.url;
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
      video.currentTime = 0.1;
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
      video.remove();
    };

    video.src = url;
  };

  VideoGeneratorNode.prototype.onSerialize = function(data) {
    if (this._previewUrl) data._previewUrl = this._previewUrl;
    if (this._previewType) data._previewType = this._previewType;
    if (this._wfOutputs) data._wfOutputs = this._wfOutputs;
  };

  VideoGeneratorNode.prototype.onConfigure = function(data) {
    this._updateEnums();

    if (data._previewUrl) {
      this._previewUrl = data._previewUrl;
      this._previewType = data._previewType || 'video';
      this._extractVideoThumb(data._previewUrl);
    }
    if (data._wfOutputs) {
      this._wfOutputs = data._wfOutputs;
      this._wfStatus = 'complete';
    }
  };

  LiteGraph.registerNodeType('generator/video', VideoGeneratorNode);
}
