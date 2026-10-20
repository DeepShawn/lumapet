import { defineConfig } from 'vite';

// Relative asset paths work everywhere LumaPet is served from: GitHub Pages
// project subpaths, the Node server, and file:// in the Electron and Android
// shells. VITE_BASE can still force an absolute base.
const base = process.env.VITE_BASE || './';

export default defineConfig({ base });
