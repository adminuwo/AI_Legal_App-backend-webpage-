import BaseService from './base/BaseService.js';
import LoggerService from '../shared/LoggerService.js';

/**
 * Enterprise StreamingService Component
 * Encapsulates SSE streaming response orchestration, stream lifecycle, and chunk emission.
 */
export class StreamingService extends BaseService {
  constructor() {
    super('StreamingService');
  }

  /**
   * Setup SSE Headers on Express Response Object
   */
  setupSSEHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
  }

  /**
   * Emit Chunk to SSE Client Stream
   */
  emitChunk(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * End SSE Stream Session
   */
  endStream(res, finalData = null) {
    if (finalData) this.emitChunk(res, finalData);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

export default StreamingService;
