// ---- starter set: a warm and a cool of each primary, plus white and black for opaque paints ----
const hueGap=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
// fluorescents, metallics and the like are bright but aren't primaries (fluorescents fade)
const effect=/fluor|neon|metallic|iridescent|pearl|glitter|interference/i;
// a mix with white is a tint, not a primary to mix from
const tinted=p=>(p.pig||[]).length>1&&p.pig.some(c=>/^PW/.test(c));
const pig0=p=>(p.pig||[""])[0];
// Yellows and reds by the hue angle of their masstone: lemon and deep yellow, scarlet and rose.
// Blues by pigment, since a phthalo's masstone reads almost as violet as ultramarine and only
// shows its greener side in tints: ultramarine (PB29) is the warm blue, phthalo (PB15) or a
// cerulean or cobalt teal (PB35, PB36) the cool one. Each falls back to hue if the brand has none.
// White is titanium (or zinc, never lead) and black a true black, not a grey.
// The cool yellow is the greenest bright yellow a brand has (some have no true lemon), and the warm
// one has to sit clearly on the orange side, so the pair is a real split.
const SLOTS=[{h:97,win:12,maxH:99,skip:/green/i,lean:p=>8*(p.h-88)},{h:80,maxH:85},{h:38},{h:14},
 {h:290,pig:/^PB29$/,bonus:p=>0},
 // a phthalo's dark masstone sits far from 255°, so only ceruleans and teals are held to the hue
 // It also has to look different from the warm blue and lean greener (10° or more): some brands'
 // phthalo masstone lands right on their ultramarine, which would make the pair one paint.
 {h:255,pig:/^PB(15|16|17|35|36)\b/,bonus:p=>/^PB15/.test(pig0(p))?25:-hueGap(p.h,255),apart:15}];
const WHITE={only:p=>/^PW[456]$/.test(pig0(p))&&p.L>85&&!/transparent/i.test(p.n),score:p=>(pig0(p)==="PW6"?20:0)+(/titanium/i.test(p.n)?10:0)+p.L/10};
const BLACK={only:p=>/^PBk/.test(pig0(p))&&p.L<32&&p.C<10&&!/gr[ae]y/i.test(p.n),score:p=>-p.L};
const slotsFor=()=>cur.white?[...SLOTS,WHITE,BLACK]:SLOTS;
const base=p=>(p.single?15:0)-(p.lf>2?40:p.lf===2?5:!p.lf?10:0)-(tinted(p)?30:0)-(/\bhue\b/i.test(p.n)?10:0);
function slotScore(p,sl,win){if(effect.test(p.n))return null;
 if(sl.only)return sl.only(p)?sl.score(p)+base(p):null;
 // a blue by pigment still has to look blue: a mixture can list phthalo first and be a magenta
 if(sl.pig&&sl.pig.test(pig0(p))&&p.C>=20&&hueGap(p.h,265)<=55)return 100+p.C+sl.bonus(p)+base(p);
 const d=hueGap(p.h,sl.h);if(d>(sl.win||win)||p.C<30||(sl.maxH&&p.h>sl.maxH)||(sl.skip&&sl.skip.test(p.n)))return null;
 return p.C+(sl.lean?sl.lean(p):-2.5*d)+base(p)}
// the best paint for each slot; null when a slot can't be filled (unless partial)
function fitSet(ps,win,partial){const out=[];let tot=0;
 for(const sl of slotsFor()){let best=null,bs=-Infinity;
  for(const p of ps){if(out.includes(p)||(sl.apart&&out.some(q=>Math.hypot(p.L-q.L,p.a-q.a,p.b-q.b)<sl.apart||(pig0(q)==="PB29"&&((q.h-p.h+360)%360)<10))))continue;const sc=slotScore(p,sl,win);if(sc!=null&&sc>bs){bs=sc;best=p}}
  if(best){out.push(best);tot+=bs}else if(!partial)return null}
 return{out,tot}}
// Recommended paints are rated lightfastness I or II, so they last. Mixtures count too (budget lines
// rely on them), but single pigments, I over II and true pigment names win close calls, and tints
// (mixes with white) rarely qualify. Some brands rate phthalo blue PB15 II, as ASTM does in watercolor.
const sound=p=>p.lf===1||p.lf===2;
// Sound paints first, from as few and as affordable brands as possible: one good-value brand,
// then the medium's good-value brands together, then any one brand, then any brands. Only when no
// sound set exists does it fall back to the best paints available.
// It keeps to your filters when enough paints meet them. strict keeps to them always, even if that
// leaves some colors out (a set you build with your own filters).
function starterSet(strict){const inProd=P.filter(p=>!p.disc),ok=inProd.filter(passes),pool=strict||ok.length>=slotsFor().length?ok:inProd;
 const bestOf=(groups,only)=>{let best=null;for(const g of groups){const r=fitSet(pool.filter(p=>g.includes(p.brand)&&(!only||sound(p))),14);if(r&&(!best||r.tot>best.tot))best=r}return best};
 const value=valueBrands(),each=DATA.brands.map(b=>[b.key]),every=[DATA.brands.map(b=>b.key)];
 const best=bestOf(value.map(k=>[k]),true)||bestOf([value],true)||bestOf(each,true)||bestOf(every,true)||bestOf(value.map(k=>[k]))||bestOf(each)||fitSet(pool,14)||fitSet(pool,30,true);
 return Object.assign(best.out,{sound:best.out.length===slotsFor().length&&best.out.every(sound)})}
// Adding a set also narrows the filters to its brands and, when every paint is rated I or II,
// to that lightfastness, so what you see next matches the set. It only ever narrows: brands or
// ratings you had already left out stay out (lightfast I alone stays I alone).
function starterFilters(set){const keys=[...new Set(set.map(p=>p.brand))],fl=[];
 const nb=st.f.brand.length?keys.filter(k=>st.f.brand.includes(k)):keys;
 if(DATA.brands.length>1&&nb.length&&nb.length<(st.f.brand.length||DATA.brands.length)){st.f.brand=nb;fl.push(nb.map(k=>BRANDS[k]?.short||k).join(" and "))}
 const lf=["1","2"].filter(v=>!st.f.lf.length||st.f.lf.includes(v));
 if(set.sound&&P.some(HAS.lf)&&lf.length&&lf.length<(st.f.lf.length||4)){st.f.lf=lf;fl.push("lightfast "+lf.map(v=>ROMAN[v]).join(" or "))}
 if(fl.length)buildChips();return fl}
function addSet(set,rect,narrow){const add=set.filter(p=>!inPal(p));add.forEach(p=>st.sel.push(p.id));const fl=narrow?starterFilters(set):[];save();render();
 toast((add.length?`Added ${nPaints(add.length)}`:"Those paints are already in your palette")+(fl.length?` · filters set to ${fl.join(", ")}`:""),rect,fl.length?3200:2200)}
const addStarter=rect=>addSet(starterSet(),rect,true);
// what a set is, for the dialogs: its rating, whether it's all single pigments, and its brands
function setFacts(set){const brands=[...new Set(set.map(p=>p.bs))],f=[];
 if(set.sound)f.push(`rated lightfast ${set.every(p=>p.lf===1)?"I":"I or II"}`);
 if(set.length&&set.every(p=>p.single))f.push("all single pigments");
 if(brands.length)f.push(brands.length===1?`all from ${esc(brands[0])}`:`from ${esc(brands.join(" and "))}`);
 return f.length?f.join(", ").replace(/^./,c=>c.toUpperCase())+".":""}
const swatches=set=>`<span class="obsw" role="img" aria-label="${esc(set.map(p=>p.n).join(", "))}">${set.map(p=>`<span style="background:${p.rgb}" title="${esc(p.n)}"></span>`).join("")}</span>`;

// ---- Add a basic set: one picked for you, or one you shape with the filters ----
// Choosing your own moves the filter card into the dialog and back out when it closes. The filters
// you set there are your filters; closing without adding puts back the ones you had.
const setDlg=$("setDlg"),fHome=filtersEl.nextElementSibling;let setStep=0,setRect=null,setUndo=null;
function openSetDlg(rect){setRect=rect;setStep1();setDlg.showModal();setDlg.querySelector("h2").focus()}
function setStep1(){homeFilters();setStep=1;const set=starterSet(),n=activeFilters();
 setDlg.innerHTML=`<h2 id="setTitle" tabindex="-1">Add a basic set</h2><p class="fine obsub">A warm and a cool of each primary${cur.white?", plus white and black,":","} so you can mix most colors right away.</p>
<div class="obgrid two"><button class="obcard" data-act="auto">${swatches(set)}<b>Pick one for me</b><span class="note">From a good-value brand, rated lightfast I or II, with single-pigment paints first${n?", within your current filters":""}. ${setFacts(set)}</span></button>
<button class="obcard" data-act="custom"><span class="obsw empty" aria-hidden="true"></span><b>Choose brand and filters</b><span class="note">Pick the brands, lightfastness and anything else, and see the set before you add it.</span></button></div>
<div class="obfoot"><button class="link" data-act="cancel">Cancel</button></div>`;
 setDlg.querySelector("[data-act=auto]").onclick=()=>{setDlg.close();addStarter(setRect)};
 setDlg.querySelector("[data-act=custom]").onclick=setStep2;
 setDlg.querySelector("[data-act=cancel]").onclick=()=>setDlg.close()}
function setStep2(){setStep=2;setUndo=clone(st.f);
 setDlg.innerHTML=`<button class="link obback" data-act="back">‹ Back</button><h2 id="setTitle" tabindex="-1">Choose your basic set</h2><p class="fine obsub">Set the brand and anything else. The set only uses paints that match, and updates as you go.</p>
<div class="setslot"></div><div class="setbar"><div class="setprev" aria-live="polite"></div><div class="obfoot"><button class="link" data-act="cancel">Cancel</button><button class="primary" data-act="add"></button></div></div>`;
 setDlg.querySelector(".setslot").appendChild(filtersEl);
 setDlg.querySelector("[data-act=back]").onclick=()=>{undoFilters();setStep1();setDlg.querySelector("h2").focus()};
 setDlg.querySelector("[data-act=cancel]").onclick=()=>setDlg.close();
 setDlg.querySelector("[data-act=add]").onclick=()=>{const set=starterSet(true);setUndo=null;setDlg.close();addSet(set,setRect,false)};
 setPreview();setDlg.querySelector("h2").focus()}
function setPreview(){const box=setDlg.querySelector(".setprev");if(!box)return;
 const set=starterSet(true),add=set.filter(p=>!inPal(p)),want=slotsFor().length;
 box.innerHTML=set.length?`${swatches(set)}<p class="fine">${esc(set.map(p=>shortName(p)).join(", "))}. ${setFacts(set)}${set.length<want?` These filters leave out ${want-set.length} of the ${want} colors; loosen them for a full set.`:""}</p>`:'<p class="fine">No paints match these filters. Loosen them to build a set.</p>';
 const b=setDlg.querySelector("[data-act=add]");b.disabled=!add.length;b.textContent=add.length?`Add ${nPaints(add.length)}`:set.length?"Already in your palette":"Add"}
function undoFilters(){if(!setUndo)return;st.f=setUndo;setUndo=null;save();buildChips();syncLight();render()}
function homeFilters(){if(filtersEl.parentNode!==fHome.parentNode)fHome.before(filtersEl)}
setDlg.addEventListener("close",()=>{undoFilters();homeFilters();setStep=0});
