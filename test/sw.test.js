// node test/sw.test.js — que la precarga del service worker no se quede corta (heredado de captura).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
const FUERA = new Set(['sw.js', 'servidor-local.js']);
const modulos = readdirSync(raiz).filter(f => f.endsWith('.js') && !FUERA.has(f));
assert.ok(modulos.length > 0);
for (const m of modulos) assert.ok(sw.includes(`'./${m}'`), `sw.js precarga ${m}`);
assert.ok(sw.includes(`'./esquema.json'`), 'sw.js precarga esquema.json');
assert.ok(/const CACHE = 'minsa-proyectos-v(\d+)'/.test(sw), 'sw.js versiona su caché');
assert.ok(!/\.addAll\s*\(/.test(sw), 'sin addAll: pasa por la caché HTTP');
assert.ok(/cache:\s*'reload'/.test(sw), 'cada petición del armazón lleva cache: reload');
assert.ok(!/graph\.microsoft\.com|login\.microsoftonline\.com/.test(sw), 'el sw no menciona Graph ni login');
// obs. 595 (2026-09-13): el numero de version vive en dos archivos y se desincronizo en v0.15.1; la unica guarda que aguanta es esta.
const version = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')).version;
const m = /export const VERSION = '([^']+)'/.exec(readFileSync(join(raiz, 'comun.js'), 'utf8'));
assert.ok(m && m[1] === version, `comun.js VERSION (${m && m[1]}) debe ser igual a package.json version (${version})`);
// S-07 (v0.76.0): el <script> de MSAL lleva integrity; si alguien sube el vendor y no toca el atributo, el navegador
// lo rechaza en silencio y la app no arranca. Aqui se coteja contra los bytes del archivo, en los tres HTML que lo cargan.
import { createHash } from 'node:crypto';
const sri = 'sha256-' + createHash('sha256').update(readFileSync(join(raiz, 'vendor', 'msal-browser.min.js'))).digest('base64');
for (const html of ['index.html', '../herramientas-dev/provisionar.html', '../herramientas-dev/sembrar.html']) {
  const tag = /<script src="\.\/vendor\/msal-browser\.min\.js"([^>]*)>/.exec(readFileSync(join(raiz, html), 'utf8'));
  assert.ok(tag, `${html} carga el vendor de MSAL`);
  assert.ok(tag[1].includes(`integrity="${sri}"`), `${html}: integrity del vendor de MSAL debe ser ${sri}`);
}
console.log('sw: ok');
