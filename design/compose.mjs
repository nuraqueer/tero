import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = 'out';
const uri = (f) => 'data:image/png;base64,' + fs.readFileSync(`${out}/${f}`).toString('base64');
const sets = {
  'hero.png': ['lock.png', 'gathering.png', 'space.png', 'messages.png', 'you.png'],
  'suits.png': ['support.png', 'resources.png', 'opportunities.png', 'journey.png'],
};
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, files] of Object.entries(sets)) {
  const w = files.length * 300 + (files.length - 1) * 36 + 120;
  const page = await browser.newPage({ viewport: { width: w, height: 770 }, deviceScaleFactor: 2 });
  const imgs = files.map((f) => `<img src="${uri(f)}" style="width:300px;height:649px;border-radius:40px;box-shadow:0 0 0 1px rgba(31,30,29,0.12),0 24px 48px rgba(20,20,19,0.14)">`).join('');
  await page.setContent(`<body style="margin:0;background:#F0EEE6"><div style="display:flex;gap:36px;padding:60px">${imgs}</div></body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}` });
  await page.close();
  console.log('ok', name);
}
await browser.close();
