/* Percorre a página e mede o estado do cubo e do mostrador em cada altura.
   É a única forma honesta de conferir uma peça conduzida pela rolagem.
   Uso: node ferramentas/percurso.mjs [arquivo] [largura]
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const ARQ = process.argv[2] || 'index.html';
const LARG = parseInt(process.argv[3] || '1440', 10);
const RAIZ = resolve(import.meta.dirname, '..', 'public');
const T = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml',
  '.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp',
  '.xml':'application/xml','.txt':'text/plain','.ico':'image/x-icon' };

const srv = createServer(async (q, r) => {
  try {
    const c = join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
    const d = await readFile(c);
    r.writeHead(200, { 'Content-Type': T[extname(c)] || 'application/octet-stream' });
    r.end(d);
  } catch { r.writeHead(404).end('nao encontrado'); }
});
await new Promise(k => srv.listen(8981, '127.0.0.1', k));

const ch = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=9231', `--user-data-dir=/tmp/pc${Date.now()}`,
   '--no-first-run', '--hide-scrollbars', '--use-angle=swiftshader',
   '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });

let url;
for (let i = 0; i < 80; i++) {
  try {
    const a = await (await fetch('http://127.0.0.1:9231/json/list')).json();
    const p = a.find(x => x.type === 'page');
    if (p) { url = p.webSocketDebuggerUrl; break; }
  } catch {}
  await new Promise(k => setTimeout(k, 250));
}
const ws = new WebSocket(url);
await new Promise(k => ws.addEventListener('open', k));
let id = 0; const fila = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && fila.has(m.id)) { fila.get(m.id)(m.result); fila.delete(m.id); }
});
const cdp = (m, p = {}) => new Promise(k => { const n = ++id; fila.set(n, k); ws.send(JSON.stringify({ id: n, method: m, params: p })); });

await cdp('Emulation.setDeviceMetricsOverride', { width: LARG, height: Math.round(LARG * 0.62), deviceScaleFactor: 1, mobile: LARG < 700 });
await cdp('Page.navigate', { url: `http://127.0.0.1:8981/${ARQ}` });
await new Promise(k => setTimeout(k, 2500));

const alt = JSON.parse((await cdp('Runtime.evaluate', { returnByValue: true,
  expression: 'JSON.stringify({a:document.body.scrollHeight})' })).result.value).a;

console.log(`\n  Percurso · ${ARQ} · ${LARG}px · página de ${alt}px\n  ${'-'.repeat(72)}`);
console.log('  altura   seção            chão      objeto travado');
for (let y = 0; y <= alt - 700; y += Math.round((alt - 700) / 8)) {
  await cdp('Runtime.evaluate', { expression: `window.scrollTo(0,${y})` });
  await new Promise(k => setTimeout(k, 1100));
  const d = JSON.parse((await cdp('Runtime.evaluate', { returnByValue: true, expression: `(()=>{
    const sec=[...document.querySelectorAll('section[id],section.hero,footer')].find(s=>{
      const r=s.getBoundingClientRect(); return r.top<=innerHeight*0.4 && r.bottom>innerHeight*0.4;});
    return JSON.stringify({
      y:Math.round(scrollY),
      sec:(sec&&(sec.id||sec.className.split(' ')[0]))||'-',
      etapa:(document.querySelector('.etapa--ativa .etapa__nome')||{}).textContent||'-',
      chao:getComputedStyle(document.documentElement).getPropertyValue('--chao').trim(),
      objeto:((document.querySelector('[data-estado][data-vivo] .pino__frase, [data-estado][data-vivo] .pino__legenda')||{}).textContent||'-').slice(0,28)})})()` })).result.value);
  console.log(`  ${String(d.y).padStart(6)}   ${d.sec.padEnd(16)} ${(d.chao||"-").padEnd(9)} ${d.objeto}`);
}
console.log();
ws.close(); ch.kill(); srv.close(); process.exit(0);
