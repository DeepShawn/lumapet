import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const required = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'platform/android/app/src/main/AndroidManifest.xml',
  'platform/windows/main.cjs',
  'agent/server.mjs'
];

for (const relative of required) await access(resolve(root, relative));
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (!html.includes('src="') || !html.includes('assets/')) throw new Error('dist/index.html 没有入口脚本');
const manifest = await readFile(resolve(root, 'platform/android/app/src/main/AndroidManifest.xml'), 'utf8');
if (!manifest.includes('SYSTEM_ALERT_WINDOW') || !manifest.includes('PROPERTY_SPECIAL_USE_FGS_SUBTYPE')) throw new Error('Android 悬浮服务权限声明不完整');
const androidHtml = await readFile(resolve(root, 'platform/android/app/src/main/assets/public/index.html'), 'utf8');
if (!androidHtml.includes('./assets/')) throw new Error('Android WebView 资源没有使用相对路径');
const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const script of ['build', 'agent', 'android:sync', 'check']) if (!packageJson.scripts?.[script]) throw new Error(`缺少 npm script: ${script}`);
console.log(`LumaPet smoke check passed (${required.length} artifacts checked)`);
