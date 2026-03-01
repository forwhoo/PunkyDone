const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n<Popover>', '</PopoverContent>\n</Popover>\n\n<Popover>');
// Fix mistralService compilation issue
let mistral = fs.readFileSync('services/mistralService.ts', 'utf8');
mistral = mistral.replace(/reasonably implied\.\\n\\nYou are \*\*Harvey\*\*/, 'reasonably implied.`\n\nconst AGENT_SYSTEM_PROMPT = `You are **Harvey**');
fs.writeFileSync('services/mistralService.ts', mistral, 'utf8');
