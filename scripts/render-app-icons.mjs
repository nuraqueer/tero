// Source vectors remain editable. Native launchers provide their own corner masks.
import sharp from 'sharp';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
const out = new URL('../apps/app/assets/', import.meta.url);
const source = new URL('../design/assets/', import.meta.url);
await mkdir(source, { recursive: true });
function icon({background, card, line, star, scale = 1, pride = false}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
<rect x="302" y="166" width="420" height="692" rx="67" fill="${card}" stroke="${line}" stroke-width="19"/>
<rect x="329" y="193" width="366" height="638" rx="44" fill="none" stroke="${line}" stroke-width="5" opacity=".66"/>
<path d="M512 365 C589 422 635 467 635 512 C635 557 589 602 512 659 C435 602 389 557 389 512 C389 467 435 422 512 365Z" fill="${star}"/>
<path d="M512 422 C555 457 580 488 580 512 C580 536 555 567 512 602 C469 567 444 536 444 512 C444 488 469 457 512 422Z" fill="${card}"/>
<path d="M512 475 C531 490 542 502 542 512 C542 522 531 534 512 549 C493 534 482 522 482 512 C482 502 493 490 512 475Z" fill="${star}"/>
${pride ? `<g opacity=".86"><rect x="410" y="780" width="34" height="5" rx="2.5" fill="#D39B9A"/><rect x="444" y="780" width="34" height="5" fill="#DFB18D"/><rect x="478" y="780" width="34" height="5" fill="#D8C29A"/><rect x="512" y="780" width="34" height="5" fill="#9FB9A4"/><rect x="546" y="780" width="34" height="5" fill="#92AFC9"/><rect x="580" y="780" width="34" height="5" rx="2.5" fill="#B3A1C8"/></g>` : ''}
</g></svg>`;
}
const designs = {
  light: { background: '#F4F0E8', card: '#141413', line: '#C9A27E', star: '#E6C9A8', pride: true },
  dark: { background: '#141413', card: '#1F1E1D', line: '#C9A27E', star: '#E6C9A8', pride: true },
  tinted: { background: '#000000', card: '#171717', line: '#F2F2F2', star: '#FFFFFF' },
  foreground: { background: null, card: 'none', line: '#C9A27E', star: '#E6C9A8', scale: .82 },
  monochrome: { background: null, card: 'none', line: '#FFFFFF', star: '#FFFFFF', scale: .82 },
};
for (const [name, config] of Object.entries(designs)) {
  const svg = icon(config);
  await writeFile(new URL(`app-icon-${name}.svg`, source), svg);
  const target = name === 'light' ? 'icon.png' : name === 'foreground' ? 'android-icon-foreground.png' : name === 'monochrome' ? 'android-icon-monochrome.png' : `icon-${name}.png`;
  let image = sharp(Buffer.from(svg));
  if (config.background) image = image.flatten({background: config.background});
  await image.png().toFile(new URL(target, out).pathname);
}
await sharp({create: {width: 1024, height: 1024, channels: 3, background: '#141413'}}).png().toFile(new URL('android-icon-background.png', out).pathname);
await sharp(Buffer.from(icon({...designs.dark, scale: 1.12}))).resize(64,64).png().toFile(new URL('favicon.png',out).pathname);
await sharp(Buffer.from(icon({...designs.light, background: null}))).png().toFile(new URL('splash-icon.png',out).pathname);
await sharp(await readFile(new URL('app-icon-notification.svg', source)))
  .png().toFile(new URL('notification-icon.png', out).pathname);
