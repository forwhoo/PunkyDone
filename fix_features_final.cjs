const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

// Just remove all popover weirdness at end of file if any.
let lines = spotlight.split('\n');

let firstError = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<ChatContainerContent')) {
        firstError = i;
        break;
    }
}

if (firstError !== -1) {
    for(let i=firstError-10; i<firstError; i++) {
        if(i >= 0 && lines[i].includes('</Popover>')) {
            // we have stray </Popover> tags
            // Let's count <Popover> vs </Popover> globally
        }
    }
}

let open = 0;
let closed = 0;
for(let i=0; i<lines.length; i++) {
    let line = lines[i];
    open += (line.match(/<Popover>/g) || []).length;
    closed += (line.match(/<\/Popover>/g) || []).length;
}
console.log("Popover count:", open, closed);

let diff = closed - open;
if (diff > 0) {
    for (let i = lines.length - 1; i >= 0 && diff > 0; i--) {
        if (lines[i].includes('</Popover>')) {
            lines[i] = lines[i].replace('</Popover>', '');
            diff--;
        }
    }
}

fs.writeFileSync('components/AISpotlight.tsx', lines.join('\n'), 'utf8');
