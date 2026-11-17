# Design notes

This file records the decisions behind the look of `meroo__ · enter`, so the
next change has a reason to keep or replace instead of guessing.

## Palette

- **Core:** violet (`#c4b5fd` family) for identity and focus, cyan (`#67e8f9`
  family) as the single accent, and near-black violet (`#05030c`, `#090418`)
  as the page base.
- **Status only:** emerald for online, amber for idle or a degraded service,
  rose for do-not-disturb and form errors. These hues never decorate a panel.
- **Project accents:** every project gradient stays inside the violet, indigo,
  and cyan family. The old fuchsia, pink, amber, orange, and rose project
  gradients were removed because they pushed the screen to six competing
  hues.
- **Text:** `zinc-100` for primary copy, `zinc-200` for dialogue, `zinc-400`
  for labels and metadata. `zinc-500` and darker are reserved for icons and
  decoration, never for readable text.

## Type

- **Chakra Petch** (`--font-display`) for the name, panel headings, and
  Castorice dialogue. It is slightly squared and technical, which fits a HUD
  without looking like a game menu.
- **Inter** (`--font-sans`) for body copy. It is chosen for legibility at
  10-13px in dense panels, not because it is a default. The alternative,
  Chakra Petch at body sizes, becomes tiring over a full screen.
- **JetBrains Mono** (`--font-mono`) for status lines, counters, and
  timestamps. A mono face makes changing numbers stay on the same grid, and
  its taller x-height survives the 8-9px tracking-heavy labels.

## Icons

Lucide is used for generic interface actions because its stroke weight
matches the 1px borders. Character-specific marks are hand-drawn in
`src/components/icons.tsx` (`CastoriceGlyph`, `SparkGlyph`, Discord, GitHub)
so the brand is not a recoloured library icon. Avoid decorative sparkles and
stars as section ornaments; use a glyph only when it carries meaning.

## Motion dials

- **Energy: 3/5.** Ambient aurora, particles, and a slow gradient pan. The
  interface never bounces or overshoots.
- **Rhythm: 4/5.** Short, eased entrances (0.4-0.85s) and a 10s preloader.
  Longer loops (aurora 24-32s, marquee 38s) stay under the threshold where
  they read as a screensaver.
- **Motion: 3/5.** Pointer tilt, parallax, and a typewriter dialogue. Every
  loop has a pause: the header `Waves` button toggles `html.motion-off` and
  persists the choice in `meroo.motion`. `prefers-reduced-motion` also
  disables the loops, and `perf-lite` drops the expensive ones.

## Glass and grid

- **Glass:** one blurred surface, the top bar. HUD panels are opaque violet
  glass without `backdrop-filter`, which keeps text contrast stable and saves
  GPU time on laptops. Dialog overlays are solid dark, not blurred.
- **Grid:** the full-bleed HUD grid was removed. It read as a default "tech"
  texture with no job. The intro keeps one faint grid because it sits behind
  the warp and gives the transition a measurable plane to move through. The
  archive viewer keeps a small local grid for the same depth reason.
- **Glow:** kept on the avatar ring and the single Castorice button. Removed
  from panel corners, panel heads, status dots, and primary buttons, so the
  eye has one focal point instead of ten.

## Files kept on purpose

- `backup/favicon-trace.svg` (2.1 MB) is the owner's backup source for the
  favicon. It is unreferenced at runtime and stays in the repository until
  the owner replaces it.
- `plan.txt` is the owner's own backlog (BGM shuffle, Blender idle clip,
  in-game voice lines), not generated project documentation.
