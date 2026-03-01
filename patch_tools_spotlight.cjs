const fs = require('fs');

let content = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

// Need to store customTools state in AISpotlight
content = content.replace(/const \[toolsModalOpen, setToolsModalOpen\] = useState\(false\);/, `const [toolsModalOpen, setToolsModalOpen] = useState(false);\n    const [customTools, setCustomTools] = useState<any[]>([]);`);

// In the streaming loop, handle ai_tool_maker
const toolMakerIntercept = `
                        if (chunk.toolCall.name === 'ai_tool_maker') {
                            const newTool = {
                                name: chunk.toolCall.arguments.name.toLowerCase().replace(/\\s+/g, '_'),
                                label: chunk.toolCall.arguments.name,
                                description: chunk.toolCall.arguments.description,
                                parameters: chunk.toolCall.arguments.parameters,
                                system_prompt: chunk.toolCall.arguments.system_prompt,
                                parser_logic: chunk.toolCall.arguments.parser_logic
                            };
                            setCustomTools(prev => [...prev, newTool]);
                            // Also maybe automatically apply it? User must enable it from library.
                        }
`;
content = content.replace('if (chunk.toolCall.name === \'create_skill\')', toolMakerIntercept + '\n                        if (chunk.toolCall.name === \'create_skill\')');

// Update ToolsModal props in AISpotlight return statement
content = content.replace(/<ToolsModal\s+isOpen=\{toolsModalOpen\}\s+onClose=\{\(\) => setToolsModalOpen\(false\)\}\s+onSelectTool=\{\(toolName\) => setUserPrompt\(\`@tool \$\{toolName\} \`\)\}\s+\/>/, `<ToolsModal\n                isOpen={toolsModalOpen}\n                onClose={() => setToolsModalOpen(false)}\n                onSelectTool={(toolName) => setUserPrompt(\`@tool \${toolName} \`)}\n                customTools={customTools}\n            />`);

// But wait, the system prompt of custom tools needs to be active when selected.
// However, the instructions say:
// "The user can enable the tool from the library, which activates its behavior."
// If they type "@tool late_night_mode " and send it, we append the tool's system_prompt to the userPrompt or mistralService handles it?
// The mistralService doesn't know about customTools unless we pass them or inject them into the history.
// Actually, mistralService `streamMusicQuestionWithTools` takes `persona` but not `customTools`.
// To fully support "enabling" a custom tool, we might need to inject its system prompt into the user's prompt or the mistralService.
// Given the scope, the prompt asks to: "The user can enable the tool from the library, which activates its behavior."
// Right now `onSelectTool` just appends `@tool name ` to the input box.

// To truly inject the behavior, we can check if `userPrompt` contains a custom tool name, and if so, append its system prompt to the query.
const applyCustomToolLogic = `
        let finalQuery = query;
        const matchedTool = customTools.find(t => finalQuery.includes(\`@tool \${t.name}\`));
        if (matchedTool) {
            finalQuery = \`[ACTIVE TOOL BEHAVIOR: \${matchedTool.system_prompt}] \\n\\n\` + finalQuery;
        }
`;
content = content.replace(/let finalQuery = query;/, applyCustomToolLogic);

fs.writeFileSync('components/AISpotlight.tsx', content, 'utf8');
