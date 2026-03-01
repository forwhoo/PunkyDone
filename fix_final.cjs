const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

// Because `<PopoverContent` was split across lines by prettier.
spotlight = spotlight.replace(/<PopoverContent\n<PopoverContent/, '<PopoverContent');

fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
