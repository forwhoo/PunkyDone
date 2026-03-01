1. **Color Palette Update**:
   - Update `tailwind.config.js` to replace all current colors with the specified ones (`#1C1C1A`, `#252523`, etc.).
   - Review and update all hardcoded hex values in `components/`, `App.tsx`, and `index.css` to use the new color palette variables or directly use the specified hex codes.
   - Replace any instances of `rgba(0,0,0,...)` with `rgba(28,28,26,...)` to match `#1C1C1A`.

2. **Dark Mode Enforcement**:
   - Ensure the `light` class is removed from `<html>` and apply dark mode everywhere.
   - Ensure backgrounds, inputs, text colors all adhere to the palette properly, getting rid of any white/light mode defaults (`bg-white`, `text-black`).

3. **Typography**:
   - Update `index.html` to import `DM Sans` and `Playfair Display`.
   - Update `tailwind.config.js` to map `fontFamily.sans`/`body` to `DM Sans` and `fontFamily.heading` to `Playfair Display`.

4. **Button & Glow Cleanup**:
   - Remove all classes like `shadow-2xl`, `drop-shadow-xl`, `pulse-glow`, `rainbow-glow` from components.
   - Ensure buttons use flat or subtly bordered styles with only slight background lightening on hover.
   - Update CSS for animations if they contain glows.

5. **Rename "Persona" to "Skill"**:
   - Rename UI references in `AISpotlight.tsx`.
   - Rename `set_persona` tool to `set_skill`.
   - Implement the "Create New Skill" flow with AI asking clarifying questions, generating Title/Description/System Prompt, and adding to the UI.

6. **Restyle Modals**:
   - Update the Top Artist, Top Album, and Top Song modals in `App.tsx` and related files to strictly use the new dark palette (`#252523`, `#2E2E2C`, etc.) instead of the current Anthropic-style light ones.

7. **Add AI Tool Maker**:
   - Implement the "AI Tool Maker" tool inside `services/mistralService.ts` and `AISpotlight.tsx`.
   - Implement the system prompt that generates tool configurations dynamically based on user input.

8. **Pre-commit**: Use `pre_commit_instructions` to ensure code is clean.
