const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

let target = `</PopoverContent>
</Popover>
<Popover>`;

let replace = `</PopoverContent>
</Popover>
</div>
<Popover>`;

spotlight = spotlight.replace(target, replace);
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
