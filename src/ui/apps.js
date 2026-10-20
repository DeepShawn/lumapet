import { CHARACTERS, drawThumbnail } from '../pet/characters.js';
import { THEMES } from '../themes.js';
import { PROVIDERS, providerConfig, isLive } from '../chat.js';
import { store } from '../store.js';

export const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const toggle = (key, label, hint) => `
  <label class="row toggle-row">
    <span><b>${label}</b><small>${hint}</small></span>
    <input type="checkbox" class="switch" data-setting="${key}" ${store.settings[key] ? 'checked' : ''} />
  </label>`;

function bindToggles(body, app) {
  body.querySelectorAll('[data-setting]').forEach((input) => input.addEventListener('change', () => {
    store.set({ [input.dataset.setting]: input.checked });
    app.applySettings();
  }));
}

// ───────────────────────── chat ─────────────────────────

export const APPS = {
  chat: {
    title: '聊天', icon: '💬', width: 400, height: 560,
    render(body, app) {
      const config = providerConfig();
      const pets = app.world.pets;
      const partner = app.chatPartner();
      body.innerHTML = `
        <div class="chat">
          <div class="chat-head">
            <label class="chip-select"><span>和</span><select data-chat-pet>${pets.map((pet) => `<option value="${pet.id}" ${pet === partner ? 'selected' : ''}>${esc(CHARACTERS[pet.kind].emoji)} ${esc(CHARACTERS[pet.kind].name)}</option>`).join('')}</select></label>
            <button type="button" class="chip" data-open="settings"><i style="background:${config.color}"></i>${esc(config.name)} · ${isLive() ? esc(config.model) : '演示模式'}</button>
          </div>
          <div class="chat-list" data-chat-list></div>
          <div class="chat-quick">
            ${['讲个冷笑话', '给我一句鼓励', '帮我规划今天', '总结剪贴板'].map((q) => `<button type="button" data-quick="${q}">${q}</button>`).join('')}
          </div>
          <form class="chat-form" data-chat-form>
            <textarea rows="1" maxlength="4000" placeholder="和 ${esc(CHARACTERS[partner?.kind]?.name || '桌宠')} 说点什么…（Enter 发送）"></textarea>
            <button type="submit" class="send" aria-label="发送">➤</button>
          </form>
        </div>`;
      APPS.chat.renderList(body, app);
      const form = body.querySelector('[data-chat-form]');
      const input = form.querySelector('textarea');
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); }
      });
      input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(120, input.scrollHeight)}px`; });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        app.ask(text);
      });
      body.querySelector('[data-chat-pet]').addEventListener('change', (event) => { app.chatPartnerId = event.target.value; APPS.chat.render(body, app); });
      body.querySelectorAll('[data-quick]').forEach((button) => button.addEventListener('click', () => {
        if (button.dataset.quick === '总结剪贴板') app.summarizeClipboard();
        else app.ask(button.dataset.quick);
      }));
      body.querySelector('[data-open]').addEventListener('click', () => app.openApp('settings'));
      window.setTimeout(() => input.focus(), 50);
    },
    renderList(body, app) {
      const list = body.querySelector('[data-chat-list]');
      if (!list) return;
      const messages = store.messages;
      list.innerHTML = messages.length ? messages.map((message) => {
        const character = CHARACTERS[message.pet] || CHARACTERS.claude;
        return message.role === 'user'
          ? `<div class="msg user"><p>${esc(message.content).replace(/\n/g, '<br>')}</p></div>`
          : `<div class="msg pet"><span class="avatar">${esc(character.emoji)}</span><p>${esc(message.content).replace(/\n/g, '<br>')}</p></div>`;
      }).join('') : `<div class="chat-empty"><span>💬</span><p>双击桌面上的桌宠也能直接聊天哦。</p></div>`;
      if (app.thinking) list.insertAdjacentHTML('beforeend', '<div class="msg pet"><span class="avatar">✻</span><p class="typing"><i></i><i></i><i></i></p></div>');
      list.scrollTop = list.scrollHeight;
    }
  },

  // ───────────────────────── wardrobe ─────────────────────────

  wardrobe: {
    title: '角色衣柜', icon: '👗', width: 620, height: 560,
    render(body, app) {
      const pets = app.world.pets;
      body.innerHTML = `
        <div class="wardrobe">
          <section>
            <h4>桌面上的伙伴 <small>${pets.length}/4 · 拖动、扔、摸头、喂食都可以</small></h4>
            <div class="pet-list">${pets.map((pet) => {
              const c = CHARACTERS[pet.kind];
              const big = pet.kind === 'clawd' ? ['小只', '大只'] : ['Q 版', '成年'];
              return `<div class="pet-row">
                <span class="pet-emoji">${esc(c.emoji)}</span>
                <span class="pet-meta"><b>${esc(c.name)}</b><small>亲密度 ${'♥'.repeat(Math.ceil(pet.affection / 20)) || '♡'} ${Math.round(pet.affection)}</small></span>
                ${pet.kind === 'custom' ? '' : `<div class="seg"><button type="button" class="${pet.mode === 'chibi' ? 'on' : ''}" data-mode="chibi" data-pet="${pet.id}">${big[0]}</button><button type="button" class="${pet.mode === 'adult' ? 'on' : ''}" data-mode="adult" data-pet="${pet.id}">${big[1]}</button></div>`}
                <button type="button" class="ghost" data-call="${pet.id}">叫过来</button>
                <button type="button" class="ghost danger" data-remove="${pet.id}" ${pets.length <= 1 ? 'disabled' : ''}>送走</button>
              </div>`;
            }).join('')}</div>
          </section>
          <section>
            <h4>召唤新伙伴</h4>
            <div class="char-grid">${Object.entries(CHARACTERS).map(([kind, c]) => `
              <article class="char-card" style="--c:${c.accent}">
                <canvas data-thumb="${kind}"></canvas>
                <b>${esc(c.name)}</b>
                <small>${esc(c.blurb)}</small>
                ${kind === 'custom' ? `<label class="btn small"><input type="file" accept="image/png,image/webp,image/gif,image/jpeg" data-custom-upload hidden />${store.settings.customImage ? '更换图片' : '上传图片'}</label>` : ''}
                <button type="button" class="btn small primary" data-summon="${kind}" ${pets.length >= 4 || (kind === 'custom' && !store.settings.customImage) ? 'disabled' : ''}>召唤</button>
              </article>`).join('')}</div>
          </section>
          <section class="row">
            <span><b>桌宠大小</b><small>${Math.round(store.settings.scale * 100)}%</small></span>
            <input type="range" min="0.6" max="1.6" step="0.05" value="${store.settings.scale}" data-scale />
          </section>
        </div>`;
      body.querySelectorAll('[data-thumb]').forEach((canvas) => drawThumbnail(canvas, canvas.dataset.thumb, 'chibi', app.customImage));
      body.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => { app.setPetMode(button.dataset.pet, button.dataset.mode); APPS.wardrobe.render(body, app); }));
      body.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => { app.removePet(button.dataset.remove); APPS.wardrobe.render(body, app); }));
      body.querySelectorAll('[data-call]').forEach((button) => button.addEventListener('click', () => app.callPet(button.dataset.call)));
      body.querySelectorAll('[data-summon]').forEach((button) => button.addEventListener('click', () => { app.addPet(button.dataset.summon); APPS.wardrobe.render(body, app); }));
      body.querySelector('[data-scale]').addEventListener('input', (event) => { store.set({ scale: Number(event.target.value) }); app.applySettings(); event.target.closest('.row').querySelector('small').textContent = `${Math.round(store.settings.scale * 100)}%`; });
      body.querySelector('[data-custom-upload]')?.addEventListener('change', (event) => app.loadCustomImage(event.target.files?.[0]).then(() => APPS.wardrobe.render(body, app)));
    }
  },

  // ───────────────────────── themes ─────────────────────────

  themes: {
    title: '主题工坊', icon: '🎨', width: 560, height: 500,
    render(body, app) {
      body.innerHTML = `
        <div class="themes">
          <div class="theme-grid">${Object.entries(THEMES).map(([id, theme]) => `
            <button type="button" class="theme-card ${store.settings.theme === id ? 'on' : ''}" data-theme-pick="${id}" style="--preview:${theme.preview};--ta:${theme.vars.accent}">
              <span class="theme-preview"><i></i><i></i><i></i></span>
              <b>${theme.emoji} ${theme.name}</b>
            </button>`).join('')}</div>
          <div class="row">
            <span><b>强调色</b><small>${store.settings.accent ? '自定义' : '跟随主题'}</small></span>
            <span class="inline"><input type="color" value="${store.settings.accent || THEMES[store.settings.theme]?.vars.accent || '#8b7cff'}" data-accent />${store.settings.accent ? '<button type="button" class="ghost" data-accent-reset>重置</button>' : ''}</span>
          </div>
          ${app.platform === 'windows' ? '' : toggle('wallpaperMotion', '动态壁纸', '关闭可以省电')}
          ${toggle('bubbles', '对白气泡', '桌宠说话时在头顶冒泡')}
        </div>`;
      body.querySelectorAll('[data-theme-pick]').forEach((button) => button.addEventListener('click', () => { app.setTheme(button.dataset.themePick); APPS.themes.render(body, app); }));
      body.querySelector('[data-accent]').addEventListener('input', (event) => { store.set({ accent: event.target.value }); app.applySettings(); });
      body.querySelector('[data-accent-reset]')?.addEventListener('click', () => { store.set({ accent: '' }); app.applySettings(); APPS.themes.render(body, app); });
      bindToggles(body, app);
    }
  },

  // ───────────────────────── settings ─────────────────────────

  settings: {
    title: '设置', icon: '⚙️', width: 520, height: 600,
    render(body, app) {
      const id = app.settingsProvider || store.settings.provider;
      const config = providerConfig(id);
      body.innerHTML = `
        <div class="settings">
          <h4>AI 模型</h4>
          <div class="seg wide">${Object.values(PROVIDERS).map((p) => `<button type="button" class="${p.id === id ? 'on' : ''}" data-provider="${p.id}"><i style="background:${p.color}"></i>${p.name}</button>`).join('')}</div>
          <p class="hint">${esc(PROVIDERS[id].description)}${store.settings.provider === id ? ' · <b>当前使用</b>' : ''}</p>
          <form data-provider-form class="form">
            <label>模型<input name="model" value="${esc(config.model)}" autocomplete="off" /></label>
            <label>API Key<input name="apiKey" type="password" value="${esc(config.apiKey)}" placeholder="留空则使用演示模式" autocomplete="new-password" /></label>
            <label>请求方式<select name="transport"><option value="direct" ${config.transport === 'direct' ? 'selected' : ''}>设备直连（Key 只存在本机）</option><option value="proxy" ${config.transport === 'proxy' ? 'selected' : ''}>LumaPet 服务端代理（Key 在服务器）</option></select></label>
            <label>${id === 'claude' ? 'API 根地址' : '接口地址'}<input name="endpoint" value="${esc(config.endpoint)}" autocomplete="url" /></label>
            <label>代理访问令牌<input name="proxyToken" type="password" value="${esc(store.settings.proxyToken)}" placeholder="服务端设置了 LUMAPET_PROXY_TOKEN 时填写" autocomplete="off" /></label>
            <button type="submit" class="btn primary">保存并使用 ${esc(PROVIDERS[id].name)}</button>
          </form>
          <h4>桌宠行为</h4>
          ${toggle('quiet', '专注勿扰', '少说话、多坐着，不再到处乱跑')}
          ${toggle('chatter', '自言自语', '闲下来时偶尔说句话')}
          ${toggle('follow', '跟着鼠标', '桌宠会追着你的光标走')}
          ${toggle('sound', '音效', '点击、落地、吃东西的小音效')}
          <h4>数据</h4>
          <div class="btn-row">
            <button type="button" class="btn" data-export>导出配置</button>
            <label class="btn"><input type="file" accept="application/json" data-import hidden />导入配置</label>
            <button type="button" class="btn" data-clear-chat>清空聊天</button>
          </div>
          <p class="hint">设备直连时 API Key 只保存在这台设备的本地存储里；导出的配置文件不会包含 Key 和令牌。聊天内容只发送给你选择的模型服务商。</p>
        </div>`;
      body.querySelectorAll('[data-provider]').forEach((button) => button.addEventListener('click', () => { app.settingsProvider = button.dataset.provider; APPS.settings.render(body, app); }));
      body.querySelector('[data-provider-form]').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = new FormData(event.target);
        store.providers[id] = { model: String(data.get('model')).trim() || PROVIDERS[id].model, apiKey: String(data.get('apiKey')).trim(), transport: data.get('transport') === 'proxy' ? 'proxy' : 'direct', endpoint: String(data.get('endpoint')).trim() || PROVIDERS[id].endpoint };
        store.saveProviders();
        store.set({ provider: id, proxyToken: String(data.get('proxyToken')).trim() });
        app.toast(`已切换到 ${PROVIDERS[id].name}${isLive(id) ? '' : '（演示模式）'}`);
        app.refreshApps();
      });
      bindToggles(body, app);
      body.querySelector('[data-export]').addEventListener('click', () => app.exportConfig());
      body.querySelector('[data-import]').addEventListener('change', (event) => app.importConfig(event.target.files?.[0]));
      body.querySelector('[data-clear-chat]').addEventListener('click', () => { store.messages = []; store.saveMessages(); app.refreshApps(); app.toast('聊天已清空'); });
    }
  },

  // ───────────────────────── tools ─────────────────────────

  tools: {
    title: '工具箱', icon: '🧰', width: 520, height: 560,
    render(body, app) {
      const focus = app.focus;
      const agent = app.agent;
      body.innerHTML = `
        <div class="tools">
          <section class="tool-card">
            <h4>⏱ 专注时钟</h4>
            ${focus.endsAt > Date.now()
              ? `<div class="focus-live"><b data-focus-left>${fmt(focus.endsAt - Date.now())}</b><button type="button" class="btn" data-focus-stop>结束专注</button></div>`
              : `<div class="btn-row">${[15, 25, 45].map((m) => `<button type="button" class="btn" data-focus="${m}">${m} 分钟</button>`).join('')}</div>`}
            <p class="hint">专注期间桌宠会安静地坐着陪你，倒计时显示在它头顶。</p>
          </section>
          <section class="tool-card">
            <h4>📋 剪贴板摘要</h4>
            <div class="btn-row"><button type="button" class="btn" data-clip>读取剪贴板并总结</button></div>
          </section>
          <section class="tool-card">
            <h4>🦾 本机任务代理 <span class="pill ${agent.connected ? 'on' : ''}">${agent.connected ? '已连接' : '未连接'}</span></h4>
            <p class="hint">运行 <code>npm run agent</code> 后，桌宠可以帮你打开网页、读取页面、截图。写操作会先等你批准。</p>
            <div class="form two">
              <label>代理地址<input data-agent-url value="${esc(store.settings.agentUrl)}" /></label>
              <label>令牌<input data-agent-token type="password" value="${esc(store.settings.agentToken)}" placeholder="本机可留空" /></label>
            </div>
            <label class="form">目标网址 / 应用<input data-agent-target placeholder="https://example.com 或 calculator" /></label>
            <div class="btn-row wrap">
              <button type="button" class="btn" data-agent="connect">连接</button>
              <button type="button" class="btn" data-agent="openUrl">浏览器打开</button>
              <button type="button" class="btn" data-agent="navigate">受控网页</button>
              <button type="button" class="btn" data-agent="read">读取网页</button>
              <button type="button" class="btn" data-agent="screenshot">截图</button>
              <button type="button" class="btn" data-agent="activeWindow">当前窗口</button>
              <button type="button" class="btn" data-agent="openApp">打开应用</button>
            </div>
            ${agent.pending ? `<div class="approve"><span>等待确认：${esc(agent.pending.summary || agent.pending.action)}</span><button type="button" class="btn primary" data-agent="approve">允许一次</button></div>` : ''}
            <pre class="agent-out">${esc(agent.result || '连接后选择一个动作。')}</pre>
          </section>
        </div>`;
      body.querySelectorAll('[data-focus]').forEach((button) => button.addEventListener('click', () => { app.startFocus(Number(button.dataset.focus)); APPS.tools.render(body, app); }));
      body.querySelector('[data-focus-stop]')?.addEventListener('click', () => { app.stopFocus(); APPS.tools.render(body, app); });
      body.querySelector('[data-clip]').addEventListener('click', () => app.summarizeClipboard());
      body.querySelectorAll('[data-agent]').forEach((button) => button.addEventListener('click', async () => {
        store.set({ agentUrl: body.querySelector('[data-agent-url]').value.trim() || store.settings.agentUrl, agentToken: body.querySelector('[data-agent-token]').value.trim() });
        await app.agentAction(button.dataset.agent, body.querySelector('[data-agent-target]').value.trim());
        APPS.tools.render(body, app);
      }));
    }
  },

  // ───────────────────────── about ─────────────────────────

  about: {
    title: '关于 LumaPet', icon: '✨', width: 440, height: 520,
    render(body, app) {
      body.innerHTML = `
        <div class="about">
          <div class="about-hero"><span class="logo-orb">✦</span><div><h3>LumaPet</h3><small>AI 桌宠 · v0.2</small></div></div>
          <ul class="tips">
            <li><b>拖住</b> 桌宠可以拎起来，<b>甩出去</b> 它会飞，撞墙会晕</li>
            <li><b>来回摸头</b> 会害羞冒爱心，亲密度上升</li>
            <li><b>双击</b> 直接聊天，<b>右键</b>（手机上长按）打开菜单</li>
            <li>扔到墙上可能会 <b>爬墙</b>，Clawd 还会倒挂在天花板上</li>
            <li>打开的窗口顶上可以 <b>站人</b>，拖窗口能载着它走</li>
            <li>任务栏里可以 <b>投喂</b> 和 <b>扔球</b></li>
            ${app.platform === 'windows' ? '<li>托盘图标可以随时召唤聊天和设置，<b>Alt+L</b> 快速聊天</li>' : '<li>按 <b>/</b> 键可以快速和桌宠说话</li>'}
          </ul>
          <p class="hint">Claude 娘 / GPT 娘 / DeepSeek 娘均为 Canvas 原创绘制的同人形象；Clawd 是 Anthropic 的 Claude Code 吉祥物同人像素画。</p>
        </div>`;
    }
  }
};

export function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
