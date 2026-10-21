import { World } from './pet/engine.js';
import { CHARACTERS } from './pet/characters.js';
import { line, timeGreeting } from './pet/personas.js';
import { THEMES, Wallpaper, applyTheme } from './themes.js';
import { store } from './store.js';
import { sendChat, providerConfig, isLive } from './chat.js';
import { WindowManager } from './ui/windows.js';
import { APPS, esc, fmt } from './ui/apps.js';
import { Bubbles } from './ui/bubbles.js';
import { play } from './ui/sfx.js';

// ───────────────────────── platform ─────────────────────────

const params = new URL(location.href).searchParams;
const desktop = window.lumaDesktop || null;
const android = window.LumaAndroid || null;
const platform = desktop ? 'windows' : params.get('overlay') === '1' && android ? 'overlay' : params.get('platform') === 'android' ? 'android' : 'web';
document.body.classList.add(`platform-${platform}`);

const APP_BASE = import.meta.env?.BASE_URL || './';

document.querySelector('#app').innerHTML = `
  <canvas id="wallpaper" aria-hidden="true"></canvas>
  <div id="desktop-icons"></div>
  <div id="win-layer"></div>
  <canvas id="pet-layer" aria-label="桌宠"></canvas>
  <div id="bubble-layer"></div>
  <nav id="taskbar" class="interactive" aria-label="任务栏"></nav>
  <div id="start-menu" class="interactive" hidden></div>
  <div id="ctx-menu" class="interactive" role="menu" hidden></div>
  <div id="toast" role="status"></div>`;

const $ = (selector) => document.querySelector(selector);
const petCanvas = $('#pet-layer');
const petCtx = petCanvas.getContext('2d');
const world = new World();
if (import.meta.env?.DEV || new URL(location.href).searchParams.has("debug")) window.__world = world;
const wm = new WindowManager($('#win-layer'));
// Android WebViews render in software; keep canvases at 1x there, and in
// lite mode (after a renderer crash) keep the wallpaper still.
const lite = params.get('lite') === '1';
const maxRatio = platform === 'android' || platform === 'overlay' ? 1 : 2;
if (lite) document.body.classList.add('lite');
const wallpaper = platform === 'web' || platform === 'android' ? new Wallpaper($('#wallpaper'), { maxRatio: Math.min(1.5, maxRatio) }) : null;

// Overlay mode: this page is a small floating window; it follows the pet.
const overlay = { x: 0, y: 0, w: 0, h: 0, sentX: NaN, sentY: NaN };

const app = {
  platform,
  store,
  world,
  wm,
  thinking: false,
  chatPartnerId: null,
  settingsProvider: null,
  customImage: null,
  focus: { endsAt: 0 },
  agent: { connected: false, pending: null, result: '' },

  characterName(pet) { return CHARACTERS[pet.kind]?.name || '桌宠'; },
  mainPet() { return world.pets.find((pet) => !pet.hidden) || world.pets[0]; },
  chatPartner() { return world.pets.find((pet) => pet.id === app.chatPartnerId) || app.mainPet(); },
  toScreen(point) { return platform === 'overlay' ? { x: point.x - overlay.x, y: point.y - overlay.y } : point; },

  openApp(id) {
    const spec = APPS[id];
    if (!spec) return;
    closeMenus();
    wm.open(id, { title: spec.title, icon: spec.icon, width: spec.width, height: spec.height, render: (body) => spec.render(body, app) });
    // A pet sometimes hops onto a freshly opened window.
    window.setTimeout(() => {
      const plat = wm.platforms().find((item) => item.id === id);
      const pet = world.pets.find((item) => item.onFloor() && item.surface === 'ground' && !item.thinking);
      if (plat && pet && Math.random() < .45 && !store.settings.quiet) pet.jumpTo(plat.x1 + (plat.x2 - plat.x1) * (.25 + Math.random() * .5), plat.y);
    }, 600);
  },
  refreshApps() { for (const { id } of wm.list()) wm.rerender(id); renderTaskbar(); },
  toast,

  applySettings() {
    const s = store.settings;
    applyTheme(s.theme, document.documentElement, s.accent);
    if (wallpaper) wallpaper.animated = s.wallpaperMotion && !lite && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    world.options.quiet = s.quiet || app.focus.endsAt > Date.now();
    world.options.chatter = s.chatter;
    world.options.follow = s.follow;
    for (const pet of world.pets) pet.setLook(null, s.scale);
    renderTaskbar();
  },

  setTheme(id) {
    if (!THEMES[id]) return;
    store.set({ theme: id, accent: '' });
    wallpaper?.setTheme(id);
    app.applySettings();
    desktop?.setTheme?.(id);
    const pet = app.mainPet();
    if (pet && Math.random() < .6) pet.say(`${THEMES[id].emoji} 换成「${THEMES[id].name}」啦！`, 1800);
  },

  addPet(kind, mode = 'chibi', silent = false) {
    if (world.pets.length >= 4 || !CHARACTERS[kind]) return null;
    const pet = world.addPet({ kind, mode, scale: store.settings.scale, image: kind === 'custom' ? app.customImage : null, x: 140 + Math.random() * Math.max(100, world.bounds.right - 280) });
    if (!silent) window.setTimeout(() => pet.say(line(kind, 'greet')), 900);
    store.set({ petsEdited: true });
    syncPets();
    return pet;
  },

  removePet(id) {
    if (world.pets.length <= 1) return;
    const pet = world.pets.find((item) => item.id === id);
    if (!pet) return;
    pet.say('拜拜～', 900);
    store.set({ petsEdited: true });
    window.setTimeout(() => { bubbles.remove(pet); world.removePet(id); syncPets(); app.refreshApps(); }, 700);
  },

  setPetMode(id, mode) {
    const pet = world.pets.find((item) => item.id === id);
    if (!pet) return;
    pet.setLook(mode);
    if (pet.onFloor()) pet.hop(-520);
    store.set({ petsEdited: true });
    syncPets();
  },

  callPet(id) {
    const pet = world.pets.find((item) => item.id === id);
    if (!pet) return;
    const target = world.pointer.inside ? world.pointer.x : (world.bounds.left + world.bounds.right) / 2;
    if (pet.onFloor()) pet.start('walk', 8, { target, speed: 230 });
    pet.say('来啦来啦！', 1200);
  },

  async loadCustomImage(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('图片请控制在 10MB 以内'); return; }
    const url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = await loadImage(url);
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    store.set({ customImage: canvas.toDataURL('image/png') });
    app.customImage = await loadImage(store.settings.customImage);
    for (const pet of world.pets) if (pet.kind === 'custom') pet.image = app.customImage;
    toast('自定义形象已载入，可以召唤啦');
  },

  // ── chat ──

  async ask(text, pet = app.chatPartner()) {
    if (!pet || app.thinking) return;
    store.messages.push({ role: 'user', content: text });
    store.saveMessages();
    pet.touch();
    pet.thinking = true;
    app.thinking = true;
    renderChatList();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const history = store.messages.map(({ role, content }) => ({ role, content }));
      const { content } = await sendChat({ kind: pet.kind, affection: pet.affection, history, signal: controller.signal });
      store.messages.push({ role: 'assistant', content, pet: pet.kind });
      pet.say(content);
      pet.affection = Math.min(100, pet.affection + .5);
    } catch (error) {
      const reason = controller.signal.aborted ? '请求超时' : error.message;
      store.messages.push({ role: 'assistant', content: `连接没有成功：${reason}\n可以在「设置」里检查 API Key 和接口地址。`, pet: pet.kind });
      pet.say('呜…连接失败了，去设置里看看？');
    } finally {
      window.clearTimeout(timeout);
      pet.thinking = false;
      app.thinking = false;
      store.saveMessages();
      renderChatList();
    }
  },

  async summarizeClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return toast('剪贴板是空的');
      app.openApp('chat');
      return app.ask(`请帮我摘要这段剪贴板内容：\n${text.trim().slice(0, 3000)}`);
    } catch {
      return toast('没有拿到剪贴板权限');
    }
  },

  // ── focus timer ──

  startFocus(minutes) {
    app.focus.endsAt = Date.now() + minutes * 60000;
    app.applySettings();
    for (const pet of world.pets) if (pet.onFloor()) pet.start('sit', 3);
    app.mainPet()?.say(line(app.mainPet().kind, 'focusStart'), 2400);
    toast(`${minutes} 分钟专注开始`);
  },
  stopFocus(done = false) {
    app.focus.endsAt = 0;
    app.applySettings();
    if (done) {
      for (const pet of world.pets) if (pet.onFloor()) pet.start('dance', 5);
      app.mainPet()?.say(line(app.mainPet().kind, 'focusEnd'), 3000);
      play('chime', true);
      desktop?.notify?.('LumaPet', '专注完成！');
    }
    wm.rerender('tools');
  },

  // ── local agent bridge ──

  async agentAction(kind, target) {
    const map = {
      navigate: ['browser.navigate', { url: target }, '打开网页'],
      read: ['browser.read', {}, '读取当前网页'],
      screenshot: ['browser.screenshot', {}, '截取当前网页'],
      openUrl: ['system.open_url', { url: target }, '用系统浏览器打开链接'],
      activeWindow: ['system.active_window', {}, '读取当前窗口'],
      openApp: ['system.open_app', { app: target }, '打开安全白名单应用']
    };
    try {
      if (kind === 'connect') {
        const { data } = await agentRequest('/v1/capabilities');
        app.agent.connected = true;
        app.agent.result = `已连接：${(data.capabilities || []).length} 项本机能力可用`;
        return;
      }
      if (kind === 'approve') {
        if (!app.agent.pending?.id) return;
        const { data } = await agentRequest(`/v1/tasks/${app.agent.pending.id}/approve`, { method: 'POST', body: '{}' });
        app.agent.result = JSON.stringify(data.task?.result ?? data, null, 2);
        app.agent.pending = null;
        return;
      }
      const [action, args, summary] = map[kind] || [];
      if (!action) return;
      const { response, data } = await agentRequest('/v1/tasks', { method: 'POST', body: JSON.stringify({ action, args, summary }) });
      app.agent.connected = true;
      if (response.status === 202 || data.requiresApproval) {
        app.agent.pending = data.task;
        app.agent.result = `等待确认：${data.task.summary}`;
      } else {
        app.agent.result = JSON.stringify(data.task?.result ?? data, null, 2);
      }
    } catch (error) {
      app.agent.connected = false;
      app.agent.result = `失败：${error.message}`;
    }
  },

  exportConfig() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(store.exportConfig(), null, 2)], { type: 'application/json' }));
    link.download = `lumapet-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('配置已导出（不含 API Key）');
  },

  importConfig(file) {
    if (!file) return;
    file.text().then((text) => {
      store.importConfig(JSON.parse(text));
      spawnPets();
      wallpaper?.setTheme(store.settings.theme);
      app.applySettings();
      app.refreshApps();
      toast('配置已导入');
    }).catch(() => toast('配置文件格式不正确'));
  }
};

async function agentRequest(path, options = {}) {
  const response = await fetch(`${store.settings.agentUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(store.settings.agentToken ? { 'X-LumaPet-Agent-Token': store.settings.agentToken } : {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  return { response, data };
}

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

const bubbles = new Bubbles($('#bubble-layer'), app);
world.on('say', ({ pet, text, ms }) => bubbles.say(pet, text, ms));
world.on('sound', (name) => play(name, store.settings.sound));
world.on('affection', () => syncPets());
wm.onChange(() => document.body.classList.toggle('has-window', wm.list().some((win) => !win.minimized)));

function renderChatList() {
  const win = wm.windows.get('chat');
  if (win) APPS.chat.renderList(win.body, app);
}

function syncPets() {
  store.pets = world.pets.map((pet) => ({ kind: pet.kind, mode: pet.mode, affection: Math.round(pet.affection) }));
  store.savePets();
  renderTaskbar();
}

function spawnPets() {
  for (const pet of [...world.pets]) { bubbles.remove(pet); world.removePet(pet.id); }
  const list = platform === 'overlay' ? store.pets.slice(0, 1) : store.pets;
  list.forEach((saved, index) => {
    const width = world.bounds.right - world.bounds.left;
    const x = platform === 'overlay' ? world.bounds.right - 120 : world.bounds.left + width * (.35 + index * .18);
    world.addPet({ kind: saved.kind, mode: saved.mode, affection: saved.affection, scale: store.settings.scale, image: saved.kind === 'custom' ? app.customImage : null, x, y: world.bounds.top - 60 - index * 140, vx: (Math.random() - .5) * 200 });
  });
}

// ───────────────────────── layout / bounds ─────────────────────────

function taskbarHeight() {
  const bar = $('#taskbar');
  return bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
}

function resize() {
  const ratio = Math.min(maxRatio, window.devicePixelRatio || 1);
  petCanvas.width = Math.round(window.innerWidth * ratio);
  petCanvas.height = Math.round(window.innerHeight * ratio);
  petCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (platform === 'overlay') {
    const screen = readAndroidScreen();
    overlay.w = window.innerWidth;
    overlay.h = window.innerHeight;
    world.setBounds({ left: 0, top: 24, right: screen.w, bottom: screen.h - 56 });
  } else {
    world.setBounds({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight - taskbarHeight() });
  }
}

function readAndroidScreen() {
  try {
    const info = JSON.parse(android.screenInfo());
    if (info.w > 0 && info.h > 0) return info;
  } catch {
    // Fall through to the page size.
  }
  return { w: window.screen.width, h: window.screen.height };
}

// ───────────────────────── taskbar & start menu ─────────────────────────

const START_APPS = ['chat', 'wardrobe', 'themes', 'settings', 'tools', 'about'];

function renderTaskbar() {
  const bar = $('#taskbar');
  if (!bar || platform === 'windows' || platform === 'overlay') return;
  const config = providerConfig();
  const running = wm.list();
  bar.innerHTML = `
    <button type="button" class="start-btn" data-start aria-label="开始菜单"><span class="logo-orb">✦</span><b>LumaPet</b></button>
    <div class="task-apps">${running.map((win) => `<button type="button" class="task-app ${win.focused && !win.minimized ? 'on' : ''} ${win.minimized ? 'min' : ''}" data-task="${win.id}" title="${esc(win.title)}"><span>${win.icon}</span><b>${esc(win.title)}</b></button>`).join('')}</div>
    <div class="task-tray">
      <button type="button" data-feed title="投喂">🍙</button>
      <button type="button" data-ball class="${world.balls.length ? 'on' : ''}" title="扔个球">⚽</button>
      <button type="button" data-follow class="${store.settings.follow ? 'on' : ''}" title="跟着鼠标">🧲</button>
      <button type="button" data-next-theme title="换主题">${THEMES[store.settings.theme]?.emoji || '🎨'}</button>
      <button type="button" class="provider-dot" data-open-app="settings" title="${esc(config.name)}${isLive() ? '' : '（演示模式）'}"><i style="background:${config.color}"></i><span>${esc(config.name)}</span></button>
      <time data-clock>${clock()}</time>
    </div>`;
  bar.querySelector('[data-start]').addEventListener('click', (event) => { event.stopPropagation(); toggleStart(); });
  bar.querySelectorAll('[data-task]').forEach((button) => button.addEventListener('click', () => {
    const spec = APPS[button.dataset.task];
    wm.toggle(button.dataset.task, { title: spec.title, icon: spec.icon, width: spec.width, height: spec.height, render: (body) => spec.render(body, app) });
  }));
  bar.querySelector('[data-feed]').addEventListener('click', feed);
  bar.querySelector('[data-ball]').addEventListener('click', toggleBall);
  bar.querySelector('[data-follow]').addEventListener('click', () => { store.set({ follow: !store.settings.follow }); app.applySettings(); toast(store.settings.follow ? '桌宠会跟着你的鼠标走' : '桌宠自由活动'); });
  bar.querySelector('[data-next-theme]').addEventListener('click', () => {
    const ids = Object.keys(THEMES);
    app.setTheme(ids[(ids.indexOf(store.settings.theme) + 1) % ids.length]);
  });
  bar.querySelector('[data-open-app]').addEventListener('click', () => app.openApp('settings'));
}

function clock() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function toggleStart(force) {
  const menu = $('#start-menu');
  const open = force ?? menu.hidden;
  closeMenus();
  if (!open) return;
  const pet = app.mainPet();
  const c = CHARACTERS[pet?.kind] || CHARACTERS.claude;
  const hour = new Date().getHours();
  const hello = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 19 ? '下午好' : '晚上好';
  menu.innerHTML = `
    <div class="start-head">
      <span class="start-avatar" style="--c:${c.accent}">${c.emoji}</span>
      <div><b>${hello}！</b><small>${esc(c.name)} 和 ${world.pets.length - 1 > 0 ? `另外 ${world.pets.length - 1} 位伙伴` : '你'}在桌面上 · 亲密度 ${Math.round(pet?.affection || 0)}</small></div>
    </div>
    <div class="start-grid">${START_APPS.map((id) => `<button type="button" data-app="${id}"><span>${APPS[id].icon}</span><b>${APPS[id].title}</b></button>`).join('')}</div>
    <div class="start-section"><small>大家一起</small><div class="start-actions">
      <button type="button" data-all="dance">💃 跳舞</button>
      <button type="button" data-all="jump">🦘 跳起来</button>
      <button type="button" data-all="sleep">😴 睡觉</button>
      <button type="button" data-all="climb">🧗 爬墙</button>
      ${android && platform === 'android' ? '<button type="button" data-android-overlay>📱 放到手机桌面</button>' : ''}
    </div></div>
    <div class="start-themes">${Object.entries(THEMES).map(([id, theme]) => `<button type="button" class="${store.settings.theme === id ? 'on' : ''}" data-theme="${id}" title="${theme.name}" style="--preview:${theme.preview}"></button>`).join('')}</div>`;
  menu.hidden = false;
  menu.querySelectorAll('[data-app]').forEach((button) => button.addEventListener('click', () => app.openApp(button.dataset.app)));
  menu.querySelectorAll('[data-all]').forEach((button) => button.addEventListener('click', () => { world.pets.forEach((p, i) => window.setTimeout(() => p.react(button.dataset.all), i * 180)); closeMenus(); }));
  menu.querySelectorAll('[data-theme]').forEach((button) => button.addEventListener('click', () => { app.setTheme(button.dataset.theme); toggleStart(true); }));
  menu.querySelector('[data-android-overlay]')?.addEventListener('click', () => { closeMenus(); startAndroidOverlay(); });
}

function startAndroidOverlay() {
  try {
    const result = android.startOverlay();
    toast(result === 'permission' ? '请允许「显示在其他应用上层」，然后再点一次' : '桌宠已经跑到手机桌面上啦');
  } catch {
    toast('这个版本的安卓壳还不支持悬浮桌宠');
  }
}

// ───────────────────────── desktop icons ─────────────────────────

const ICONS = [
  { id: 'chat', icon: '💬', label: '聊天' },
  { id: 'wardrobe', icon: '👗', label: '角色衣柜' },
  { id: 'themes', icon: '🎨', label: '主题工坊' },
  { id: 'tools', icon: '🧰', label: '工具箱' },
  { id: 'settings', icon: '⚙️', label: '设置' },
  { id: 'trash', icon: '🗑️', label: '回收站' }
];

function renderIcons() {
  const host = $('#desktop-icons');
  if (platform !== 'web' && platform !== 'android') return;
  host.innerHTML = ICONS.map((item) => `<button type="button" class="desk-icon interactive" data-icon="${item.id}" id="icon-${item.id}"><span>${item.icon}</span><b>${item.label}</b></button>`).join('');
  host.querySelectorAll('[data-icon]').forEach((button) => {
    button.addEventListener('click', () => {
      host.querySelectorAll('.desk-icon').forEach((other) => other.classList.toggle('selected', other === button));
      // Single tap opens on touch devices; double-click on desktop.
      if (matchMedia('(pointer: coarse)').matches) openIcon(button.dataset.icon);
    });
    button.addEventListener('dblclick', () => openIcon(button.dataset.icon));
  });
}

function openIcon(id) {
  if (id === 'trash') {
    const bin = $('#icon-trash');
    bin.classList.add('shake');
    window.setTimeout(() => bin.classList.remove('shake'), 500);
    toast('回收站是空的。试试把桌宠拖进来？');
    return;
  }
  app.openApp(id);
}

// ───────────────────────── context menu ─────────────────────────

function closeMenus() {
  $('#start-menu').hidden = true;
  $('#ctx-menu').hidden = true;
}

function showMenu(x, y, items) {
  const menu = $('#ctx-menu');
  menu.innerHTML = items.map((item) => item === '-' ? '<hr />' : `<button type="button" role="menuitem" data-key="${item.key}" ${item.disabled ? 'disabled' : ''}><span>${item.icon}</span>${esc(item.label)}</button>`).join('');
  menu.hidden = false;
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - rect.height - 8)}px`;
  menu.querySelectorAll('[data-key]').forEach((button) => button.addEventListener('click', () => {
    closeMenus();
    items.find((item) => item.key === button.dataset.key)?.run();
  }));
}

function petMenu(pet, x, y) {
  const name = app.characterName(pet);
  showMenu(x, y, [
    { key: 'chat', icon: '💬', label: `和 ${name} 聊天`, run: () => bubbles.input(pet) },
    { key: 'window', icon: '🗨️', label: '打开聊天窗口', run: () => { app.chatPartnerId = pet.id; app.openApp('chat'); } },
    '-',
    { key: 'feed', icon: '🍙', label: '投喂', run: () => feed(pet.x) },
    { key: 'dance', icon: '💃', label: '跳个舞', run: () => pet.react('dance') },
    { key: 'climb', icon: '🧗', label: '去爬墙', run: () => pet.react('climb'), disabled: !pet.onFloor() },
    { key: 'sit', icon: '🪑', label: '坐一会儿', run: () => pet.react('sit') },
    { key: 'sleep', icon: '😴', label: '睡一觉', run: () => pet.react('sleep') },
    '-',
    { key: 'wardrobe', icon: '👗', label: '角色衣柜', run: () => app.openApp('wardrobe') },
    { key: 'themes', icon: '🎨', label: '主题工坊', run: () => app.openApp('themes') },
    { key: 'settings', icon: '⚙️', label: '设置', run: () => app.openApp('settings') },
    ...(platform === 'windows' ? [{ key: 'tools', icon: '🧰', label: '工具箱', run: () => app.openApp('tools') }] : []),
    { key: 'bye', icon: '👋', label: `送走 ${name}`, run: () => app.removePet(pet.id), disabled: world.pets.length <= 1 },
    ...(platform === 'windows' ? ['-', { key: 'quit', icon: '⏻', label: '退出 LumaPet', run: () => desktop.quit?.() }] : [])
  ]);
}

function desktopMenu(x, y) {
  showMenu(x, y, [
    { key: 'feed', icon: '🍙', label: '在这里投喂', run: () => feed(x) },
    { key: 'ball', icon: '⚽', label: world.balls.length ? '收起球' : '扔个球', run: toggleBall },
    { key: 'call', icon: '📣', label: '大家过来', run: () => world.pets.forEach((pet) => { if (pet.onFloor()) pet.start('walk', 8, { target: x + (Math.random() - .5) * 160, speed: 220 }); }) },
    '-',
    { key: 'themes', icon: '🎨', label: '主题工坊', run: () => app.openApp('themes') },
    { key: 'wardrobe', icon: '👗', label: '角色衣柜', run: () => app.openApp('wardrobe') },
    { key: 'about', icon: '✨', label: '关于 LumaPet', run: () => app.openApp('about') }
  ]);
}

// ───────────────────────── toys ─────────────────────────

const FOODS = ['🍙', '🍓', '🍪', '🍰', '🍡', '🍣', '🧁', '🍤', '🍑'];

function feed(x) {
  const pet = app.mainPet();
  const at = typeof x === 'number' ? x : (pet?.x ?? (world.bounds.left + world.bounds.right) / 2) + (Math.random() - .5) * 300;
  world.dropFood(at, FOODS[Math.floor(Math.random() * FOODS.length)]);
  play('pop', store.settings.sound);
}

function toggleBall() {
  const on = world.toggleBall();
  toast(on ? '⚽ 球来啦！拖住球也可以扔' : '球收起来了');
  renderTaskbar();
}

// ───────────────────────── toast ─────────────────────────

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove('show'), 2600);
}

// ───────────────────────── pointer input ─────────────────────────

let press = null;
let lastClick = { pet: null, at: 0 };
let clickTimer = 0;
let ignoringMouse = null;

function worldPoint(event) {
  return platform === 'overlay' ? { x: event.clientX + overlay.x, y: event.clientY + overlay.y } : { x: event.clientX, y: event.clientY };
}

function setClickThrough(ignore) {
  if (!desktop || ignoringMouse === ignore) return;
  ignoringMouse = ignore;
  desktop.setIgnoreMouse(ignore);
}

window.addEventListener('pointerdown', (event) => {
  const point = worldPoint(event);
  if (!event.target.closest?.('#start-menu, #ctx-menu, [data-start]')) closeMenus();
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  const hit = world.hitTest(point.x, point.y);
  if (!hit) return;
  event.preventDefault();
  event.stopPropagation();
  press = { hit, x: point.x, y: point.y, dragging: false, id: event.pointerId };
  setClickThrough(false);
  if (event.pointerType !== 'mouse' && hit.type === 'pet') {
    press.longPress = window.setTimeout(() => {
      if (press && !press.dragging) {
        const pet = hit.ref;
        press = null;
        if (platform === 'overlay') openAndroidApp();
        else petMenu(pet, event.clientX, event.clientY);
      }
    }, 550);
  }
}, { capture: true });

window.addEventListener('pointermove', (event) => {
  const point = worldPoint(event);
  world.pointerMove(point.x, point.y, Boolean(press));
  if (press) {
    if (!press.dragging && Math.hypot(point.x - press.x, point.y - press.y) > 6) {
      press.dragging = true;
      window.clearTimeout(press.longPress);
      if (press.hit.type === 'pet') press.hit.ref.grab(point.x, point.y);
      else world.held = press.hit.ref;
      document.body.classList.add('grabbing');
    }
    if (press.dragging) {
      if (press.hit.type === 'pet') press.hit.ref.dragTo(point.x, point.y, performance.now());
      else {
        const ball = press.hit.ref;
        ball.vx = (point.x - ball.x) / .016;
        ball.vy = (point.y - ball.y) / .016;
        ball.x = point.x;
        ball.y = point.y;
      }
    }
    return;
  }
  if (desktop) {
    const over = world.hitTest(point.x, point.y) || document.elementFromPoint(event.clientX, event.clientY)?.closest('.interactive');
    setClickThrough(!over);
  }
  document.body.classList.toggle('over-pet', Boolean(world.hitTest(point.x, point.y)));
});

window.addEventListener('pointerup', (event) => {
  if (!press) return;
  const current = press;
  press = null;
  window.clearTimeout(current.longPress);
  document.body.classList.remove('grabbing');
  if (current.dragging) {
    if (current.hit.type === 'pet') {
      const pet = current.hit.ref;
      pet.release();
      maybeTrash(pet, event);
    } else {
      const ball = current.hit.ref;
      world.held = null;
      ball.vx = Math.max(-2400, Math.min(2400, ball.vx * .5));
      ball.vy = Math.max(-2400, Math.min(2400, ball.vy * .5));
    }
    return;
  }
  if (current.hit.type !== 'pet') return;
  const pet = current.hit.ref;
  const now = performance.now();
  if (lastClick.pet === pet && now - lastClick.at < 340) {
    window.clearTimeout(clickTimer);
    lastClick = { pet: null, at: 0 };
    if (platform === 'overlay') openAndroidApp();
    else bubbles.input(pet);
    return;
  }
  lastClick = { pet, at: now };
  clickTimer = window.setTimeout(() => pet.react('click'), 260);
});

window.addEventListener('pointercancel', () => {
  if (press?.dragging && press.hit.type === 'pet') press.hit.ref.release();
  world.held = null;
  press = null;
  document.body.classList.remove('grabbing');
});

window.addEventListener('pointerleave', () => { world.pointer.inside = false; });
document.addEventListener('mouseleave', () => { world.pointer.inside = false; });

window.addEventListener('contextmenu', (event) => {
  const point = worldPoint(event);
  const hit = world.hitTest(point.x, point.y);
  if (hit?.type === 'pet') {
    event.preventDefault();
    petMenu(hit.ref, event.clientX, event.clientY);
  } else if ((platform === 'web' || platform === 'android') && (event.target.id === 'wallpaper' || event.target.id === 'desktop-icons' || event.target === document.body || event.target.id === 'app')) {
    event.preventDefault();
    desktopMenu(event.clientX, event.clientY);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenus();
  const typing = event.target.closest?.('input, textarea, select, [contenteditable]');
  if (event.key === '/' && !typing) {
    event.preventDefault();
    const pet = app.mainPet();
    if (pet) bubbles.input(pet);
  }
});

function maybeTrash(pet, event) {
  const bin = $('#icon-trash');
  if (!bin || platform === 'windows') return;
  const rect = bin.getBoundingClientRect();
  if (event.clientX < rect.left - 10 || event.clientX > rect.right + 10 || event.clientY < rect.top - 10 || event.clientY > rect.bottom + 10) return;
  pet.hidden = true;
  bin.classList.add('shake', 'full');
  play('thud', store.settings.sound);
  window.setTimeout(() => {
    bin.classList.remove('shake', 'full');
    pet.hidden = false;
    pet.surface = null;
    pet.action = 'fall';
    pet.x = rect.left + rect.width / 2 + pet.size.w / 2 + 10;
    pet.y = rect.top + rect.height / 2;
    pet.vx = 260;
    pet.vy = -980;
    pet.data = { thrown: false };
    pet.say(line(pet.kind, 'trash'), 2200);
  }, 2200);
}

function openAndroidApp() {
  try { android.openApp(); } catch { /* bridge missing */ }
}

// ───────────────────────── Windows shell glue ─────────────────────────

if (desktop) {
  desktop.onCommand?.((command) => {
    if (APPS[command]) app.openApp(command);
    else if (command === 'quick-chat') { const pet = app.mainPet(); if (pet) { setClickThrough(false); bubbles.input(pet); } }
    else if (command === 'feed') feed();
    else if (command === 'ball') toggleBall();
    else if (command.startsWith('theme:')) app.setTheme(command.slice(6));
    else if (command.startsWith('all:')) world.pets.forEach((pet) => pet.react(command.slice(4)));
    else if (command === 'toggle-quiet') { store.set({ quiet: !store.settings.quiet }); app.applySettings(); toast(store.settings.quiet ? '专注勿扰已开启' : '专注勿扰已关闭'); }
    else if (command.startsWith('summon:')) app.addPet(command.slice(7));
  });
  // Keep the windows from losing clicks while a menu or input is open.
  wm.onChange(() => setClickThrough(false));
}

// ───────────────────────── main loop ─────────────────────────

let last = performance.now();
let lastSave = 0;

function frame(now) {
  // rAF timestamps can precede the last performance.now() reading.
  const dt = Math.max(0, Math.min(.05, (now - last) / 1000));
  last = now;
  const t = now / 1000;
  if (platform !== 'overlay') world.setPlatforms(wm.platforms());
  world.update(dt, t);
  wallpaper?.tick(now);

  petCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  if (platform === 'overlay') {
    const pet = world.pets[0];
    if (pet) {
      const center = pet.toWorld(0, -pet.size.h / 2);
      overlay.x = Math.round(center.x - overlay.w / 2);
      overlay.y = Math.round(center.y - overlay.h * .6);
      if (overlay.x !== overlay.sentX || overlay.y !== overlay.sentY) {
        overlay.sentX = overlay.x;
        overlay.sentY = overlay.y;
        try { android.moveTo(overlay.x, overlay.y); } catch { /* bridge missing */ }
      }
    }
    petCtx.save();
    petCtx.translate(-overlay.x, -overlay.y);
    world.draw(petCtx, t);
    petCtx.restore();
  } else {
    world.draw(petCtx, t);
  }

  if (app.focus.endsAt) {
    const left = app.focus.endsAt - Date.now();
    if (left <= 0) app.stopFocus(true);
    else {
      const pet = app.mainPet();
      if (pet) bubbles.timer(pet, fmt(left));
      const label = document.querySelector('[data-focus-left]');
      if (label) label.textContent = fmt(left);
    }
  }
  bubbles.update();

  if (now - lastSave > 15000) {
    lastSave = now;
    syncPets();
    const clockEl = document.querySelector('[data-clock]');
    if (clockEl) clockEl.textContent = clock();
  }
  requestAnimationFrame(frame);
}

// ───────────────────────── boot ─────────────────────────

async function boot() {
  if (store.settings.customImage) app.customImage = await loadImage(store.settings.customImage).catch(() => null);
  applyTheme(store.settings.theme, document.documentElement, store.settings.accent);
  wallpaper?.setTheme(store.settings.theme);
  renderIcons();
  renderTaskbar();
  resize();
  app.applySettings();
  spawnPets();
  window.addEventListener('resize', () => { resize(); renderTaskbar(); });
  requestAnimationFrame(frame);
  window.setTimeout(() => {
    const pet = app.mainPet();
    if (!pet) return;
    if (!store.settings.onboarded && platform !== 'overlay') {
      const touch = matchMedia('(pointer: coarse)').matches;
      pet.say(platform === 'windows' ? '我住到你的桌面上啦！拖我、扔我、摸摸头，双击和我聊天，右键有菜单～' : `欢迎来到 LumaPet！拖我、扔我、摸摸头都可以，双击和我聊天，${touch ? '长按' : '右键'}有更多玩法～`, 7000);
      store.set({ onboarded: true });
    } else {
      pet.say(timeGreeting(pet.kind), 3200);
    }
  }, 1600);
  if (platform !== 'overlay' && 'serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env?.PROD) {
    navigator.serviceWorker.register(`${APP_BASE}sw.js`).catch(() => {});
  }
}

boot();
