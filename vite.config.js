import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/ while local and server builds use /.
const base = process.env.VITE_BASE || (process.env.GITHUB_ACTIONS ? '/lumapet/' : '/');

export default defineConfig({ base });
