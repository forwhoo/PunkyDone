const fs = require('fs');

function renameInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Rename variables, constants, and tools
    content = content.replace(/set_persona/g, 'set_skill');
    content = content.replace(/selectedPersona/g, 'selectedSkill');
    content = content.replace(/setSelectedPersona/g, 'setSelectedSkill');
    content = content.replace(/PERSONA_DESCRIPTIONS/g, 'SKILL_DESCRIPTIONS');
    content = content.replace(/PERSONAS/g, 'SKILLS');
    content = content.replace(/newPersona/g, 'newSkill');
    content = content.replace(/persona:/g, 'skill:');
    content = content.replace(/persona\?/g, 'skill?');
    content = content.replace(/persona /g, 'skill ');
    content = content.replace(/persona;/g, 'skill;');
    content = content.replace(/persona=/g, 'skill=');
    content = content.replace(/persona\./g, 'skill.');
    content = content.replace(/persona\]/g, 'skill]');
    content = content.replace(/persona}/g, 'skill}');
    content = content.replace(/'persona'/g, "'skill'");
    content = content.replace(/"persona"/g, '"skill"');
    content = content.replace(/persona_set/g, 'skill_set');

    // UI labels
    content = content.replace(/Set Persona/g, 'Set Skill');
    content = content.replace(/Persona/g, 'Skill');
    content = content.replace(/persona/g, 'skill');
    // Ensure capitalization for Skill if previously lowercase persona
    content = content.replace(/set_skill/g, 'set_skill');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

['services/mistralService.ts', 'components/AISpotlight.tsx'].forEach(renameInFile);
