const fs = require('fs');

const path = 'src/dashboard/dashboard-html.ts';
let raw = fs.readFileSync(path, 'utf8');
const isCrlf = raw.includes('\r\n');
let text = raw.replace(/\r\n/g, '\n');

text = text.replace(
  '<span style="font-weight: 800; font-size: 15.5px; color: #FFFFFF; letter-spacing: -0.2px;">Payment Rail Fee Model</span>',
  '<span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">Payment Rail Fee Model</span>'
);

text = text.replace(
  '<div style="font-size: 12px; color: #94A3B8; margin-top: 4px; font-weight: 500;">Configure settlement rails & estimate savings</div>',
  '<div style="font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 500;">Configure settlement rails & estimate savings</div>'
);

text = text.replace(
  'background: rgba(147, 51, 234, 0.18);\n      border: 1px solid rgba(168, 85, 247, 0.4);\n      color: #C084FC;',
  'background: #F3E8FF;\n      border: 1px solid #E9D5FF;\n      color: #7E22CE;'
);

text = text.replace(
  'color: #94A3B8;\n      text-align: center;',
  'color: #475569;\n      font-weight: 700;\n      text-align: center;'
);

if (isCrlf) text = text.replace(/\n/g, '\r\n');
fs.writeFileSync(path, text, 'utf8');
console.log('Fee model styling successfully updated!');
