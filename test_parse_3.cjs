const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
let lines = spotlight.split('\n');
// Let's just output around 150-160
for (let i = 150; i < 160; i++) {
    console.log(i + ": " + lines[i]);
}
