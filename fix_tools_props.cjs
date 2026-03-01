const fs = require('fs');
let content = fs.readFileSync('components/ToolsModal.tsx', 'utf8');

content = content.replace(/export const ToolsModal: React\.FC<ToolsModalProps> = \(\{ isOpen, onClose, onSelectTool \} \) => \{/, `export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onSelectTool, customTools = [] }) => {`);

fs.writeFileSync('components/ToolsModal.tsx', content, 'utf8');
