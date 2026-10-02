// Palette Builder
// Scripts load in order (see index.html) and share one scope; each holds one part of the app.
// This one is the list of mediums, the part most likely to need editing.
// One palette per medium. Each medium's paints live in their own file (see MEDIA); mixing uses Mixbox (js/mixbox.js).
// same ?v= as this script, so new data isn't hidden behind a cached copy
const ASSET_V=new URL(document.currentScript.src).searchParams.get("v")||"";
// A medium whose file isn't there yet (404) shows a "coming soon" note instead of the wheel.
// value: brands for someone who doesn't know brands yet: the least expensive lines sold by US art
// retailers that can supply the whole basic set in paints rated lightfast I or II.
// Price and availability aren't in the data; they were checked against US retailers in October 2026.
const MEDIA=[
 {key:"watercolor",name:"Watercolor",file:"data/paints.json",about:"Transparent washes, lightened with water",value:["vangogh","davinci"],strong:"a staining paint takes over faster on paper"},
 {key:"gouache",name:"Gouache",file:"data/gouache.json",about:"Opaque, matte and rewettable",value:["winsor-and-newton-designers-gouache"],white:true},
 {key:"oil",name:"Oil",file:"data/oil.json",about:"Slow drying, blends on the canvas",value:["maimeri-classico"],white:true},
 {key:"acrylic",name:"Acrylic",file:"data/acrylic.json",about:"Fast drying and water based",value:["liquitex-basics-acrylics"],white:true}];
