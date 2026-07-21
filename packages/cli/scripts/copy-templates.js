const path = require('path');
const fs = require('fs-extra');

const root = path.resolve(__dirname, '../../..');
const templatesSrc = path.join(root, 'templates');
const templatesDest = path.resolve(__dirname, '../dist/templates');

if (!fs.existsSync(templatesSrc)) {
  console.error(`Templates directory not found: ${templatesSrc}`);
  process.exit(1);
}

fs.ensureDirSync(templatesDest);
fs.emptyDirSync(templatesDest);

fs.copySync(templatesSrc, templatesDest, {
  filter: (srcPath) => {
    const base = path.basename(srcPath);
    return base !== 'node_modules' && base !== '.turbo' && base !== '.cache';
  },
});

console.log(`Copied templates to ${templatesDest}`);
