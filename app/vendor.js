// FIRE LoL — prépare renderer/vendor/ avant de lancer ou compiler l'app (npm run vendor).
// Copie les bibliothèques tierces, les polices de la V2 (Inter, Cinzel : licence OFL, en local)
// et construit le jeu d'icônes Lucide de la V2 à partir de renderer/v2/icons.json.
'use strict';
const fs = require('fs');
const path = require('path');

const R = (...p) => path.join(__dirname, ...p);
const OUT = R('renderer', 'vendor');
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });

// ---------- Bibliothèques ----------
fs.copyFileSync(R('node_modules/d3/dist/d3.min.js'), path.join(OUT, 'd3.min.js'));
fs.copyFileSync(R('node_modules/peerjs/dist/peerjs.min.js'), path.join(OUT, 'peerjs.min.js'));
fs.copyFileSync(R('node_modules/mp4-muxer/build/mp4-muxer.js'), path.join(OUT, 'mp4-muxer.js')); // clips instantanés
const W = R('node_modules/@sapphi-red/web-noise-suppressor/dist');
fs.copyFileSync(path.join(W, 'rnnoise/workletProcessor.js'), path.join(OUT, 'rnnoise-worklet.js'));
fs.copyFileSync(path.join(W, 'rnnoise.wasm'), path.join(OUT, 'rnnoise.wasm'));
fs.copyFileSync(path.join(W, 'rnnoise_simd.wasm'), path.join(OUT, 'rnnoise_simd.wasm'));

// ---------- Polices de la V2 : sous-ensembles latin + latin-ext seulement ----------
const FONTS = [['inter', [400, 600, 700]], ['cinzel', [600]]];
let css = '/* Généré par vendor.js : Inter et Cinzel (Fontsource, licence SIL OFL 1.1). */\n';
for (const [fam, weights] of FONTS) {
  const dir = R('node_modules/@fontsource', fam);
  for (const w of weights) {
    const src = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8');
    for (const block of src.split('/*').slice(1)) {
      const name = (block.match(/^\s*([\w-]+)\s*\*\//) || [])[1] || '';
      if (!/-(latin|latin-ext)-\d+-normal$/.test(name)) continue;
      const file = `${name}.woff2`;
      fs.copyFileSync(path.join(dir, 'files', file), path.join(OUT, 'fonts', file));
      const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
      const family = fam === 'inter' ? 'Inter' : 'Cinzel';
      css += `@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${w};src:url(./fonts/${file}) format('woff2');${range ? `unicode-range:${range};` : ''}}\n`;
    }
  }
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), css);

// ---------- Icônes Lucide de la V2 ----------
const dict = JSON.parse(fs.readFileSync(R('renderer/v2/icons.json'), 'utf8'));
const names = new Set();
for (const [group, map] of Object.entries(dict)) {
  if (!map || typeof map !== 'object' || group === 'aliases' || group === 'revisions') continue;
  Object.values(map).forEach((n) => names.add(n));
}
['Moon', 'ChevronUp', 'Minus', 'Users', 'LayoutGrid', 'Flame', 'ArrowLeftRight', 'Droplet', 'Wheat', 'CircleCheck', 'CircleX', 'BicepsFlexed', 'Compass', 'TrendingDown', 'Award', 'Turtle', 'Lightbulb', 'Save', 'Download', 'Circle', 'ExternalLink', 'Square', 'Network', 'Heart'].forEach((n) => names.add(n)); // utilisées par le cadre V2
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').replace(/([a-zA-Z])([0-9])/g, '$1-$2').toLowerCase();
const icons = {};
for (const n of names) {
  const f = R('node_modules/lucide-static/icons', kebab(n) + '.svg');
  if (!fs.existsSync(f)) throw new Error('Icône Lucide introuvable : ' + n);
  const svg = fs.readFileSync(f, 'utf8');
  icons[n] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s+/g, ' ').trim();
}
fs.writeFileSync(path.join(OUT, 'lucide.js'),
  '// Généré par vendor.js à partir de lucide-static (licence ISC).\n' +
  `window.FIRE_LUCIDE = ${JSON.stringify(icons)};\nwindow.FIRE_ICONS = ${JSON.stringify(dict)};\n`);
console.log(`vendor : ${names.size} icônes, polices ${FONTS.map((f) => f[0]).join(' + ')}`);
