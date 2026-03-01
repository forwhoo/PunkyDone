const { execSync } = require('child_process');
execSync(`npx prettier --write "components/AISpotlight.tsx"`);
