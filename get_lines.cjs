const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
let lines = spotlight.split('\n');
for(let i=110; i<130; i++) {
    console.log(i + ": " + lines[i]);
}
