const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

let tags = [];
let idx = 0;
while (idx < spotlight.length) {
    if (spotlight.substr(idx, 9) === '<Popover>') { tags.push('<Popover>'); idx += 9; continue; }
    if (spotlight.substr(idx, 10) === '</Popover>') { tags.pop(); idx += 10; continue; }
    idx++;
}
console.log("Unclosed tags:", tags);
