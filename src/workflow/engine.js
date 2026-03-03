import { muapi } from '../lib/muapi.js';

export class WorkflowEngine {
  constructor(graph) {
    this.graph = graph;
    this.running = false;
    this.abortController = null;
    this.onNodeStatus = null; // callback(nodeId, status, data)
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.running = false;
  }

  _setStatus(nodeId, status, data) {
    const node = this.graph.getNodeById(nodeId);
    if (node) {
      node._wfStatus = status;
      node._wfData = data || null;
      node.setDirtyCanvas(true, true);
    }
    if (this.onNodeStatus) this.onNodeStatus(nodeId, status, data);
  }

  async execute() {
    if (this.running) return;

    // Check API key
    const key = localStorage.getItem('muapi_key');
    if (!key) {
      const { AuthModal } = await import('../components/AuthModal.js');
      document.body.appendChild(AuthModal());
      throw new Error('API key required');
    }

    this.running = true;
    this.abortController = new AbortController();

    // Reset all node statuses
    const nodes = this.graph._nodes;
    nodes.forEach(n => {
      n._wfStatus = 'idle';
      n._wfData = null;
      n._wfOutputs = {};
      n.setDirtyCanvas(true, true);
    });

    // Get execution order (topological sort)
    const order = this.graph.computeExecutionOrder(false);

    try {
      for (const node of order) {
        if (!this.running) break;
        if (this.abortController.signal.aborted) break;

        // Skip nodes that don't have execute
        if (typeof node.onWorkflowExecute !== 'function') continue;

        // Gather inputs from connected nodes
        const inputs = {};
        if (node.inputs) {
          for (let i = 0; i < node.inputs.length; i++) {
            const input = node.inputs[i];
            const link = this.graph.links[input.link];
            if (link) {
              const sourceNode = this.graph.getNodeById(link.origin_id);
              if (sourceNode && sourceNode._wfOutputs) {
                const slotName = sourceNode.outputs?.[link.origin_slot]?.name || link.origin_slot;
                inputs[input.name] = sourceNode._wfOutputs[slotName];
              }
            }
          }
        }

        this._setStatus(node.id, 'running');

        try {
          const outputs = await node.onWorkflowExecute(inputs, muapi, this.abortController.signal);

          if (outputs && typeof outputs === 'object') {
            node._wfOutputs = outputs;
          }

          this._setStatus(node.id, 'complete', outputs);
        } catch (err) {
          if (err.name === 'AbortError') {
            this._setStatus(node.id, 'idle');
            break;
          }
          this._setStatus(node.id, 'error', { message: err.message });
          throw err;
        }
      }
    } finally {
      this.running = false;
      this.abortController = null;
    }
  }
}
