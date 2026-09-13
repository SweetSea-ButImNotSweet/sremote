import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToDelete = [
  'docs/content/guides/vi/00-developer-overview.md',
  'docs/content/guides/vi/01-iframe-setup.md',
  'docs/content/guides/vi/02-compatibility-check.md',
  'docs/content/guides/vi/03-wrapper-integration.md',
  'docs/content/guides/vi/04-testing-debugging.md',
  'docs/content/guides/vi/05-ux-best-practices.md',
  'docs/content/guides/vi/06-troubleshooting.md',
  'docs/content/guides/vi/errors.md',
  'docs/content/guides/en/00-developer-overview.md',
  'docs/content/guides/en/01-iframe-setup.md',
  'docs/content/guides/en/02-compatibility-check.md',
  'docs/content/guides/en/03-wrapper-integration.md',
  'docs/content/guides/en/04-testing-debugging.md',
  'docs/content/guides/en/05-ux-best-practices.md',
  'docs/content/guides/en/06-troubleshooting.md',
  'docs/content/guides/en/errors.md',
  // Xóa các file script tạm đã dùng để port
  'scripts/port-matrix.js',
  'scripts/clean-matrix-vi.js',
  'scripts/create-en-matrix.js'
];

let deletedCount = 0;
for (const relPath of filesToDelete) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Deleted: ${relPath}`);
    deletedCount++;
  }
}

console.log(`\nSuccessfully deleted ${deletedCount} files according to Option B.`);
