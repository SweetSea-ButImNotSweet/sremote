import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.resolve(rootDir, 'tarballs');

console.log('📦 Starting SRemote packaging process...\n');

// 1. Build all workspace packages first
console.log('🔨 Step 1: Building all packages...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 2. Ensure output directory exists and is clean
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  // Clear older .tgz files in tarballs/
  const existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.tgz'));
  for (const file of existingFiles) {
    fs.unlinkSync(path.join(outputDir, file));
  }
}

// 3. Define packages to pack
const packagesToPack = [
  { name: '@sremote/wrapper', dir: path.resolve(rootDir, 'packages/wrapper') },
  { name: '@sremote/ready2use', dir: path.resolve(rootDir, 'packages/ready2use') },
];

console.log('\n📦 Step 2: Packaging npm tarballs into tarballs/ directory...');

const generatedTarballs = [];

for (const pkg of packagesToPack) {
  console.log(`\n  Packing ${pkg.name}...`);
  const output = execSync(`npm pack --pack-destination "${outputDir}"`, { cwd: pkg.dir, encoding: 'utf-8' });
  const filename = output.trim().split('\n').pop().trim();
  generatedTarballs.push(filename);
  console.log(`  ✓ Generated: ${filename}`);
}

// Also copy userscript outputs to tarballs/ if desired for releases
const distDir = path.resolve(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  const userScripts = fs.readdirSync(distDir).filter(f => f.endsWith('.user.js'));
  for (const script of userScripts) {
    fs.copyFileSync(path.join(distDir, script), path.join(outputDir, script));
    console.log(`  ✓ Included: ${script}`);
  }
}

console.log('\n🎉 Packaging complete! Files in tarballs/:');
fs.readdirSync(outputDir).forEach(f => console.log(` - tarballs/${f}`));
