const fs = require('fs');

let content = fs.readFileSync('components/ToolsModal.tsx', 'utf8');

// The tools list was statically iterating TOOL_DEFINITIONS.
// We need to accept custom tools as props from AISpotlight, or manage state locally.
// But the issue says: "Once the AI generates the tool, it is added to the Tool Library... The user can enable the tool from the library, which activates its behavior... Tools are persistent and listed in the Tool Library alongside built-in tools."

// Let's modify ToolsModal props to receive `customTools` and `onSelectTool`
content = content.replace(/interface ToolsModalProps \{/, `interface ToolsModalProps {\n    customTools?: any[];`);
content = content.replace(/export const ToolsModal: React\.FC<ToolsModalProps> = \(\{ isOpen, onClose, onSelectTool \} \) => \{/, `export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onSelectTool, customTools = [] }) => {`);

// filteredTools needs to include customTools
content = content.replace(/const filteredTools = TOOL_DEFINITIONS\.filter\(t =>/, `const allTools = [...TOOL_DEFINITIONS, ...customTools];\n    const filteredTools = allTools.filter(t =>`);

content = content.replace(/TOOL_DEFINITIONS\.length/g, `allTools.length`);

// In the map function for filteredTools:
content = content.replace(/const iconInfo = TOOL_ICON_MAP\[tool\.name\] \|\| \{ icon: 'Zap', label: tool\.name \};/, `const iconInfo = TOOL_ICON_MAP[tool.name] || { icon: 'Zap', label: tool.label || tool.name };`);

// And since customTools might not have properties defined the same way:
content = content.replace(/Object\.keys\(tool\.parameters\.properties \|\| \{\}\)/g, `Object.keys(tool.parameters?.properties || {})`);

fs.writeFileSync('components/ToolsModal.tsx', content, 'utf8');
