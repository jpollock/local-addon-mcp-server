#!/usr/bin/env node
/**
 * Uninstall addon from Local's addons directory
 * Removes the development symlink
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getAddonsPath() {
  switch (os.platform()) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support', 'Local', 'addons');
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Local', 'addons');
    case 'linux':
      return path.join(os.homedir(), '.config', 'Local', 'addons');
    default:
      throw new Error(`Unsupported platform: ${os.platform()}`);
  }
}

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const addonName = pkg.name;
const targetPath = path.join(getAddonsPath(), addonName);

console.log(`\n🗑️  Uninstalling ${addonName} from Local...\n`);

if (fs.existsSync(targetPath)) {
  fs.rmSync(targetPath, { recursive: true });
  console.log(`✅ Removed ${targetPath}\n`);
} else {
  console.log(`⚠️  Addon not found at ${targetPath}\n`);
}

console.log(`Restart Local for changes to take effect.\n`);
