import { store } from './store.js';
import { CHARACTERS } from './pet/characters.js';
import { personaPrompt } from './pet/personas.js';

export const PROVIDERS = {
  claude: {
    id: 'claude', name: 'Claude', color: '#d97757',
    model: 'claude-opus-5-5', endpoint: 'https://api.anthropic.com',
    description: 'Anthropic Messages API · 长文、写作与代码'
  },
  cloudgpt: {
    id: 'cloudgpt', name: 'Cloud GPT', color: '#a78bfa',
    model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions',
    description: 'OpenAI 兼容接口 · 通用对话'
  },
  deepseek: {
    id: 'deepseek', name: 'DeepSeek', color: '#55a8ff',
    model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/chat/completions',
    description: 'OpenAI 兼容接口 · 中文与推理'
  }
};

export function providerConfig(id = store.settings.provider) {
  const base = PROVIDERS[id] || PROVIDERS.claude;
  const saved = store.providers[id] || {};
  return {
    ...base,
    model: saved.model || base.model,
    endpoint: saved.endpoint || base.endpoint,
    transport: saved.transport === 'proxy' ? 'proxy' : 'direct',
    apiKey: typeof saved.apiKey === 'string' ? saved.apiKey.trim() : ''
  };
}

export function isLive(id = store.settings.provider) {
  const config = providerConfig(id);
  return config.transport === 'proxy' || Boolean(config.apiKey);
}

function systemPrompt(kind, affection) {
  const name = CHARACTERS[kind]?.name || 'LumaPet';
  return `${personaPrompt(kind)}\n你是住在用户电脑桌面上的 AI 桌宠「${name}」，可以在屏幕上走来走去。回答要简洁自然，像朋友聊天；默认不超过 120 字，除非用户需要详细内容。和用户的亲密度：${Math.round(affection)}/100。`;
}

function demoReply(input, kind) {
  const name = CHARACTERS[kind]?.name || 'LumaPet';
  const provider = PROVIDERS[store.settings.provider]?.name || '模型';
  if (/你好|嗨|hello|hi/i.test(input)) return `你好呀！我是 ${name}～现在是演示模式，在「模型设置」里填上 ${provider} 的 API Key，我就能真正回答你啦。`;
  if (/摘要|总结/.test(input)) return `${name} 帮你抓了下重点：\n• 主题与核心观点\n• 需要行动的部分\n• 关键数字和名字\n（演示模式，配置 API Key 后会给出真实摘要）`;
  if (/累|烦|难过|焦虑/.test(input)) return '辛苦啦，先深呼吸一下。要不要摸摸我的头？我会一直在桌面上陪着你。';
  if (/天气|几点|时间/.test(input)) return `现在是 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}。我还看不到窗外，不过可以陪你等太阳出来。`;
  return `收到「${input.slice(0, 30)}${input.length > 30 ? '…' : ''}」！我现在是演示模式，配置 ${provider} 的 API Key 后就能认真回答你。`;
}

export async function sendChat({ kind, affection = 0, history, signal }) {
  const latest = history[history.length - 1];
  const config = providerConfig();
  if (!isLive()) {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return { content: demoReply(latest?.content || '', kind), demo: true };
  }
  const system = systemPrompt(kind, affection);
  const messages = history.slice(-14).map(({ role, content }) => ({ role, content }));
  if (config.id === 'claude' && config.transport !== 'proxy') {
    // Loaded on demand so the SDK stays out of the first paint.
    const { claudeChat } = await import('./claude-chat.js');
    const content = await claudeChat({ apiKey: config.apiKey, baseURL: config.endpoint, model: config.model, system, messages, browser: true, signal });
    return { content };
  }
  const proxy = config.transport === 'proxy';
  const body = { model: config.model, messages: [{ role: 'system', content: system }, ...messages], temperature: .8 };
  if (proxy) body.provider = config.id;
  const response = await fetch(proxy ? proxyUrl() : config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(proxy ? (store.settings.proxyToken ? { 'X-LumaPet-Proxy-Token': store.settings.proxyToken } : {}) : { Authorization: `Bearer ${config.apiKey}` }) },
    body: JSON.stringify(body),
    signal
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('接口没有返回可读内容');
  return { content: String(content) };
}

function proxyUrl() {
  // The Electron and Android shells load from file://, where a relative URL
  // has no server behind it; they talk to the local proxy directly.
  return location.protocol === 'file:' ? 'http://127.0.0.1:8787/api/chat' : '/api/chat';
}
