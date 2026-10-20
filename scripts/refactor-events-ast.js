import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const RENAME_MAP = {
  extractMediaState: 'captureMediaSnapshot',
  createEventPayload: 'buildEventEnvelope',
  isValidMediaElement: 'assertValidMediaElement',
  hasMediaSource: 'hasActiveMediaSource',
  resolveIsProgrammatic: 'detectProgrammaticOrigin',
  bindMediaEvents: 'attachDomMediaListeners',
  wrapCustomAdapter: 'decorateCustomAdapter',
};

const TARGET_DIRECTORIES = [path.resolve('packages/shared/src'), path.resolve('packages/sdk/src'), path.resolve('packages/userscript/src'), path.resolve('packages/ready2use/src')];

const EXCLUDED_FILES = [
  path.resolve('packages/shared/src/events.js'), // File gốc đang chuẩn bị refactor
];

/**
 * Collects all source files recursively.
 */
function getAllSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (/\.(js|mjs|ts|d\.ts)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Checks whether a node is a declaration of an identifier that we shouldn't rename out of context.
 */
function shouldRenameIdentifier(node) {
  const name = node.text;
  if (!RENAME_MAP[name]) return false;

  // Don't rename object property keys if they are literal member accesses like obj.extractMediaState,
  // UNLESS it's an import/export specifier or a direct function call/reference.
  const parent = node.parent;
  if (!parent) return true;

  // Property access expression: obj.prop (only rename if identifier is not the property name, or if it's namespace access)
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    // If accessing actions.wrapAdapter or dom.isValid, don't rename the property unless explicitly intended
    return false;
  }

  // Method declaration on unrelated class/object: { extractMediaState() {} }
  if (ts.isMethodDeclaration(parent) && parent.name === node) {
    return false;
  }

  return true;
}

/**
 * Transform source file using TypeScript AST Walker.
 */
function transformFile(filePath, isDryRun = true) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true, // setParentNodes
    filePath.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );

  const replacements = [];

  function visit(node) {
    if (ts.isIdentifier(node)) {
      const oldName = node.text;
      if (RENAME_MAP[oldName] && shouldRenameIdentifier(node)) {
        replacements.push({ start: node.getStart(sourceFile), end: node.getEnd(), oldName, newName: RENAME_MAP[oldName] });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (replacements.length === 0) {
    return 0;
  }

  // Sort replacements from end to start so offsets remain valid
  replacements.sort((a, b) => b.start - a.start);

  let newContent = content;
  for (const r of replacements) {
    newContent = newContent.slice(0, r.start) + r.newName + newContent.slice(r.end);
  }

  console.log(`\n📄 [${isDryRun ? 'DRY-RUN' : 'APPLIED'}] ${path.relative(process.cwd(), filePath)}: ${replacements.length} identifier(s)`);
  const previewMap = new Map();
  for (const r of replacements) {
    previewMap.set(r.oldName, (previewMap.get(r.oldName) || 0) + 1);
  }
  for (const [oldName, count] of previewMap.entries()) {
    console.log(`   - ${oldName} -> ${RENAME_MAP[oldName]} (${count}x)`);
  }

  if (!isDryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  return replacements.length;
}

// CLI Execution
const args = process.argv.slice(2);
const isDryRun = !args.includes('--write');

console.log(`🚀 Starting AST Codemod for SRemote Events (${isDryRun ? 'DRY-RUN MODE' : 'WRITE MODE'})...\n`);
console.log('Mapping Table:');
console.table(RENAME_MAP);

let totalFilesChanged = 0;
let totalReplacements = 0;

for (const dir of TARGET_DIRECTORIES) {
  const files = getAllSourceFiles(dir);
  for (const file of files) {
    if (EXCLUDED_FILES.includes(path.resolve(file))) continue;
    const count = transformFile(file, isDryRun);
    if (count > 0) {
      totalFilesChanged++;
      totalReplacements += count;
    }
  }
}

console.log('\n----------------------------------------');
console.log(`✨ Summary: ${totalReplacements} identifier(s) across ${totalFilesChanged} file(s).`);
if (isDryRun) {
  console.log('💡 Run with `node scripts/refactor-events-ast.js --write` to apply changes.');
} else {
  console.log('✅ Changes successfully written to disk.');
}
