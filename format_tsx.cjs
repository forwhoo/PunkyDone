const fs = require('fs');
const { execSync } = require('child_process');

['App.tsx', 'components/TotalMinutesStory.tsx', 'components/BrutalistCard.tsx', 'components/AISpotlight.tsx', 'components/ToolsModal.tsx'].forEach(file => {
   if (fs.existsSync(file)) {
       try {
           execSync(`npx prettier --write "${file}"`);
           console.log(`Formatted ${file}`);
       } catch (e) {
           console.log(`Error formatting ${file}`);
       }
   }
});
