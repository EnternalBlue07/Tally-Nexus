const fs = require('fs');
const path = require('path');

const REPO_ROOT = 'D:/tally-nexus';

function getAllFiles(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist') {
        res = res.concat(getAllFiles(full));
      }
    } else {
      res.push(full);
    }
  }
  return res;
}

const allFiles = getAllFiles(REPO_ROOT);
console.log('Total files indexed across repository:', allFiles.length);

const fileMap = new Map();
allFiles.forEach(f => {
  const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
  const base = path.basename(f);
  fileMap.set(base, rel);
  // also map relative path itself
  fileMap.set(rel, rel);
});

// Also explicitly map Dockerfile and render.yaml
fileMap.set('Dockerfile', 'Dockerfile');
fileMap.set('render.yaml', 'render.yaml');

const allMds = allFiles.filter(f => f.endsWith('.md'));

let totalLinksChecked = 0;
let totalLinksFixed = 0;
const brokenLinks = [];

allMds.forEach(filePath => {
  const fileDir = path.dirname(filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, rawTarget) => {
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('mailto:') || rawTarget.startsWith('#')) {
      return match;
    }

    totalLinksChecked++;

    let [targetPath, anchor] = rawTarget.split('#');
    anchor = anchor ? '#' + anchor : '';

    // Strip absolute URI scheme if present
    targetPath = targetPath.replace(/^file:\/\/\/[a-zA-Z]:\/tally-nexus\//i, '');
    
    // Check if target is a known file
    const baseName = path.basename(targetPath);
    let matchedRel = fileMap.get(targetPath) || fileMap.get(baseName);

    if (!matchedRel) {
      // Check relative to current file dir
      const directResolved = path.resolve(fileDir, targetPath);
      if (fs.existsSync(directResolved)) {
        return match;
      }
      brokenLinks.push({ from: path.relative(REPO_ROOT, filePath), target: rawTarget });
      return match;
    }

    const actualFullPath = path.join(REPO_ROOT, matchedRel);
    let newRelPath = path.relative(fileDir, actualFullPath).replace(/\\/g, '/');
    if (!newRelPath.startsWith('.')) {
      newRelPath = './' + newRelPath;
    }

    const newTarget = newRelPath + anchor;
    if (newTarget !== rawTarget) {
      totalLinksFixed++;
      modified = true;
      return `[${linkText}](${newTarget})`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('=== COMPLETE LINK REPAIR RESULTS ===');
console.log('Total Links Checked:', totalLinksChecked);
console.log('Total Links Fixed:', totalLinksFixed);
console.log('Remaining Broken Links:', brokenLinks.length);
if (brokenLinks.length > 0) {
  console.log('Broken Links Details:', brokenLinks);
}
