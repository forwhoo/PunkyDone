const fs = require('fs');

// Fix mistralService.ts escaping issue
let mistral = fs.readFileSync('services/mistralService.ts', 'utf8');
mistral = mistral.replace(/using the `ai_tool_maker` tool/, 'using the \\`ai_tool_maker\\` tool');
mistral = mistral.replace(/reasonably implied\.You are \*\*Harvey\*\*/, 'reasonably implied.\\n\\nYou are **Harvey**');
fs.writeFileSync('services/mistralService.ts', mistral, 'utf8');

// Fix AISpotlight.tsx popover issue
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
spotlight = spotlight.replace(/<\/PopoverContent> <\/Popover> <Popover>/, '</PopoverContent>\n</Popover>\n<Popover>');
fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
