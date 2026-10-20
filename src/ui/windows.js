// Draggable desktop windows. Their top edges double as platforms pets can
// land on, so the window manager also reports those edges to the world.

export class WindowManager {
  constructor(layer) {
    this.layer = layer;
    this.windows = new Map();
    this.z = 10;
    this.listeners = [];
    this.cascade = 0;
  }

  get compact() { return window.innerWidth < 720; }

  onChange(listener) { this.listeners.push(listener); }
  changed() { this.listeners.forEach((listener) => listener()); }

  open(id, spec) {
    const existing = this.windows.get(id);
    if (existing) {
      existing.el.hidden = false;
      existing.minimized = false;
      if (spec.refresh !== false) existing.render?.();
      this.focus(id);
      this.changed();
      return existing;
    }
    const el = document.createElement('section');
    el.className = 'win interactive opening';
    el.dataset.win = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', spec.title);
    el.innerHTML = `
      <header class="win-bar">
        <span class="win-icon" aria-hidden="true">${spec.icon || '✦'}</span>
        <b class="win-title">${spec.title}</b>
        <div class="win-ctrl">
          <button type="button" class="win-min" aria-label="最小化">–</button>
          <button type="button" class="win-close" aria-label="关闭">×</button>
        </div>
      </header>
      <div class="win-body"></div>`;
    const width = Math.min(spec.width || 420, window.innerWidth - 24);
    const height = Math.min(spec.height || 480, window.innerHeight - 110);
    const offset = (this.cascade++ % 6) * 28;
    const x = spec.x ?? Math.max(12, (window.innerWidth - width) / 2 - 120 + offset);
    const y = spec.y ?? Math.max(56, (window.innerHeight - height) / 2 - 40 + offset);
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    this.layer.append(el);
    const win = { id, el, body: el.querySelector('.win-body'), title: spec.title, icon: spec.icon, minimized: false, onClose: spec.onClose };
    win.render = () => spec.render(win.body, win);
    this.windows.set(id, win);
    win.render();
    this.bind(win);
    this.focus(id);
    this.clamp(win);
    window.setTimeout(() => el.classList.remove('opening'), 260);
    this.changed();
    return win;
  }

  bind(win) {
    const bar = win.el.querySelector('.win-bar');
    win.el.addEventListener('pointerdown', () => this.focus(win.id));
    win.el.querySelector('.win-close').addEventListener('click', () => this.close(win.id));
    win.el.querySelector('.win-min').addEventListener('click', () => this.minimize(win.id));
    bar.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button') || this.compact) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const left = win.el.offsetLeft;
      const top = win.el.offsetTop;
      bar.setPointerCapture(event.pointerId);
      win.el.classList.add('dragging');
      const move = (moveEvent) => {
        win.el.style.left = `${left + moveEvent.clientX - startX}px`;
        win.el.style.top = `${top + moveEvent.clientY - startY}px`;
        this.clamp(win);
      };
      const up = () => {
        win.el.classList.remove('dragging');
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  }

  clamp(win) {
    if (this.compact) return;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 60;
    const x = Math.min(maxX, Math.max(-win.el.offsetWidth + 80, win.el.offsetLeft));
    const y = Math.min(maxY, Math.max(4, win.el.offsetTop));
    win.el.style.left = `${x}px`;
    win.el.style.top = `${y}px`;
  }

  focus(id) {
    const win = this.windows.get(id);
    if (!win) return;
    this.z += 1;
    win.el.style.zIndex = this.z;
    for (const other of this.windows.values()) other.el.classList.toggle('focused', other === win);
    this.focused = id;
    this.changed();
  }

  minimize(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.minimized = true;
    win.el.hidden = true;
    this.changed();
  }

  toggle(id, spec) {
    const win = this.windows.get(id);
    if (win && !win.minimized && this.focused === id) return this.minimize(id);
    return this.open(id, { ...spec, refresh: false });
  }

  close(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.onClose?.();
    win.el.classList.add('closing');
    this.windows.delete(id);
    window.setTimeout(() => win.el.remove(), 180);
    this.changed();
  }

  rerender(id) { this.windows.get(id)?.render(); }
  isOpen(id) { const win = this.windows.get(id); return Boolean(win && !win.minimized); }

  list() {
    return [...this.windows.values()].map((win) => ({ id: win.id, title: win.title, icon: win.icon, minimized: win.minimized, focused: this.focused === win.id }));
  }

  // Top edges of visible windows, as platforms for the pet world.
  platforms() {
    const result = [];
    for (const win of this.windows.values()) {
      if (win.minimized || win.el.classList.contains('closing')) continue;
      const rect = win.el.getBoundingClientRect();
      if (rect.width < 120 || rect.top < 30) continue;
      result.push({ id: win.id, x1: rect.left + 6, x2: rect.right - 6, y: rect.top });
    }
    return result;
  }
}
