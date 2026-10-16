(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))c(l);new MutationObserver(l=>{for(const u of l)if(u.type==="childList")for(const b of u.addedNodes)b.tagName==="LINK"&&b.rel==="modulepreload"&&c(b)}).observe(document,{childList:!0,subtree:!0});function i(l){const u={};return l.integrity&&(u.integrity=l.integrity),l.referrerPolicy&&(u.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?u.credentials="include":l.crossOrigin==="anonymous"?u.credentials="omit":u.credentials="same-origin",u}function c(l){if(l.ep)return;l.ep=!0;const u=i(l);fetch(l.href,u)}})();const h={cloudgpt:{id:"cloudgpt",name:"Cloud GPT",shortName:"GPT",color:"#a78bfa",model:"gpt-4o-mini",endpoint:"https://api.openai.com/v1/chat/completions",description:"适合通用对话、写作与多模态工作流"},deepseek:{id:"deepseek",name:"DeepSeek",shortName:"DS",color:"#55a8ff",model:"deepseek-chat",endpoint:"https://api.deepseek.com/chat/completions",description:"适合中文对话、推理与代码助手"}},P={gpt:{name:"GPT 娘",eyebrow:"Cloud GPT",adult:"/references/gpt-reference.jpg",child:"/references/gpt-reference.jpg",objectAdult:"20% 50%",objectChild:"80% 50%",emoji:"✦",line:"紫雾龙角与柔光魔法"},deepseek:{name:"DeepSeek 娘",eyebrow:"DeepSeek",adult:"/references/deepseek-reference.jpg",child:"/references/deepseek-reference.jpg",objectAdult:"20% 50%",objectChild:"80% 50%",emoji:"◈",line:"深海蓝与小小鱼尾"}},R={aurora:"linear-gradient(140deg, #211c42 0%, #29234d 45%, #183b48 100%)",night:"radial-gradient(circle at 25% 10%, #3e2b65 0, #17152a 50%, #0c0d17 100%)",paper:"linear-gradient(140deg, #fffaf2 0%, #f2e8de 100%)",custom:""},A={settings:"lumapet.settings.v1",providerConfigs:"lumapet.provider-configs.v1",messages:"lumapet.messages.v1"},D=(t,a)=>{try{return JSON.parse(localStorage.getItem(t))??a}catch{return a}},N=(t,a)=>{try{localStorage.setItem(t,JSON.stringify(a))}catch{}},v=D(A.settings,{}),k=D(A.providerConfigs,{}),M=D(A.messages,[]),C=new URL(window.location.href),e={platform:C.searchParams.get("platform")||"web",provider:v.provider||"cloudgpt",petMode:v.petMode||"chibi",preset:v.preset||"gpt",background:v.background||"aurora",customBackground:v.customBackground||"",accent:v.accent||"#a78bfa",size:Number(v.size||1),bubble:v.bubble!==!1,motion:v.motion!==!1,focusEndsAt:0,focusTimer:null,isThinking:!1,petMood:"在线",customImage:v.customImage||"",messages:Array.isArray(M)&&M.length?M:[{role:"assistant",content:"晚上好，我是 LumaPet。选一个模型，给我一句话，我们就可以开始。"},{role:"assistant",content:"你也可以在右侧换背景、上传参考图，做一只只属于你的桌宠。",meta:"小提示"}]},F=document.querySelector("#app");function r(t=""){return String(t).replace(/[&<>'"]/g,a=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[a])}function q(t=e.provider){return{...h[t]||h.cloudgpt,...k[t]||{}}}function S(){return P[e.preset]||P.gpt}function O(){return e.customImage?e.customImage:e.petMode==="adult"?S().adult:S().child}function U(){if(e.customImage)return"50% 50%";const t=S();return e.petMode==="adult"?t.objectAdult:t.objectChild}function H(){return e.customImage?"object-position:50% 50%;":`width:200%;max-width:none;object-fit:cover;object-position:center;transform:translateX(${e.petMode==="adult"?"0":"-50%"});`}function g(){N(A.settings,{provider:e.provider,petMode:e.petMode,preset:e.preset,background:e.background,customBackground:e.customBackground,accent:e.accent,size:e.size,bubble:e.bubble,motion:e.motion,customImage:e.customImage})}function T(){N(A.messages,e.messages.slice(-30))}function J(t){const a=Math.max(0,Math.ceil(t/1e3)),i=String(Math.floor(a/60)).padStart(2,"0"),c=String(a%60).padStart(2,"0");return`${i}:${c}`}function m(t,a="normal"){const i=document.querySelector("#toast");i&&(i.className=`toast show ${a}`,i.textContent=t,window.clearTimeout(m.timer),m.timer=window.setTimeout(()=>{i.className="toast"},2600))}function d(){var y,$;const t=q(),a=S(),i=e.background==="custom"&&e.customBackground?`url(${e.customBackground}) center/cover`:R[e.background],c=e.focusEndsAt>Date.now()?J(e.focusEndsAt-Date.now()):"开始专注",l=e.platform==="windows"?"Windows 浮窗":e.platform==="android"?"Android 悬浮":"Web 工作台",u=e.background==="paper";F.innerHTML=`
    <div class="app-shell ${u?"theme-light":""}" data-platform="${r(e.platform)}" style="--accent:${r(e.accent)};--stage-bg:${r(i)}">
      <header class="topbar">
        <a class="brand" href="?platform=${r(e.platform)}" aria-label="LumaPet 首页">
          <span class="brand-mark"><span></span><span></span><span></span></span>
          <span><strong>Luma<span>Pet</span></strong><small>AI companion OS</small></span>
        </a>
        <div class="topbar-center">
          <div class="platform-switch" role="tablist" aria-label="平台预览">
            ${["web","windows","android"].map(n=>`<button class="platform-tab ${e.platform===n?"active":""}" data-platform-tab="${n}" role="tab">${n==="web"?"Web":n==="windows"?"Windows":"Android"}</button>`).join("")}
          </div>
          <span class="platform-badge"><i></i>${l}</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-button" data-action="open-reference" title="参考图与角色">▧<span class="sr-only">角色参考图</span></button>
          <button class="icon-button" data-action="open-settings" title="API 设置">⚙<span class="sr-only">API 设置</span></button>
          <button class="avatar-button" data-action="open-settings">你</button>
        </div>
      </header>

      <main class="workspace">
        <section class="pet-column">
          <div class="section-kicker"><span class="live-dot"></span>桌宠空间 <span class="muted">/ ${r(a.eyebrow)}</span></div>
          <div class="pet-card">
            <div class="pet-card-head">
              <div><span class="eyebrow">${r(a.eyebrow)}</span><h1>${r(a.name)}</h1></div>
              <button class="ghost-button" data-action="pet-speak">${e.petMood==="在线"?"在看你":e.petMood}</button>
            </div>
            <div class="pet-stage" style="--pet-scale:${e.size};">
              <div class="stage-glow"></div>
              <div class="spark spark-a">✦</div><div class="spark spark-b">✧</div><div class="spark spark-c">·</div>
              ${e.bubble?`<div class="pet-bubble"><span>${e.isThinking?"正在思考…":e.petMood==="开心"?"收到啦！":"今天也要发光"}</span><i></i></div>`:""}
              <button class="pet-portrait ${e.motion?"float":""}" data-action="pet-speak" aria-label="点击 ${r(a.name)}">
                <img src="${r(O())}" alt="${r(a.name)} 参考形象" style="${r(H())}" />
                <span class="pet-glass"></span>
              </button>
              <div class="pet-nameplate"><span class="pet-orb">${r(a.emoji)}</span><span><b>${r(a.name)}</b><small>${e.petMode==="adult"?"成年形态":"Q版形态"} · ${r(a.line)}</small></span></div>
            </div>
            <div class="pet-card-foot">
              <div class="mode-toggle" role="group" aria-label="形态选择">
                <button class="${e.petMode==="chibi"?"active":""}" data-mode="chibi">Q版</button>
                <button class="${e.petMode==="adult"?"active":""}" data-mode="adult">成年版</button>
              </div>
              <label class="mini-select"><span>角色</span><select id="preset-select">${Object.entries(P).map(([n,s])=>`<option value="${n}" ${n===e.preset?"selected":""}>${r(s.name)}</option>`).join("")}</select></label>
            </div>
          </div>
          <div class="reference-strip">
            <div class="reference-copy"><span class="eyebrow">VISUAL DNA</span><b>把你的参考图变成桌宠</b><small>上传一张图，首版会锁定为当前形象参考。</small></div>
            <button class="reference-thumb ${e.customImage?"has-image":""}" data-action="open-reference">
              <img src="${r(e.customImage||O())}" alt="当前参考图" style="object-position:${r(e.customImage?"50% 50%":U())}" />
              <span>${e.customImage?"已上传":"更换参考图"} <b>↗</b></span>
            </button>
          </div>
        </section>

        <section class="chat-column">
          <div class="chat-head">
            <div><span class="section-kicker">对话中</span><h2>和你的 AI 说点什么</h2></div>
            <div class="provider-picker"><span class="provider-dot" style="background:${r(t.color)}"></span><select id="provider-select">${Object.values(h).map(n=>`<option value="${n.id}" ${n.id===e.provider?"selected":""}>${r(n.name)}</option>`).join("")}</select><button data-action="open-settings" title="配置当前模型">⌄</button></div>
          </div>
          <div class="chat-meta"><span><i class="status-dot"></i>${e.isThinking?"模型正在回复":"已连接 · 本地优先"}</span><span>${r(t.model)}</span></div>
          <div class="message-list" id="message-list">
            ${e.messages.map(n=>`<article class="message ${n.role==="user"?"user":"assistant"}"><div class="message-avatar">${n.role==="user"?"你":r(a.emoji)}</div><div class="message-body">${n.meta?`<span class="message-meta">${r(n.meta)}</span>`:""}<p>${r(n.content).replace(/\n/g,"<br>")}</p><time>${n.role==="user"?"刚刚":"LumaPet"}</time></div></article>`).join("")}
            ${e.isThinking?'<article class="message assistant"><div class="message-avatar">✦</div><div class="message-body typing"><span></span><span></span><span></span></div></article>':""}
          </div>
          <form class="composer" id="chat-form">
            <textarea id="chat-input" rows="1" placeholder="让 ${r(a.name)} 帮你做点什么…" maxlength="4000"></textarea>
            <div class="composer-foot"><span><kbd>Enter</kbd> 发送 · <kbd>Shift</kbd> + <kbd>Enter</kbd> 换行</span><button class="send-button" type="submit" ${e.isThinking?"disabled":""}>发送 <b>↗</b></button></div>
          </form>
        </section>

        <aside class="control-column">
          <div class="control-card quick-card">
            <div class="card-title"><span>OpenClaw 快捷区</span><button class="more-button" data-action="open-claw-info">•••</button></div>
            <p class="card-subtitle">把常用动作放到桌面边缘，Windows 与 Android 壳会继续扩展。</p>
            <div class="quick-grid">
              <button data-action="clipboard"><span>⌘</span><b>读取剪贴板</b><small>摘要到对话</small></button>
              <button data-action="focus"><span>◷</span><b>${c}</b><small>25 分钟专注</small></button>
              <button data-action="screenshot"><span>⌗</span><b>捕捉窗口</b><small>首版预留</small></button>
              <button data-action="pet-speak"><span>✦</span><b>叫醒桌宠</b><small>一句回应</small></button>
            </div>
          </div>

          <div class="control-card">
            <div class="card-title"><span>外观与场景</span><button class="more-button" data-action="open-reference">编辑</button></div>
            <div class="setting-row"><div><b>背景氛围</b><small>为每个平台单独保存</small></div><div class="swatches">${Object.keys(R).map(n=>`<button class="swatch ${e.background===n?"selected":""} ${n}" data-background="${n}" title="${n==="aurora"?"极光":n==="night"?"深夜":n==="paper"?"纸张":"自定义"}"></button>`).join("")}</div></div>
            <div class="setting-row"><div><b>桌宠大小</b><small>${Math.round(e.size*100)}%</small></div><input class="range-input" id="size-range" type="range" min="0.78" max="1.24" step="0.01" value="${e.size}" /></div>
            <div class="setting-row"><div><b>强调色</b><small>同步按钮与光效</small></div><input class="color-input" id="accent-input" type="color" value="${r(e.accent)}" /></div>
            <div class="setting-row toggle-row"><div><b>对白气泡</b><small>让桌宠即时回应</small></div><button class="toggle ${e.bubble?"on":""}" data-toggle="bubble"><i></i></button></div>
            <div class="setting-row toggle-row"><div><b>轻微呼吸动画</b><small>低功耗模式可关闭</small></div><button class="toggle ${e.motion?"on":""}" data-toggle="motion"><i></i></button></div>
          </div>

          <div class="control-card api-card"><div class="api-icon">${r(t.shortName)}</div><div><b>${r(t.name)} 已就绪</b><small>${(y=k[e.provider])!=null&&y.apiKey?"API Key 已保存在本机":"演示模式 · 点击配置 API Key"}</small></div><button data-action="open-settings">配置</button></div>
        </aside>
      </main>

      <footer class="statusbar"><span><i class="status-dot"></i> LumaPet v0.1 · 本地工作区</span><span><button data-action="open-privacy">隐私说明</button><span class="footer-sep">·</span><span>Cloud GPT + DeepSeek</span></span></footer>
    </div>
    <div class="modal-backdrop" id="modal-backdrop" hidden></div>
    <section class="modal" id="settings-modal" hidden role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-head"><div><span class="eyebrow">MODEL CONNECTION</span><h3 id="settings-title">连接你的 AI 模型</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <p class="modal-lead">密钥只会保存在当前设备的本地存储中，并直接从应用请求模型服务。仓库里不会写入任何密钥。</p>
      <form id="settings-form" class="settings-form">
        <label>模型提供方<select id="settings-provider">${Object.values(h).map(n=>`<option value="${n.id}" ${n.id===e.provider?"selected":""}>${r(n.name)} · ${r(n.description)}</option>`).join("")}</select></label>
        <div class="form-grid"><label>模型名称<input id="settings-model" value="${r(t.model)}" autocomplete="off" /></label><label>API Key<input id="settings-key" type="password" placeholder="sk-…" value="${r((($=k[e.provider])==null?void 0:$.apiKey)||"")}" autocomplete="new-password" /></label></div>
        <label>兼容接口地址<input id="settings-endpoint" value="${r(t.endpoint)}" autocomplete="url" /></label>
        <div class="modal-tip"><span>✦</span><p>如果你的服务是 OpenAI 兼容接口，可以直接替换地址与模型名。没有填写 Key 时，LumaPet 会使用本地演示回复。</p></div>
        <div class="modal-actions"><button type="button" class="secondary-button" data-action="close-modal">取消</button><button class="primary-button" type="submit">保存连接</button></div>
      </form>
    </section>
    <section class="modal reference-modal" id="reference-modal" hidden role="dialog" aria-modal="true" aria-labelledby="reference-title">
      <div class="modal-head"><div><span class="eyebrow">REFERENCE STUDIO</span><h3 id="reference-title">角色参考与外观</h3></div><button class="close-button" data-action="close-modal">×</button></div>
      <div class="reference-preview"><div class="large-reference"><img id="reference-preview-image" src="${r(e.customImage||O())}" alt="参考图预览" /></div><div><b>${e.customImage?"自定义参考图":r(a.name)}</b><p>首版保留参考图，用于角色视觉锚定。后续可接入 Live2D、动作层与生成式换装。</p><label class="upload-button"><input id="reference-upload" type="file" accept="image/png,image/jpeg,image/webp" />上传一张参考图</label>${e.customImage?'<button class="text-button" data-action="clear-reference">清除自定义图</button>':""}</div></div>
      <div class="reference-gallery"><span class="eyebrow">内置参考</span><div class="gallery-grid"><button data-reference="gpt"><img src="/references/gpt-reference.jpg" alt="GPT 娘参考" /><span>GPT 娘</span></button><button data-reference="deepseek"><img src="/references/deepseek-reference.jpg" alt="DeepSeek 娘参考" /><span>DeepSeek 娘</span></button><button data-reference="intro"><img src="/references/intro.jpg" alt="灵感板" /><span>灵感板</span></button></div></div>
    </section>
    <section class="modal small-modal" id="info-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">OPENCLAW READY</span><h3>快捷能力接口</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">第一版先提供剪贴板摘要、专注计时、桌宠唤醒等本地动作；Windows 的悬浮窗和 Android 的悬浮服务已经预留入口，后续可以继续挂接 OpenClaw 的工具链。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">知道了</button></div></section>
    <section class="modal small-modal" id="privacy-modal" hidden role="dialog" aria-modal="true"><div class="modal-head"><div><span class="eyebrow">LOCAL FIRST</span><h3>隐私说明</h3></div><button class="close-button" data-action="close-modal">×</button></div><p class="modal-lead">LumaPet 的第一版不带自建服务器。聊天内容、外观设置和 API Key 默认保留在当前设备；只有点击发送时，消息才会直接发往你选择的模型接口。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">关闭</button></div></section>
    <div id="toast" class="toast" role="status"></div>
  `,ee();const b=document.querySelector("#message-list");b&&(b.scrollTop=b.scrollHeight)}function E(t){document.querySelectorAll(".modal").forEach(c=>{c.hidden=!0});const a=document.querySelector("#modal-backdrop"),i=document.querySelector(`#${t}`);if(i&&a){i.hidden=!1,a.hidden=!1,document.body.classList.add("modal-open");const c=i.querySelector("input, select, button");c==null||c.focus()}}function L(){document.querySelectorAll(".modal").forEach(a=>{a.hidden=!0});const t=document.querySelector("#modal-backdrop");t&&(t.hidden=!0),document.body.classList.remove("modal-open")}function Q(t){e.platform=t,C.searchParams.set("platform",t),history.replaceState({},"",C),d()}function V(t){h[t]&&(e.provider=t,g(),d(),m(`${h[t].name} 已切换`))}function X(){e.petMood="开心",d(),m(`${S().name}：我在这里。`),window.setTimeout(()=>{e.petMood="在线",d()},2400)}function Y(){if(e.focusEndsAt>Date.now()){e.focusEndsAt=0,window.clearInterval(e.focusTimer),e.focusTimer=null,m("专注计时已暂停"),d();return}e.focusEndsAt=Date.now()+1500*1e3,window.clearInterval(e.focusTimer),e.focusTimer=window.setInterval(()=>{Date.now()>=e.focusEndsAt&&(e.focusEndsAt=0,window.clearInterval(e.focusTimer),m("专注完成，做得好。","success")),d()},1e3),m("25 分钟专注已开始","success"),d()}async function Z(){try{const t=await navigator.clipboard.readText();if(!t.trim())return m("剪贴板是空的");const a=t.trim().slice(0,1200);e.messages.push({role:"user",content:`请帮我摘要这段剪贴板内容：
${a}`}),T(),d(),await x(!0)}catch{m("浏览器没有授予剪贴板权限","error")}}function _(t){const a=q(),i=S().name,c=[`我用 ${a.name} 的演示模式接住了这句话。`,`你可以在右上角配置 ${a.name} API Key，让我换成真实模型回复。`,"如果你愿意，我也可以把这件事拆成三步：先整理重点，再给出方案，最后生成可执行清单。"];return/摘要|总结/.test(t)?`${i} 已经把内容收好啦：
• 抓住主题与重点
• 标出需要行动的部分
• 保留原文里的关键信息

${c[1]}`:/你好|嗨|hello/i.test(t)?`你好！我是 ${i}。${c[0]}

今天想先做什么？`:`${c[0]}

我会先围绕「${t.slice(0,42)}${t.length>42?"…":""}」给你一个清晰的起点。${c[2]}`}async function x(t=!1){var u,b,y,$,n,s,o,p,I,K;if(e.isThinking)return;const a=e.messages[e.messages.length-1],i=(a==null?void 0:a.role)==="user"?a.content:"";if(!i.trim())return;e.isThinking=!0,d();const c=q(),l=(b=(u=k[e.provider])==null?void 0:u.apiKey)==null?void 0:b.trim();if(!l){await new Promise(w=>window.setTimeout(w,t?480:720)),e.messages.push({role:"assistant",content:_(i)}),e.isThinking=!1,T(),d();return}try{const w=new AbortController,B=window.setTimeout(()=>w.abort(),3e4),j=await fetch(c.endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({model:c.model,messages:[{role:"system",content:`你是 LumaPet，一只友好的 AI 桌宠。回答简洁、清楚，偶尔带一点轻松的陪伴感。当前角色：${S().name}。`},...e.messages.slice(-12).map(({role:G,content:W})=>({role:G,content:W}))],temperature:.7}),signal:w.signal});window.clearTimeout(B);const f=await j.json().catch(()=>({}));if(!j.ok)throw new Error(((y=f==null?void 0:f.error)==null?void 0:y.message)||`HTTP ${j.status}`);const z=((s=(n=($=f==null?void 0:f.choices)==null?void 0:$[0])==null?void 0:n.message)==null?void 0:s.content)||((K=(I=(p=(o=f==null?void 0:f.output)==null?void 0:o[0])==null?void 0:p.content)==null?void 0:I[0])==null?void 0:K.text);if(!z)throw new Error("接口没有返回可读内容");e.messages.push({role:"assistant",content:String(z)})}catch(w){e.messages.push({role:"assistant",content:`这次连接没有成功：${w.name==="AbortError"?"请求超时":w.message}

你可以检查 API Key、接口地址或网络连接；也可以先清空 Key 使用演示模式。`})}finally{e.isThinking=!1,T(),d()}}function ee(){var t,a,i,c,l,u,b,y,$,n;document.querySelectorAll("[data-platform-tab]").forEach(s=>s.addEventListener("click",()=>Q(s.dataset.platformTab))),document.querySelectorAll("[data-mode]").forEach(s=>s.addEventListener("click",()=>{e.petMode=s.dataset.mode,g(),d()})),document.querySelectorAll("[data-background]").forEach(s=>s.addEventListener("click",()=>{e.background=s.dataset.background,g(),d()})),document.querySelectorAll("[data-toggle]").forEach(s=>s.addEventListener("click",()=>{const o=s.dataset.toggle;e[o]=!e[o],g(),d()})),document.querySelectorAll("[data-action]").forEach(s=>s.addEventListener("click",async()=>{const o=s.dataset.action;o==="open-settings"&&E("settings-modal"),o==="open-reference"&&E("reference-modal"),o==="open-claw-info"&&E("info-modal"),o==="open-privacy"&&E("privacy-modal"),o==="close-modal"&&L(),o==="pet-speak"&&X(),o==="focus"&&Y(),o==="clipboard"&&await Z(),o==="screenshot"&&m("窗口捕捉已预留给 Windows / Android 壳"),o==="clear-reference"&&(e.customImage="",g(),L(),d(),m("已恢复内置参考图"))})),(t=document.querySelector("#preset-select"))==null||t.addEventListener("change",s=>{e.preset=s.target.value,e.customImage="",g(),d()}),(a=document.querySelector("#provider-select"))==null||a.addEventListener("change",s=>V(s.target.value)),(i=document.querySelector("#size-range"))==null||i.addEventListener("input",s=>{var o,p;e.size=Number(s.target.value),g(),(o=document.querySelector(".app-shell"))==null||o.style.setProperty("--pet-scale",e.size),(p=document.querySelector(".pet-portrait"))==null||p.style.setProperty("transform",`scale(${e.size})`)}),(c=document.querySelector("#accent-input"))==null||c.addEventListener("input",s=>{var o;e.accent=s.target.value,g(),(o=document.querySelector(".app-shell"))==null||o.style.setProperty("--accent",e.accent)}),(l=document.querySelector("#chat-form"))==null||l.addEventListener("submit",async s=>{s.preventDefault();const o=document.querySelector("#chat-input"),p=o.value.trim();!p||e.isThinking||(e.messages.push({role:"user",content:p}),o.value="",T(),await x())}),(u=document.querySelector("#chat-input"))==null||u.addEventListener("keydown",s=>{var o;s.key==="Enter"&&!s.shiftKey&&(s.preventDefault(),(o=document.querySelector("#chat-form"))==null||o.requestSubmit())}),(b=document.querySelector("#settings-provider"))==null||b.addEventListener("change",s=>{var p;const o=q(s.target.value);document.querySelector("#settings-model").value=o.model,document.querySelector("#settings-endpoint").value=o.endpoint,document.querySelector("#settings-key").value=((p=k[s.target.value])==null?void 0:p.apiKey)||""}),(y=document.querySelector("#settings-form"))==null||y.addEventListener("submit",s=>{s.preventDefault();const o=document.querySelector("#settings-provider").value;k[o]={model:document.querySelector("#settings-model").value.trim()||h[o].model,endpoint:document.querySelector("#settings-endpoint").value.trim()||h[o].endpoint,apiKey:document.querySelector("#settings-key").value.trim()},N(A.providerConfigs,k),e.provider=o,g(),L(),d(),m(`${h[o].name} 连接已保存`,"success")}),($=document.querySelector("#reference-upload"))==null||$.addEventListener("change",s=>{var I;const o=(I=s.target.files)==null?void 0:I[0];if(!o)return;if(o.size>8*1024*1024)return m("图片请控制在 8MB 以内","error");const p=new FileReader;p.onload=()=>{e.customImage=p.result,g(),d(),E("reference-modal"),m("参考图已载入")},p.readAsDataURL(o)}),document.querySelectorAll("[data-reference]").forEach(s=>s.addEventListener("click",()=>{P[s.dataset.reference]&&(e.preset=s.dataset.reference,e.customImage="",g(),d(),E("reference-modal"))})),(n=document.querySelector("#modal-backdrop"))==null||n.addEventListener("click",L),document.addEventListener("keydown",s=>{s.key==="Escape"&&L()},{once:!0})}d();
