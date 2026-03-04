import {
  t2iModels, i2iModels,
  getAspectRatiosForModel, getAspectRatiosForI2IModel,
  getResolutionsForModel, getQualityFieldForModel,
  getI2IModelById, getMaxImagesForI2IModel,
  getResolutionsForI2IModel, getQualityFieldForI2IModel,
} from '../../lib/models.js';
import { drawHeader, handleHeaderClick, handleHeaderMove, handleTitleDblClick, getContentY } from '../nodeHeader.js';
import { drawPreview, handlePreviewClick, handlePreviewMove } from '../nodePreview.js';

export function registerImageGeneratorNode() {
  function ImageGeneratorNode() {
    this.addInput('prompt', 'string');
    this.addInput('image', 'image');
    this.addInput('images', 'collection');
    this.addOutput('image', 'image');
    this.properties = {
      model: t2iModels[0]?.id || 'flux-dev',
      aspect_ratio: '1:1',
      resolution: '',
      quality: '',
    };
    this.size = [280, 200];
    this._defaultSize = [280, 200];
    this.color = '#0f2a2a';
    this.bgcolor = '#081a1a';
    this._img = null;
    this._previewUrl = '';
    this._previewType = 'image';
    this._previewInfoLines = 2;

    this._modelList = [...t2iModels, ...i2iModels];
    this._enums = {};
    this._updateEnums();
  }

  ImageGeneratorNode.title = 'Image Generator';
  ImageGeneratorNode.desc = 'Generate images using AI models (t2i/i2i)';

  ImageGeneratorNode.prototype._updateEnums = function() {
    const modelId = this.properties.model;
    const isI2I = !!getI2IModelById(modelId);

    if (isI2I) {
      const ars = getAspectRatiosForI2IModel(modelId);
      this._enums = { aspect_ratio: ars || ['1:1', '16:9', '9:16', '4:3'] };
      const resolutions = getResolutionsForI2IModel(modelId);
      if (resolutions && resolutions.length) {
        const qField = getQualityFieldForI2IModel(modelId);
        if (qField === 'resolution') this._enums.resolution = resolutions;
        else if (qField === 'quality') this._enums.quality = resolutions;
      }
    } else {
      const ars = getAspectRatiosForModel(modelId) || getAspectRatiosForI2IModel(modelId);
      this._enums = { aspect_ratio: ars || ['1:1', '16:9', '9:16', '4:3'] };
      const resolutions = getResolutionsForModel(modelId);
      if (resolutions && resolutions.length) {
        const qField = getQualityFieldForModel(modelId);
        if (qField === 'resolution') this._enums.resolution = resolutions;
        else if (qField === 'quality') this._enums.quality = resolutions;
      }
    }
  };

  ImageGeneratorNode.prototype.onModelChange = function(modelId) {
    this.properties.model = modelId;
    this._updateEnums();
    if (this._enums.aspect_ratio && !this._enums.aspect_ratio.includes(this.properties.aspect_ratio)) {
      this.properties.aspect_ratio = this._enums.aspect_ratio[0] || '1:1';
    }
  };

  ImageGeneratorNode.prototype.onDrawForeground = function(ctx) {
    drawHeader(ctx, this);
    if (this.flags.collapsed) return;

    const y0 = getContentY(this);
    const model = this._modelList.find(m => m.id === this.properties.model);

    ctx.fillStyle = '#71717a';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`Model: ${model?.name || this.properties.model}`, 10, y0);

    let infoLine = `AR: ${this.properties.aspect_ratio}`;
    // Show max refs for i2i models or models with edit variant
    const i2iModel = getI2IModelById(this.properties.model) || getI2IModelById(this.properties.model + '-edit');
    if (i2iModel) {
      const maxImgs = i2iModel.maxImages || 1;
      if (maxImgs > 1) infoLine += ` | Refs: ${maxImgs}`;
    }
    ctx.fillText(infoLine, 10, y0 + 14);

    // Preview with overlay buttons
    drawPreview(ctx, this);
  };

  ImageGeneratorNode.prototype.onMouseMove = function(e, localPos) {
    handleHeaderMove(this, localPos);
    handlePreviewMove(this, localPos);
  };

  ImageGeneratorNode.prototype.onMouseDown = function(e, localPos) {
    if (handleHeaderClick(this, localPos, e)) return true;
    if (handlePreviewClick(this, localPos)) return true;
    return false;
  };

  ImageGeneratorNode.prototype.onDblClick = function(e, localPos) {
    if (handleTitleDblClick(this, localPos)) return true;
  };

  ImageGeneratorNode.prototype.onTitleDblClick = function() {
    const newTitle = prompt('Rename node:', this.title);
    if (newTitle !== null && newTitle.trim()) {
      this.title = newTitle.trim();
      this.setDirtyCanvas(true, true);
    }
  };

  ImageGeneratorNode.prototype.onWorkflowExecute = async function(inputs, muapi, signal) {
    const promptText = inputs.prompt || '';
    const imageUrl = inputs.image || '';
    const imagesList = inputs.images || [];
    const params = {
      model: this.properties.model,
      prompt: promptText,
      aspect_ratio: this.properties.aspect_ratio,
    };
    if (this.properties.resolution) params.resolution = this.properties.resolution;
    if (this.properties.quality) params.quality = this.properties.quality;

    let result;
    if (imagesList.length > 0 || imageUrl) {
      // Collect all images
      const allImages = imagesList.length > 0 ? [...imagesList] : [];
      if (imageUrl && !allImages.includes(imageUrl)) allImages.unshift(imageUrl);

      if (allImages.length > 1) {
        params.images_list = allImages;
      } else {
        params.image_url = allImages[0];
      }

      // If the selected model is a t2i model, try to find a matching i2i variant
      const isI2IModel = !!getI2IModelById(params.model);
      if (!isI2IModel) {
        const editVariant = getI2IModelById(params.model + '-edit');
        if (editVariant) {
          params.model = editVariant.id;
          result = await muapi.generateI2I(params);
        } else {
          result = await muapi.generateImage(params);
        }
      } else {
        result = await muapi.generateI2I(params);
      }
    } else {
      result = await muapi.generateImage(params);
    }

    if (result.url) {
      this._previewUrl = result.url;
      this._img = new Image();
      this._img.crossOrigin = 'anonymous';
      this._img.onload = () => this.setDirtyCanvas(true);
      this._img.src = result.url;
    }

    return { image: result.url || '' };
  };

  ImageGeneratorNode.prototype.onSerialize = function(data) {
    if (this._previewUrl) data._previewUrl = this._previewUrl;
    if (this._previewType) data._previewType = this._previewType;
    if (this._wfOutputs) data._wfOutputs = this._wfOutputs;
  };

  ImageGeneratorNode.prototype.onConfigure = function(data) {
    this._updateEnums();

    if (data._previewUrl) {
      this._previewUrl = data._previewUrl;
      this._previewType = data._previewType || 'image';
      this._img = new Image();
      this._img.crossOrigin = 'anonymous';
      this._img.onload = () => this.setDirtyCanvas(true);
      this._img.src = data._previewUrl;
    }
    if (data._wfOutputs) {
      this._wfOutputs = data._wfOutputs;
      this._wfStatus = 'complete';
    }
  };

  LiteGraph.registerNodeType('generator/image', ImageGeneratorNode);
}
