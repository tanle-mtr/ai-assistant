// AI 对话助手 - 增强版
const API_CONFIG = {
  key: \'\',
  baseUrl: \'https://api.deepseek.com/v1\'
};

let currentChatId = null;
let chats = {};
let models = [];
let isGenerating = false;
let currentImageBase64 = null;
let isStreaming = false;

// 初始化
document.addEventListener(\'DOMContentLoaded\', () => {
  loadSettings();
  initEventListeners();
  renderChatList();
});

// 加载设置
function loadSettings() {
  const saved = localStorage.getItem(\'ai_settings\');
  if (saved) {
    const settings = JSON.parse(saved);
    API_CONFIG.key = settings.key || \'\';
    API_CONFIG.baseUrl = settings.baseUrl || \'https://api.deepseek.com/v1\';
    document.getElementById(\'apiKeyInput\').value = API_CONFIG.key;
    document.getElementById(\'baseUrlInput\').value = API_CONFIG.baseUrl;
  }
  const savedChats = localStorage.getItem(\'ai_chats\');
  if (savedChats) {
    chats = JSON.parse(savedChats);
  }
}

// 保存设置
function saveSettings() {
  localStorage.setItem(\'ai_settings\', JSON.stringify(API_CONFIG));
}

// 保存对话
function saveChats() {
  localStorage.setItem(\'ai_chats\', JSON.stringify(chats));
}

// 初始化事件监听
function initEventListeners() {
  // 侧边栏
  document.getElementById(\'newChatBtn\').addEventListener(\'click\', createNewChat);
  document.getElementById(\'menuBtn\').addEventListener(\'click\', toggleSidebar);
  document.getElementById(\'closeSidebarBtn\').addEventListener(\'click\', toggleSidebar);
  document.getElementById(\'sidebarOverlay\').addEventListener(\'click\', toggleSidebar);
  
  // 设置
  document.getElementById(\'settingsBtn\').addEventListener(\'click\', () => showPage(\'settings\'));
  document.getElementById(\'closeSettingsBtn\').addEventListener(\'click\', () => showPage(\'chat\'));
  
  // 模型选择
  document.getElementById(\'modelBtn\').addEventListener(\'click\', toggleModelDropdown);
  document.getElementById(\'modelSearch\').addEventListener(\'input\', filterModels);
  document.addEventListener(\'click\', (e) => {
    if (!e.target.closest(\'#modelBtn\') && !e.target.closest(\'#modelDropdown\')) {
      document.getElementById(\'modelDropdown\').classList.remove(\'active\');
    }
  });
  
  // 发送消息
  document.getElementById(\'sendBtn\').addEventListener(\'click\', sendMessage);
  document.getElementById(\'messageInput\').addEventListener(\'keypress\', (e) => {
    if (e.key === \'Enter\' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) sendMessage();
    }
  });
  
  // 图片上传
  document.getElementById(\'imageUploadBtn\').addEventListener(\'click\', () => {
    document.getElementById(\'imageInput\').click();
  });
  document.getElementById(\'imageInput\').addEventListener(\'change\', handleImageUpload);
  document.getElementById(\'removeImageBtn\').addEventListener(\'click\', clearImage);
  
  // 快捷操作
  document.querySelectorAll(\'.quick-btn\').forEach(btn => {
    btn.addEventListener(\'click\', (e) => handleQuickAction(e.target.dataset.action));
  });
  
  // 输入框
  document.getElementById(\'messageInput\').addEventListener(\'input\', (e) => {
    document.getElementById(\'charCount\').textContent = e.target.value.length + \' 字符\';
    autoResize(e.target);
    updateSendBtn();
  });
  
  // API 设置
  document.getElementById(\'discoverModelsBtn\').addEventListener(\'click\', discoverModels);
  document.getElementById(\'toggleKeyBtn\').addEventListener(\'click\', toggleApiKey);
  document.getElementById(\'apiKeyInput\').addEventListener(\'blur\', saveApiKey);
  document.getElementById(\'baseUrlInput\').addEventListener(\'blur\', saveApiUrl);
  
  // 模板选择
  document.querySelectorAll(\'.template-card\').forEach(btn => {
    btn.addEventListener(\'click\', (e) => selectTemplate(e.currentTarget));
  });
  
  // 删除对话
  document.getElementById(\'deleteChatBtn\').addEventListener(\'click\', deleteCurrentChat);
  
  // 图片预览
  document.getElementById(\'modalCloseBtn\').addEventListener(\'click\', closeModal);
  document.getElementById(\'imageModal\').addEventListener(\'click\', (e) => {
    if (e.target === document.getElementById(\'imageModal\')) closeModal();
  });
}

// 侧边栏切换
function toggleSidebar() {
  const sidebar = document.getElementById(\'sidebar\');
  const overlay = document.getElementById(\'sidebarOverlay\');
  sidebar.classList.toggle(\'open\');
  overlay.classList.toggle(\'active\');
}

// 页面切换
function showPage(page) {
  document.getElementById(\'welcomePage\').classList.add(\'hidden\');
  document.getElementById(\'chatPage\').classList.add(\'hidden\');
  document.getElementById(\'settingsPage\').classList.add(\'hidden\');
  
  if (page === \'welcome\') document.getElementById(\'welcomePage\').classList.remove(\'hidden\');
  else if (page === \'chat\') document.getElementById(\'chatPage\').classList.remove(\'hidden\');
  else if (page === \'settings\') {
    document.getElementById(\'settingsPage\').classList.remove(\'hidden\');
    renderSavedKeys();
    updateTemplateActive();
  }
}

// 新建对话
function createNewChat() {
  const chatId = \'chat_\' + Date.now();
  chats[chatId] = {
    id: chatId,
    title: \'新对话\',
    messages: [],
    created: new Date().toISOString()
  };
  currentChatId = chatId;
  saveChats();
  renderChatList();
  showPage(\'chat\');
  document.getElementById(\'chatTitle\').textContent = \'新对话\';
  document.getElementById(\'messagesContainer\').innerHTML = `
    <div class="welcome-message">
      <p>你好！我是 AI 助手 🤖</p>
      <p>请选择模型后开始对话。</p>
    </div>
  `;
  document.getElementById(\'messageInput\').value = \'\';
  document.getElementById(\'messageInput\').focus();
  document.getElementById(\'charCount\').textContent = \'0 字符\';
  
  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) toggleSidebar();
}

// 渲染对话列表
function renderChatList() {
  const list = document.getElementById(\'chatList\');
  const sortedChats = Object.values(chats).sort((a, b) => new Date(b.created) - new Date(a.created));
  
  if (sortedChats.length === 0) {
    list.innerHTML = \'<div class="empty-chats"><p>暂无对话记录</p></div>\';
    return;
  }
  
  list.innerHTML = \'\';
  sortedChats.forEach(chat => {
    const item = document.createElement(\'div\');
    item.className = \'chat-item\' + (chat.id === currentChatId ? \' active\' : \'\');
    item.innerHTML = `
      <span class="chat-item-title">${escapeHtml(chat.title)}</span>
      <button class="chat-item-delete" data-id="${chat.id}">&times;</button>
    `;
    item.querySelector(\'.chat-item-title\').addEventListener(\'click\', () => loadChat(chat.id));
    item.querySelector(\'.chat-item-delete\').addEventListener(\'click\', (e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    });
    list.appendChild(item);
  });
}

// 加载对话
function loadChat(chatId) {
  const chat = chats[chatId];
  if (!chat) return;
  
  currentChatId = chatId;
  showPage(\'chat\');
  document.getElementById(\'chatTitle\').textContent = chat.title;
  renderMessages(chat.messages);
  renderChatList();
  
  // 移动端关闭侧边栏
  if (window.innerWidth <= 768) toggleSidebar();
}

// 删除对话
function deleteChat(chatId) {
  delete chats[chatId];
  if (currentChatId === chatId) {
    currentChatId = null;
    showPage(\'welcome\');
  }
  saveChats();
  renderChatList();
}

// 删除当前对话
function deleteCurrentChat() {
  if (!currentChatId) return;
  if (confirm(\'确定要删除当前对话吗？\')) {
    deleteChat(currentChatId);
  }
}

// 渲染消息
function renderMessages(messages) {
  const container = document.getElementById(\'messagesContainer\');
  container.innerHTML = \'\';
  messages.forEach(msg => appendMessage(msg.role, msg.content, msg.image));
  container.scrollTop = container.scrollHeight;
}

// 追加消息
function appendMessage(role, content, image) {
  const container = document.getElementById(\'messagesContainer\');
  const messageDiv = document.createElement(\'div\');
  messageDiv.className = \'message \' + role;
  
  const avatar = role === \'assistant\' ? \'🤖\' : \'👤\';
  let contentHtml = formatMessage(content);
  
  if (image) {
    contentHtml += `<img src="${image}" class="message-image" onclick="previewImage(this.src)">`;
  }
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">${contentHtml}</div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// 添加打字指示器
function addTypingIndicator() {
  const container = document.getElementById(\'messagesContainer\');
  const div = document.createElement(\'div\');
  div.className = \'message assistant typing-message\';
  div.id = \'typingIndicator\';
  div.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

// 移除打字指示器
function removeTypingIndicator() {
  const indicator = document.getElementById(\'typingIndicator\');
  if (indicator) indicator.remove();
}

// 格式化消息
function formatMessage(content) {
  if (!content) return \'\';
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, \'<pre><code>$2</code></pre>\')
    .replace(/`([^`]+)`/g, \'<code>$1</code>\')
    .replace(/\*\*([^*]+)\*\*/g, \'<strong>$1</strong>\')
    .replace(/\n/g, \'<br>\');
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement(\'div\');
  div.textContent = text;
  return div.innerHTML;
}

// 发送消息
async function sendMessage() {
  if (isGenerating) return;
  
  const input = document.getElementById(\'messageInput\');
  const content = input.value.trim();
  if (!content) return;
  
  const model = document.getElementById(\'currentModelName\').dataset.model;
  if (!model) {
    showToast(\'请先选择模型\', \'warning\');
    return;
  }
  
  if (!chats[currentChatId]) createNewChat();
  
  // 保存用户消息
  const userMessage = { role: \'user\', content, image: currentImageBase64 };
  chats[currentChatId].messages.push(userMessage);
  chats[currentChatId].title = content.slice(0, 20) + (content.length > 20 ? \'...\' : \'\');
  saveChats();
  renderChatList();
  
  // 清空输入
  input.value = \'\';
  document.getElementById(\'charCount\').textContent = \'0 字符\';
  clearImage();
  
  // 显示用户消息
  appendMessage(\'user\', content, userMessage.image);
  
  // 开始生成
  showLoading(true);
  isGenerating = true;
  document.getElementById(\'sendBtn\').disabled = true;
  
  // 添加打字指示器
  addTypingIndicator();
  
  try {
    const assistantContent = await callAI(model, content);
    removeTypingIndicator();
    
    // 保存并显示助手消息
    chats[currentChatId].messages.push({ role: \'assistant\', content: assistantContent });
    saveChats();
    appendMessage(\'assistant\', assistantContent);
  } catch (error) {
    removeTypingIndicator();
    appendMessage(\'assistant\', \'❌ 错误: \' + error.message);
    showToast(error.message, \'error\');
  } finally {
    showLoading(false);
    isGenerating = false;
    document.getElementById(\'sendBtn\').disabled = false;
  }
}

// 调用 AI API
async function callAI(model, message) {
  const messages = chats[currentChatId].messages.map(m => ({
    role: m.role,
    content: m.content,
    ...(m.image ? { images: [m.image] } : {})
  }));
  
  const requestBody = {
    model: model,
    messages: messages.slice(-20),
    stream: false,
    max_tokens: 2000
  };
  
  const response = await fetch(API_CONFIG.baseUrl + \'/chat/completions\', {
    method: \'POST\',
    headers: {
      \'Content-Type\': \'application/json\',
      \'Authorization\': \'Bearer \' + API_CONFIG.key
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || \'请求失败\');
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// 发现模型
async function discoverModels() {
  const status = document.getElementById(\'discoveryStatus\');
  status.className = \'discovery-status loading\';
  status.textContent = \'正在发现模型...\';
  
  try {
    const response = await fetch(API_CONFIG.baseUrl + \'/models\', {
      headers: { \'Authorization\': \'Bearer \' + API_CONFIG.key }
    });
    
    if (!response.ok) throw new Error(\'API Key 无效或网络错误\');
    
    const data = await response.json();
    models = data.data || [];
    
    updateModelDropdown();
    
    status.className = \'discovery-status success\';
    status.textContent = \'✓ 发现 \' + models.length + \' 个模型\';
    showToast(\'模型发现成功\', \'success\');
  } catch (error) {
    status.className = \'discovery-status error\';
    status.textContent = \'✗ \' + error.message;
    showToast(error.message, \'error\');
  }
}

// 更新模型下拉
function updateModelDropdown() {
  const list = document.getElementById(\'modelList\');
  list.innerHTML = \'\';
  
  if (models.length === 0) {
    list.innerHTML = \'<div class="model-empty">未找到模型</div>\';
    return;
  }
  
  models.forEach(m => {
    const item = document.createElement(\'div\');
    item.className = \'model-item\';
    item.textContent = m.id;
    item.addEventListener(\'click\', () => selectModel(m.id));
    list.appendChild(item);
  });
}

// 筛选模型
function filterModels() {
  const search = document.getElementById(\'modelSearch\').value.toLowerCase();
  const items = document.querySelectorAll(\'.model-item\');
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(search) ? \'\' : \'none\';
  });
}

// 选择模型
function selectModel(modelId) {
  document.getElementById(\'currentModelName\').textContent = modelId;
  document.getElementById(\'currentModelName\').dataset.model = modelId;
  document.getElementById(\'modelDropdown\').classList.remove(\'active\');
  localStorage.setItem(\'ai_selected_model\', modelId);
}

// 切换模型下拉
function toggleModelDropdown() {
  const dropdown = document.getElementById(\'modelDropdown\');
  dropdown.classList.toggle(\'active\');
  if (dropdown.classList.contains(\'active\')) {
    updateModelDropdown();
    document.getElementById(\'modelSearch\').focus();
  }
}

// 图片上传
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    currentImageBase64 = event.target.result;
    document.getElementById(\'previewImg\').src = currentImageBase64;
    document.getElementById(\'imagePreview\').style.display = \'block\';
    showToast(\'图片已加载\', \'success\');
  };
  reader.readAsDataURL(file);
}

// 清除图片
function clearImage() {
  currentImageBase64 = null;
  document.getElementById(\'imagePreview\').style.display = \'none\';
  document.getElementById(\'imageInput\').value = \'\';
}

// 预览图片
function previewImage(src) {
  document.getElementById(\'modalImage\').src = src;
  document.getElementById(\'imageModal\').classList.remove(\'hidden\');
}

// 关闭模态框
function closeModal() {
  document.getElementById(\'imageModal\').classList.add(\'hidden\');
}

// 快捷操作
function handleQuickAction(action) {
  const input = document.getElementById(\'messageInput\');
  if (action === \'image\') input.value = \'请帮我生成一张图片：\';
  else if (action === \'video\') input.value = \'请帮我生成一个视频：\';
  else if (action === \'vision\') {
    document.getElementById(\'imageUploadBtn\').click();
    return;
  }
  input.focus();
  updateSendBtn();
}

// 加载/隐藏加载状态
function showLoading(show) {
  const overlay = document.getElementById(\'loadingOverlay\');
  overlay.classList.toggle(\'hidden\', !show);
}

// 显示提示
function showToast(message, type = \'info\') {
  const toast = document.getElementById(\'errorToast\');
  toast.textContent = message;
  toast.className = \'toast \' + type;
  setTimeout(() => toast.classList.add(\'hidden\'), 3000);
}

// 自动调整文本框高度
function autoResize(textarea) {
  textarea.style.height = \'auto\';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + \'px\';
}

// 更新发送按钮状态
function updateSendBtn() {
  const input = document.getElementById(\'messageInput\');
  const btn = document.getElementById(\'sendBtn\');
  btn.disabled = !input.value.trim() || isGenerating;
}

// 切换 API Key 可见性
function toggleApiKey() {
  const input = document.getElementById(\'apiKeyInput\');
  input.type = input.type === \'password\' ? \'text\' : \'password\';
}

// 保存 API Key
function saveApiKey() {
  const key = document.getElementById(\'apiKeyInput\').value.trim();
  if (key) {
    API_CONFIG.key = key;
    saveSettings();
    
    // 添加到已保存列表
    let keys = JSON.parse(localStorage.getItem(\'ai_keys\') || \'[]\');
    if (!keys.includes(key)) {
      keys.push(key);
      localStorage.setItem(\'ai_keys\', JSON.stringify(keys));
    }
  }
}

// 保存 API URL
function saveApiUrl() {
  const url = document.getElementById(\'baseUrlInput\').value.trim();
  if (url) {
    API_CONFIG.baseUrl = url;
    saveSettings();
  }
}

// 选择模板
function selectTemplate(btn) {
  const url = btn.dataset.url;
  document.getElementById(\'baseUrlInput\').value = url;
  API_CONFIG.baseUrl = url;
  
  // 更新激活状态
  document.querySelectorAll(\'.template-card\').forEach(c => c.classList.remove(\'active\'));
  btn.classList.add(\'active\');
  
  saveSettings();
}

// 更新模板激活状态
function updateTemplateActive() {
  document.querySelectorAll(\'.template-card\').forEach(card => {
    card.classList.toggle(\'active\', card.dataset.url === API_CONFIG.baseUrl);
  });
}

// 渲染已保存的 Key
function renderSavedKeys() {
  const list = document.getElementById(\'savedKeysList\');
  const keys = JSON.parse(localStorage.getItem(\'ai_keys\') || \'[]\');
  
  if (keys.length === 0) {
    list.innerHTML = \'<div class="empty-chats"><p>暂无保存的 Key</p></div>\';
    return;
  }
  
  list.innerHTML = keys.map((key, i) => `
    <div class="saved-key-item">
      <span>${key.slice(0, 8)}...${key.slice(-4)}</span>
      <button onclick="removeKey(${i})">删除</button>
    </div>
  `).join(\'\');
}

// 删除 Key
function removeKey(index) {
  let keys = JSON.parse(localStorage.getItem(\'ai_keys\') || \'[]\');
  keys.splice(index, 1);
  localStorage.setItem(\'ai_keys\', JSON.stringify(keys));
  renderSavedKeys();
}

// 键盘快捷键
document.addEventListener(\'keydown\', (e) => {
  // Ctrl/Cmd + Enter 发送
  if ((e.ctrlKey || e.metaKey) && e.key === \'Enter\') {
    if (!isGenerating) sendMessage();
  }
  // Escape 关闭模态框
  if (e.key === \'Escape\') {
    closeModal();
    document.getElementById(\'modelDropdown\').classList.remove(\'active\');
  }
});