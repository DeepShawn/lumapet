import { esc } from './apps.js';

// Speech bubbles float above each pet's head and follow it every frame.
// A bubble can hold typed text, a quick-chat input, or the focus timer.

export class Bubbles {
  constructor(layer, app) {
    this.layer = layer;
    this.app = app;
    this.items = new Map();
  }

  entry(pet) {
    let item = this.items.get(pet.id);
    if (!item) {
      const el = document.createElement('div');
      el.className = 'bubble';
      el.hidden = true;
      this.layer.append(el);
      item = { el, pet, text: '', shown: 0, until: 0, mode: 'text', typingTimer: 0 };
      this.items.set(pet.id, item);
    }
    return item;
  }

  say(pet, text, ms) {
    if (!this.app.store.settings.bubbles && !this.app.forceBubble) return;
    const item = this.entry(pet);
    if (item.mode === 'input') return;
    const full = String(text);
    const short = full.length > 110 ? `${full.slice(0, 108)}…` : full;
    item.mode = 'text';
    item.text = short;
    item.more = short !== full;
    item.shown = 0;
    const duration = ms ?? Math.min(9000, 1800 + short.length * 90);
    item.until = performance.now() + duration + short.length * 28;
    item.el.className = 'bubble interactive show';
    item.el.hidden = false;
    item.el.innerHTML = '<span class="bubble-text"></span>';
    if (item.more) item.el.insertAdjacentHTML('beforeend', '<button type="button" class="bubble-more">看全文</button>');
    item.el.querySelector('.bubble-more')?.addEventListener('click', () => this.app.openApp('chat'));
    pet.setTalking(short.length * 28 + 200);
    window.clearInterval(item.typingTimer);
    const span = item.el.querySelector('.bubble-text');
    item.typingTimer = window.setInterval(() => {
      item.shown += 1;
      span.textContent = item.text.slice(0, item.shown);
      if (item.shown >= item.text.length) window.clearInterval(item.typingTimer);
    }, 28);
  }

  input(pet) {
    const item = this.entry(pet);
    window.clearInterval(item.typingTimer);
    item.mode = 'input';
    item.until = Infinity;
    item.el.hidden = false;
    item.el.className = 'bubble interactive show input';
    item.el.innerHTML = `<form><input maxlength="2000" placeholder="和 ${esc(this.app.characterName(pet))} 说…" aria-label="快速聊天" /><button type="submit">➤</button></form>`;
    const form = item.el.querySelector('form');
    const field = form.querySelector('input');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = field.value.trim();
      this.closeInput(pet);
      if (text) this.app.ask(text, pet);
    });
    field.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.closeInput(pet); });
    field.addEventListener('blur', () => window.setTimeout(() => { if (item.mode === 'input' && !field.value.trim()) this.closeInput(pet); }, 200));
    window.setTimeout(() => field.focus(), 30);
  }

  closeInput(pet) {
    const item = this.items.get(pet.id);
    if (!item || item.mode !== 'input') return;
    item.mode = 'text';
    item.until = 0;
  }

  timer(pet, label) {
    const item = this.entry(pet);
    if (item.mode === 'input') return;
    if (item.mode === 'text' && performance.now() < item.until) return;
    item.mode = 'timer';
    item.until = performance.now() + 1500;
    item.el.hidden = false;
    item.el.className = 'bubble show timer';
    item.el.textContent = `⏱ ${label}`;
  }

  remove(pet) {
    const item = this.items.get(pet.id);
    if (!item) return;
    window.clearInterval(item.typingTimer);
    item.el.remove();
    this.items.delete(pet.id);
  }

  update() {
    const now = performance.now();
    for (const item of this.items.values()) {
      const { el, pet } = item;
      if (now > item.until || pet.hidden) {
        if (!el.hidden) { el.classList.remove('show'); el.hidden = true; }
        continue;
      }
      const head = this.app.toScreen(pet.headPoint());
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const x = Math.max(8, Math.min(window.innerWidth - width - 8, head.x - width / 2));
      const below = head.y - height - 14 < 4;
      const y = below ? head.y + 40 : head.y - height - 14;
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      el.classList.toggle('below', below);
      el.style.setProperty('--tail', `${Math.max(14, Math.min(width - 14, head.x - x))}px`);
    }
  }
}
