// AI 对话助手主应用
const API_CONFIG = {
  key: '',
  baseUrl: 'https://api.openai.com/v1'
};

let currentChatId = null;
let chats = {};
let models = [];
let isGenerating = false;
let currentImageBase64 = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initEventListeners();
  renderChatList();
});

function loadSettings() {
  const saved = localStorage.getItem('ai_settings');
  if (saved) {
    const settings = JSON.parse(saved);
    API_CONFIG.key = settings.key || '';
    API_CONFIG.baseUrl = settings.baseUrl || 'https://api.openai.com/v1';
    document.getElementById('apiKeyInput').value = API_CONFIG.key;
    document.getElementById('baseUrlInput').value = API_CONFIG.baseUrl;
  }
  const savedChats = localStorage.getItem('ai_chats');
  if (savedChats) {
    chats = JSON.parse(savedChats);
  }
}

function saveSettings() {
  localStorage.setItem('ai_settings', JSON.stringify(API_CONFIG));
}

function saveChats() {
  localStorage.setItem('ai_chats', JSON.stringify(chats));
}

function initEventListeners() {
  document.getElementById('newChatBtn').addEventListener('click', createNewChat);
  document.getElementById('startChatBtn').addEventListener('click', createNewChat);
  document.getElementById('settingsBtn').addEventListener('click', () => showPage('settings'));
  document.getElementById('closeSettingsBtn').addEventListener('click', () => showPage('chat'));
  document.getElementById('discoverModelsBtn').addEventListener('click', discoverModels);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('imageUploadBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
  });
  document.getElementById('imageInput').addEventListener('change', handleImageUpload);
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleQuickAction(e.target.dataset.action));
  });
  document.getElementById('messageInput').addEventListener('input', (e) => {
    document.getElementById('charCount').textContent = e.target.value.length + ' 字符';
  });
  document.getElementById('apiKeyInput').addEventListener('blur', () => {
    const key = document.getElementById('apiKeyInput').value.trim();
    const baseUrl = document.getElementById('baseUrlInput').value.trim();
    if (key) {
      API_CONFIG.key = key;
      API_CONFIG.baseUrl = baseUrl || 'https://api.openai.com/v1';
      saveSettings();
    }
  });
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url;
      document.getElementById('baseUrlInput').value = url;
      API_CONFIG.baseUrl = url;
    });
  });
}

function showPage(page) {
  document.getElementById('welcomePage').classList.add('hidden');
  document.getElementById('chatPage').classList.add('hidden');
  document.getElementById('settingsPage').classList.add('hidden');
  if (page === 'welcome') document.getElementById('welcomePage').classList.remove('hidden');
  else if (page === 'chat') document.getElementById('chatPage').classList.remove('hidden');
  else if (page === 'settings') {
    document.getElementById('settingsPage').classList.remove('hidden');
    renderSavedKeys();
  }
}

function createNewChat() {
  const chatId = 'chat_' + Date.now();
  chats[chatId] = {
    id: chatId,
    title: '新对话',
    messages: [],
    created: new Date().toISOString()
  };
  currentChatId = chatId;
  saveChats();
  renderChatList();
  showPage('chat');
  document.getElementById('chatTitle').textContent = '新对话';
  document.getElementById('messagesContainer').innerHTML = '';
  document.getElementById('messageInput').focus();
}

function renderChatList() {
  const list = document.getElementById('chatList');
  list.innerHTML = '';
  Object.values(chats).sort((a, b) => new Date(b.created) - new Date(a.created)).forEach(chat => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
    item.innerHTML = '<span class="chat-item-title">'+chat.title+'</span><button class="chat-item-delete" data-id="'+chat.id+'">x</button>';
    item.querySelector('.chat-item-title').addEventListener('click', () => loadChat(chat.id));
    item.querySelector('.chat-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    list.appendChild(item);
  });
}

function loadChat(chatId) {
  const chat = chats[chatId];
  if (!chat) return;
  currentChatId = chatId;
  showPage('chat');
  document.getElementById('chatTitle').textContent = chat.title;
  renderMessages(chat.messages);
  renderChatList();
}

function deleteChat(chatId) {
  delete chats[chatId];
  if (currentChatId === chatId) {
    currentChatId = null;
    showPage('welcome');
  }
  saveChats();
  renderChatList();
}

function renderMessages(messages) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '';
  messages.forEach(msg => appendMessage(msg.role, msg.content, msg.image));
  container.scrollTop = container.scrollHeight;
}

function appendMessage(role, content, image) {
  const container = document.getElementById('messagesContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + role;
  const avatar = role === 'assistant' ? '🤖' : '👤';
  let contentHtml = formatMessage(content);
  if (image) contentHtml += '<img src="' + image + '\" class="message-image" onclick="previewImage(this.src)">';
  messageDiv.innerHTML = '<div class="message-avatar">' + avatar + '</div><div class="message-content">' + contentHtml + '</div>';
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function formatMessage(content) {
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

async function sendMessage() {
  if (isGenerating) return;
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content) return;
  const model = document.getElementById('modelSelect').value;
  if (!model) {
    showNotification('请先选择或发现模型', 'warning');
    return;
  }
  if (!chats[currentChatId]) createNewChat();
  const userMessage = { role: 'user', content, image: currentImageBase64 };
  chats[currentChatId].messages.push(userMessage);
  chats[currentChatId].title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
  saveChats();
  renderChatList();
  input.value = '';
  document.getElementById('charCount').textContent = '0 字符';
  currentImageBase64 = null;
  appendMessage('user', content, userMessage.image);
  showLoading(true);
  isGenerating = true;
  document.getElementById('sendBtn').disabled = true;
  try {
    const response = await callAI(model, content);
    chats[currentChatId].messages.push({ role: 'assistant', content: response });
    saveChats();
    appendMessage('assistant', response);
  } catch (error) {
    appendMessage('assistant', '❌ 错误: ' + error.message);
  } finally {
    showLoading(false);
    isGenerating = false;
    document.getElementById('sendBtn').disabled = false;
  }
}

async function callAI(model, message) {
  const messages = chats[currentChatId].messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.image ? { images: [m.image] } : {})
  }));
  const requestBody = {
    model: model,
    messages: messages.slice(-10),
    stream: false
  };
  const response = await fetch(API_CONFIG.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_CONFIG.key
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || '请求失败');
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function discoverModels() {
  const status = document.getElementById('discoveryStatus');
  status.className = 'discovery-status loading';
  status.textContent = '正在发现模型...';
  try {
    const response = await fetch(API_CONFIG.baseUrl + '/models', {
      headers: { 'Authorization': 'Bearer ' + API_CONFIG.key }
    });
    if (!response.ok) throw new Error('API Key 无效或网络错误');
    const data = await response.json();
    models = data.data || [];
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = '<option value="">选择模型...</option>';
    models.forEach(m => {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.id;
      modelSelect.appendChild(option);
    });
    status.className = 'discovery-status success';
    status.textContent = '✓ 发现 ' + models.length + ' 个模型';
    showNotification('模型发现成功', 'success');
  } catch (error) {
    status.className = 'discovery-status error';
    status.textContent = '✗ ' + error.message;
    showNotification(error.message, 'error');
  }
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageBase64 = event.target.result;
    showNotification('图片已加载，发送时将一起发送', 'success');
  };
  reader.readAsDataURL(file);
}

function previewImage(src) {
  document.getElementById('modalImage').src = src;
  document.getElementById('imageModal').classList.remove('hidden');
}

function handleQuickAction(action) {
  const input = document.getElementById('messageInput');
  if (action === 'image') input.value = '请帮我生成一张图片：';
  else if (action === 'video') input.value = '请帮我生成一个视频：';
  else if (action === 'vision') {
    document.getElementById('imageUploadBtn').click();
    return;
  }
  input.focus();
}

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (show) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = 'notification notification-' + type;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function renderSavedKeys() {
  const list = document.getElementById('savedKeysList');
  const keys = JSON.parse(localStorage.getItem('ai_keys') || '[]');
  list.innerHTML = keys.map((key, i) => {
    return '<div class="saved-key-item"><span>'+key.slice(0,8)+'...'+key.slice(-4)+'</span><button onclick="removeKey('+i+')">删除</button></div>';
  }).join('');
}

function removeKey(index) {
  const keys = JSON.parse(localStorage.getItem('ai_keys') || '[]');
  keys.splice(index, 1);
  localStorage.setItem('ai_keys', JSON.stringify(keys));
  renderSavedKeys();
}