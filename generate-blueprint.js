const fs = require('fs');
const path = require('path');

// Directories we want to ignore to keep the blueprint clean and meaningful
const IGNORE_LIST = new Set([
  'node_modules',
  '.next',
  '.git',
  '.supabase',
  '.vercel',
  'dist',
  'out',
  '.DS_Store'
]);

function buildTree(dirPath, prefix = '') {
  let output = '';
  
  try {
    const items = fs.readdirSync(dirPath).sort((a, b) => {
      // Sort directories first, then files alphabetically
      const aStat = fs.statSync(path.join(dirPath, a));
      const bStat = fs.statSync(path.join(dirPath, b));
      if (aStat.isDirectory() && !bStat.isDirectory()) return -1;
      if (!aStat.isDirectory() && bStat.isDirectory()) return 1;
      return a.localeCompare(b);
    });

    // Filter out ignored directories/files
    const visibleItems = items.filter(item => !IGNORE_LIST.has(item));

    visibleItems.forEach((item, index) => {
      const fullPath = path.join(dirPath, item);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      const isLast = index === visibleItems.length - 1;
      
      const lineMarker = isLast ? '└── ' : '├── ';
      output += `${prefix}${lineMarker}${item}${isDirectory ? '/' : ''}\n`;

      if (isDirectory) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        output += buildTree(fullPath, nextPrefix);
      }
    });
  } catch (error) {
    output += `${prefix} [Error reading directory: ${error.message}]\n`;
  }
  
  return output;
}

console.log('Mapping codebase structure...');
const rootDir = process.cwd();
const folderName = path.basename(rootDir);
let finalBlueprint = `${folderName}/\n`;
finalBlueprint += buildTree(rootDir);

fs.writeFileSync('project-blueprint.txt', finalBlueprint, 'utf-8');
console.log('✅ Success! "project-blueprint.txt" has been created in your root directory.');