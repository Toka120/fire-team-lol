// Construit app/m/fire-web.js (la version téléphone) : node web/build.mjs
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const shim = (n) => path.join(here, 'shim', n);
await esbuild.build({
  entryPoints: [path.join(here, 'fire-web.js')],
  bundle: true, format: 'iife', platform: 'browser', target: ['safari15', 'chrome100'],
  outfile: path.join(here, '..', 'app', 'm', 'fire-web.js'), minify: true, legalComments: 'none',
  alias: { electron: shim('electron.js'), fs: shim('fs.js'), crypto: shim('crypto.js'), zlib: shim('zlib.js'), path: 'path-browserify' },
  inject: [shim('buffer-global.js')],
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [path.join(here, 'node_modules')],
  logLevel: 'warning',
});
console.log('app/m/fire-web.js construit');
