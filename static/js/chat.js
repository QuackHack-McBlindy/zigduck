const API_CONFIG = Object.assign(
  { host: location.hostname, port: location.port, baseUrl: '' },
  window.CHAT_CONFIG || {}
);

const AUDIO_CONFIG = {
  enabled: true,
  volume: 0.8
};

let messageHistory = [];
let historyIndex = -1;
let isFirstMessage = true;
let lastTtsCheck = 0;
let hlsJsLoaded = false;
let hlsJsLoading = false;

function fixViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  const inputContainer = document.getElementById('input-container');
  const chat = document.getElementById('chat');
  if (inputContainer && chat) {
    const inputHeight = inputContainer.offsetHeight;
    chat.style.paddingBottom = `${inputHeight + 20}px`;
  }
}

window.addEventListener('load', fixViewportHeight);
window.addEventListener('resize', fixViewportHeight);
window.addEventListener('orientationchange', fixViewportHeight);

document.addEventListener('click', function (e) {
  const bubble = e.target.closest('.chat-bubble');
  if (!bubble) return;
  if (e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.closest('input') ||
      e.target.closest('video') ||
      e.target.closest('audio') ||
      e.target.closest('.playlist-controls')) {
    return;
  }
  bubble.classList.toggle('fullscreen');
  if (bubble.classList.contains('fullscreen')) {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        bubble.classList.remove('fullscreen');
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
    const closeHandler = (event) => {
      if (event.target === bubble || event.target.closest('.chat-bubble') === bubble) {
        const rect = bubble.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        if (x > rect.right - 60 && y < rect.top + 60) {
          bubble.classList.remove('fullscreen');
          document.removeEventListener('keydown', handleEscape);
        }
      }
    };
    bubble.addEventListener('click', closeHandler, { once: true });
  }
});

function addToHistory(message) {
  if (!message.trim()) return;
  if (messageHistory.length > 0 && messageHistory[messageHistory.length - 1] === message) {
    return;
  }
  messageHistory.push(message);
  if (messageHistory.length > 50) {
    messageHistory.shift();
  }
  historyIndex = messageHistory.length;
}

function navigateHistory(direction) {
  const promptInput = document.getElementById('prompt');
  if (messageHistory.length === 0) return;
  if (direction === 'up') {
    if (historyIndex > 0) {
      historyIndex--;
    } else {
      historyIndex = 0;
    }
  } else if (direction === 'down') {
    if (historyIndex < messageHistory.length - 1) {
      historyIndex++;
    } else {
      promptInput.value = "";
      historyIndex = messageHistory.length;
      return;
    }
  }
  if (historyIndex >= 0 && historyIndex < messageHistory.length) {
    promptInput.value = messageHistory[historyIndex];
  }
}

function getAuthToken() {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  }
  const cookiePassword = getCookie('api_password');
  if (cookiePassword) return cookiePassword;
  return localStorage.getItem('mqttPassword') ||
         localStorage.getItem('dashboardPassword') ||
         "";
}

function showNotification(message, type) {
  let notification = document.getElementById('chat-notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'chat-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#4CAF50' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: monospace;
      font-size: 14px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(notification);
  }
  notification.textContent = message;
  notification.style.background = type === 'error' ? '#ff4444' : type === 'success' ? '#4CAF50' : '#2196F3';
  notification.style.opacity = '1';
  notification.style.transform = 'translateY(0)';
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
  }, 3000);
}

function convertMarkdownTableToHTML(text) {
  const lines = text.split('\n').filter(line =>
    line.trim().startsWith('|') && line.trim().endsWith('|')
  );
  if (lines.length < 2) return text;
  const tableData = lines.map(line =>
    line.split('|').slice(1, -1).map(cell => cell.trim())
  );
  const isSecondRowSeparator = tableData[1] && tableData[1].every(cell => /^:?-+:?$/.test(cell));
  const headers = isSecondRowSeparator ? tableData[0] : [];
  const dataRows = isSecondRowSeparator ? tableData.slice(2) : tableData;
  let html = '<div class="markdown-table-container"><table class="markdown-table">';
  if (headers.length > 0) {
    html += '<thead><tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead>';
  }
  html += '<tbody>';
  dataRows.forEach(row => {
    if (row.length === headers.length || headers.length === 0) {
      row.forEach(cell => {
        const tag = headers.length === 0 && row === dataRows[0] ? 'th' : 'td';
        html += `<${tag}>${cell}</${tag}>`;
      });
      html += '</tr>';
    }
  });
  html += '</tbody></table></div>';
  return html;
}

function extractOutputFromResponse(responseText) {
  try {
    const data = JSON.parse(responseText);
    if (data.output) {
      return data.output;
    }
  } catch (e) {
    console.log('JSON parse failed, trying regex');
  }
  const outputMatch = responseText.match(/"output":"([\s\S]*?)"(?=,|\})/);
  if (outputMatch && outputMatch[1]) {
    return outputMatch[1];
  }
  return responseText;
}

function cleanAPIResponse(output) {
  if (!output) return "Command executed!";
  let cleaned = output.replace(/\u001b\[[0-9;]*m/g, "");
  cleaned = cleaned.replace(/\\n/g, '\n');
  return cleaned;
}

function enhanceContent(content) {
  const cleaned = content
    .split('\n')
    .filter(line => !line.includes('Loading fuzzy index from:'))
    .join('\n');
  const noAnsi = cleaned.replace(/\x1b\[[0-9;]*m/g, "");
  const isTerminalOutput = noAnsi.includes('│') || noAnsi.includes('┌') ||
                           noAnsi.includes('─') || noAnsi.includes('└');
  if (isTerminalOutput) {
    return { type: 'terminal', content: noAnsi };
  }
  const html = noAnsi
    .replace(/# 🏆(.*)/g, '<h3 style="color: #FFD700; margin: 15px 0 8px 0; font-size: 1.3em; font-weight: bold;">🏆$1</h3>')
    .replace(/# 🗞️(.*)/g, '<h3 style="color: #4CAF50; margin: 15px 0 8px 0; font-size: 1.3em; font-weight: bold;">🗞️$1</h3>')
    .replace(/### (.*)/g, '<h5 style="color: #2196F3; margin: 12px 0 6px 0; font-weight: bold;">$1</h5>')
    .replace(/## (.*)/g, '<h4 style="color: #FF9800; margin: 14px 0 7px 0; font-weight: bold;">$1</h4>')
    .replace(/# (.*)/g, '<h3 style="color: #4CAF50; margin: 16px 0 8px 0; font-size: 1.3em; font-weight: bold;">$1</h3>')
    .replace(/\n/g, '<br>');
  return { type: 'html', content: html };
}

function extractMediaUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const urlRegex = /https?:\/\/[^\s<>"'()\[\]{}]+/g;
  const rawMatches = text.match(urlRegex) || [];
  const mediaExtensions = [
    'mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v', 'ogv', '3gp',
    'mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'opus', 'wma',
    'm3u', 'm3u8'
  ];
  const streamingKeywords = ['stream', 'hls', 'playlist'];
  return rawMatches
    .map(u => u.replace(/[.,;:!?]+$/, ''))
    .filter(url => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const ext = pathname.split('.').pop();
        if (mediaExtensions.includes(ext)) return true;
        const urlLower = url.toLowerCase();
        return streamingKeywords.some(k => urlLower.includes(k));
      } catch (e) {
        return false;
      }
    });
}

const extractVideoUrls = extractMediaUrls;

function isAudioUrl(url) {
  try {
    const urlObj = new URL(url, location.href);
    const pathname = urlObj.pathname.toLowerCase();
    return ['.mp3', '.wav', '.ogg', '.oga', '.flac', '.m4a', '.aac', '.opus', '.wma']
      .some(ext => pathname.endsWith(ext));
  } catch (e) {
    return false;
  }
}

function isPlaylistUrl(url) {
  try {
    const urlObj = new URL(url, location.href);
    const pathname = urlObj.pathname.toLowerCase();
    return pathname.endsWith('.m3u') ||
           pathname.endsWith('.m3u8') ||
           url.toLowerCase().includes('m3u8') ||
           url.toLowerCase().includes('/hls/') ||
           url.toLowerCase().includes('playlist');
  } catch (e) {
    return false;
  }
}

function loadHlsJs() {
  return new Promise((resolve) => {
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      hlsJsLoaded = true;
      resolve(true);
      return;
    }
    if (hlsJsLoading) {
      const checkInterval = setInterval(() => {
        if (typeof Hls !== 'undefined') {
          clearInterval(checkInterval);
          hlsJsLoaded = true;
          resolve(true);
        }
      }, 100);
      return;
    }
    hlsJsLoading = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.10/dist/hls.min.js';
    script.onload = function () {
      hlsJsLoading = false;
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        hlsJsLoaded = true;
        console.log('HLS.js loaded successfully');
        resolve(true);
      } else {
        console.warn('HLS.js loaded but not supported');
        resolve(false);
      }
    };
    script.onerror = function () {
      hlsJsLoading = false;
      console.warn('Failed to load HLS.js');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

function createPlaylistPlayer(videoUrls, container) {
  const video = document.createElement('video');
  video.controls = true;
  video.style.maxWidth = '100%';
  video.style.borderRadius = '8px';
  video.style.background = '#000';
  video.style.marginBottom = '10px';

  const controlsDiv = document.createElement('div');
  controlsDiv.className = 'playlist-controls';
  controlsDiv.style.marginTop = '10px';
  controlsDiv.style.fontSize = '0.9em';
  controlsDiv.style.color = '#666';

  let currentIndex = 0;
  let isPlaying = false;

  function playVideoAtIndex(index) {
    if (index < 0 || index >= videoUrls.length) return;
    currentIndex = index;
    const currentUrl = videoUrls[currentIndex];
    video.src = currentUrl;
    video.load();
    updateControls();
    if (isPlaying) {
      video.play().catch(e => {
        console.log('Auto-play prevented:', e);
        isPlaying = false;
      });
    }
  }

  function updateControls() {
    controlsDiv.innerHTML = `
      <div style="margin-bottom: 5px;">
        <span>${currentIndex + 1}/${videoUrls.length}: ${videoUrls[currentIndex].split('/').pop() || 'Video'}</span>
      </div>
      <div>
        <button data-playlist-action="prev" style="margin-right: 10px; background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">◀ Prev</button> <button data-playlist-action="next" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Next ▶</button>
      </div>
    `;
    controlsDiv.querySelector('[data-playlist-action="prev"]').addEventListener('click', () => {
      if (currentIndex > 0) playVideoAtIndex(currentIndex - 1);
    });
    controlsDiv.querySelector('[data-playlist-action="next"]').addEventListener('click', () => {
      if (currentIndex < videoUrls.length - 1) {
        playVideoAtIndex(currentIndex + 1);
      } else {
        playVideoAtIndex(0);
      }
    });
  }

  video.addEventListener('ended', () => {
    isPlaying = false;
    if (currentIndex < videoUrls.length - 1) {
      setTimeout(() => {
        playVideoAtIndex(currentIndex + 1);
        video.play().catch(e => console.log('Auto-play prevented after end:', e));
      }, 500);
    }
  });

  video.addEventListener('play', () => { isPlaying = true; });
  video.addEventListener('pause', () => { isPlaying = false; });

  container.appendChild(video);
  container.appendChild(controlsDiv);
  playVideoAtIndex(0);
  return video;
}

function createMediaPlayer(url, container) {
  const isAudio = isAudioUrl(url);
  const media = document.createElement(isAudio ? 'audio' : 'video');
  media.controls = true;
  media.preload = 'metadata';
  media.style.maxWidth = '100%';
  media.style.marginBottom = '10px';
  if (isAudio) {
    media.style.width = '100%';
  } else {
    media.style.borderRadius = '8px';
    media.style.background = '#000';
  }
  media.src = url;

  media.addEventListener('error', () => {
    const fallback = document.createElement('div');
    fallback.style.cssText = 'font-size: 0.85em; color: #ff9800; margin-top: 6px;';
    fallback.innerHTML = `Could not load media. <a href="${url}" target="_blank" rel="noopener" style="color:#2196F3;">Open directly</a>`;
    container.appendChild(fallback);
  });

  container.appendChild(media);
  return media;
}

const createRegularVideoPlayer = createMediaPlayer;

function addAIMessage(content, options = {}) {
  const chatContainer = document.getElementById('chat');
  const typingIndicator = document.querySelector('.typing-indicator');
  if (typingIndicator) {
    chatContainer.removeChild(typingIndicator);
  }

  const videoUrls = extractMediaUrls(content);
  let textContent = content;
  videoUrls.forEach(url => {
    textContent = textContent.replace(url, "").trim();
  });

  const enhanced = enhanceContent(textContent);
  const aiBubble = document.createElement('div');
  aiBubble.className = 'chat-bubble ai-bubble';

  if (enhanced.type === 'terminal') {
    const pre = document.createElement('pre');
    pre.style.cssText = `
      font-family: 'Fira Code', 'DejaVu Sans Mono', monospace;
      white-space: pre;
      overflow-x: auto;
      margin: 0;
      padding: 15px;
      background: #1e1e1e;
      color: #f0f0f0;
      border-radius: 10px;
      border: 1px solid #333;
      font-size: 13px;
      line-height: 1.4;
      max-height: 400px;
      overflow-y: auto;
    `;
    pre.textContent = enhanced.content;
    aiBubble.appendChild(pre);
  } else if (textContent.trim()) {
    aiBubble.innerHTML = enhanced.content;
  }

  if (videoUrls.length > 0) {
    if (textContent.trim()) {
      const separator = document.createElement('div');
      separator.style.height = '20px';
      aiBubble.appendChild(separator);
    }
    videoUrls.forEach((videoUrl) => {
      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-container';

      const title = document.createElement('div');
      title.className = 'video-title';
      title.textContent = `Media: ${videoUrl.split('/').pop() || 'Stream'}`;
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '10px';
      title.style.color = '#2196F3';
      videoContainer.appendChild(title);

      const isPlaylist = isPlaylistUrl(videoUrl);

      if (isPlaylist) {
        (async () => {
          try {
            const response = await fetch(videoUrl);
            const text = await response.text();
            const playlistUrls = text.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.startsWith('#') && line.length > 0);
            if (playlistUrls.length === 0) {
              videoContainer.innerHTML = 'No valid media URLs found in playlist';
              return;
            }
            console.log('Playlist detected with', playlistUrls.length, 'items');
            createPlaylistPlayer(playlistUrls, videoContainer);
          } catch (error) {
            console.error('Failed to process playlist:', error);
            videoContainer.innerHTML = `Failed to load playlist: ${error.message}`;
          }
        })();
      } else {
        createMediaPlayer(videoUrl, videoContainer);
      }

      const infoDiv = document.createElement('div');
      infoDiv.style.marginTop = '8px';
      infoDiv.style.fontSize = '0.85em';
      infoDiv.style.color = '#666';
      videoContainer.appendChild(infoDiv);
      aiBubble.appendChild(videoContainer);
    });
  }

  chatContainer.appendChild(aiBubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const playTTSAudio = async () => {
    if (!AUDIO_CONFIG.enabled) return;
    const cacheBuster = Date.now();
    const url = `/tts/tts.wav?cb=${cacheBuster}`;
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) return;
    } catch (e) {
      return;
    }
    const audio = new Audio(url);
    audio.volume = AUDIO_CONFIG.volume;
    try {
      await audio.play();
      window.lastTtsCheck = cacheBuster;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        const btn = document.createElement('button');
        btn.textContent = '🔊 Play voice';
        btn.style.cssText = 'margin-top:8px;padding:6px 12px;background:#4CAF50;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;';
        btn.onclick = () => { audio.play().catch(console.error); btn.remove(); };
        aiBubble.appendChild(btn);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else {
        console.warn('TTS playback failed:', err);
      }
    }
  };
  setTimeout(playTTSAudio, 500);
}

function addErrorMessage(text) {
  const chatContainer = document.getElementById('chat');
  const typingIndicator = document.querySelector('.typing-indicator');
  if (typingIndicator) {
    chatContainer.removeChild(typingIndicator);
  }

  const cleanedText = text
    .split('\n')
    .filter(line => !line.includes('Loading fuzzy index from:'))
    .join('\n');

  const errorBubble = document.createElement('div');
  errorBubble.className = 'chat-bubble error-special-bubble';

  const errorMatch = cleanedText.match(/🦆 says ⮞ fuck ❌[^\n]*/);
  const errorMessage = errorMatch ? errorMatch[0].replace('🦆 says ⮞ ', "") : 'Error!';

  errorBubble.innerHTML = `
    <div class="error-special-text">🦆says⮞${errorMessage}</div>
  `;
  chatContainer.appendChild(errorBubble);

  const matches = [];
  const lines = cleanedText.split('\n');
  lines.forEach(line => {
    const match = line.match(/(\d+)%:\s*'([^']+)'\s*->\s*(.*)/);
    if (match) {
      const [, percentage, pattern, command] = match;
      matches.push({ percentage, pattern, command });
    }
  });

  if (matches.length > 0) {
    const suggestionBubble = document.createElement('div');
    suggestionBubble.className = 'chat-bubble suggestion-header-bubble';
    suggestionBubble.innerHTML = `<div class="suggestion-header">Did you mean?</div>`;
    chatContainer.appendChild(suggestionBubble);

    matches.forEach(match => {
      const matchBubble = document.createElement('div');
      matchBubble.className = 'chat-bubble suggestion-match-bubble';
      matchBubble.innerHTML = `
        <div class="match-percentage">${match.percentage}% match</div>
        <div class="match-pattern">${match.pattern}</div>
        <div class="match-command">→ ${match.command}</div>
      `;
      matchBubble.style.cursor = 'pointer';
      matchBubble.addEventListener('click', () => {
        document.getElementById('prompt').value = match.pattern.replace(/\{[^}]+\}/g, '...');
        sendMessage();
      });
      chatContainer.appendChild(matchBubble);
    });
  }

  chatContainer.scrollTop = chatContainer.scrollHeight;

  const playFailAudio = () => {
    if (!AUDIO_CONFIG.enabled) return;
    const cacheBuster = Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    const audio = new Audio(`/tts/fail.wav?cb=${cacheBuster}`);
    audio.volume = AUDIO_CONFIG.volume;
    audio.play().catch(err => {
      console.warn('Fail audio autoplay blocked:', err.name);
    });
  };
  setTimeout(playFailAudio, 300);
}

function showTypingIndicator() {
  const chatContainer = document.getElementById('chat');
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    chatContainer.removeChild(existingIndicator);
  }
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  chatContainer.appendChild(typingIndicator);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendCommandToAPI(command) {
  showTypingIndicator();
  try {
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.startsWith('do ')) {
      const naturalLanguageCommand = command.substring(3);
      return await sendNaturalLanguageCommand(naturalLanguageCommand);
    } else if (lowerCommand.includes('shopping') || lowerCommand.includes('shopping list')) {
      return await fetchShoppingList();
    } else if (lowerCommand.includes('reminder') || lowerCommand.includes('remind')) {
      return await fetchReminders();
    } else if (lowerCommand.includes('timer')) {
      return await fetchTimers();
    } else if (lowerCommand.includes('alarm')) {
      return await fetchAlarms();
    } else if (lowerCommand.includes('location') || lowerCommand.includes('where am i')) {
      return await fetchLocation();
    } else {
      return await sendNaturalLanguageCommand(command);
    }
  } catch (error) {
    console.error('API call failed:', error);
    addErrorMessage("Failed to send command to API. Please check the connection.");
    return false;
  }
}

async function sendNaturalLanguageCommand(command) {
  try {
    const password = getAuthToken();
    const response = await fetch(`${API_CONFIG.baseUrl}/do?cmd=${encodeURIComponent(command)}`, {
      headers: { 'Authorization': `Bearer ${password}` }
    });
    if (response.ok) {
      let responseText = await response.text();
      const rawOutput = extractOutputFromResponse(responseText);
      const cleanOutput = cleanAPIResponse(rawOutput);
      const isError = cleanOutput.match(/(No matching command found|System rebuild failed)/);
      if (isError) {
        addErrorMessage(cleanOutput);
      } else {
        addAIMessage(cleanOutput);
      }
      return true;
    } else {
      addErrorMessage('API Error: ' + response.status + ' - ' + response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Yo DO command failed:', error);
    addAIMessage("Command sent to API! (Check API logs for details)");
    return true;
  }
}

function sendMessage() {
  const promptInput = document.getElementById('prompt');
  const prompt = promptInput.value.trim();
  const chatContainer = document.getElementById('chat');

  if (prompt === "") return;

  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user-bubble';
  userBubble.textContent = prompt;
  chatContainer.appendChild(userBubble);
  addToHistory(prompt);

  promptInput.value = "";
  historyIndex = messageHistory.length;
  chatContainer.scrollTop = chatContainer.scrollHeight;
  sendCommandToAPI(prompt);
  isFirstMessage = false;
}

function sendSuggestion(element) {
  const text = element.textContent;
  document.getElementById('prompt').value = text;
  sendMessage();
}

function checkEnter(event) {
  if (event.key === 'Enter') {
    sendMessage();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    navigateHistory('up');
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    navigateHistory('down');
  }
}

document.getElementById('prompt').addEventListener('keydown', checkEnter);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.querySelectorAll('.suggestion-bubble').forEach(bubble => {
  bubble.addEventListener('click', function () {
    sendSuggestion(this);
  });
});
setTimeout(() => {
  if (isFirstMessage) {
    addAIMessage("Quack quack! I'm a 🦆 here to help! Qwack me a question yo!");
  }
}, 2000);
