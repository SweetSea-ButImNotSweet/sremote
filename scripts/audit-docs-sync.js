import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

const viBase = path.join(__dirname, '../docs/content/guides/vi');
const enBase = path.join(__dirname, '../docs/content/guides/en');

const viFiles = getFiles(viBase).map(f => path.relative(viBase, f).replace(/\\/g, '/')).sort();
const enFiles = getFiles(enBase).map(f => path.relative(enBase, f).replace(/\\/g, '/')).sort();

console.log('VI Guide files (' + viFiles.length + '):');
console.log(viFiles.join('\n'));

console.log('\nEN Guide files (' + enFiles.length + '):');
console.log(enFiles.join('\n'));

const missingInEn = viFiles.filter(f => !enFiles.includes(f));
const missingInVi = enFiles.filter(f => !viFiles.includes(f));

console.log('\nMissing in EN:', missingInEn.length === 0 ? 'None (100% matched!)' : missingInEn);
console.log('Missing in VI:', missingInVi.length === 0 ? 'None (100% matched!)' : missingInVi);

if (missingInEn.length === 0 && missingInVi.length === 0) {
  console.log('\n>>> All guide documentation files are in 1:1 sync between VI and EN! <<<');
}
