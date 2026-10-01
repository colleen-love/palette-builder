# Watercolor Palette Builder

**[Try it out!](https://colleen-love.github.io/watercolor-palette-builder/)**

Select paints on the color wheel and add them to your palette, then mix them together. The wheel places over a thousand artist watercolors from nine brands by hue angle and chroma, using measured masstone colors.

- **Pigments:** the wheel, with filters for brand, lightfastness, single pigment vs. mixture, transparency, staining, granulation, price series, availability and lightness. Search by name, brand or pigment code (e.g. `PB29`) to add a paint in one tap.
- **Palette:** your paints, how much of the full color range they reach (the shaded wash on the wheel), which paints set its edge, and which additions would widen it most. You can store a palette and compare against it later.
- **Mixing:** mixing paths between palette paints on the a\*b\* color plane, a strip per pair (textured where a paint granulates), or everything three paints can make together. Tap any dot or point along a strip for the mixed color, its percentages and a simple parts ratio, and drag to adjust it.

On phones the three sections sit behind a bottom menu, the filters open from a button above the wheel, and tapping near a dot opens a sheet with its details and an Add button. Your palette, filters and theme are saved in your browser.

## Files

- `index.html`: page markup
- `css/styles.css`: styles, including light and dark themes
- `js/app.js`: the app
- `js/mixbox.js`: [Mixbox](https://github.com/scrtwpns/mixbox) pigment mixing (CC BY-NC 4.0)
- `data/paints.json`: every paint, with its brand, CIELAB color and properties
- `data/inference-report.md`: how well the staining and granulation inference matches the brands' own ratings
- `tools/infer_properties.py`: fills in staining and granulation from the pigments

The page loads `data/paints.json` with `fetch`, so opening `index.html` straight from disk won't work. Serve the folder instead, for example `python3 -m http.server`, and open http://localhost:8000.

## Data

- Color (CIELAB) and paint properties: [artistpigments.org](https://artistpigments.org/), licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), mostly handmade masstone samples. A few paints use the manufacturer's published values or a printed color chart; the app says so for those paints.
- Lightfastness is converted from each brand's own scale (ASTM I–IV, AA–C, or stars) to a common I–IV for filtering, and staining to non-staining, semi-staining or staining. Each paint's original rating is kept in `lfRaw` and shown in the app. Price series are each brand's own and aren't comparable across brands.
- Staining and granulation that a brand doesn't publish are inferred from the paint's pigments by `tools/infer_properties.py`: how the brands that do publish rate the same pigment code, then pigment-family defaults, then "any component" rules for mixtures. Each paint records where its value came from in `stainSrc` / `granSrc` (`brand`, `pigment`, `family` or `uncertain`). The app marks inferred values with a hollow dot, and the Inferred filter can leave them out. Where brands disagree about a pigment, or a brand's own chart contradicts the pigment, the value stays unknown. `data/inference-report.md` shows how well the method predicts the brands' own ratings when each brand is held out. Granulation agrees about 9 times in 10. Staining agrees far less often, because brands use different staining scales, so most staining gaps stay unknown. Re-run the script after updating `paints.json`.

## Caveats

Reach is the area your palette covers on the a\*b\* plane, traced along the simulated mixing curve between every pair of paints rather than straight lines. Treat it as a guide. Mixes use Mixbox and treat every paint as equally strong. Each paint is a single masstone measurement, and the wheel doesn't show lightness.

Not affiliated with any paint maker. Mixbox and the artistpigments.org data are both licensed for non-commercial use, so keep this project non-commercial.

When you change `css/`, `js/` or `data/`, update the `?v=` value on the three asset links in `index.html` (any new string works). Browsers cache these files, and the new value makes them fetch fresh copies; `app.js` reuses it for `data/paints.json`.
