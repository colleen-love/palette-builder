# Daniel Smith pigment wheel

**[Try it out!](https://colleen-love.github.io/watercolor-palette-builder/)**

An interactive hue–chroma wheel of every Daniel Smith Extra Fine watercolor, for building a palette with the widest possible color range.

Tap paints to build a palette. The shaded wash shows the range your palette can reach, and the sidebar shows how much of the full Daniel Smith range (and of the range that meets your filters) you cover, which paints would widen it most, and which of your paints set the edge.

A Mixing section lets you pick two palette paints and see their mix as a strip and as a path on the a\*b\* color plane, with texture where a paint granulates.

Filter by lightfastness, single pigment vs. mixture, transparency, staining, granulation, and price series. Your palette and filters are saved in your browser.

## Data

- Color (CIELAB): masstone measurements from [artistpigments.org](https://artistpigments.org/brands/daniel-smith-extra-fine-watercolors), licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/); Earthy Light Red and Coral Reef use Daniel Smith's [published CIE Lab values](https://danielsmith.com/daniel-smith-watercolors-cie-lab-coordinates/) until they're measured there
- Lightfastness, staining, granulation, transparency, series: Daniel Smith, [Pigment Characteristics sheet (May 2021)](https://danielsmith.com/wp-content/uploads/2021/05/DS-Watercolor-pigment-characteristics.pdf), plus retailer listings for King's Royal Blue and McCracken Black
- Paints added after 2021 (the 2025 releases, both Jane's Blacks, Chrome Titanate Yellow): Daniel Smith's color-story and new-color pages

## Caveats

Reach is the area your palette covers on the a\*b\* plane, traced along the simulated mixing curve between every pair of paints rather than straight lines. Treat it as a guide. Mixes use [Mixbox](https://github.com/scrtwpns/mixbox) (CC BY-NC 4.0, built into the page) and treat every paint as equally strong. Mixes start from each paint's measured masstone. Each paint is a single measurement at one strength, and lightness isn't shown.

Not affiliated with Daniel Smith. Mixbox and the artistpigments.org data are both licensed for non-commercial use, so keep this project non-commercial.
