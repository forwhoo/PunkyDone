const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
// The issue is an unmatched parenthesis or tag. Let's see.
// The file is currently broken into a single line at line 74 mostly.

spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n<Popover>', '</PopoverContent>\n</Popover>\n<Popover>');

// Let's format it and get exactly the location.
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
