const fs = require('fs');

let content = fs.readFileSync('services/mistralService.ts', 'utf8');

// 1. Add create_skill tool
const createSkillTool = `    {
        name: "create_skill",
        description: "Creates a new custom skill/persona. Use this when the user asks you to create a new skill, after you have gathered enough context (asking clarifying questions if necessary).",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "A short name for the skill (e.g. 'Data Scientist')" },
                description: { type: "string", description: "1-2 sentence summary of what the skill does" },
                system_prompt: { type: "string", description: "The full instruction the AI will follow when this skill is active" }
            },
            required: ["title", "description", "system_prompt"]
        }
    },
`;

content = content.replace('export const TOOL_DEFINITIONS = [', 'export const TOOL_DEFINITIONS = [\n' + createSkillTool);

// 2. Add icon for create_skill
content = content.replace('set_skill: { icon: \'UserCog\', label: \'Set Skill\' }', 'set_skill: { icon: \'UserCog\', label: \'Set Skill\' },\n    create_skill: { icon: \'UserCog\', label: \'Create Skill\' }');

// 3. Handle create_skill execution
const executeCreateSkill = `            case 'create_skill': {
                return { status: "skill_created", title: funcArgs.title, description: funcArgs.description, system_prompt: funcArgs.system_prompt };
            }`;

content = content.replace(/case 'set_skill': \{ return \{ status: "skill_set", skill: funcArgs\.skill \}; \}/, `case 'set_skill': { return { status: "skill_set", skill: funcArgs.skill }; }\n${executeCreateSkill}`);

fs.writeFileSync('services/mistralService.ts', content, 'utf8');
