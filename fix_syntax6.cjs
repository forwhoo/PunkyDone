const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
// Fix popover issue again
spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n<Popover>', '</PopoverContent>\n</Popover>\n<Popover>');
// there was an extra </Popover> before <Popover> that causes syntax error
spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n<Popover>', '</PopoverContent>\n<Popover>');
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
