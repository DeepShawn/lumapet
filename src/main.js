import './styles.css';

const PROVIDERS = {
  cloudgpt: {
    id: 'cloudgpt',
    name: 'Cloud GPT',
    shortName: 'GPT',
    color: '#a78bfa',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    transport: 'direct',
    description: '适合通用对话、写作与多模态工作流'
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DS',
    color: '#55a8ff',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/chat/completions',
    transport: 'direct',
    description: '适合中文对话、推理与代码助手'
  }
};

const PRESETS = {
  gpt: {
    name: 'GPT 娘',
    eyebrow: 'Cloud GPT',
    adult: '/references/gpt-reference.jpg',
    child: '/references/gpt-reference.jpg',
    objectAdult: '20% 50%',
    objectChild: '80% 50%',
    emoji: '✦',
    line: '紫雾龙角与柔光魔法'
  },
  deepseek: {
    name: 'DeepSeek 娘',
    eyebrow: 'DeepSeek',
    adult: '/references/deepseek-reference.jpg',
    child: '/references/deepseek-reference.jpg',
    objectAdult: '20% 50%',
    objectChild: '80% 50%',
    emoji: '◈',
    line: '深海蓝与小小鱼尾'
  }
};

const BACKGROUNDS = {
  aurora: 'linear-gradient(140deg, #211c42 0%, #29234d 45%, #183b48 100%)',
  night: 'radial-gradient(circle at 25% 10%, #3e2b65 0, #17152a 50%, #0c0d17 100%)',
  paper: 'linear-gradient(140deg, #fffaf2 0%, #f2e8de 100%)',
  custom: ''
};

const STORAGE = {
  settings: 'lumapet.settings.v1',
  providerConfigs: 'lumapet.provider-configs.v1',
  messages: 'lumapet.messages.v1'
};

const safeRead = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing and storage quotas should not break the chat shell.
  }
};

const savedSettings = safeRead(STORAGE.settings, {});
const savedConfigs = safeRead(STORAGE.providerConfigs, {});
const savedMessages = safeRead(STORAGE.messages, []);
const url = new URL(window.location.href);

const state = {
  platform: url.searchParams.get('platform') || 'web',
  provider: savedSettings.provider || 'cloudgpt',
  petMode: savedSettings.petMode || 'chibi',
  preset: savedSettings.preset || 'gpt',
  background: savedSettings.background || 'aurora',
  customBackground: savedSettings.customBackground || '',
  accent: savedSettings.accent || '#a78bfa',
  size: Number(savedSettings.size || 1),
  bubble: savedSettings.bubble !== false,
  motion: savedSettings.motion !== false,
  focusEndsAt: 0,
  focusTimer: null,
  isThinking: false,
  petMood: '在线',
  customImage: savedSettings.customImage || '',
  messages: Array.isArray(savedMessages) && savedMessages.length ? savedMessages : [
    { role: 'assistant', content: '晚上好，我是 LumaPet。选一个模型，给我一句话，我们就可以开始。' },
    { role: 'assistant', content: '你也可以在右侧换背景、上传参考图，做一只只属于你的桌宠。', meta: '小提示'
    }
  ]
};

const app = document.querySelector('#app');
let swRegistered = false;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function providerConfig(id = state.provider) {
  const base = PROVIDERS[id] || PROVIDERS.cloudgpt;
  return { ...base, ...(savedConfigs[id] || {}) };
}

function currentPreset() {
  return PRESETS[state.preset] || PRESETS.gpt;
}

function imageForPet() {
  if (state.customImage) return state.customImage;
  return state.petMode === 'adult' ? currentPreset().adult : currentPreset().child;
}

function objectPosition() {
  if (state.customImage) return '50% 50%';
  const preset = currentPreset();
  return state.petMode === 'adult' ? preset.objectAdult : preset.objectChild;
}

function petImageStyle() {
  if (state.customImage) return 'object-position:50% 50%;';
  // The supplied visual sheets contain adult and Q版 panels side by side.
  // Doubling the image width lets the stage show one panel cleanly.
  return `width:200%;max-width:none;object-fit:cover;object-position:center;transform:translateX(${state.petMode === 'adult' ? '0' : '-50%'});`;
}

function persistSettings() {
  safeWrite(STORAGE.settings, {
    provider: state.provider,
    petMode: state.petMode,
    preset: state.preset,
    background: state.background,
    customBackground: state.customBackground,
    accent: state.accent,
    size: state.size,
    bubble: state.bubble,
    motion: state.motion,
    customImage: state.customImage
  });
}

function persistMessages() {
  safeWrite(STORAGE.messages, state.messages.slice(-30));
}

function clearChat() {
  state.messages = [{ role: 'assistant', content: `聊天已清空。${currentPreset().name} 随时可以重新开始。`, meta: '新的开始' }];
  persistMessages();
  render();
  toast('对话已清空');
}

function exportSettings() {
  const safeConfigs = Object.fromEntries(Object.entries(savedConfigs).map(([id, config]) => [id, { model: config.model, endpoint: config.endpoint, transport: config.transport || 'direct' }]));
  const payload = { version: 1, exportedAt: new Date().toISOString(), settings: { provider: state.provider, petMode: state.petMode, preset: state.preset, background: state.background, customBackground: state.customBackground, accent: state.accent, size: state.size, bubble: state.bubble, motion: state.motion }, providerConfigs: safeConfigs };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  link.download = `lumapet-config-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('外观与接口配置已导出', 'success');
}

function importSettings(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const incoming = payload.settings || {};
      ['provider', 'petMode', 'preset', 'background', 'customBackground', 'accent', 'size', 'bubble', 'motion'].forEach((key) => {
        if (incoming[key] !== undefined) state[key] = incoming[key];
      });
      Object.entries(payload.providerConfigs || {}).forEach(([id, config]) => {
        if (!PROVIDERS[id]) return;
        savedConfigs[id] = { ...(savedConfigs[id] || {}), model: config.model || PROVIDERS[id].model, endpoint: config.endpoint || PROVIDERS[id].endpoint, transport: config.transport === 'proxy' ? 'proxy' : 'direct' };
      });
      safeWrite(STORAGE.providerConfigs, savedConfigs);
      persistSettings();
      closeModal();
      render();
      toast('配置已导入（API Key 保留本机原值）', 'success');
    } catch { toast('配置文件格式不正确', 'error'); }
  };
  reader.readAsText(file);
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function toast(message, tone = 'normal') {
  const node = document.querySelector('#toast');
  if (!node) return;
  node.className = `toast show ${tone}`;
  node.textContent = message;
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => { node.className = 'toast'; }, 2600);
}

function render() {
  const provider = providerConfig();
  const preset = currentPreset();
  const bg = state.background === 'custom' && state.customBackground
    ? `url(${state.customBackground}) center/cover`
    : BACKGROUNDS[state.background];
  const focusLabel = state.focusEndsAt > Date.now() ? formatTime(state.focusEndsAt - Date.now()) : '开始专注';
  const platformLabel = state.platform === 'windows' ? 'Windows 浮窗' : state.platform === 'android' ? 'Android 悬浮' : 'Web 工作台';
  const isLight = state.background === 'paper';

  app.innerHTML = `
    <div class="app-shell ${isLight ? 'theme-light' : ''}" data-platform="${esc(state.platform)}" style="--accent:${esc(state.accent)};--stage-bg:${esc(bg)}">
      <header class="topbar">
        <a class="brand" href="?platform=${esc(state.platform)}" aria-label="LumaPet 首页">
          <span class="brand-mark"><span></span><span></span><span></span></span>
          <span><strong>Luma<span>Pet</span></strong><small>AI companion OS</small></span>
        </a>
        <div class="topbar-center">
          <div class="platform-switch" role="tablist" aria-label="平台预览">
            ${['web', 'windows', 'android'].map((id) => `<button class="platform-tab ${state.platform === id ? 'active' : ''}" data-platform-tab="${id}" role="tab">${id === 'web' ? 'Web' : id === 'windows' ? 'Windows' : 'Android'}</button>`).join('')}
          </div>
          <span class="platform-badge"><i></i>${platformLabel}</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-button" data-action="open-reference" title="参考图与角色">▧<span class="sr-only">角色参考图</span></button>
          <button class="icon-button" data-action="open-settings" title="API 设置">⚙<span class="sr-only">API 设置</span></button>
          <button class="avatar-button" data-action="open-settings">你</button>
        </div>
      </header>

      <main class="workspace">
        <section class="pet-column">
          <div class="section-kicker"><span class="live-dot"></span>桌宠空间 <span class="muted">/ ${esc(preset.eyebrow)}</span></div>
          <div class="pet-card">
            <div class="pet-card-head">
              <div><span class="eyebrow">${esc(preset.eyebrow)}</span><h1>${esc(preset.name)}</h1></div>
              <button class="ghost-button" data-action="pet-speak">${state.petMood === '在线' ? '在看你' : state.petMood}</button>
            </div>
            <div class="pet-stage" style="--pet-scale:${state.size};">
              <div class="stage-glow"></div>
              <div class="spark spark-a">✦</div><div class="spark spark-b">✧</div><div class="spark spark-c">·</div>
              ${state.bubble ? `<div class="pet-bubble"><span>${state.isThinking ? '正在思考…' : state.petMood === '开心' ? '收到啦！' : '今天也要发光'}</span><i></i></div>` : ''}
              <button class="pet-portrait ${state.motion ? 'float' : ''}" data-action="pet-speak" aria-label="点击 ${esc(preset.name)}">
                <img src="${esc(imageForPet())}" alt="${esc(preset.name)} 参考形象" style="${esc(petImageStyle())}" />
                <span class="pet-glass"></span>
              </button>
              <div class="pet-nameplate"><span class="pet-orb">${esc(preset.emoji)}</span><span><b>${esc(preset.name)}</b><small>${state.petMode === 'adult' ? '成年形态' : 'Q版形态'} · ${esc(preset.line)}</small></span></div>
            </div>
            <div class="pet-card-foot">
              <div class="mode-toggle" role="group" aria-label="形态选择">
                <button class="${state.petMode === 'chibi' ? 'active' : ''}" data-mode="chibi">Q版</button>
                <button class="${state.petMode === 'adult' ? 'active' : ''}" data-mode="adult">成年版</button>
              </div>
              <label class="mini-select"><span>角色</span><select id="preset-select">${Object.entries(PRESETS).map(([id, item]) => `<option value="${id}" ${id === state.preset ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>
            </div>
          </div>
          <div class="reference-strip">
            <div class="reference-copy"><span class="eyebrow">VISUAL DNA</span><b>把你的参考图变成桌宠</b><small>上传一张图，首版会锁定为当前形象参考。</small></div>
            <button class="reference-thumb ${state.customImage ? 'has-image' : ''}" data-action="open-reference">
              <img src="${esc(state.customImage || imageForPet())}" alt="当前参考图" style="object-position:${esc(state.customImage ? '50% 50%' : objectPosition())}" />
              <span>${state.customImage ? '已上传' : '更换参考图'} <b>↗</b></span>
            </button>
          </div>
        </section>

        <section class="chat-column">
          <div class="chat-head">
            <div><span class="section-kicker">对话中</span><h2>和你的 AI 说点什么</h2></div>
            <button class="clear-chat" data-action="clear-chat">清空</button>
            <div class="provider-picker"><span class="provider-dot" style="background:${esc(provider.color)}"></span><select id="provider-select">${Object.values(PROVIDERS).map((item) => `<option value="${item.id}" ${item.id === state.provider ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select><button data-action="open-settings" title="配置当前模型">⌄</button></div>
          </div>
          <div class="chat-meta"><span><i class="status-dot"></i>${state.isThinking ? '模型正在回复' : '已连接 · 本地优先'}</span><span>${esc(provider.model)}</span></div>
          <div class="message-list" id="message-list">
            ${state.messages.map((message) => `<article class="message ${message.role === 'user' ? 'user' : 'assistant'}"><div class="message-avatar">${message.role === 'user' ? '你' : esc(preset.emoji)}</div><div class="message-body">${message.meta ? `<span class="message-meta">${esc(message.meta)}</span>` : ''}<p>${esc(message.content).replace(/\n/g, '<br>')}</p><time>${message.role === 'user' ? '刚刚' : 'LumaPet'}</time></div></article>`).join('')}
            ${state.isThinking ? '<article class="message assistant"><div class="message-avatar">✦</div><div class="message-body typing"><span></span><span></span><span></span></div></article>' : ''}
          </div>
          <form class="composer" id="chat-form">
            <textarea id="chat-input" rows="1" placeholder="让 ${esc(preset.name)} 帮你做点什么…" maxlength="4000"></textarea>
            <div class="composer-foot"><span><kbd>Enter</kbd> 发送 · <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行</span><button class="send-button" type="submit" ${state.isThinking ? 'disabled' : ''}>发送 <b>↗</b></button></div>
          </form>
        </section>

        <aside class="control-column">
          <div class="control-card quick-card">
            <div class="card-title"><span>OpenClaw 快捷区</span><button class="more-button" data-action="open-claw-info">•••</button></div>
            <p class="card-subtitle">把常用动作放到桌面边缘，Windows 与 Android 壳会继续扩展。</p>
            <div class="quick-grid">
              <button data-action="clipboard"><span>⌘</span><b>读取剪贴板</b><small>摘要到对话</small></button>
              <button data-action="focus"><span>◷</span><b>${focusLabel}</b><small>25 分钟专注</small></button>
              <button data-action="screenshot"><span>⌗</span><b>捕捉窗口</b><small>首版预留</small></button>
              <button data-action="pet-speak"><span>✦</span><b>叫醒桌宠</b><small>一句回应</small></button>
            </div>
          </div>

          <div class="control-card">
            <div class="card-title"><span>外观与场景</span><button class="more-button" data-action="open-reference">编辑</button></div>
            <div class="setting-row"><div><b>背景氛围</b><small>为每个平台单独保存</small></div><div class="swatches">${Object.keys(BACKGROUNDS).map((id) => `<button class="swatch ${state.background === id ? 'selected' : ''} ${id}" data-background="${id}" title="${id === 'aurora' ? '极光' : id === 'night' ? '深夜' : id === 'paper' ? '纸张' : '自定义'}"></button>`).join('')}</div></div>
            <div class="setting-row"><div><b>桌宠大小</b><small>${Math.round(state.size * 100)}%</small></div><input class="range-input" id="size-range" type="range" min="0.78" max="1.24" step="0.01" value="${state.size}" /></div>
            <div class="setting-row"><div><b>强调色</b><small>同步按钮与光效</small></div><input class="color-input" id="accent-input" type="color" value="${esc(state.accent)}" /></div>
            <div class="setting-row toggle-row"><div><b>对白气泡</b><small>让桌宠即时回应</small></div><button class="toggle ${state.bubble ? 'on' : ''}" data-toggle="bubble"><i></i></button></div>
            <div class="setting-row toggle-row"><div><b>轻微呼吸动画</b><small>低功耗模式可关闭</small></div><button class="toggle ${state.motion ? 'on' : ''}" data-toggle="motion"><i></i></button></div>
          </div>

          <div class="control-card api-card"><div class="api-icon">${esc(provider.shortName)}</div><div><b>${esc(provider.name)} 已就绪</b><small>${provider.transport === 'proxy' ? '服务端代理 · Key 不下发到设备' : savedConfigs[state.provider]?.apiKey ? 'API Key 已保存在本机' : '演示模式 · 点击配置 API Key'}</small></div><button data-action="open-settings">配置</button></div>
        </aside>
      </main>

      <footer class="statusbar"><span><i class="status-dot"></i> LumaPet v0.1 · 本地工作区</span><span><button data-action="open-privacy">隐私说明</button><span class="footer-sep">·</span><span>Cloud GPT + DeepSeek</span></span></footer>
    </div>
    <div class="modal-backdrop" id="modal-backdrop" hidden></div>
    <section class="modal" id="settings-modal" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-head"><div><span class="eyebrow">MODEL CONNECTION</span><h3 id="settings-title">连接你的 AI 模型</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <p class="modal-lead">密钥只会保存在当前设备的本地存储中，并直接从应用请求模型服务。仓库里不会写入任何密钥。</p>
      <form id="settings-form" class="settings-form">
        <label>模型提供方<select id="settings-provider">${Object.values(PROVIDERS).map((item) => `<option value="${item.id}" ${item.id === state.provider ? 'selected' : ''}>${esc(item.name)} · ${esc(item.description)}</option>`).join('')}</select></label>
        <div class="form-grid"><label>模型名称<input id="settings-model" value="${esc(provider.model)}" autocomplete="off" /></label><label>API Key<input id="settings-key" type="password" placeholder="sk-…（代理模式可留空）" value="${esc(savedConfigs[state.provider]?.apiKey || '')}" autocomplete="new-password" /></label></div>
        <label>请求方式<select id="settings-transport"><option value="direct" ${provider.transport !== 'proxy' ? 'selected' : ''}>设备直连 · Key 保存在本机</option><option value="proxy" ${provider.transport === 'proxy' ? 'selected' : ''}>LumaPet 服务端代理 · 使用服务器环境变量</option></select></label>
        <label>兼容接口地址<input id="settings-endpoint" value="${esc(provider.endpoint)}" autocomplete="url" /></label>
        <div class="modal-tip"><span>✦</span><p>如果你的服务是 OpenAI 兼容接口，可以直接替换地址与模型名。没有填写 Key 时，LumaPet 会使用本地演示回复。</p></div>
        <div class="modal-actions"><button type="button" class="secondary-button" data-action="export-settings">导出外观配置</button><button type="button" class="secondary-button" data-action="import-settings">导入配置</button><button type="button" class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" type="submit">保存连接</button></div><input id="config-upload" type="file" accept="application/json" hidden />
      </form>
    </section>
    <section class="modal reference-modal" id="reference-modal" hidden role="dialog" aria-modal="true" aria-labelledby="reference-title">
      <div class="modal-head"><div><span class="eyebrow">REFERENCE STUDIO</span><h3 id="reference-title">角色参考与外观</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <div class="reference-preview"><div class="large-reference"><img id="reference-preview-image" src="${esc(state.customImage || imageForPet())}" alt="参考图预览" /></div><div><b>${state.customImage ? '自定义参考图' : esc(preset.name)}</b><p>首版保留参考图，用于角色视觉锚定。后续可接入 Live2D、动作层与生成式换装。</p><label class="upload-button"><input id="reference-upload" type="file" accept="image/png,image/jpeg,image/webp" />上传一张参考图</label>${state.customImage ? '<button class="text-button" data-action="clear-reference">清除自定义图</button>' : ''}</div></div>
      <div class="reference-gallery"><span class="eyebrow">内置参考</span><div class="gallery-grid"><button data-reference="gpt"><img src="/references/gpt-reference.jpg" alt="GPT 娘参考" /><span>GPT 娘</span></button><button data-reference="deepseek"><img src="/references/deepseek-reference.jpg" alt="DeepSeek 娘参考" /><span>DeepSeek 娘</span></button><button data-reference="intro"><img src="/references/intro.jpg" alt="灵感板" /><span>灵感板</span></button></div></div>
    </section>
    <section class="modal small-modal" id="info-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">OPENCLAW READY</span><h3>快捷能力接口</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">第一版先提供剪贴板摘要、专注计时、桌宠唤醒等本地动作；Windows 的悬浮窗和 Android 的悬浮服务已经预留入口，后续可以继续挂接 OpenClaw 的工具链。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">知道了</button></div></section>
    <section class="modal small-modal" id="privacy-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">LOCAL FIRST</span><h3>隐私说明</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">默认模式下聊天内容、外观设置和 API Key 保留在当前设备，并直接发往你选择的模型接口。你也可以启用 LumaPet 服务端代理，让 API Key 只存在服务器环境变量中；代理不会把 Key 下发到设备。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">关闭</button></div></section>
    <div id="toast" class="toast" role="status"></div>
  `;

  bindEvents();
  const list = document.querySelector('#message-list');
  if (list) list.scrollTop = list.scrollHeight;
  if (!swRegistered && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => { swRegistered = true; }).catch(() => {});
  }
}

function openModal(id) {
  document.querySelectorAll('.modal').forEach((modal) => { modal.hidden = true; });
  const backdrop = document.querySelector('#modal-backdrop');
  const modal = document.querySelector(`#${id}`);
  if (modal && backdrop) {
    modal.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add('modal-open');
    const focusable = modal.querySelector('input, select, button');
    focusable?.focus();
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach((modal) => { modal.hidden = true; });
  const backdrop = document.querySelector('#modal-backdrop');
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('modal-open');
}

function setPlatform(platform) {
  state.platform = platform;
  url.searchParams.set('platform', platform);
  history.replaceState({}, '', url);
  render();
}

function setProvider(id) {
  if (!PROVIDERS[id]) return;
  state.provider = id;
  persistSettings();
  render();
  toast(`${PROVIDERS[id].name} 已切换`);
}

function petSpeak() {
  state.petMood = '开心';
  render();
  toast(`${currentPreset().name}：我在这里。`);
  window.setTimeout(() => { state.petMood = '在线'; render(); }, 2400);
}

function startFocus() {
  if (state.focusEndsAt > Date.now()) {
    state.focusEndsAt = 0;
    window.clearInterval(state.focusTimer);
    state.focusTimer = null;
    toast('专注计时已暂停');
    render();
    return;
  }
  state.focusEndsAt = Date.now() + 25 * 60 * 1000;
  window.clearInterval(state.focusTimer);
  state.focusTimer = window.setInterval(() => {
    if (Date.now() >= state.focusEndsAt) {
      state.focusEndsAt = 0;
      window.clearInterval(state.focusTimer);
      toast('专注完成，做得好。', 'success');
    }
    render();
  }, 1000);
  toast('25 分钟专注已开始', 'success');
  render();
}

async function readClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return toast('剪贴板是空的');
    const excerpt = text.trim().slice(0, 1200);
    state.messages.push({ role: 'user', content: `请帮我摘要这段剪贴板内容：\n${excerpt}` });
    persistMessages();
    render();
    await sendChat(true);
  } catch {
    toast('浏览器没有授予剪贴板权限', 'error');
  }
}

function demoReply(input) {
  const provider = providerConfig();
  const name = currentPreset().name;
  const hints = [
    `我用 ${provider.name} 的演示模式接住了这句话。`,
    `你可以在右上角配置 ${provider.name} API Key，让我换成真实模型回复。`,
    `如果你愿意，我也可以把这件事拆成三步：先整理重点，再给出方案，最后生成可执行清单。`
  ];
  if (/摘要|总结/.test(input)) return `${name} 已经把内容收好啦：\n• 抓住主题与重点\n• 标出需要行动的部分\n• 保留原文里的关键信息\n\n${hints[1]}`;
  if (/你好|嗨|hello/i.test(input)) return `你好！我是 ${name}。${hints[0]}\n\n今天想先做什么？`;
  return `${hints[0]}\n\n我会先围绕「${input.slice(0, 42)}${input.length > 42 ? '…' : ''}」给你一个清晰的起点。${hints[2]}`;
}

async function sendChat(fromClipboard = false) {
  if (state.isThinking) return;
  const latest = state.messages[state.messages.length - 1];
  const input = latest?.role === 'user' ? latest.content : '';
  if (!input.trim()) return;
  state.isThinking = true;
  render();
  const config = providerConfig();
  const key = savedConfigs[state.provider]?.apiKey?.trim();
  const useProxy = config.transport === 'proxy';
  if (!useProxy && !key) {
    await new Promise((resolve) => window.setTimeout(resolve, fromClipboard ? 480 : 720));
    state.messages.push({ role: 'assistant', content: demoReply(input) });
    state.isThinking = false;
    persistMessages();
    render();
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: `你是 LumaPet，一只友好的 AI 桌宠。回答简洁、清楚，偶尔带一点轻松的陪伴感。当前角色：${currentPreset().name}。` },
        ...state.messages.slice(-12).map(({ role, content }) => ({ role, content }))
      ],
      temperature: 0.7
    };
    if (useProxy) requestBody.provider = state.provider;
    const response = await fetch(useProxy ? '/api/chat' : config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(useProxy ? {} : { 'Authorization': `Bearer ${key}` }) },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    window.clearTimeout(timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
    const content = data?.choices?.[0]?.message?.content || data?.output?.[0]?.content?.[0]?.text;
    if (!content) throw new Error('接口没有返回可读内容');
    state.messages.push({ role: 'assistant', content: String(content) });
  } catch (error) {
    state.messages.push({ role: 'assistant', content: `这次连接没有成功：${error.name === 'AbortError' ? '请求超时' : error.message}\n\n你可以检查 API Key、接口地址或网络连接；也可以先清空 Key 使用演示模式。` });
  } finally {
    state.isThinking = false;
    persistMessages();
    render();
  }
}

function bindEvents() {
  document.querySelectorAll('[data-platform-tab]').forEach((button) => button.addEventListener('click', () => setPlatform(button.dataset.platformTab)));
  document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { state.petMode = button.dataset.mode; persistSettings(); render(); }));
  document.querySelectorAll('[data-background]').forEach((button) => button.addEventListener('click', () => { state.background = button.dataset.background; persistSettings(); render(); }));
  document.querySelectorAll('[data-toggle]').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.toggle; state[key] = !state[key]; persistSettings(); render(); }));
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', async () => {
    const action = button.dataset.action;
    if (action === 'open-settings') openModal('settings-modal');
    if (action === 'open-reference') openModal('reference-modal');
    if (action === 'open-claw-info') openModal('info-modal');
    if (action === 'open-privacy') openModal('privacy-modal');
    if (action === 'close-modal') closeModal();
    if (action === 'clear-chat') clearChat();
    if (action === 'export-settings') exportSettings();
    if (action === 'import-settings') document.querySelector('#config-upload')?.click();
    if (action === 'pet-speak') petSpeak();
    if (action === 'focus') startFocus();
    if (action === 'clipboard') await readClipboard();
    if (action === 'screenshot') toast('窗口捕捉已预留给 Windows / Android 壳');
    if (action === 'clear-reference') { state.customImage = ''; persistSettings(); closeModal(); render(); toast('已恢复内置参考图'); }
  }));
  document.querySelector('#preset-select')?.addEventListener('change', (event) => { state.preset = event.target.value; state.customImage = ''; persistSettings(); render(); });
  document.querySelector('#provider-select')?.addEventListener('change', (event) => setProvider(event.target.value));
  document.querySelector('#size-range')?.addEventListener('input', (event) => { state.size = Number(event.target.value); persistSettings(); document.querySelector('.app-shell')?.style.setProperty('--pet-scale', state.size); document.querySelector('.pet-portrait')?.style.setProperty('transform', `scale(${state.size})`); });
  document.querySelector('#accent-input')?.addEventListener('input', (event) => { state.accent = event.target.value; persistSettings(); document.querySelector('.app-shell')?.style.setProperty('--accent', state.accent); });
  document.querySelector('#chat-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const input = document.querySelector('#chat-input'); const content = input.value.trim(); if (!content || state.isThinking) return; state.messages.push({ role: 'user', content }); input.value = ''; persistMessages(); await sendChat(); });
  document.querySelector('#chat-input')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); document.querySelector('#chat-form')?.requestSubmit(); } });
  document.querySelector('#settings-provider')?.addEventListener('change', (event) => {
    const config = providerConfig(event.target.value);
    document.querySelector('#settings-model').value = config.model;
    document.querySelector('#settings-endpoint').value = config.endpoint;
    document.querySelector('#settings-key').value = savedConfigs[event.target.value]?.apiKey || '';
    document.querySelector('#settings-transport').value = config.transport || 'direct';
  });
  document.querySelector('#settings-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = document.querySelector('#settings-provider').value;
    savedConfigs[id] = { model: document.querySelector('#settings-model').value.trim() || PROVIDERS[id].model, endpoint: document.querySelector('#settings-endpoint').value.trim() || PROVIDERS[id].endpoint, transport: document.querySelector('#settings-transport').value, apiKey: document.querySelector('#settings-key').value.trim() };
    safeWrite(STORAGE.providerConfigs, savedConfigs);
    state.provider = id;
    persistSettings();
    closeModal();
    render();
    toast(`${PROVIDERS[id].name} 连接已保存`, 'success');
  });
  document.querySelector('#config-upload')?.addEventListener('change', (event) => importSettings(event.target.files?.[0]));
  document.querySelector('#reference-upload')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('图片请控制在 8MB 以内', 'error');
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        state.customImage = canvas.toDataURL('image/webp', 0.82);
        persistSettings();
        render();
        openModal('reference-modal');
        toast('参考图已载入');
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  document.querySelectorAll('[data-reference]').forEach((button) => button.addEventListener('click', () => { if (PRESETS[button.dataset.reference]) { state.preset = button.dataset.reference; state.customImage = ''; persistSettings(); render(); openModal('reference-modal'); } }));
  document.querySelector('#modal-backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); }, { once: true });
}

render();
