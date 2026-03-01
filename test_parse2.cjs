const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

// 1. Rename Persona to Skill globally
spotlight = spotlight.replace(/set_persona/g, 'set_skill');
spotlight = spotlight.replace(/selectedPersona/g, 'selectedSkill');
spotlight = spotlight.replace(/setSelectedPersona/g, 'setSelectedSkill');
spotlight = spotlight.replace(/PERSONA_DESCRIPTIONS/g, 'SKILL_DESCRIPTIONS');
spotlight = spotlight.replace(/PERSONAS/g, 'SKILLS');
spotlight = spotlight.replace(/newPersona/g, 'newSkill');
spotlight = spotlight.replace(/persona:/g, 'skill:');
spotlight = spotlight.replace(/persona\?/g, 'skill?');
spotlight = spotlight.replace(/persona /g, 'skill ');
spotlight = spotlight.replace(/persona;/g, 'skill;');
spotlight = spotlight.replace(/persona=/g, 'skill=');
spotlight = spotlight.replace(/persona\./g, 'skill.');
spotlight = spotlight.replace(/persona\]/g, 'skill]');
spotlight = spotlight.replace(/persona}/g, 'skill}');
spotlight = spotlight.replace(/'persona'/g, "'skill'");
spotlight = spotlight.replace(/"persona"/g, '"skill"');
spotlight = spotlight.replace(/persona_set/g, 'skill_set');
spotlight = spotlight.replace(/Set Persona/g, 'Set Skill');
spotlight = spotlight.replace(/Persona/g, 'Skill');
spotlight = spotlight.replace(/persona/g, 'skill');
spotlight = spotlight.replace(/set_skill/g, 'set_skill');

// Replace all old colors using the regexes
const replacements = [
    { regex: /bg-\[#faf9f5\]/g, replacement: "bg-[#1C1C1A]" },
    { regex: /bg-white/g, replacement: "bg-[#252523]" },
    { regex: /bg-\[#ffffff\]/g, replacement: "bg-[#252523]" },
    { regex: /bg-\[#e8e6dc\]/g, replacement: "bg-[#2E2E2C]" },
    { regex: /text-\[#141413\]/g, replacement: "text-[#EDEAE2]" },
    { regex: /text-black/g, replacement: "text-[#EDEAE2]" },
    { regex: /text-\[#b0aea5\]/g, replacement: "text-[#9E9C95]" },
    { regex: /border-\[#e8e6dc\]/g, replacement: "border-[#3A3A37]" },
    { regex: /border-\[#b0aea5\]/g, replacement: "border-[#3A3A37]" },
    { regex: /text-\[#d97757\]/g, replacement: "text-[#E8806A]" },
    { regex: /bg-\[#d97757\]/g, replacement: "bg-[#E8806A]" },
    { regex: /text-\[#6a9bcc\]/g, replacement: "text-[#3BBFBF]" },
    { regex: /bg-\[#6a9bcc\]/g, replacement: "bg-[#3BBFBF]" }
];
replacements.forEach(r => spotlight = spotlight.replace(r.regex, r.replacement));

// Shadows/glows
const glows = ['shadow-2xl', 'drop-shadow-lg', 'drop-shadow-xl', 'drop-shadow-2xl', 'rainbow-glow', 'pulse-glow', /shadow-\[0_[^\]]+\]/g, /shadow-\[#FA2D48\]\/[0-9]+/g];
glows.forEach(g => {
    if (typeof g === 'string') spotlight = spotlight.replace(new RegExp(`\\s*${g}\\s*`, 'g'), ' ');
    else spotlight = spotlight.replace(g, ' ');
});

// Import Plus
spotlight = spotlight.replace(/import \{([^\}]+)\} from 'lucide-react';/, (match, p1) => {
    if (!p1.includes('Plus')) return `import {${p1}, Plus} from 'lucide-react';`;
    return match;
});

// Custom Tool State
spotlight = spotlight.replace('const SKILLS = [', 'const DEFAULT_SKILLS = [');
spotlight = spotlight.replace('const [selectedSkill, setSelectedSkill] = useState(\'default\');', `    const [customSkills, setCustomSkills] = useState<any[]>([]);
    const SKILLS = [...DEFAULT_SKILLS, ...customSkills];
    const [selectedSkill, setSelectedSkill] = useState('default');
    const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
    const [customTools, setCustomTools] = useState<any[]>([]);`);

// Intercepts
const intercepts = `
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
`;
spotlight = spotlight.replace('if (chunk.toolCall.name === \'set_skill\'', intercepts + '\n                        if (chunk.toolCall.name === \'set_skill\'');

// Active behavior injection
spotlight = spotlight.replace('let finalQuery = query;', `
        let finalQuery = query;
        const matchedTool = customTools.find(t => finalQuery.includes(\`@tool \${t.name}\`));
        if (matchedTool) {
            finalQuery = \`[ACTIVE TOOL BEHAVIOR: \${matchedTool.system_prompt}] \\n\\n\` + finalQuery;
        }
`);

// The exact UI Block
const searchBlock = `<PopoverContent
              className="w-[200px] p-1 bg-[#252523] border-[#3A3A37] border-[#3A3A37] z-[10002]"
              align="end"
            >
              <div className="flex flex-col gap-0.5">
                {SKILLS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedSkill(p.id)}
                    className={\`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium rounded-lg transition-colors hover:bg-[#2E2E2C]/50 \${
                      selectedSkill === p.id
                        ? "text-[#EDEAE2] bg-[#2E2E2C]/50"
                        : "text-[#9E9C95]"
                    }\`}
                  >
                    <span className="flex items-center gap-2">
                      <p.icon size={12} />
                      {p.label}
                    </span>
                    {selectedSkill === p.id && (
                      <CheckCircle size={12} className="text-[#E8806A]" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>`;

const replaceBlock = `<PopoverContent className="w-[300px] p-2 bg-[#252523] border-[#3A3A37] border-[#3A3A37] z-[10002]" align="end">
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

// Due to possible formatting differences, let's just replace from `<PopoverContent` to `</PopoverContent>` for the first instance after `SKILLS.find`.

let lines = spotlight.split('\n');
let pStart = -1, pEnd = -1;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('w-[200px] p-1 bg-[#252523] border-[#3A3A37] border-[#3A3A37]')) {
        pStart = i;
    }
    if(pStart !== -1 && lines[i].includes('</PopoverContent>')) {
        pEnd = i;
        break;
    }
}

if(pStart !== -1 && pEnd !== -1) {
    lines.splice(pStart, pEnd - pStart + 1, replaceBlock);
    spotlight = lines.join('\n');
}

// Tool Props
spotlight = spotlight.replace('<ToolsModal', '<ToolsModal customTools={customTools}');

fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
