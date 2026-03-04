# Changelog

## 2026-03-04

### Feature: Seedance 2.0 I2V workflow support
- Merged upstream Seedance 2.0 models (T2V, I2V, Extend)
- Added `maxImages: 9` to Seedance 2.0 I2V model (supports up to 9 reference images)
- Added quality selector to Video Generator node (high/basic for Seedance 2.0, medium/high for Kling)
- Added quality helper functions for video and I2V models

### Feature: Scene Splitter node + workflow improvements
- Scene Splitter node: LLM-powered scene decomposition into first frame, last frame, and motion prompts
- Video Generator: dynamic model capabilities display, last frame input, I2V auto-resolution
- Inspector: model capabilities info panel
- LLM Generator: real muapi endpoint integration (gpt-5-mini, gpt-5-nano, openrouter-vision)
- Group Assets: fix nested array flattening for images_list
- Polling: increased timeout to 4min for image generation
- Node header: play button on any executable node, upstream output caching
