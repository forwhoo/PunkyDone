const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
// Fix popover issue again
spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n<Popover>', '</PopoverContent>\n</Popover>\n                <Popover>');
spotlight = spotlight.replace('</PopoverContent> </Popover> <Popover>', '</PopoverContent>\n                    </Popover>\n                    <Popover>');
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
