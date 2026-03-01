const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');
content = content + "\nexport default App;\n";
fs.writeFileSync('App.tsx', content, 'utf8');
