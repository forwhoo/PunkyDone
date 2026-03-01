const fs = require('fs');

let content = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

// 1. Convert SKILLS to state and manage custom skills
content = content.replace('const SKILLS = [', `const DEFAULT_SKILLS = [`);

content = content.replace(/const \[selectedSkill, setSelectedSkill\] = useState\('default'\);/, `const [customSkills, setCustomSkills] = useState<any[]>([]);
    const SKILLS = [...DEFAULT_SKILLS, ...customSkills];
    const [selectedSkill, setSelectedSkill] = useState('default');
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null);`);

// 2. Intercept create_skill
const createSkillIntercept = `
                        // Intercept create_skill to add custom skills to UI
                        if (chunk.toolCall.name === 'create_skill') {
                            const newSkill = {
                                id: chunk.toolCall.arguments.title.toLowerCase().replace(/\\s+/g, '-'),
                                label: chunk.toolCall.arguments.title,
                                icon: UserCog,
                                description: chunk.toolCall.arguments.description,
                                system_prompt: chunk.toolCall.arguments.system_prompt
                            };
                            setCustomSkills(prev => [...prev, newSkill]);
                            setSelectedSkill(newSkill.id); // auto-select new skill
                        }
`;
content = content.replace('if (chunk.toolCall.name === \'set_skill\'', createSkillIntercept + '\n                        if (chunk.toolCall.name === \'set_skill\'');

// 3. Update PopoverContent to show expandable skills and "Create New Skill" button
const skillListUI = `
                        <PopoverContent className="w-[300px] p-2 bg-[#252523] border-[#3A3A37] border-[#3A3A37] z-[10002]" align="end">
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

content = content.replace(/<PopoverContent className="w-\[200px\] p-1 bg-\[#252523\] border-\[#3A3A37\] border-\[#3A3A37\] z-\[10002\]" align="end">[\s\S]*?<\/PopoverContent>/, skillListUI);

// Add Plus icon import
content = content.replace('X, Play, Search, StopCircle', 'X, Play, Search, StopCircle, Plus');

fs.writeFileSync('components/AISpotlight.tsx', content, 'utf8');
