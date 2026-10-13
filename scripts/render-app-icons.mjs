// Source vectors remain editable. Native launchers provide their own corner masks.
import sharp from 'sharp';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
const out = new URL('../apps/app/assets/', import.meta.url);
const source = new URL('../design/assets/', import.meta.url);
await mkdir(source, { recursive: true });
function icon({background, card, line, star, scale = 1}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
<rect x="302" y="166" width="420" height="692" rx="67" fill="${card}" stroke="${line}" stroke-width="19"/>
<rect x="329" y="193" width="366" height="638" rx="44" fill="none" stroke="${line}" stroke-width="3" opacity=".5"/>
<circle cx="512" cy="512" r="109" fill="none" stroke="${line}" stroke-width="5" opacity=".65"/>
<path d="M512 402 540 484 622 512 540 540 512 622 484 540 402 512 484 484Z" fill="${star}"/>
</g></svg>`;
}
const designs = {
  light: { background: '#F4F0E8', card: '#141413', line: '#C9A27E', star: '#E6C9A8' },
  dark: { background: '#141413', card: '#1F1E1D', line: '#C9A27E', star: '#E6C9A8' },
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
await sharp(Buffer.from(icon(designs.dark))).resize(64,64).png().toFile(new URL('favicon.png',out).pathname);
await sharp(Buffer.from(icon({...designs.light, background: null}))).png().toFile(new URL('splash-icon.png',out).pathname);
await sharp(await readFile(new URL('app-icon-notification.svg', source)))
  .png().toFile(new URL('notification-icon.png', out).pathname);
