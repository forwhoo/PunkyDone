const fs = require('fs');

const content = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
if (content.includes('customTools')) {
    console.log("Custom tools state exists in AISpotlight.");
} else {
    console.log("Missing customTools state.");
}

const mistralContent = fs.readFileSync('services/mistralService.ts', 'utf8');
if (mistralContent.includes('ai_tool_maker')) {
    console.log("ai_tool_maker tool definition exists in mistralService.");
} else {
    console.log("Missing ai_tool_maker tool definition.");
}

const modalContent = fs.readFileSync('components/ToolsModal.tsx', 'utf8');
if (modalContent.includes('customTools')) {
    console.log("customTools prop exists in ToolsModal.");
} else {
    console.log("Missing customTools prop in ToolsModal.");
}
