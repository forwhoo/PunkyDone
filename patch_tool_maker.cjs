const fs = require('fs');

let content = fs.readFileSync('services/mistralService.ts', 'utf8');

// 1. Add AI Tool Maker definition
const aiToolMakerDef = `    {
        name: "ai_tool_maker",
        description: "Creates a new AI tool dynamically based on user description.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "A short, clear name for the tool (e.g. 'Late Night Mode')" },
                description: { type: "string", description: "1-2 sentences describing what the tool does and when to use it" },
                parameters: {
                    type: "object",
                    description: "A JSON schema object representing the tool's parameters"
                },
                system_prompt: { type: "string", description: "The full instruction set for how the AI should behave when this tool is active." },
                parser_logic: { type: "string", description: "Describe how the tool's input should be parsed and output should be returned." }
            },
            required: ["name", "description", "parameters", "system_prompt", "parser_logic"]
        }
    },
`;

content = content.replace('export const TOOL_DEFINITIONS = [', 'export const TOOL_DEFINITIONS = [\n' + aiToolMakerDef);

// 2. Add icon
content = content.replace('create_skill: { icon: \'UserCog\', label: \'Create Skill\' }', 'create_skill: { icon: \'UserCog\', label: \'Create Skill\' },\n    ai_tool_maker: { icon: \'Zap\', label: \'AI Tool Maker\' }');

// 3. Handle tool execution
const executeAiToolMaker = `            case 'ai_tool_maker': {
                return { status: "tool_created", tool: funcArgs };
            }`;

content = content.replace(/case 'create_skill': \{[\s\S]*?return \{ status: "skill_created".*?\};[\s\S]*?\}/, `case 'create_skill': {
                return { status: "skill_created", title: funcArgs.title, description: funcArgs.description, system_prompt: funcArgs.system_prompt };
            }\n${executeAiToolMaker}`);

// Also inject the system prompt for AI Tool Maker into the main system prompt when we don't know the tools?
// Or we just rely on the tool description above? The prompt says "Include this internally:"
// Let's add the system prompt to AGENT_SYSTEM_PROMPT.
const systemPromptSnippet = `\n\nAI TOOL MAKER INSTRUCTIONS:\nYou are an expert tool builder. When the user describes a tool they want, your job is to construct a complete, working tool definition using the \`ai_tool_maker\` tool. Do not ask unnecessary questions — if you have enough information, build it immediately. A tool is made up of: Tool Name, Description, Parameters, System Prompt / Behavior, and Parser Logic. Always output the tool in a clean structured format. If the user's description is vague, ask one focused clarifying question before building. Never hallucinate parameters or behaviors — only build what is described or reasonably implied.`;

content = content.replace('const AGENT_SYSTEM_PROMPT = `', 'const AGENT_SYSTEM_PROMPT = `' + systemPromptSnippet);

fs.writeFileSync('services/mistralService.ts', content, 'utf8');
