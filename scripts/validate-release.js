#!/usr/bin/env node
/**
 * Release Validation Script
 * Ensures the addon is ready for release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let hasErrors = false;
let hasWarnings = false;

function log(msg) {
  console.log(msg);
}

function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  hasErrors = true;
}

function warn(msg) {
  console.warn(`⚠️  WARNING: ${msg}`);
  hasWarnings = true;
}

function success(msg) {
  console.log(`✅ ${msg}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(ROOT, filePath));
}

log('\n🔍 Validating release...\n');

// 1. Check package.json
log('📦 Checking package.json...');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const requiredFields = ['name', 'version', 'productName', 'main', 'description'];
for (const field of requiredFields) {
  if (!pkg[field]) {
    error(`Missing required field: ${field}`);
  }
}

if (pkg.localAddon?.minimumLocalVersion) {
  success(`Local minimum version: ${pkg.localAddon.minimumLocalVersion}`);
} else {
  error('Missing localAddon.minimumLocalVersion');
}

// Check version format
if (!/^\d+\.\d+\.\d+(-\w+)?$/.test(pkg.version)) {
  error(`Invalid version format: ${pkg.version}`);
} else {
  success(`Version: ${pkg.version}`);
}

// 2. Check build output
log('\n🔨 Checking build output...');
const buildFiles = ['lib/main/index.js'];
for (const file of buildFiles) {
  if (fileExists(file)) {
    const stats = fs.statSync(path.join(ROOT, file));
    success(`${file} (${Math.round(stats.size / 1024)}KB)`);
  } else {
    error(`Missing build file: ${file}`);
  }
}

// 3. Check documentation
log('\n📚 Checking documentation...');
const docs = [
  { file: 'README.md', required: true },
  { file: 'CHANGELOG.md', required: true },
  { file: 'LICENSE', required: true },
  { file: 'CONTRIBUTING.md', required: false },
  { file: 'docs/USER-GUIDE.md', required: false },
  { file: 'docs/DEVELOPER-GUIDE.md', required: false },
];

for (const doc of docs) {
  if (fileExists(doc.file)) {
    success(doc.file);
  } else if (doc.required) {
    error(`Missing required doc: ${doc.file}`);
  } else {
    warn(`Missing optional doc: ${doc.file}`);
  }
}

// 4. Check for sensitive data
log('\n🔒 Scanning for sensitive data...');
const sensitivePatterns = [
  /sk-[a-zA-Z0-9]{48}/g,                    // OpenAI API key
  /anthropic[_-]?api[_-]?key/gi,            // Anthropic key reference
  /password\s*[:=]\s*["'][^"']+["']/gi,     // Hardcoded passwords
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, // Private keys
];

// Known safe patterns (false positives)
const safePatterns = [
  /wpAdminPassword\s*=\s*["']password["']/gi,  // Default WordPress admin password
];

const filesToScan = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(f => /\.(js|ts|tsx|json)$/.test(f) && !f.includes('node_modules'));

let sensitiveFound = false;
for (const file of filesToScan) {
  try {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        // Reset pattern state
        pattern.lastIndex = 0;
        // Skip false positives in mocks/tests
        if (!file.includes('__mocks__') && !file.includes('.test.') && !file.includes('.spec.')) {
          // Check if this is a known safe pattern
          const isSafe = safePatterns.some(safePattern => {
            const result = safePattern.test(content);
            safePattern.lastIndex = 0;
            return result;
          });
          if (!isSafe) {
            error(`Potential sensitive data in ${file}`);
            sensitiveFound = true;
          }
        }
      }
    }
  } catch (e) {
    // File might not exist
  }
}
if (!sensitiveFound) {
  success('No sensitive data detected');
}

// 5. Check CI/CD
log('\n🔄 Checking CI/CD configuration...');
const workflows = ['.github/workflows/ci.yml', '.github/workflows/release.yml'];
for (const workflow of workflows) {
  if (fileExists(workflow)) {
    success(workflow);
  } else {
    error(`Missing workflow: ${workflow}`);
  }
}

// 6. Run quality checks
log('\n🧪 Running quality checks...');
try {
  execSync('npm run typecheck', { cwd: ROOT, stdio: 'pipe' });
  success('TypeScript check passed');
} catch (e) {
  error('TypeScript check failed');
}

try {
  execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
  success('Lint check passed');
} catch (e) {
  warn('Lint check failed (run npm run lint:fix)');
}

// Summary
log('\n' + '='.repeat(50));
if (hasErrors) {
  log('\n❌ Release validation FAILED');
  log('   Fix the errors above before releasing.\n');
  process.exit(1);
} else if (hasWarnings) {
  log('\n⚠️  Release validation PASSED with warnings');
  log('   Consider addressing the warnings above.\n');
  process.exit(0);
} else {
  log('\n✅ Release validation PASSED');
  log('   Ready to release!\n');
  process.exit(0);
}
