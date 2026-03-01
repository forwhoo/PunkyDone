const fs = require('fs');

let content = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
if (!content.includes('Plus,')) {
    content = content.replace(/import {([^}]+)} from 'lucide-react';/, (match, p1) => {
        return `import {${p1}, Plus} from 'lucide-react';`;
    });
    fs.writeFileSync('components/AISpotlight.tsx', content, 'utf8');
}
