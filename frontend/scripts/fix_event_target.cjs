const fs = require('fs');
const path = require('path');

function findAllFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(findAllFiles(fullPath));
    } else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !item.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  });
  return files;
}

function fixEventTarget(content) {
  let fixed = content;
  
  // Fix: e.target.blur() => (e.target as HTMLElement).blur()
  fixed = fixed.replace(/e\.target\.blur\(\)/g, '(e.target as HTMLElement).blur()');
  
  // Fix: e.target.value => (e.target as HTMLInputElement).value
  fixed = fixed.replace(/e\.target\.value/g, '(e.target as HTMLInputElement).value');
  
  // Fix: e.target.checked => (e.target as HTMLInputElement).checked
  fixed = fixed.replace(/e\.target\.checked/g, '(e.target as HTMLInputElement).checked');
  
  return fixed;
}

const srcDir = path.join(process.cwd(), 'src');
const allFiles = findAllFiles(srcDir);

let count = 0;
allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fixed = fixEventTarget(content);
  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    count++;
  }
});

console.log(`Fixed EventTarget in ${count} files`);
