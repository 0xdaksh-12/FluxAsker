document.addEventListener('DOMContentLoaded', () => {
  const processBtn = document.getElementById('process-btn');
  const statusText = document.getElementById('status-text');
  const chatArea = document.getElementById('chat-area');
  const statusArea = document.getElementById('status-area');
  const messagesList = document.getElementById('messages');
  const queryInput = document.getElementById('query-input');
  const sendBtn = document.getElementById('send-btn');

  // Check current status on load
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response) {
      updateUIStatus(response.status);
    }
  });

  processBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url.includes('youtube.com/watch')) {
        updateUIStatus('PROCESSING');
        chrome.runtime.sendMessage({ action: 'PROCESS_VIDEO', url: activeTab.url }, (resp) => {
          if (resp && resp.success) {
            updateUIStatus('READY');
          } else {
            updateUIStatus('ERROR', resp?.error || 'Failed to process video');
          }
        });
      } else {
        updateUIStatus('ERROR', 'Please navigate to a YouTube video.');
      }
    });
  });

  sendBtn.addEventListener('click', handleSend);
  queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  function handleSend() {
    const query = queryInput.value.trim();
    if (!query) return;

    addMessage('user', query);
    queryInput.value = '';
    
    // Add temporary loading message
    const loadingId = addMessage('ai', 'Thinking...');

    chrome.runtime.sendMessage({ action: 'ASK_QUESTION', query }, (resp) => {
      removeMessage(loadingId);
      if (resp && resp.answer) {
        addMessage('ai', formatAnswer(resp.answer));
      } else {
        addMessage('ai', 'Error generating answer.');
      }
    });
  }

  function formatAnswer(text) {
    // Regex to match timestamp format like [00:15] or [1:23:45]
    return text.replace(/\[((\d{1,2}:)?\d{1,2}:\d{2})\]/g, (match, p1) => {
      // Create a clickable span which the content script / background can handle
      return `<span class="timestamp-link" data-time="${p1}">${match}</span>`;
    });
  }

  let msgIdCounter = 0;
  function addMessage(role, htmlContent) {
    const id = `msg-${msgIdCounter++}`;
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = htmlContent;
    
    // Add click listeners to any timestamp links
    msgDiv.querySelectorAll('.timestamp-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const timeStr = e.target.getAttribute('data-time');
        jumpToTime(timeStr);
      });
    });

    messagesList.appendChild(msgDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
    return id;
  }

  function removeMessage(id) {
    const msg = document.getElementById(id);
    if (msg) msg.remove();
  }

  function updateUIStatus(status, errorMsg = '') {
    if (status === 'READY') {
      statusArea.classList.add('hidden');
      chatArea.classList.remove('hidden');
    } else if (status === 'PROCESSING') {
      statusText.innerText = 'Extracting and embedding transcript... This may take a minute.';
      processBtn.disabled = true;
      processBtn.innerText = 'Processing...';
    } else if (status === 'ERROR') {
      statusText.innerText = 'Error: ' + errorMsg;
      processBtn.disabled = false;
      processBtn.innerText = 'Try Again';
    } else {
      statusArea.classList.remove('hidden');
      chatArea.classList.add('hidden');
    }
  }

  function jumpToTime(timeStr) {
    // Convert time string (e.g., 01:23) to seconds
    const parts = timeStr.split(':').reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      seconds += parseInt(parts[i], 10) * Math.pow(60, i);
    }
    
    // Tell content script to jump player
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'JUMP_VIDEO', seconds });
      }
    });
  }
});
