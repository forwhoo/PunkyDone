const fs = require('fs');

function replaceColors(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Mappings based on the new palette
    // bg-[#faf9f5] -> bg-[#1C1C1A]
    // bg-white -> bg-[#252523]
    // bg-[#ffffff] -> bg-[#252523]
    // bg-[#e8e6dc] -> bg-[#2E2E2C]
    // text-[#141413] -> text-[#EDEAE2]
    // text-black -> text-[#EDEAE2]
    // text-[#b0aea5] -> text-[#9E9C95]
    // border-[#e8e6dc] -> border-[#3A3A37]
    // text-[#d97757] -> text-[#E8806A]
    // bg-[#d97757] -> bg-[#E8806A]
    // text-[#6a9bcc] -> text-[#3BBFBF]
    // bg-[#6a9bcc] -> bg-[#3BBFBF]

    const replacements = [
        { regex: /bg-\[#faf9f5\]/g, replacement: "bg-[#1C1C1A]" },
        { regex: /bg-white/g, replacement: "bg-[#252523]" },
        { regex: /bg-\[#ffffff\]/g, replacement: "bg-[#252523]" },
        { regex: /bg-\[#e8e6dc\]/g, replacement: "bg-[#2E2E2C]" },
        { regex: /text-\[#141413\]/g, replacement: "text-[#EDEAE2]" },
        { regex: /text-black/g, replacement: "text-[#EDEAE2]" },
        { regex: /text-\[#b0aea5\]/g, replacement: "text-[#9E9C95]" },
        { regex: /border-\[#e8e6dc\]/g, replacement: "border-[#3A3A37]" },
        { regex: /text-\[#d97757\]/g, replacement: "text-[#E8806A]" },
        { regex: /bg-\[#d97757\]/g, replacement: "bg-[#E8806A]" },
        { regex: /text-\[#6a9bcc\]/g, replacement: "text-[#3BBFBF]" },
        { regex: /bg-\[#6a9bcc\]/g, replacement: "bg-[#3BBFBF]" },
        // Gradients/opacity variants
        { regex: /bg-\[#faf9f5\]\/([0-9]+)/g, replacement: "bg-[#1C1C1A]/$1" },
        { regex: /bg-white\/([0-9\.]+)/g, replacement: "bg-[#252523]/$1" },
        { regex: /bg-\[#e8e6dc\]\/([0-9]+)/g, replacement: "bg-[#2E2E2C]/$1" },
        { regex: /text-\[#141413\]\/([0-9]+)/g, replacement: "text-[#EDEAE2]/$1" },
        { regex: /border-\[#b0aea5\]/g, replacement: "border-[#3A3A37]" },
        // Fill colors for charts
        { regex: /fill-\[#141413\]/g, replacement: "fill-[#EDEAE2]" },
        { regex: /fill-\[#e8e6dc\]/g, replacement: "fill-[#2E2E2C]" },
        { regex: /stroke-\[#141413\]/g, replacement: "stroke-[#EDEAE2]" },
        { regex: /stroke-\[#e8e6dc\]/g, replacement: "stroke-[#3A3A37]" },
        // Raw hex replacements in inline styles
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

replaceColors('App.tsx');
