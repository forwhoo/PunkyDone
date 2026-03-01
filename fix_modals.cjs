const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// The modal background is in FullScreenModal or inside App.tsx itself? Let's check App.tsx since we modified it already
// We replaced bg-[#faf9f5] with bg-[#1C1C1A], bg-white with bg-[#252523].
// But the issue description says: "These modals/sections look broken and don't match the color palette. Restyle them fully using the palette. Backgrounds: #252523 or #2E2E2C. Text: #EDEAE2. Accents: #E8806A or #3BBFBF."

// Let's replace any bg-[#1C1C1A] inside the modals to bg-[#252523] or bg-[#2E2E2C].
// Wait, the main background of App is #1C1C1A. The modals use #1C1C1A as well now since we did a global replace of #faf9f5 -> #1C1C1A.
// FullScreenModal component might be used or App.tsx inline modas. Let's check where modals are.

// Actually, in App.tsx there are multiple `fixed inset-0` or `z-50` full screen modals.
content = content.replace(/className="fixed inset-0 z-\[9999\] bg-\[#0a0a0a\]"/g, 'className="fixed inset-0 z-[9999] bg-[#1C1C1A]"');
content = content.replace(/className="fixed inset-0 z-\[9999\] flex items-center justify-center p-4 sm:p-6"/g, 'className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#1C1C1A]/80 backdrop-blur-sm"');

// Fix text colors inside Modals if any still use black/white
content = content.replace(/bg-black/g, 'bg-[#1C1C1A]');
content = content.replace(/text-black/g, 'text-[#EDEAE2]');
content = content.replace(/bg-white/g, 'bg-[#252523]');
content = content.replace(/text-white/g, 'text-[#EDEAE2]');

fs.writeFileSync('App.tsx', content, 'utf8');
