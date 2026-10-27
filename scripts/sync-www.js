const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const copyFiles = [
  'index.html',
  'manifest.json',
  'sw.js'
];

const copyDirs = ['src', 'assets', 'models'];

function copyFile(src, dest) {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  } catch (err) {
    console.warn(`Could not copy ${src} -> ${dest}:`, err.message);
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

fs.mkdirSync(www, { recursive: true });

for (const f of copyFiles) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) copyFile(src, path.join(www, f));
}

for (const d of copyDirs) {
  copyDir(path.join(root, d), path.join(www, d));
}

console.log('Successfully synced assets and code to www/');
