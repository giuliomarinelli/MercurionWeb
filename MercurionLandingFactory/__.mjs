#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(
  'dist/MercurionLandingFactory/browser'
);

// directory che NON sono codici HTTP
const SKIP_DIRS = new Set([
  'fonts',
  'logo'
]);

function fixHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  // base href
  html = html.replace(
    /<base href="[^"]*">/g,
    '<base href="../">'
  );

  // href="/xxx" → href="../xxx"
  html = html.replace(
    /href="\/([^"]+)"/g,
    'href="../$1"'
  );

  // src="/xxx" → src="../xxx"
  html = html.replace(
    /src="\/([^"]+)"/g,
    'src="../$1"'
  );

  // url(/fonts/...) → url(../fonts/...)
  html = html.replace(
    /url\(\s*\/fonts\//g,
    'url(../fonts/'
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('✔ patched', filePath);
}

function walk() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    // solo directory numeriche (400, 404, ecc)
    if (!/^\d+$/.test(entry.name)) continue;

    const htmlPath = path.join(ROOT, entry.name, 'index.html');
    if (fs.existsSync(htmlPath)) {
      fixHtml(htmlPath);
    }
  }
}

walk();
