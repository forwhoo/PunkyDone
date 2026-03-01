const fs = require('fs');
let spotlight = fs.readFileSync('components/AISpotlight.tsx', 'utf8');

spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n</Popover>', '</PopoverContent>\n</Popover>\n</div>\n</Popover>');
// One of the earlier replace passes missed the div before </Popover> for the outer group or something.
// The structure should be:
// <div className="flex items-center gap-2"> ...
//    <Popover> ... </Popover>
//    <Popover> ... </Popover>
// </div> </div>

spotlight = spotlight.replace('</PopoverContent>\n</Popover>\n</div>\n</div>\n<ChatContainerContent', '</PopoverContent>\n</Popover>\n</div>\n</div>\n</div>\n<ChatContainerContent');
spotlight = spotlight.replace('</PopoverContent> </Popover> </div> </div> <ChatContainerContent', '</PopoverContent> </Popover> </div> </div> </div> <ChatContainerContent');

fs.writeFileSync('components/AISpotlight.tsx', spotlight, 'utf8');
