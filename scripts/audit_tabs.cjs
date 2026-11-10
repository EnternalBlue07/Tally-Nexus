const fs = require('fs');

const content = fs.readFileSync('D:/tally-nexus/src/dashboard/dashboard-html.ts', 'utf8');
const lines = content.split('\n');

console.log('--- FINDING TAB CONTENT SECTIONS ---');
lines.forEach((line, idx) => {
  if (line.includes('class="tab-content"') || line.includes("class='tab-content'")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('\n--- FINDING ALL .metric-value OCCURRENCES ---');
lines.forEach((line, idx) => {
  if (line.includes('metric-value')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
