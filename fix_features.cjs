const fs = require('fs');

let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');
let lines = spotlight.split('\n');

// Import Plus
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('import {') && lines[i].includes('lucide-react')) {
        lines[i] = lines[i].replace('}', ', Plus }');
        break;
    }
}

// Custom Tool State
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('const SKILLS = [')) {
        lines[i] = lines[i].replace('const SKILLS = [', 'const DEFAULT_SKILLS = [');
    }
    if(lines[i].includes('const [selectedSkill, setSelectedSkill] = useState(\'default\');')) {
        lines[i] = `    const [customSkills, setCustomSkills] = useState<any[]>([]);
    const SKILLS = [...DEFAULT_SKILLS, ...customSkills];
    const [selectedSkill, setSelectedSkill] = useState('default');
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
    const [customTools, setCustomTools] = useState<any[]>([]);`;
    }
}

// Intercept tool calls
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('if (chunk.toolCall.name === \'set_skill\'')) {
        lines[i] = `
                        if (chunk.toolCall.name === 'create_skill') {
                            const newSkill = {
                                id: chunk.toolCall.arguments.title.toLowerCase().replace(/\\s+/g, '-'),
                                label: chunk.toolCall.arguments.title,
                                icon: UserCog,
                                description: chunk.toolCall.arguments.description,
                                system_prompt: chunk.toolCall.arguments.system_prompt
                            };
                            setCustomSkills(prev => [...prev, newSkill]);
                            setSelectedSkill(newSkill.id);
                        }
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
                        }
` + lines[i];
    }
}

// Active tool behavior logic
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('let finalQuery = query;')) {
        lines[i] = `
        let finalQuery = query;
        const matchedTool = customTools.find(t => finalQuery.includes(\`@tool \${t.name}\`));
        if (matchedTool) {
            finalQuery = \`[ACTIVE TOOL BEHAVIOR: \${matchedTool.system_prompt}] \\n\\n\` + finalQuery;
        }
`;
    }
}

// Skills Popover Content - Let's find exactly lines where PopoverContent is.
let popoverStart = -1;
let popoverEnd = -1;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('<PopoverContent className="w-[200px]')) {
        popoverStart = i;
    }
    if(popoverStart !== -1 && i > popoverStart && lines[i].includes('</PopoverContent>')) {
        popoverEnd = i;
        break; // Only the first popover content which is for Skills
    }
}

const replaceBlock = `                        <PopoverContent className="w-[300px] p-2 bg-[#252523] border-[#3A3A37] border-[#3A3A37] z-[10002]" align="end">
                            <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => handleQuery("Create a new skill.")}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-center text-[12px] font-bold rounded-lg text-[#1C1C1A] bg-[#E8806A] hover:bg-[#ff9985] transition-colors mb-2"
                                >
                                    <Plus size={14} /> Create New Skill
                                </button>
                                {SKILLS.map(p => (
                                    <div key={p.id} className="border border-[#3A3A37] rounded-lg overflow-hidden mb-1 bg-[#1C1C1A]">
                                        <div className="flex items-center justify-between w-full">
                                            <button
                                                onClick={() => setSelectedSkill(p.id)}
                                                className={\`flex-1 flex items-center gap-2 px-3 py-2 text-left text-[12px] font-medium transition-colors hover:bg-[#2E2E2C]/50 \${selectedSkill === p.id ? 'text-[#EDEAE2] bg-[#2E2E2C]/50' : 'text-[#9E9C95]'}\`}
                                            >
                                                <p.icon size={12} />
                                                {p.label}
                                                {selectedSkill === p.id && <CheckCircle size={12} className="text-[#E8806A] ml-auto" />}
                                            </button>
                                            {(p.description || p.system_prompt) && (
                                                <button
                                                    onClick={() => setExpandedSkill(expandedSkill === p.id ? null : p.id)}
                                                    className="px-3 py-2 text-[#9E9C95] hover:text-[#EDEAE2] transition-colors"
                                                >
                                                    <ChevronDown size={12} className={\`transition-transform \${expandedSkill === p.id ? 'rotate-180' : ''}\`} />
                                                </button>
                                            )}
                                        </div>
                                        {expandedSkill === p.id && (p.description || p.system_prompt) && (
                                            <div className="px-3 pb-3 pt-1 text-[11px] text-[#9E9C95] border-t border-[#3A3A37] bg-[#252523]">
                                                {p.description && <p className="mb-2"><strong>Desc:</strong> {p.description}</p>}
                                                {p.system_prompt && <p><strong>Prompt:</strong> {p.system_prompt}</p>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>`;

if(popoverStart !== -1) {
    lines.splice(popoverStart, popoverEnd - popoverStart + 1, replaceBlock);
}

// Tool Props
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('<ToolsModal')) {
        lines[i] = `            <ToolsModal
                isOpen={toolsModalOpen}
                onClose={() => setToolsModalOpen(false)}
                onSelectTool={(toolName) => setUserPrompt(\`@tool \${toolName} \`)}
                customTools={customTools}
            />`;
        // clean up next lines that belong to old ToolsModal
        while (lines[i+1].trim().startsWith('isOpen=') || lines[i+1].trim().startsWith('onClose=') || lines[i+1].trim().startsWith('onSelectTool=') || lines[i+1].trim() === '/>') {
            lines.splice(i+1, 1);
        }
        break;
    }
}

fs.writeFileSync('components/AISpotlight.tsx', lines.join('\n'), 'utf8');
