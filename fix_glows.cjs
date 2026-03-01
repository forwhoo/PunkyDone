const fs = require('fs');

function removeGlows(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove specific classes
    const classesToRemove = [
        'shadow-2xl',
        'drop-shadow-lg',
        'drop-shadow-xl',
        'drop-shadow-2xl',
        'rainbow-glow',
        'pulse-glow',
        /shadow-\[0_[^\]]+\]/g,
        /shadow-[#FA2D48]\/[0-9]+/g
    ];

    let newContent = content;
    classesToRemove.forEach(cls => {
        if (typeof cls === 'string') {
            newContent = newContent.replace(new RegExp(`\\s*${cls}\\s*`, 'g'), ' ');
        } else {
            newContent = newContent.replace(cls, ' ');
        }
    });

    // Clean up multiple spaces
    newContent = newContent.replace(/\s+/g, ' ');

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

['App.tsx', 'components/TotalMinutesStory.tsx', 'components/BrutalistCard.tsx', 'components/AISpotlight.tsx', 'components/ToolsModal.tsx'].forEach(file => {
   if (fs.existsSync(file)) {
       removeGlows(file);
   }
});
