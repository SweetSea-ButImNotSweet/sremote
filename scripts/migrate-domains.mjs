import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const TARGET_FILES = [
  'packages/sdk/src/strategies/dom.js',
  'packages/sdk/src/client.js',
  'packages/userscript/src/iframe/media-hunter.js',
  'packages/userscript/src/iframe/controller.js',
  'packages/userscript/src/iframe/index.js',
  'packages/userscript/src/parent/top-media.js',
  'packages/userscript/src/parent/index.js',
  'packages/userscript/src/parent/api.js',
  'packages/userscript/src/config.js',
];

// Map of legacy identifier to domain member
const DOMAIN_MAP = {
  // dom
  resolveMediaElement: { domain: 'dom', prop: 'resolve' },
  queryMediaDeep: { domain: 'dom', prop: 'query' },
  findAllMedia: { domain: 'dom', prop: 'findAll' },
  createMediaWatcher: { domain: 'dom', prop: 'watch' },
  isValidMediaElement: { domain: 'dom', prop: 'isValid' },
  hasMediaSource: { domain: 'dom', prop: 'hasSource' },

  // state
  extractMediaState: { domain: 'state', prop: 'get' },
  createEventPayload: { domain: 'state', prop: 'createPayload' },

  // capabilities
  evaluateCapabilities: { domain: 'capabilities', prop: 'get' },

  // actions
  executeMediaAction: { domain: 'actions', prop: 'execute' },
  safePlayMedia: { domain: 'actions', prop: 'safePlay' },
  safePauseMedia: { domain: 'actions', prop: 'safePause' },
  wrapCustomAdapter: { domain: 'actions', prop: 'wrapAdapter' },

  // events
  bindMediaEvents: { domain: 'events', prop: 'bind' },

  // pipeline
  getGlobalTransactionTracker: { domain: 'pipeline', prop: 'getTracker' },
  createTransactionTracker: { domain: 'pipeline', prop: 'createTracker' },
  ActionTransactionTracker: { domain: 'pipeline', prop: 'Tracker' },

  // instance
  createInstanceManager: { domain: 'instance', prop: 'createManager' },
  generateInstanceId: { domain: 'instance', prop: 'generateId' },

  // logging
  createLogger: { domain: 'logger', prop: 'create' },
  LOG_LEVELS: { domain: 'logger', prop: 'LEVELS' },
  defaultLogger: { domain: 'logger', prop: 'default' },
  resolveLogLevel: { domain: 'logger', prop: 'resolveLevel' },
  getGlobalLogLevelOverride: { domain: 'logger', prop: 'getGlobalOverride' },

  // constants
  SREMOTE_ACTIONS: { domain: 'constants', prop: 'ACTIONS' },
  SREMOTE_EVENTS: { domain: 'constants', prop: 'EVENTS' },
  SREMOTE_STORAGE_KEYS: { domain: 'constants', prop: 'STORAGE_KEYS' },
};

function migrateFile(relPath) {
  const absPath = path.join(rootDir, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`[SKIP] Not found: ${relPath}`);
    return;
  }

  let code = fs.readFileSync(absPath, 'utf8');

  // Regex to match import { ... } from '@sremote/shared';
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@sremote\/shared['"];?/;
  const match = code.match(importRegex);

  if (!match) {
    console.log(`[NO_IMPORT] ${relPath}`);
    return;
  }

  const rawImports = match[1];
  const importedTokens = rawImports
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const neededDomains = new Set();
  const unmapped = [];
  const tokenReplacements = [];

  for (const token of importedTokens) {
    // Check if alias exists: e.g. foo as bar
    const parts = token.split(/\s+as\s+/);
    const origName = parts[0].trim();
    const alias = parts[1] ? parts[1].trim() : origName;

    if (DOMAIN_MAP[origName]) {
      const { domain, prop } = DOMAIN_MAP[origName];
      neededDomains.add(domain);
      tokenReplacements.push({ origToken: alias, replacement: `${domain}.${prop}` });
    } else {
      unmapped.push(token);
    }
  }

  // Build new import statement
  const domainList = Array.from(neededDomains).sort();
  const allImports = [...domainList, ...unmapped];
  const newImport = `import { ${allImports.join(', ')} } from '@sremote/shared';`;

  // Replace import statement first
  code = code.replace(importRegex, newImport);

  // Replace usages throughout file body
  for (const { origToken, replacement } of tokenReplacements) {
    // Avoid replacing if it's already domain.prop or inside property key
    // Using word boundary regex
    const usageRegex = new RegExp(`\\b${origToken}\\b`, 'g');
    code = code.replace(usageRegex, (m, offset, fullStr) => {
      // Don't replace if it's part of the new import line
      const lineStart = fullStr.lastIndexOf('\n', offset) + 1;
      const lineEnd = fullStr.indexOf('\n', offset);
      const line = fullStr.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (line.includes("from '@sremote/shared'")) {
        return m;
      }
      // Don't replace if preceded by a dot (e.g. obj.origToken)
      if (offset > 0 && fullStr[offset - 1] === '.') {
        return m;
      }
      return replacement;
    });
  }

  fs.writeFileSync(absPath, code, 'utf8');
  console.log(`[MIGRATED] ${relPath} -> domains: [${domainList.join(', ')}]`);
}

for (const f of TARGET_FILES) {
  migrateFile(f);
}
console.log('Codemod finished successfully.');
