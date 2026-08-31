import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const recipesDir = path.join(__dirname, '..', 'docs', 'recipes');
const commentsPath = path.join(recipesDir, 'comments-i18n.json');

const commentsDict = JSON.parse(fs.readFileSync(commentsPath, 'utf8'));
const dirs = fs.readdirSync(recipesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let untaggedCount = 0;
let taggedCount = 0;
let missingKeys = new Set();

for (const dir of dirs) {
  const dirPath = path.join(recipesDir, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js') || f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) {
        const match = trimmed.match(/\/\/\s*\[(cmt_[a-zA-Z0-9_]+)\]/);
        if (match) {
          taggedCount++;
          const tag = match[1];
          if (!commentsDict[tag]) {
            missingKeys.add(tag);
            console.error(`❌ Missing key in comments-i18n.json: ${tag} (${dir}/${file}:${idx + 1})`);
          }
        } else {
          untaggedCount++;
          console.warn(`⚠️ Untagged comment in ${dir}/${file}:${idx + 1} -> ${trimmed}`);
        }
      }
    });
  }
}

console.log('\n--- VERIFICATION RESULT ---');
console.log(`✅ Total tagged i18n comments: ${taggedCount}`);
console.log(`⚠️ Untagged comments: ${untaggedCount}`);
console.log(`❌ Missing dictionary keys: ${missingKeys.size}`);
