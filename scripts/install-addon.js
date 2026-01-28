#!/usr/bin/env node
/**
 * Install addon to Local's addons directory
 * Creates a symlink for development
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
const addonsPath = getAddonsPath();
const targetPath = path.join(addonsPath, addonName);

console.log(`\n📦 Installing ${addonName} to Local...\n`);

// Create addons directory if it doesn't exist
if (!fs.existsSync(addonsPath)) {
  console.log(`Creating addons directory: ${addonsPath}`);
  fs.mkdirSync(addonsPath, { recursive: true });
}

// Remove existing symlink/directory
if (fs.existsSync(targetPath)) {
  console.log(`Removing existing installation...`);
  fs.rmSync(targetPath, { recursive: true });
}

// Create symlink
const linkType = os.platform() === 'win32' ? 'junction' : 'dir';
fs.symlinkSync(ROOT, targetPath, linkType);

console.log(`✅ Linked ${ROOT}`);
console.log(`   → ${targetPath}\n`);
console.log(`Restart Local and enable the addon in Add-ons settings.\n`);
