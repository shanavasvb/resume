# Theme Vision for Portal

This portfolio rotates between multiple themes that share the same layout but must feel distinct through purposeful, theme-specific styling. The goal is to show design engineering range without breaking usability or changing the HTML structure.

## Mission
- Keep the base layout intact while making each theme visually unmistakable.
- Add 2-4 signature UI treatments per theme (hero, headers, cards, badges, buttons).
- Favor clean, intentional accents over noisy effects. Distinct, not chaotic.
- Keep changes scoped to CSS theme selectors (e.g. `[data-theme="signal"] ...`).

## Current Theme Directions

### Editorial (Swiss/Neo-brutalist)
- Sharp edges, double-border frames, minimal gradients.
- Uppercase, spaced labels and strict linework.
- Portal cards use top bar + hard borders.

### Signal (tech/monitor)
- Pills and dashed lines, radar ring accents.
- High-contrast blues with amber highlights.
- Section headers look like status chips.

### Sorbet (soft, playful)
- Pastel gradients, frosted pills, round geometry.
- Warm halo accents and dashed pastel separators.
- Light depth, soft shadows.

### Terminal (retro console)
- Monospace, uppercase, hard borders, scanlines.
- Minimal gradients, bright accent lines.

### Simple
- Clean and subtle; acts as baseline.

## How to Extend or Modify a Theme
- Add theme-specific overrides in `styles.css` under the relevant selectors.
- Prefer component-level overrides (hero, section header, portal cards, status bar).
- Keep motion subtle and consistent with the theme.
- If adding a new theme: update theme list in `index.html` and provide a few signature treatments.

## Definition of Done for a Theme
- At least 2-3 components are visibly distinct at first glance.
- No layout breakage across screen sizes.
- Theme still feels coherent with the overall portfolio identity.

## Mobile Performance Notes
- Disable or tone down heavy hero animations (lava layers) on mobile.
- Prefer static gradients or reduced blur for small screens.
- Keep motion minimal to avoid jank on low-power devices.
