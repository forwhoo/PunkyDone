const fs = require('fs');

let content = fs.readFileSync('components/BrutalistCard.tsx', 'utf8');
content = content.replace(/shadow-\[8px_8px_0px_0px_rgba\(0,0,0,1\)\]/g, ' ');
content = content.replace(/shadow-\[2px_2px_0px_0px_#000\]/g, ' ');

// Wait, the file is currently all on one line. Let me use prettier first to make it easier to debug or just write directly since it's just regex replacement.
// But earlier it failed formatting because it was already messed up? No, the error from formatting was just line length or something.

fs.writeFileSync('components/BrutalistCard.tsx', content, 'utf8');
