(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))l(n);new MutationObserver(n=>{for(const d of n)if(d.type==="childList")for(const b of d.addedNodes)b.tagName==="LINK"&&b.rel==="modulepreload"&&l(b)}).observe(document,{childList:!0,subtree:!0});function c(n){const d={};return n.integrity&&(d.integrity=n.integrity),n.referrerPolicy&&(d.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?d.credentials="include":n.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function l(n){if(n.ep)return;n.ep=!0;const d=c(n);fetch(n.href,d)}})();const v={cloudgpt:{id:"cloudgpt",name:"Cloud GPT",shortName:"GPT",color:"#a78bfa",model:"gpt-4o-mini",endpoint:"https://api.openai.com/v1/chat/completions",transport:"direct",description:"适合通用对话、写作与多模态工作流"},deepseek:{id:"deepseek",name:"DeepSeek",shortName:"DS",color:"#55a8ff",model:"deepseek-chat",endpoint:"https://api.deepseek.com/chat/completions",transport:"direct",description:"适合中文对话、推理与代码助手"}},M={gpt:{name:"GPT 娘",eyebrow:"Cloud GPT",adult:"/references/gpt-reference.jpg",child:"/references/gpt-reference.jpg",objectAdult:"20% 50%",objectChild:"80% 50%",emoji:"✦",line:"紫雾龙角与柔光魔法"},deepseek:{name:"DeepSeek 娘",eyebrow:"DeepSeek",adult:"/references/deepseek-reference.jpg",child:"/references/deepseek-reference.jpg",objectAdult:"20% 50%",objectChild:"80% 50%",emoji:"◈",line:"深海蓝与小小鱼尾"}},W={aurora:"linear-gradient(140deg, #211c42 0%, #29234d 45%, #183b48 100%)",night:"radial-gradient(circle at 25% 10%, #3e2b65 0, #17152a 50%, #0c0d17 100%)",paper:"linear-gradient(140deg, #fffaf2 0%, #f2e8de 100%)",custom:""},L={settings:"lumapet.settings.v1",providerConfigs:"lumapet.provider-configs.v1",messages:"lumapet.messages.v1"},R=(t,a)=>{try{return JSON.parse(localStorage.getItem(t))??a}catch{return a}},O=(t,a)=>{try{localStorage.setItem(t,JSON.stringify(a))}catch{}},w=R(L.settings,{}),f=R(L.providerConfigs,{}),D=R(L.messages,[]),K=new URL(window.location.href),e={platform:K.searchParams.get("platform")||"web",provider:w.provider||"cloudgpt",petMode:w.petMode||"chibi",preset:w.preset||"gpt",background:w.background||"aurora",customBackground:w.customBackground||"",accent:w.accent||"#a78bfa",size:Number(w.size||1),bubble:w.bubble!==!1,motion:w.motion!==!1,focusEndsAt:0,focusTimer:null,isThinking:!1,petMood:"在线",customImage:w.customImage||"",messages:Array.isArray(D)&&D.length?D:[{role:"assistant",content:"晚上好，我是 LumaPet。选一个模型，给我一句话，我们就可以开始。"},{role:"assistant",content:"你也可以在右侧换背景、上传参考图，做一只只属于你的桌宠。",meta:"小提示"}]},J=document.querySelector("#app");let U=!1;function i(t=""){return String(t).replace(/[&<>'"]/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[a])}function C(t=e.provider){return{...v[t]||v.cloudgpt,...f[t]||{}}}function A(){return M[e.preset]||M.gpt}function N(){return e.customImage?e.customImage:e.petMode==="adult"?A().adult:A().child}function Q(){if(e.customImage)return"50% 50%";const t=A();return e.petMode==="adult"?t.objectAdult:t.objectChild}function V(){return e.customImage?"object-position:50% 50%;":`width:200%;max-width:none;object-fit:cover;object-position:center;transform:translateX(${e.petMode==="adult"?"0":"-50%"});`}function g(){O(L.settings,{provider:e.provider,petMode:e.petMode,preset:e.preset,background:e.background,customBackground:e.customBackground,accent:e.accent,size:e.size,bubble:e.bubble,motion:e.motion,customImage:e.customImage})}function T(){O(L.messages,e.messages.slice(-30))}function X(){e.messages=[{role:"assistant",content:`聊天已清空。${A().name} 随时可以重新开始。`,meta:"新的开始"}],T(),p(),m("对话已清空")}function Y(){const t=Object.fromEntries(Object.entries(f).map(([l,n])=>[l,{model:n.model,endpoint:n.endpoint,transport:n.transport||"direct"}])),a={version:1,exportedAt:new Date().toISOString(),settings:{provider:e.provider,petMode:e.petMode,preset:e.preset,background:e.background,customBackground:e.customBackground,accent:e.accent,size:e.size,bubble:e.bubble,motion:e.motion},providerConfigs:t},c=document.createElement("a");c.href=URL.createObjectURL(new Blob([JSON.stringify(a,null,2)],{type:"application/json"})),c.download=`lumapet-config-${new Date().toISOString().slice(0,10)}.json`,c.click(),URL.revokeObjectURL(c.href),m("外观与接口配置已导出","success")}function Z(t){if(!t)return;const a=new FileReader;a.onload=()=>{try{const c=JSON.parse(a.result),l=c.settings||{};["provider","petMode","preset","background","customBackground","accent","size","bubble","motion"].forEach(n=>{l[n]!==void 0&&(e[n]=l[n])}),Object.entries(c.providerConfigs||{}).forEach(([n,d])=>{v[n]&&(f[n]={...f[n]||{},model:d.model||v[n].model,endpoint:d.endpoint||v[n].endpoint,transport:d.transport==="proxy"?"proxy":"direct"})}),O(L.providerConfigs,f),g(),P(),p(),m("配置已导入（API Key 保留本机原值）","success")}catch{m("配置文件格式不正确","error")}},a.readAsText(t)}function _(t){const a=Math.max(0,Math.ceil(t/1e3)),c=String(Math.floor(a/60)).padStart(2,"0"),l=String(a%60).padStart(2,"0");return`${c}:${l}`}function m(t,a="normal"){const c=document.querySelector("#toast");c&&(c.className=`toast show ${a}`,c.textContent=t,window.clearTimeout(m.timer),m.timer=window.setTimeout(()=>{c.className="toast"},2600))}function p(){var k,S;const t=C(),a=A(),c=e.background==="custom"&&e.customBackground?`url(${e.customBackground}) center/cover`:W[e.background],l=e.focusEndsAt>Date.now()?_(e.focusEndsAt-Date.now()):"开始专注",n=e.platform==="windows"?"Windows 浮窗":e.platform==="android"?"Android 悬浮":"Web 工作台",d=e.background==="paper";J.innerHTML=`
    <div class="app-shell ${d?"theme-light":""}" data-platform="${i(e.platform)}" style="--accent:${i(e.accent)};--stage-bg:${i(c)}">
      <header class="topbar">
        <a class="brand" href="?platform=${i(e.platform)}" aria-label="LumaPet 首页">
          <span class="brand-mark"><span></span><span></span><span></span></span>
          <span><strong>Luma<span>Pet</span></strong><small>AI companion OS</small></span>
        </a>
        <div class="topbar-center">
          <div class="platform-switch" role="tablist" aria-label="平台预览">
            ${["web","windows","android"].map(r=>`<button class="platform-tab ${e.platform===r?"active":""}" data-platform-tab="${r}" role="tab">${r==="web"?"Web":r==="windows"?"Windows":"Android"}</button>`).join("")}
          </div>
          <span class="platform-badge"><i></i>${n}</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-button" data-action="open-reference" title="参考图与角色">▧<span class="sr-only">角色参考图</span></button>
          <button class="icon-button" data-action="open-settings" title="API 设置">⚙<span class="sr-only">API 设置</span></button>
          <button class="avatar-button" data-action="open-settings">你</button>
        </div>
      </header>

      <main class="workspace">
        <section class="pet-column">
          <div class="section-kicker"><span class="live-dot"></span>桌宠空间 <span class="muted">/ ${i(a.eyebrow)}</span></div>
          <div class="pet-card">
            <div class="pet-card-head">
              <div><span class="eyebrow">${i(a.eyebrow)}</span><h1>${i(a.name)}</h1></div>
              <button class="ghost-button" data-action="pet-speak">${e.petMood==="在线"?"在看你":e.petMood}</button>
            </div>
            <div class="pet-stage" style="--pet-scale:${e.size};">
              <div class="stage-glow"></div>
              <div class="spark spark-a">✦</div><div class="spark spark-b">✧</div><div class="spark spark-c">·</div>
              ${e.bubble?`<div class="pet-bubble"><span>${e.isThinking?"正在思考…":e.petMood==="开心"?"收到啦！":"今天也要发光"}</span><i></i></div>`:""}
              <button class="pet-portrait ${e.motion?"float":""}" data-action="pet-speak" aria-label="点击 ${i(a.name)}">
                <img src="${i(N())}" alt="${i(a.name)} 参考形象" style="${i(V())}" />
                <span class="pet-glass"></span>
              </button>
              <div class="pet-nameplate"><span class="pet-orb">${i(a.emoji)}</span><span><b>${i(a.name)}</b><small>${e.petMode==="adult"?"成年形态":"Q版形态"} · ${i(a.line)}</small></span></div>
            </div>
            <div class="pet-card-foot">
              <div class="mode-toggle" role="group" aria-label="形态选择">
                <button class="${e.petMode==="chibi"?"active":""}" data-mode="chibi">Q版</button>
                <button class="${e.petMode==="adult"?"active":""}" data-mode="adult">成年版</button>
              </div>
              <label class="mini-select"><span>角色</span><select id="preset-select">${Object.entries(M).map(([r,I])=>`<option value="${r}" ${r===e.preset?"selected":""}>${i(I.name)}</option>`).join("")}</select></label>
            </div>
          </div>
          <div class="reference-strip">
            <div class="reference-copy"><span class="eyebrow">VISUAL DNA</span><b>把你的参考图变成桌宠</b><small>上传一张图，首版会锁定为当前形象参考。</small></div>
            <button class="reference-thumb ${e.customImage?"has-image":""}" data-action="open-reference">
              <img src="${i(e.customImage||N())}" alt="当前参考图" style="object-position:${i(e.customImage?"50% 50%":Q())}" />
              <span>${e.customImage?"已上传":"更换参考图"} <b>↗</b></span>
            </button>
          </div>
        </section>

        <section class="chat-column">
          <div class="chat-head">
            <div><span class="section-kicker">对话中</span><h2>和你的 AI 说点什么</h2></div>
            <button class="clear-chat" data-action="clear-chat">清空</button>
            <div class="provider-picker"><span class="provider-dot" style="background:${i(t.color)}"></span><select id="provider-select">${Object.values(v).map(r=>`<option value="${r.id}" ${r.id===e.provider?"selected":""}>${i(r.name)}</option>`).join("")}</select><button data-action="open-settings" title="配置当前模型">⌄</button></div>
          </div>
          <div class="chat-meta"><span><i class="status-dot"></i>${e.isThinking?"模型正在回复":"已连接 · 本地优先"}</span><span>${i(t.model)}</span></div>
          <div class="message-list" id="message-list">
            ${e.messages.map(r=>`<article class="message ${r.role==="user"?"user":"assistant"}"><div class="message-avatar">${r.role==="user"?"你":i(a.emoji)}</div><div class="message-body">${r.meta?`<span class="message-meta">${i(r.meta)}</span>`:""}<p>${i(r.content).replace(/\n/g,"<br>")}</p><time>${r.role==="user"?"刚刚":"LumaPet"}</time></div></article>`).join("")}
            ${e.isThinking?'<article class="message assistant"><div class="message-avatar">✦</div><div class="message-body typing"><span></span><span></span><span></span></div></article>':""}
          </div>
          <form class="composer" id="chat-form">
            <textarea id="chat-input" rows="1" placeholder="让 ${i(a.name)} 帮你做点什么…" maxlength="4000"></textarea>
            <div class="composer-foot"><span><kbd>Enter</kbd> 发送 · <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行</span><button class="send-button" type="submit" ${e.isThinking?"disabled":""}>发送 <b>↗</b></button></div>
          </form>
        </section>

        <aside class="control-column">
          <div class="control-card quick-card">
            <div class="card-title"><span>OpenClaw 快捷区</span><button class="more-button" data-action="open-claw-info">•••</button></div>
            <p class="card-subtitle">把常用动作放到桌面边缘，Windows 与 Android 壳会继续扩展。</p>
            <div class="quick-grid">
              <button data-action="clipboard"><span>⌘</span><b>读取剪贴板</b><small>摘要到对话</small></button>
              <button data-action="focus"><span>◷</span><b>${l}</b><small>25 分钟专注</small></button>
              <button data-action="screenshot"><span>⌗</span><b>捕捉窗口</b><small>首版预留</small></button>
              <button data-action="pet-speak"><span>✦</span><b>叫醒桌宠</b><small>一句回应</small></button>
            </div>
          </div>

          <div class="control-card">
            <div class="card-title"><span>外观与场景</span><button class="more-button" data-action="open-reference">编辑</button></div>
            <div class="setting-row"><div><b>背景氛围</b><small>为每个平台单独保存</small></div><div class="swatches">${Object.keys(W).map(r=>`<button class="swatch ${e.background===r?"selected":""} ${r}" data-background="${r}" title="${r==="aurora"?"极光":r==="night"?"深夜":r==="paper"?"纸张":"自定义"}"></button>`).join("")}</div></div>
            <div class="setting-row"><div><b>桌宠大小</b><small>${Math.round(e.size*100)}%</small></div><input class="range-input" id="size-range" type="range" min="0.78" max="1.24" step="0.01" value="${e.size}" /></div>
            <div class="setting-row"><div><b>强调色</b><small>同步按钮与光效</small></div><input class="color-input" id="accent-input" type="color" value="${i(e.accent)}" /></div>
            <div class="setting-row toggle-row"><div><b>对白气泡</b><small>让桌宠即时回应</small></div><button class="toggle ${e.bubble?"on":""}" data-toggle="bubble"><i></i></button></div>
            <div class="setting-row toggle-row"><div><b>轻微呼吸动画</b><small>低功耗模式可关闭</small></div><button class="toggle ${e.motion?"on":""}" data-toggle="motion"><i></i></button></div>
          </div>

          <div class="control-card api-card"><div class="api-icon">${i(t.shortName)}</div><div><b>${i(t.name)} 已就绪</b><small>${t.transport==="proxy"?"服务端代理 · Key 不下发到设备":(k=f[e.provider])!=null&&k.apiKey?"API Key 已保存在本机":"演示模式 · 点击配置 API Key"}</small></div><button data-action="open-settings">配置</button></div>
        </aside>
      </main>

      <footer class="statusbar"><span><i class="status-dot"></i> LumaPet v0.1 · 本地工作区</span><span><button data-action="open-privacy">隐私说明</button><span class="footer-sep">·</span><span>Cloud GPT + DeepSeek</span></span></footer>
    </div>
    <div class="modal-backdrop" id="modal-backdrop" hidden></div>
    <section class="modal" id="settings-modal" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-head"><div><span class="eyebrow">MODEL CONNECTION</span><h3 id="settings-title">连接你的 AI 模型</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <p class="modal-lead">密钥只会保存在当前设备的本地存储中，并直接从应用请求模型服务。仓库里不会写入任何密钥。</p>
      <form id="settings-form" class="settings-form">
        <label>模型提供方<select id="settings-provider">${Object.values(v).map(r=>`<option value="${r.id}" ${r.id===e.provider?"selected":""}>${i(r.name)} · ${i(r.description)}</option>`).join("")}</select></label>
        <div class="form-grid"><label>模型名称<input id="settings-model" value="${i(t.model)}" autocomplete="off" /></label><label>API Key<input id="settings-key" type="password" placeholder="sk-…（代理模式可留空）" value="${i(((S=f[e.provider])==null?void 0:S.apiKey)||"")}" autocomplete="new-password" /></label></div>
        <label>请求方式<select id="settings-transport"><option value="direct" ${t.transport!=="proxy"?"selected":""}>设备直连 · Key 保存在本机</option><option value="proxy" ${t.transport==="proxy"?"selected":""}>LumaPet 服务端代理 · 使用服务器环境变量</option></select></label>
        <label>兼容接口地址<input id="settings-endpoint" value="${i(t.endpoint)}" autocomplete="url" /></label>
        <div class="modal-tip"><span>✦</span><p>如果你的服务是 OpenAI 兼容接口，可以直接替换地址与模型名。没有填写 Key 时，LumaPet 会使用本地演示回复。</p></div>
        <div class="modal-actions"><button type="button" class="secondary-button" data-action="export-settings">导出外观配置</button><button type="button" class="secondary-button" data-action="import-settings">导入配置</button><button type="button" class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" type="submit">保存连接</button></div><input id="config-upload" type="file" accept="application/json" hidden />
      </form>
    </section>
    <section class="modal reference-modal" id="reference-modal" hidden role="dialog" aria-modal="true" aria-labelledby="reference-title">
      <div class="modal-head"><div><span class="eyebrow">REFERENCE STUDIO</span><h3 id="reference-title">角色参考与外观</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <div class="reference-preview"><div class="large-reference"><img id="reference-preview-image" src="${i(e.customImage||N())}" alt="参考图预览" /></div><div><b>${e.customImage?"自定义参考图":i(a.name)}</b><p>首版保留参考图，用于角色视觉锚定。后续可接入 Live2D、动作层与生成式换装。</p><label class="upload-button"><input id="reference-upload" type="file" accept="image/png,image/jpeg,image/webp" />上传一张参考图</label>${e.customImage?'<button class="text-button" data-action="clear-reference">清除自定义图</button>':""}</div></div>
      <div class="reference-gallery"><span class="eyebrow">内置参考</span><div class="gallery-grid"><button data-reference="gpt"><img src="/references/gpt-reference.jpg" alt="GPT 娘参考" /><span>GPT 娘</span></button><button data-reference="deepseek"><img src="/references/deepseek-reference.jpg" alt="DeepSeek 娘参考" /><span>DeepSeek 娘</span></button><button data-reference="intro"><img src="/references/intro.jpg" alt="灵感板" /><span>灵感板</span></button></div></div>
    </section>
    <section class="modal small-modal" id="info-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">OPENCLAW READY</span><h3>快捷能力接口</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">第一版先提供剪贴板摘要、专注计时、桌宠唤醒等本地动作；Windows 的悬浮窗和 Android 的悬浮服务已经预留入口，后续可以继续挂接 OpenClaw 的工具链。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">知道了</button></div></section>
    <section class="modal small-modal" id="privacy-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">LOCAL FIRST</span><h3>隐私说明</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">默认模式下聊天内容、外观设置和 API Key 保留在当前设备，并直接发往你选择的模型接口。你也可以启用 LumaPet 服务端代理，让 API Key 只存在服务器环境变量中；代理不会把 Key 下发到设备。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">关闭</button></div></section>
    <div id="toast" class="toast" role="status"></div>
  `,re();const b=document.querySelector("#message-list");b&&(b.scrollTop=b.scrollHeight),!U&&"serviceWorker"in navigator&&navigator.serviceWorker.register("/sw.js").then(()=>{U=!0}).catch(()=>{})}function q(t){document.querySelectorAll(".modal").forEach(l=>{l.hidden=!0});const a=document.querySelector("#modal-backdrop"),c=document.querySelector(`#${t}`);if(c&&a){c.hidden=!1,a.hidden=!1,document.body.classList.add("modal-open");const l=c.querySelector("input, select, button");l==null||l.focus()}}function P(){document.querySelectorAll(".modal").forEach(a=>{a.hidden=!0});const t=document.querySelector("#modal-backdrop");t&&(t.hidden=!0),document.body.classList.remove("modal-open")}function ee(t){e.platform=t,K.searchParams.set("platform",t),history.replaceState({},"",K),p()}function te(t){v[t]&&(e.provider=t,g(),p(),m(`${v[t].name} 已切换`))}function ae(){e.petMood="开心",p(),m(`${A().name}：我在这里。`),window.setTimeout(()=>{e.petMood="在线",p()},2400)}function se(){if(e.focusEndsAt>Date.now()){e.focusEndsAt=0,window.clearInterval(e.focusTimer),e.focusTimer=null,m("专注计时已暂停"),p();return}e.focusEndsAt=Date.now()+1500*1e3,window.clearInterval(e.focusTimer),e.focusTimer=window.setInterval(()=>{Date.now()>=e.focusEndsAt&&(e.focusEndsAt=0,window.clearInterval(e.focusTimer),m("专注完成，做得好。","success")),p()},1e3),m("25 分钟专注已开始","success"),p()}async function oe(){try{const t=await navigator.clipboard.readText();if(!t.trim())return m("剪贴板是空的");const a=t.trim().slice(0,1200);e.messages.push({role:"user",content:`请帮我摘要这段剪贴板内容：
${a}`}),T(),p(),await G(!0)}catch{m("浏览器没有授予剪贴板权限","error")}}function ne(t){const a=C(),c=A().name,l=[`我用 ${a.name} 的演示模式接住了这句话。`,`你可以在右上角配置 ${a.name} API Key，让我换成真实模型回复。`,"如果你愿意，我也可以把这件事拆成三步：先整理重点，再给出方案，最后生成可执行清单。"];return/摘要|总结/.test(t)?`${c} 已经把内容收好啦：
• 抓住主题与重点
• 标出需要行动的部分
• 保留原文里的关键信息

${l[1]}`:/你好|嗨|hello/i.test(t)?`你好！我是 ${c}。${l[0]}

今天想先做什么？`:`${l[0]}

我会先围绕「${t.slice(0,42)}${t.length>42?"…":""}」给你一个清晰的起点。${l[2]}`}async function G(t=!1){var b,k,S,r,I,o,s,u,j,h;if(e.isThinking)return;const a=e.messages[e.messages.length-1],c=(a==null?void 0:a.role)==="user"?a.content:"";if(!c.trim())return;e.isThinking=!0,p();const l=C(),n=(k=(b=f[e.provider])==null?void 0:b.apiKey)==null?void 0:k.trim(),d=l.transport==="proxy";if(!d&&!n){await new Promise(y=>window.setTimeout(y,t?480:720)),e.messages.push({role:"assistant",content:ne(c)}),e.isThinking=!1,T(),p();return}try{const y=new AbortController,E=window.setTimeout(()=>y.abort(),3e4),z={model:l.model,messages:[{role:"system",content:`你是 LumaPet，一只友好的 AI 桌宠。回答简洁、清楚，偶尔带一点轻松的陪伴感。当前角色：${A().name}。`},...e.messages.slice(-12).map(({role:F,content:H})=>({role:F,content:H}))],temperature:.7};d&&(z.provider=e.provider);const x=await fetch(d?"/api/chat":l.endpoint,{method:"POST",headers:{"Content-Type":"application/json",...d?{}:{Authorization:`Bearer ${n}`}},body:JSON.stringify(z),signal:y.signal});window.clearTimeout(E);const $=await x.json().catch(()=>({}));if(!x.ok)throw new Error(((S=$==null?void 0:$.error)==null?void 0:S.message)||`HTTP ${x.status}`);const B=((o=(I=(r=$==null?void 0:$.choices)==null?void 0:r[0])==null?void 0:I.message)==null?void 0:o.content)||((h=(j=(u=(s=$==null?void 0:$.output)==null?void 0:s[0])==null?void 0:u.content)==null?void 0:j[0])==null?void 0:h.text);if(!B)throw new Error("接口没有返回可读内容");e.messages.push({role:"assistant",content:String(B)})}catch(y){e.messages.push({role:"assistant",content:`这次连接没有成功：${y.name==="AbortError"?"请求超时":y.message}

你可以检查 API Key、接口地址或网络连接；也可以先清空 Key 使用演示模式。`})}finally{e.isThinking=!1,T(),p()}}function re(){var t,a,c,l,n,d,b,k,S,r,I;document.querySelectorAll("[data-platform-tab]").forEach(o=>o.addEventListener("click",()=>ee(o.dataset.platformTab))),document.querySelectorAll("[data-mode]").forEach(o=>o.addEventListener("click",()=>{e.petMode=o.dataset.mode,g(),p()})),document.querySelectorAll("[data-background]").forEach(o=>o.addEventListener("click",()=>{e.background=o.dataset.background,g(),p()})),document.querySelectorAll("[data-toggle]").forEach(o=>o.addEventListener("click",()=>{const s=o.dataset.toggle;e[s]=!e[s],g(),p()})),document.querySelectorAll("[data-action]").forEach(o=>o.addEventListener("click",async()=>{var u;const s=o.dataset.action;s==="open-settings"&&q("settings-modal"),s==="open-reference"&&q("reference-modal"),s==="open-claw-info"&&q("info-modal"),s==="open-privacy"&&q("privacy-modal"),s==="close-modal"&&P(),s==="clear-chat"&&X(),s==="export-settings"&&Y(),s==="import-settings"&&((u=document.querySelector("#config-upload"))==null||u.click()),s==="pet-speak"&&ae(),s==="focus"&&se(),s==="clipboard"&&await oe(),s==="screenshot"&&m("窗口捕捉已预留给 Windows / Android 壳"),s==="clear-reference"&&(e.customImage="",g(),P(),p(),m("已恢复内置参考图"))})),(t=document.querySelector("#preset-select"))==null||t.addEventListener("change",o=>{e.preset=o.target.value,e.customImage="",g(),p()}),(a=document.querySelector("#provider-select"))==null||a.addEventListener("change",o=>te(o.target.value)),(c=document.querySelector("#size-range"))==null||c.addEventListener("input",o=>{var s,u;e.size=Number(o.target.value),g(),(s=document.querySelector(".app-shell"))==null||s.style.setProperty("--pet-scale",e.size),(u=document.querySelector(".pet-portrait"))==null||u.style.setProperty("transform",`scale(${e.size})`)}),(l=document.querySelector("#accent-input"))==null||l.addEventListener("input",o=>{var s;e.accent=o.target.value,g(),(s=document.querySelector(".app-shell"))==null||s.style.setProperty("--accent",e.accent)}),(n=document.querySelector("#chat-form"))==null||n.addEventListener("submit",async o=>{o.preventDefault();const s=document.querySelector("#chat-input"),u=s.value.trim();!u||e.isThinking||(e.messages.push({role:"user",content:u}),s.value="",T(),await G())}),(d=document.querySelector("#chat-input"))==null||d.addEventListener("keydown",o=>{var s;o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),(s=document.querySelector("#chat-form"))==null||s.requestSubmit())}),(b=document.querySelector("#settings-provider"))==null||b.addEventListener("change",o=>{var u;const s=C(o.target.value);document.querySelector("#settings-model").value=s.model,document.querySelector("#settings-endpoint").value=s.endpoint,document.querySelector("#settings-key").value=((u=f[o.target.value])==null?void 0:u.apiKey)||"",document.querySelector("#settings-transport").value=s.transport||"direct"}),(k=document.querySelector("#settings-form"))==null||k.addEventListener("submit",o=>{o.preventDefault();const s=document.querySelector("#settings-provider").value;f[s]={model:document.querySelector("#settings-model").value.trim()||v[s].model,endpoint:document.querySelector("#settings-endpoint").value.trim()||v[s].endpoint,transport:document.querySelector("#settings-transport").value,apiKey:document.querySelector("#settings-key").value.trim()},O(L.providerConfigs,f),e.provider=s,g(),P(),p(),m(`${v[s].name} 连接已保存`,"success")}),(S=document.querySelector("#config-upload"))==null||S.addEventListener("change",o=>{var s;return Z((s=o.target.files)==null?void 0:s[0])}),(r=document.querySelector("#reference-upload"))==null||r.addEventListener("change",o=>{var j;const s=(j=o.target.files)==null?void 0:j[0];if(!s)return;if(s.size>8*1024*1024)return m("图片请控制在 8MB 以内","error");const u=new FileReader;u.onload=()=>{const h=new Image;h.onload=()=>{const y=Math.min(1,1400/Math.max(h.naturalWidth,h.naturalHeight)),E=document.createElement("canvas");E.width=Math.max(1,Math.round(h.naturalWidth*y)),E.height=Math.max(1,Math.round(h.naturalHeight*y)),E.getContext("2d").drawImage(h,0,0,E.width,E.height),e.customImage=E.toDataURL("image/webp",.82),g(),p(),q("reference-modal"),m("参考图已载入")},h.src=u.result},u.readAsDataURL(s)}),document.querySelectorAll("[data-reference]").forEach(o=>o.addEventListener("click",()=>{M[o.dataset.reference]&&(e.preset=o.dataset.reference,e.customImage="",g(),p(),q("reference-modal"))})),(I=document.querySelector("#modal-backdrop"))==null||I.addEventListener("click",P),document.addEventListener("keydown",o=>{o.key==="Escape"&&P()},{once:!0})}p();
