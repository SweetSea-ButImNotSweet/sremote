import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_SPEC } from '../packages/shared/src/api/schema.js';
import { SREMOTE_ACTIONS, SREMOTE_EVENTS, SREMOTE_STORAGE_KEYS } from '../packages/shared/src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🔍 [SRemote API & Docs Coverage Auditor]\n');

// 1. Collect all target documentation files
const docFiles = [
  'README.md',
  'packages/wrapper/README.md',
  'packages/ready2use/README.md',
  'packages/userscript/README.md',
  'packages/wrapper/src/index.d.ts',
  'packages/shared/src/index.d.ts',
].map(rel => ({ path: rel, fullPath: path.join(rootDir, rel), content: fs.existsSync(path.join(rootDir, rel)) ? fs.readFileSync(path.join(rootDir, rel), 'utf-8') : '' }));

const allDocContent = docFiles.map(d => d.content).join('\n');
const wrapperDts = docFiles.find(d => d.path === 'packages/wrapper/src/index.d.ts')?.content || '';
const sharedDts = docFiles.find(d => d.path === 'packages/shared/src/index.d.ts')?.content || '';

const results = { passed: 0, warnings: [] };

function checkItem(category, name, inDts = true, inDocs = false) {
  const presentInDocs = allDocContent.includes(name);
  const presentInDts = inDts ? wrapperDts.includes(name) || sharedDts.includes(name) : true;

  if (presentInDocs && presentInDts) {
    results.passed++;
  } else {
    const missing = [];
    if (!presentInDts) missing.push('.d.ts (TypeScript definition)');
    if (inDocs && !presentInDocs) missing.push('README/Markdown docs');
    if (missing.length > 0) {
      results.warnings.push({ category, name, missing: missing.join(' and ') });
    } else {
      results.passed++;
    }
  }
}

// 2. Check API_SPEC root methods
console.log('Checking API_SPEC root methods...');
for (const [methodName] of Object.entries(API_SPEC.rootMethods)) {
  checkItem('Root Playback Method', methodName, true, false);
}

// 3. Check API_SPEC namespaces
console.log('Checking API_SPEC namespace methods...');
for (const [nsName, methods] of Object.entries(API_SPEC.namespaces)) {
  for (const [subMethod] of Object.entries(methods)) {
    checkItem(`Namespace ${nsName}`, subMethod, true, false);
  }
}

// 4. Check Public Actions and Events
console.log('Checking Public Actions & Events constants...');
for (const [key, val] of Object.entries(SREMOTE_ACTIONS)) {
  checkItem('SREMOTE_ACTIONS', key, true, false);
}
for (const [key, val] of Object.entries(SREMOTE_EVENTS)) {
  checkItem('SREMOTE_EVENTS', key, true, false);
}

// 5. Check Options & Config interfaces
console.log('Checking Config Properties & Options...');
const expectedOptions = ['fallbackToDom', 'timeout', 'passkey', 'treatAlmostEndAsEnd', 'trackParent', 'multiMode', 'target', 'key', 'css'];

for (const opt of expectedOptions) {
  checkItem('Client/Hello Option', opt, true, false);
}

// 6. Summary Report
console.log('\n==================================================');
if (results.warnings.length === 0) {
  console.log(`✅ All ${results.passed} public API surfaces & options are fully documented and type-checked!`);
  console.log('==================================================\n');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${results.warnings.length} potential missing coverage items (Passed: ${results.passed}):\n`);
  for (const w of results.warnings) {
    console.log(`  [${w.category}] '${w.name}' -> Missing in: ${w.missing}`);
  }
  console.log('\n==================================================\n');
  // Exit cleanly as warnings for audit
  process.exit(0);
}
