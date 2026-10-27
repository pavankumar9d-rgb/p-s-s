const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const copyFiles = [
  'index.html',
  'manifest.json',
  'sw.js',
  'preethi.png',
  'a_stylized_3d_digital_art_character_inspired_by_the_person_in_the_photo._the.png',
  'game_background_city.png',
  'train_obstacle_yellow.png'
];

const copyDirs = ['src', 'models'];

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

rmrf(www);
fs.mkdirSync(www, { recursive: true });

for (const f of copyFiles) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) copyFile(src, path.join(www, f));
}

for (const d of copyDirs) {
  copyDir(path.join(root, d), path.join(www, d));
}

console.log('Synced web assets to www/');
