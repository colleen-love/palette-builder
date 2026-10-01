# Palette Builder

**[Try it out!](https://colleen-love.github.io/palette-builder/)**

Select paints on the color wheel and add them to your palette, then mix them together. There's one palette for each medium: watercolor, gouache, oil and acrylic. The wheel places each medium's paints by hue angle and chroma, using masstone colors: about 1,100 watercolors from nine brands, 740 gouaches from 16 lines, 1,460 oils from 15 and 1,340 acrylics from 16.

- **Mediums:** switch from the menu next to the title. Each medium keeps its own palette, stored palette, filters and mixes, and the URL says which one is open (`?medium=oil`), so links and the Back button work. A medium whose paint data isn't there yet says so instead of showing an empty wheel.
- **Getting started:** on a first visit the app asks which mediums you paint with, then offers to start from a basic set: a warm and a cool of each primary, each a single pigment rated lightfast (I). It comes from one good-value brand where one covers all six, then that medium's good-value brands together, then any brand; only when no such set exists does it settle for the best paints available or an empty palette. "Getting started" in the medium menu and the footer opens it again. Anyone who used the watercolor-only version keeps their palette as the Watercolor palette and sees a one-time note about the new mediums.

- **Pigments:** the wheel, with filters for brand, lightfastness, single pigment vs. mixture, transparency, staining, granulation, drying time (oil), price series, availability and lightness. Each filter appears only when the current medium's data has values for it. Search by name, brand or pigment code (e.g. `PB29`) to add a paint in one tap. A **Good value** shortcut at the top of the Brand filter narrows the wheel to two lower-priced lines per medium whose paints are mostly lightfast (Van Gogh and Da Vinci watercolors, Rosa Gallery and Da Vinci gouache, Maimeri Classico and Renesans oils, Liquitex Basics and Vallejo Studio acrylics), and the basic set comes from them when it can. Price isn't in the data, so these picks are a judgment call; change them in `value` in `MEDIA` at the top of `js/app.js`.
- **Palette:** your paints, how much of the full color range they reach (the shaded wash on the wheel), which paints set its edge, and which additions would widen it most. You can store a palette and compare against it later.
- **Mixing:** mixing paths between palette paints on the a\*b\* color plane, a strip per pair (textured where a paint granulates), or everything three paints can make together. Tap any dot or point along a strip for the mixed color, its percentages and a simple parts ratio, and drag to adjust it.

On phones the three sections sit behind a bottom menu, the filters open from a button above the wheel, and tapping near a dot opens a sheet with its details and an Add button. Your palettes, filters and theme are saved in your browser.

## Files

- `index.html`: page markup
- `css/styles.css`: styles, including light and dark themes
- `js/app.js`: the app
- `js/mixbox.js`: [Mixbox](https://github.com/scrtwpns/mixbox) pigment mixing (CC BY-NC 4.0)
- `data/paints.json`: every watercolor, with its brand, CIELAB color and properties
- `data/gouache.json`, `data/oil.json`, `data/acrylic.json`: the other mediums, in the same format
- `data/inference-report.md`: how well the staining and granulation inference matches the brands' own ratings
- `tools/import_artistpigments.py`: converts artistpigments.org exports into these files (Daniel Smith in `paints.json`, and the three opaque mediums)
- `tools/infer_properties.py`: fills in watercolor staining and granulation from the pigments

The page loads `data/paints.json` with `fetch`, so opening `index.html` straight from disk won't work. Serve the folder instead, for example `python3 -m http.server`, and open http://localhost:8000.

## Data

Each medium's file has the same shape as `data/paints.json`: a `brands` list (`key`, `name`, `short`, `url`) and a `paints` list. A paint needs `id` (unique), `brand` (a brand `key`), `name` and its CIELAB `L`, `a`, `b`. Everything else is optional: `single`, `pig`, `lf` and `lfRaw`, `trans` (T, ST, SO or O), `stain` and `gran` (with `stainSrc` / `granSrc`), `series`, `disc`, `src`, `url`, and for oil `dry` (fast, medium or slow) with the brand's own wording in `dryRaw`. A filter only shows when at least one paint in that medium has a value for it, so oil without granulation data simply has no Granulation filter. The medium list, file names and short descriptions are in `MEDIA` at the top of `js/app.js`.

- Color (CIELAB) and paint properties for every medium: [artistpigments.org](https://artistpigments.org/), licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), mostly handmade masstone samples. A few paints use the manufacturer's published values or a printed color chart; the app says so for those paints.
- Lightfastness is converted from each brand's own scale (ASTM I–IV, AA–C, Excellent to Poor, Blue Wool, or stars) to a common I–IV for filtering; `tools/import_artistpigments.py` lists the rules, and staining to non-staining, semi-staining or staining. Each paint's original rating is kept in `lfRaw` and shown in the app. Price series are each brand's own and aren't comparable across brands.
- Staining and granulation that a brand doesn't publish are inferred from the paint's pigments by `tools/infer_properties.py`: how the brands that do publish rate the same pigment code, then pigment-family defaults, then "any component" rules for mixtures. Each paint records where its value came from in `stainSrc` / `granSrc` (`brand`, `pigment`, `family` or `uncertain`). The app marks inferred values with a hollow dot, and the Inferred filter can leave them out. Where brands disagree about a pigment, or a brand's own chart contradicts the pigment, the value stays unknown. `data/inference-report.md` shows how well the method predicts the brands' own ratings when each brand is held out. Granulation agrees about 9 times in 10. Staining agrees far less often, because brands use different staining scales, so most staining gaps stay unknown. Re-run the script after updating `paints.json`. Daniel Smith, like Winsor & Newton, only marks granulating paints, so an unmarked Daniel Smith paint isn't counted as stated non-granulating; its four staining levels map Non to non-staining, Low and Medium to semi-staining and High to staining, which agrees best with the other brands when held out.

## Caveats

Reach is the area your palette covers on the a\*b\* plane, traced along the simulated mixing curve between every pair of paints rather than straight lines. Treat it as a guide. Mixes use Mixbox and treat every paint as equally strong. Each paint is a single masstone measurement, and the wheel doesn't show lightness.

Not affiliated with any paint maker. Mixbox and the artistpigments.org data are both licensed for non-commercial use, so keep this project non-commercial.

When you change `css/`, `js/` or `data/` (including adding a medium's file), update the `?v=` value on the three asset links in `index.html` (any new string works). Browsers cache these files, and the new value makes them fetch fresh copies; `app.js` reuses it for the data files.
