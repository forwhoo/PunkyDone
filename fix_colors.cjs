const fs = require('fs');

function replaceColors(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

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
        { regex: /bg-\[#6a9bcc\]/g, replacement: "bg-[#3BBFBF]" },

        { regex: /fill-\[#141413\]/g, replacement: "fill-[#EDEAE2]" },
        { regex: /fill-\[#e8e6dc\]/g, replacement: "fill-[#2E2E2C]" },
        { regex: /stroke-\[#141413\]/g, replacement: "stroke-[#EDEAE2]" },
        { regex: /stroke-\[#e8e6dc\]/g, replacement: "stroke-[#3A3A37]" },

        { regex: /#faf9f5/g, replacement: "#1C1C1A" },
        { regex: /#ffffff/g, replacement: "#252523" },
        { regex: /#e8e6dc/g, replacement: "#2E2E2C" },
        { regex: /#141413/g, replacement: "#EDEAE2" },
        { regex: /#b0aea5/g, replacement: "#9E9C95" },
        { regex: /#d97757/g, replacement: "#E8806A" },
        { regex: /#6a9bcc/g, replacement: "#3BBFBF" },
    ];

    let newContent = content;
    replacements.forEach(r => {
        newContent = newContent.replace(r.regex, r.replacement);
    });

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

const files = [
    'components/AISpotlight.tsx',
    'components/ToolsModal.tsx',
    'components/LoadingSkeleton.tsx'
];

files.forEach(replaceColors);
