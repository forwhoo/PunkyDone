const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
// There's a missing </div> or something. Let me just re-write the exact segment by finding the text and replacing properly.
let target = `</PopoverContent>
                    </Popover>
                    <Popover>`;
let replace = `</PopoverContent>
                    </Popover>
                    <Popover>`;
spotlight = spotlight.replace(target, replace);
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
