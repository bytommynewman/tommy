# Game Receipts ad type system

Brand fonts = the app's own (`app/layout.tsx`): **Saira** (display, 700-900, italic) and **Inter** (UI/captions, 500-800, tabular numbers).
Official OFL variable TTFs from google/fonts live in `marketing/fonts/` (`Saira-VF.ttf`, `Saira-Italic-VF.ttf`, `Inter-VF.ttf`, `OFL-Saira.txt`, `OFL-Inter.txt`)
and are also installed in `~/Library/Fonts/` for any fontconfig/CoreText based tool.

## Pipeline rule

Every piece of visible text is a **PNG layer rendered from HTML/CSS in headless Chrome** (`marketing/type.mjs`), at native 4K pixel size
(device scale factor 1, so 1 CSS px = 1 output px), transparent background, `@font-face` pointing at `marketing/fonts/*`,
`-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`, `font-kerning: normal`, `font-feature-settings: "kern","liga"` (+ `"tnum"` for numbers).
ffmpeg only overlays those PNGs. **No `drawtext`, no Impact / Arial Black, no outline strokes.** SVG text (prelaunch stills) is also rasterised by Chrome (`svgLayer`), never by librsvg.

## Treatments

| Element | Rule |
|---|---|
| Hooks | Saira 900 italic, UPPERCASE, letter-spacing -0.01em, line-height .95, white with ONE key word in volt `#22e58a`, `text-wrap: balance`, 2-3 lines (auto-fit to max width). No stroke: soft two-layer shadow (`0 3px 12px / 0 12px 48px`, black .5-.6) or a dark rounded card `rgba(10,12,14,.72)` with a 2px inner border `rgba(255,255,255,.1)` (Format A + UGC hooks over footage use the card) |
| Captions / step bands | Inter 800, sentence case, white, rounded pill `rgba(10,12,14,.74)` + hairline border; step numbers are a volt circle badge (the old "Step 3:" prefix becomes the badge) |
| Format B (POV) | Inter 800 lowercase, white, soft shadow, thin translucent pill (`rgba(10,12,14,.5)`) |
| Stopwatch | Inter 700 `tnum` in a dark pill with a small volt dot; one PNG per tenth of a second, fed to ffmpeg as a 10 fps image sequence |
| End cards | full logo, "Call it. Lock it. Prove it." Saira 800 italic (sentence case, white), "Free to play" Inter 600 uppercase `.08em` volt, volt radial glow over dark ink; Format A adds the "Comment RECEIPT ..." CTA in Saira 800 italic |
| Carousel / teasers / banner / OG / highlights | same Saira (headlines, uppercase 900 italic, volt key phrase) and Inter (subtitles, pills, "COMING SOON" pill = Inter 800 on volt) |

## API (`marketing/type.mjs`)

`hook(text,{key,size,maxW,maxLines,card})`, `pill(text,{step,size,maxW,maxLines})`, `pov(text,{size,maxW})`, `stopwatch(sec,{size})`, `endText({W,H,tagY,footY,...})`,
`frame(html,W,H)`, `svgLayer(svg,W,H,k)`, `closeType()`. Box layers carry a 160 px transparent margin (`pad`) for shadows: overlay at `(x - pad, y - pad)`.
Layers are cached in `out/.cache/type/` by content hash. Wording, layouts, safe zones and timings are unchanged from the previous renders.
