import { registerInputTextNode } from './InputTextNode.js';
import { registerInputImageNode } from './InputImageNode.js';
import { registerInputVideoNode } from './InputVideoNode.js';
import { registerInputAudioNode } from './InputAudioNode.js';
import { registerInput3DModelNode } from './Input3DModelNode.js';
import { registerImageGeneratorNode } from './ImageGeneratorNode.js';
import { registerVideoGeneratorNode } from './VideoGeneratorNode.js';
import { registerThreeDGeneratorNode } from './ThreeDGeneratorNode.js';
import { registerAudioGeneratorNode } from './AudioGeneratorNode.js';
import { registerLLMGeneratorNode } from './LLMGeneratorNode.js';
import { registerPromptBuilderNode } from './PromptBuilderNode.js';
import { registerIfElseNode } from './IfElseNode.js';
import { registerToolsNode } from './ToolsNode.js';
import { registerGroupAssetsNode } from './GroupAssetsNode.js';
import { registerSceneSplitterNode } from './SceneSplitterNode.js';

export function registerAllNodes() {
  // Input nodes
  registerInputTextNode();
  registerInputImageNode();
  registerInputVideoNode();
  registerInputAudioNode();
  registerInput3DModelNode();

  // Generator nodes
  registerImageGeneratorNode();
  registerVideoGeneratorNode();
  registerThreeDGeneratorNode();
  registerAudioGeneratorNode();
  registerLLMGeneratorNode();

  // Utility nodes
  registerPromptBuilderNode();
  registerIfElseNode();
  registerToolsNode();
  registerGroupAssetsNode();
  registerSceneSplitterNode();
}
