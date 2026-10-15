import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const baseUrl = process.argv[2] ?? 'http://localhost:4176';
const outFile = process.argv[3] ?? 'preview.png';
const theme = process.argv[4] ?? 'light';
const PORT = 9336;

const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

const workDir = mkdtempSync(path.join(tmpdir(), 'astralis-shot-'));
const chrome = spawn(browser, ['--headless=new','--disable-gpu','--no-sandbox','--disable-extensions','--no-first-run','--hide-scrollbars',`--remote-debugging-port=${PORT}`,`--user-data-dir=${path.join(workDir,'p')}`,'--window-size=1440,900','about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 60; i++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
    if (target) break;
  } catch {}
  await sleep(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 1; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } };
const send = (method, params={}) => new Promise((resolve,reject)=>{ const i=id++; pending.set(i,{resolve,reject}); ws.send(JSON.stringify({id:i,method,params})); });
const ev = async (x) => (await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate',{url:baseUrl}); await sleep(1500);

// Seed a representative set of shortcuts + theme so the screenshot shows real UI.
await ev(`(() => {
  localStorage.setItem('astralis_settings', JSON.stringify({ language:'zh', theme:'${theme}', layoutMode:'card', showFavicons:true, showShortcuts:true, greetingName:'小明', showLunar:true, showSeconds:false, customTitle:'', customIcon:'', defaultSearchEngineId:'', customWallpaper:'', wallpaperBlur:false, openSearchInNewTab:false, openLinksInNewTab:false }));
  localStorage.setItem('astralis_data', JSON.stringify([
    { id:'c1', title:'日常', links:[{id:'l1',title:'Gmail',url:'https://mail.google.com'},{id:'l2',title:'YouTube',url:'https://www.youtube.com'},{id:'l3',title:'天气',url:'https://weather.com'}] },
    { id:'c2', title:'工作与开发', links:[{id:'l4',title:'GitHub',url:'https://github.com'},{id:'l5',title:'Figma',url:'https://www.figma.com'},{id:'l6',title:'MDN',url:'https://developer.mozilla.org'}] },
    { id:'c3', title:'新闻与阅读', links:[{id:'l7',title:'Hacker News',url:'https://news.ycombinator.com'},{id:'l8',title:'少数派',url:'https://sspai.com'},{id:'l9',title:'V2EX',url:'https://v2ex.com'}] }
  ]));
  localStorage.removeItem('astralis_engines');
})()`);

await send('Page.navigate',{url:baseUrl}); await sleep(3000);

const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
console.log(`screenshot written: ${outFile}`);

ws.close(); chrome.kill(); await sleep(300); rmSync(workDir,{recursive:true,force:true});
