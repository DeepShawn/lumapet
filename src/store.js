// Small persistent store on localStorage. Every reader validates what it
// gets back because the data may come from an older version or an import.

const KEYS = {
  settings: 'lumapet.v2.settings',
  providers: 'lumapet.provider-configs.v1',
  messages: 'lumapet.v2.messages',
  pets: 'lumapet.v2.pets'
};

export const CHARACTER_IDS = ['claude', 'clawd', 'gpt', 'deepseek', 'custom'];
export const PROVIDER_IDS = ['claude', 'cloudgpt', 'deepseek'];

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full quota must not break the pet.
  }
}

const DEFAULT_SETTINGS = {
  theme: 'aurora',
  accent: '',
  provider: 'claude',
  proxyToken: '',
  scale: 1,
  quiet: false,
  chatter: true,
  follow: false,
  sound: false,
  wallpaperMotion: true,
  bubbles: true,
  agentUrl: 'http://127.0.0.1:8788',
  agentToken: '',
  customImage: '',
  onboarded: false
};

function cleanSettings(raw) {
  const value = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const key of ['quiet', 'chatter', 'follow', 'sound', 'wallpaperMotion', 'bubbles', 'onboarded']) value[key] = Boolean(value[key]);
  value.scale = Math.min(1.6, Math.max(.6, Number(value.scale) || 1));
  if (!PROVIDER_IDS.includes(value.provider)) value.provider = 'claude';
  if (typeof value.accent !== 'string' || (value.accent && !/^#[0-9a-f]{6}$/i.test(value.accent))) value.accent = '';
  for (const key of ['proxyToken', 'agentUrl', 'agentToken', 'theme']) if (typeof value[key] !== 'string') value[key] = DEFAULT_SETTINGS[key];
  if (typeof value.customImage !== 'string' || value.customImage.length > 3_000_000) value.customImage = '';
  return value;
}

function cleanPets(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const pets = list
    .filter((pet) => pet && CHARACTER_IDS.includes(pet.kind))
    .slice(0, 4)
    .map((pet) => ({ kind: pet.kind, mode: pet.mode === 'adult' ? 'adult' : 'chibi', affection: Math.min(100, Math.max(0, Number(pet.affection) || 0)) }));
  return pets.length ? pets : [{ kind: 'clawd', mode: 'chibi', affection: 0 }, { kind: 'claude', mode: 'chibi', affection: 0 }];
}

function cleanMessages(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((message) => message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-60)
    .map(({ role, content, pet }) => ({ role, content, pet: typeof pet === 'string' ? pet : undefined }));
}

export const store = {
  settings: cleanSettings(read(KEYS.settings, {})),
  providers: read(KEYS.providers, {}),
  messages: cleanMessages(read(KEYS.messages, [])),
  pets: cleanPets(read(KEYS.pets, null)),

  saveSettings() { write(KEYS.settings, this.settings); },
  saveProviders() { write(KEYS.providers, this.providers); },
  saveMessages() { write(KEYS.messages, this.messages.slice(-60)); },
  savePets() { write(KEYS.pets, this.pets); },

  set(patch) {
    this.settings = cleanSettings({ ...this.settings, ...patch });
    this.saveSettings();
  },

  exportConfig() {
    const providers = Object.fromEntries(Object.entries(this.providers).map(([id, config]) => [id, { model: config.model, endpoint: config.endpoint, transport: config.transport }]));
    // Secrets and the (large) custom image stay on this device.
    const settings = { ...this.settings };
    delete settings.proxyToken;
    delete settings.agentToken;
    delete settings.customImage;
    return { app: 'lumapet', version: 2, exportedAt: new Date().toISOString(), settings, pets: this.pets, providers };
  },

  importConfig(payload) {
    if (!payload || typeof payload !== 'object') throw new Error('配置文件格式不正确');
    const { proxyToken, agentToken, customImage } = this.settings;
    this.settings = cleanSettings({ ...payload.settings, proxyToken, agentToken, customImage });
    if (payload.pets) this.pets = cleanPets(payload.pets);
    for (const [id, config] of Object.entries(payload.providers || {})) {
      if (!PROVIDER_IDS.includes(id) || !config || typeof config !== 'object') continue;
      this.providers[id] = { ...(this.providers[id] || {}), model: String(config.model || ''), endpoint: String(config.endpoint || ''), transport: config.transport === 'proxy' ? 'proxy' : 'direct' };
    }
    this.saveSettings();
    this.savePets();
    this.saveProviders();
  }
};
