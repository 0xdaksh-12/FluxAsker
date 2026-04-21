import { fetchTranscript } from './lib/youtube';
import { RAGPipeline } from './lib/rag';

let currentStatus = 'INITIAL'; // INITIAL, PROCESSING, READY, ERROR
let ragPipeline = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_STATUS') {
    sendResponse({ status: currentStatus });
    return true;
  }

  if (request.action === 'PROCESS_VIDEO') {
    currentStatus = 'PROCESSING';
    
    (async () => {
      try {
        const segments = await fetchTranscript(request.url);
        
        // Setup RAG
        ragPipeline = new RAGPipeline();
        await ragPipeline.processTranscript(segments);
        
        currentStatus = 'READY';
        sendResponse({ success: true });
      } catch (err) {
        console.error('Error processing:', err);
        currentStatus = 'ERROR';
        sendResponse({ success: false, error: err.message });
      }
    })();
    
    return true; // async response
  }

  if (request.action === 'ASK_QUESTION') {
    if (!ragPipeline) {
      sendResponse({ answer: null, error: 'Pipeline not initialized' });
      return true;
    }

    (async () => {
      try {
        const answer = await ragPipeline.askQuestion(request.query);
        sendResponse({ answer });
      } catch (err) {
        console.error('Error generating answer:', err);
        sendResponse({ answer: null, error: err.message });
      }
    })();
    
    return true;
  }
});
