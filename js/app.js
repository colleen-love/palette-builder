// Palette Builder
// One palette per medium. Each medium's paints live in their own file (see MEDIA); mixing uses Mixbox (js/mixbox.js).
// same ?v= as this script, so new data isn't hidden behind a cached copy
const ASSET_V=new URL(document.currentScript.src).searchParams.get("v")||"";
// A medium whose file isn't there yet (404) shows a "coming soon" note instead of the wheel.
// value: brands for someone who doesn't know brands yet: lower-priced lines whose paints are mostly
// lightfast (I-II) and cover a good range. Price isn't in the data, so this is a judgment call.
const MEDIA=[
 {key:"watercolor",name:"Watercolor",file:"data/paints.json",about:"Transparent washes, lightened with water",value:["vangogh","davinci"],strong:"a staining paint takes over faster on paper"},
 {key:"gouache",name:"Gouache",file:"data/gouache.json",about:"Opaque, matte and rewettable",value:["rosa-gallery-professional-gouache-colours","da-vinci-permanent-artists-gouache"],white:true},
 {key:"oil",name:"Oil",file:"data/oil.json",about:"Slow drying, blends on the canvas",value:["maimeri-classico","renesans-oils-for-art"],white:true},
 {key:"acrylic",name:"Acrylic",file:"data/acrylic.json",about:"Fast drying and water based",value:["liquitex-basics-acrylics","vallejo-acrylic-studio"],white:true}];
start();

function start(){
const ROMAN={1:"I",2:"II",3:"III",4:"IV"};
const TNAME={T:"Transparent",ST:"Semi-transparent",SO:"Semi-opaque",O:"Opaque"};
const SNAME={1:"Non-staining",2:"Semi-staining",3:"Staining"};
const NS="http://www.w3.org/2000/svg";
const MBY=Object.fromEntries(MEDIA.map(m=>[m.key,m]));
// the current medium's data; useMedium swaps these
let cur=MEDIA[0],DATA={brands:[],paints:[]},BRANDS={},P=[],byId={},FULL=0,curveCache=new Map(),poolCache=new Map();
function lab2rgb(L,a,b){let y=(L+16)/116,x=a/500+y,z=y-b/200;const f=t=>t**3>0.008856?t**3:(t-16/116)/7.787;x=0.95047*f(x);y=f(y);z=1.08883*f(z);let r=x*3.2406+y*-1.5372+z*-0.4986,g=x*-0.9689+y*1.8758+z*0.0415,bl=x*0.0557+y*-0.2040+z*1.0570;const c=v=>{v=v>0.0031308?1.055*v**(1/2.4)-0.055:12.92*v;return Math.round(Math.max(0,Math.min(1,v))*255)};return `rgb(${c(r)},${c(g)},${c(bl)})`}
function lab2arr(L,a,b){return lab2rgb(L,a,b).match(/\d+/g).map(Number)}
const $=id=>document.getElementById(id);

// ---- state ----
const DEFF={brand:[],lf:[],pig:["any"],trans:[],stain:[],gran:["any"],inf:["inc"],dry:[],series:[],avail:["cur"],light:[0,100]};
const KEY="wpb:v3";
const clone=o=>JSON.parse(JSON.stringify(o));
const blank=()=>({sel:[],base:[],mix:[],mix3:false,f:clone(DEFF)});
// one medium's saved state; paint ids are checked against the data once that medium loads
function clean(v){const s=blank();if(!v||typeof v!=="object")return s;
 const ids=a=>Array.isArray(a)?a.filter(id=>typeof id==="string"):[];
 s.sel=ids(v.sel);s.base=ids(v.base);s.mix=ids(v.mix);s.mix3=!!v.mix3;if(Array.isArray(v.sw))s.sw=v.sw.filter(c=>typeof c==="string").slice(0,6);
 if(v.f&&typeof v.f==="object")for(const k in DEFF)if(Array.isArray(DEFF[k])&&Array.isArray(v.f[k]))s.f[k]=v.f[k];
 if(s.f.light.length!==2)s.f.light=[0,100];if(!s.f.pig.length)s.f.pig=["any"];if(!s.f.gran.length)s.f.gran=["any"];if(!s.f.inf.length)s.f.inf=["inc"];if(!s.f.avail.length)s.f.avail=["cur"];
 return s}
// S: everything saved. shown: the mediums in the switcher. onboarded: the first-visit questions are done.
// news: someone who used the watercolor-only app hasn't yet dismissed the note about the new mediums.
function load(){const S={medium:"watercolor",shown:[],media:{},onboarded:false,news:false,hinted:false};
 try{const v=JSON.parse(localStorage.getItem(KEY)||"null");
  if(v&&typeof v==="object"){if(MBY[v.medium])S.medium=v.medium;
   if(Array.isArray(v.shown))S.shown=MEDIA.map(m=>m.key).filter(k=>v.shown.includes(k));
   for(const m of MEDIA)if(v.media&&v.media[m.key])S.media[m.key]=clean(v.media[m.key]);
   S.onboarded=!!v.onboarded;S.news=!!v.news;S.hinted=!!v.hinted;return S}
  // the watercolor-only app kept one palette; it becomes the Watercolor palette
  let w=JSON.parse(localStorage.getItem("wpb:v2")||"null");
  // earlier versions stored a single-brand palette by paint name
  if(!w){const old=JSON.parse(localStorage.getItem("dswheel:public:v1")||"null");
   if(old){const m=a=>Array.isArray(a)?a.map(n=>"ds:"+n):[];w={sel:m(old.sel),base:m(old.base),mix:m(old.mix),mix3:!!old.mix3}}}
  if(w){S.media.watercolor=clean(w);S.shown=["watercolor"];S.onboarded=true;S.news=true;S.hinted=true}
 }catch(e){}
 return S}
const S=load();
let st=S.media[S.medium]??=blank();
// the switcher shows a few colors from each palette, so keep them with the palette
function save(){if(P.length)st.sw=st.sel.slice(0,6).map(id=>byId[id]?.rgb).filter(Boolean);try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const inPal=p=>st.sel.includes(p.id);
// Staining and granulation filled in from the pigment (see tools/infer_properties.py) are
// inferred, not the maker's claim. "Brand-stated only" treats them as unknown.
const inferred=(p,k)=>p[k+"Src"]==="pigment"||p[k+"Src"]==="family";
const known=(p,k)=>!!p[k]&&(st.f.inf[0]==="inc"||!inferred(p,k));

// why a paint fails the filters (empty array = passes)
// A paint with no data for a filter you have set is left out: unknown is not a match.
function fails(p){const f=st.f,w=[];
 if(f.brand.length&&!f.brand.includes(p.brand))w.push(p.bs);
 if(f.lf.length){if(!p.lf){w.push("no lightfastness data")}else if(!f.lf.includes(String(p.lf)))w.push("lightfastness "+ROMAN[p.lf])}
 if(f.pig[0]==="single"){if(p.single===false)w.push("mixture");else if(p.single==null)w.push("no pigment data")}
 if(f.trans.length){if(!p.trans){w.push("no transparency data")}else if(!f.trans.includes(p.trans))w.push(TNAME[p.trans].toLowerCase())}
 if(f.stain.length){if(!known(p,"stain")){w.push(p.stain?"no brand staining data":"no staining data")}else if(!f.stain.includes(String(p.stain)))w.push(SNAME[p.stain].toLowerCase())}
 const g=f.gran[0];if(g!=="any"){if(!known(p,"gran")){w.push(p.gran?"no brand granulation data":"no granulation data")}else if(p.gran!==g)w.push(p.gran==="G"?"granulating":"smooth")}
 if(f.dry.length){if(!p.dry){w.push("no drying time data")}else if(!f.dry.includes(p.dry))w.push(p.dry+" drying")}
 if(f.series.length){if(!p.series){w.push("no series data")}else if(!f.series.includes(p.series))w.push("series "+p.series)}
 if(f.avail[0]==="cur"&&p.disc)w.push("discontinued");
 if(p.L<f.light[0]||(f.light[1]<100&&p.L>f.light[1]))w.push("lightness "+p.L);
 return w}
const passes=p=>fails(p).length===0;

// ---- wheel scaffolding ----
const el=(t,a={},par)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(par)par.appendChild(e);return e};
const grid=$("grid");
for(const r of [20,40,60,80,100]){el("circle",{r,fill:"none",stroke:"var(--rule)","stroke-width":r===100?.5:.3},grid);const t=el("text",{x:1.2,y:-r-1,"font-size":3,fill:"var(--graphite)"},grid);t.textContent=r}
for(let d=0;d<360;d+=30){const rad=d*Math.PI/180;el("line",{x1:0,y1:0,x2:100*Math.cos(rad),y2:-100*Math.sin(rad),stroke:"var(--rule)","stroke-width":.25},grid);const t=el("text",{x:117*Math.cos(rad),y:-117*Math.sin(rad)+1.1,"font-size":3.2,fill:"var(--graphite)","text-anchor":"middle"},grid);t.textContent=d+"°"}
const ring=$("ring");
for(let d=0;d<360;d+=2.5){const a1=d*Math.PI/180,a2=(d+2.6)*Math.PI/180,r1=105,r2=111;const pt=(r,a)=>`${r*Math.cos(a)},${-r*Math.sin(a)}`;el("path",{d:`M${pt(r1,a1)}L${pt(r2,a1)}A${r2},${r2} 0 0 0 ${pt(r2,a2)}L${pt(r1,a2)}A${r1},${r1} 0 0 1 ${pt(r1,a1)}Z`,fill:lab2rgb(62,42*Math.cos((d+1.25)*Math.PI/180),42*Math.sin((d+1.25)*Math.PI/180))},ring)}
const tip=$("tip"),info=$("info");
// Touch has no hover, so taps open a sheet with details instead of toggling straight away.
let lastPtr="mouse";
document.addEventListener("pointerdown",e=>{lastPtr=e.pointerType||"mouse"},true);
const touchy=()=>lastPtr!=="mouse";
const noHover=matchMedia("(hover: none)");
function showTip(txt,e){tip.textContent=txt;tip.style.opacity=1;moveTip(e)}
function moveTip(e){const w=tip.offsetWidth;let x=e.clientX+14;if(x+w>innerWidth-8)x=e.clientX-14-w;tip.style.left=x+"px";tip.style.top=(e.clientY-tip.offsetHeight-10)+"px"}
function hideTip(){tip.style.opacity=0}
addEventListener("scroll",hideTip,{passive:true});
// small confirmation bubble just above whatever was used to add the paint
const toastEl=$("toast");let toastTimer;
function toast(msg,rect,ms=1400){toastEl.textContent=msg;const w=toastEl.offsetWidth||110;
 const x=rect?Math.max(w/2+8,Math.min(innerWidth-w/2-8,rect.left+rect.width/2)):innerWidth/2;
 let y=rect?rect.top-42:innerHeight/2;if(y<8)y=rect.bottom+8;
 toastEl.style.left=x+"px";toastEl.style.top=y+"px";toastEl.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove("show"),ms)}
// the first paint anyone adds also says where it went
function paintAdded(rect){toast(S.hinted?"Paint added":"Added. Your paints are under Palette",rect,S.hinted?1400:3200);if(!S.hinted){S.hinted=true;save()}}
// client coordinates to SVG user units, and how many user units one CSS pixel spans
function svgPt(svg,e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
const unitsPerPx=svg=>248/svg.getBoundingClientRect().width;
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const lfTxt=p=>p.lfRaw?`Lightfastness ${p.lfRaw}${!p.lf||p.lfRaw.includes("ASTM")||ROMAN[p.lfRaw]?"":` (≈ ${ROMAN[p.lf]})`}`:"Lightfastness not listed";
// filled dot: the maker's rating; hollow dot: inferred from the pigment
const mark=(p,k,txt)=>!p[k]?null:`${inferred(p,k)?"○":"●"}\u2009${txt}`;
const propsOf=p=>[p.single===true?"Single pigment":p.single===false?"Mixture":null,lfTxt(p),p.trans?TNAME[p.trans]:null,mark(p,"stain",SNAME[p.stain]),mark(p,"gran",p.gran==="G"?"Granulating":"Non-granulating"),p.dryRaw?"Drying time "+p.dryRaw:null,p.series?"Series "+p.series:null,p.disc?"Discontinued":null].filter(Boolean).join(" · ");
const SRCWHY={pigment:"how other brands rate the same pigment",family:"its pigment family"};
// one line saying which values are guesses, and which ones the brands disagree on
function infNote(p){const g=[],u=[];
 [["stain","staining"],["gran","granulation"]].forEach(([k,l])=>{if(inferred(p,k))g.push(`${l} from ${SRCWHY[p[k+"Src"]]}`);else if(p[k+"Src"]==="uncertain")u.push(l)});
 return[g.length?`○ Inferred, not stated by ${p.bs}: ${g.join("; ")}.`:"",u.length?`${u.join(" and ")[0].toUpperCase()+u.join(" and ").slice(1)} unknown: brands rate ${p.pig&&p.pig.length>1?"these pigments":"this pigment"} differently.`:""].filter(Boolean).join(" ")}
const makerTxt=p=>[p.bs,p.pig&&p.pig.join(", ")].filter(Boolean).join(" · ");
const numsOf=p=>`Hue ${p.h.toFixed(1)}°, chroma ${p.C.toFixed(1)}, lightness ${p.L}`;
const srcNote=p=>p.src==="maker"?"Color from the manufacturer's published values, not yet measured.":p.src==="chart"?"Color measured from a printed color chart.":"";
const EXT='<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';
const hostOf=u=>{try{return new URL(u).hostname.replace(/^www\./,"")}catch(e){return"the source"}};
const extLink=p=>{const u=p.url||BRANDS[p.brand].url;if(!u)return"";const h=hostOf(u);return`<a class="ext" href="${esc(u)}" target="_blank" rel="noopener" title="View on ${esc(h)}" aria-label="View ${esc(p.n)} on ${esc(h)} (opens in a new tab)">${EXT}</a>`};
function describe(p){const w=fails(p),s=srcNote(p),n=infNote(p);return `<b>${esc(p.n)}</b> ${extLink(p)} <span class="brandnote">${esc(makerTxt(p))}</span>${inPal(p)?" · in your palette":""}<br>${numsOf(p)}<br>${propsOf(p)}${n?`<br><span class="note">${n}</span>`:""}${s?"<br>"+s:""}${w.length?`<br>Outside your filters: ${w.join(", ")}`:""}`}
const DEFAULT_INFO=()=>noHover.matches?"Tap near a dot to see its details and add it to your palette.":"Hover a dot for its details. Click it to add it to your palette.";
function toggle(id,rect){const i=st.sel.indexOf(id);if(i>=0){st.sel.splice(i,1);st.mix=st.mix.filter(m=>m!==id)}else{st.sel.push(id);paintAdded(rect)}save();render()}
const wheel=$("wheel"),allg=$("allg"),focusg=$("focusg");
// each medium builds its dots once, when its data first loads
function makeDot(p){const c=el("circle",{cx:p.x,cy:p.y,r:1.4,fill:p.rgb,stroke:"var(--paper)","stroke-width":.3,tabindex:0,role:"button","aria-label":`${p.n}, ${p.bs}`,style:"cursor:pointer"});p.dot=c;c._p=p;
 c.addEventListener("pointerenter",e=>{if(e.pointerType!=="mouse")return;showTip(`${p.n} · ${p.bs}`,e);info.innerHTML=describe(p)});
 c.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")moveTip(e)});
 c.addEventListener("pointerleave",hideTip);
 c.addEventListener("focus",()=>{if(!touchy())info.innerHTML=describe(p)});
 c.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle(p.id,c.getBoundingClientRect());info.innerHTML=describe(p)}})}
wheel.addEventListener("click",e=>{
 if(!touchy()){const p=e.target._p;if(p){toggle(p.id,{left:e.clientX,width:0,top:e.clientY-6,bottom:e.clientY});info.innerHTML=describe(p)}return}
 // fingers are much bigger than the dots: take every visible dot near the tap, closest first
 if(document.activeElement&&document.activeElement._p)document.activeElement.blur();
 const pt=svgPt(wheel,e),R=24*unitsPerPx(wheel);
 const near=P.filter(p=>p.dot.style.display!=="none").map(p=>({p,d:Math.hypot(p.x-pt.x,p.y-pt.y)})).filter(o=>o.d<R).sort((a,b)=>a.d-b.d).map(o=>o.p);
 if(near.length)openPaint(near[0],near.slice(1,6),e.clientY);else closeSheet()});
info.textContent=DEFAULT_INFO();
const hueSort=(a,b)=>(a.C<5)-(b.C<5)||((a.h+30)%360)-((b.h+30)%360);
const shortName=p=>p.n.replace(" Genuine","").replace("(Green Shade)","GS").replace("(Yellow Shade)","YS").replace("(Red Shade)","RS").replace("(Blue Shade)","BS");
// add the brand when two paints in view share a name
const nameIn=(p,list)=>list.some(q=>q!==p&&q.n===p.n)?`${shortName(p)} (${p.bs})`:shortName(p);
function palRow(p,note){const li=document.createElement("li");li.className="row";
 li.innerHTML=`<span class="sw" style="background:${p.rgb}"></span><span class="nm">${esc(p.n)} ${extLink(p)}<br><span class="note">${esc(makerTxt(p))}${note?"<br>"+note:""}</span></span>`;
 const b=document.createElement("button");b.className="x";b.textContent="×";b.setAttribute("aria-label","Remove "+p.n);b.onclick=()=>toggle(p.id);li.appendChild(b);
 li.addEventListener("pointerenter",e=>{if(e.pointerType!=="mouse")return;info.innerHTML=describe(p);p.dot.setAttribute("r",3)});
 li.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")p.dot.setAttribute("r",dotR(p))});return li}
// the whole row is the button: one tap adds the paint
function addRow(p,note,right,onAdded){const li=document.createElement("li"),b=document.createElement("button");b.className="row add";b.setAttribute("aria-label","Add "+p.n+", "+p.bs);
 b.innerHTML=`<span class="sw" style="background:${p.rgb}"></span><span class="nm">${esc(p.n)}<br><span class="note">${esc(makerTxt(p))}${note?" · "+note:""}</span></span>${right?`<span class="gain">${right}</span>`:""}<span class="plus" aria-hidden="true">+</span>`;
 b.onclick=()=>{const r=b.getBoundingClientRect();if(!inPal(p))st.sel.push(p.id);save();render();onAdded&&onAdded(r)};
 b.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")info.innerHTML=describe(p)});li.appendChild(b);return li}
const dotR=p=>$("showMine").checked&&inPal(p)?2.6:1.4;

// ---- filter chips ----
const seriesSort=(a,b)=>(isNaN(a)-isNaN(b))||(isNaN(a)?a.localeCompare(b):a-b);
function groups(){const inBrands=P.filter(p=>!st.f.brand.length||st.f.brand.includes(p.brand));
 return{brand:DATA.brands.map(b=>[b.key,b.short]),
  lf:[["1","I"],["2","II"],["3","III"],["4","IV"]],
  pig:[["any","Any"],["single","Single"]],
  trans:[["T","Transparent"],["ST","Semi-transparent"],["SO","Semi-opaque"],["O","Opaque"]],
  stain:[["1","Non"],["2","Semi"],["3","Staining"]],
  gran:[["any","Any"],["G","Granulating"],["N","Smooth"]],
  inf:[["inc","Include inferred"],["exc","Brand-stated only"]],
  dry:[["fast","Fast"],["medium","Medium"],["slow","Slow"]],
  series:[...new Set(inBrands.map(p=>p.series).filter(Boolean))].sort(seriesSort).map(s=>[s,s]),
  avail:[["cur","In production"],["any","Include discontinued"]]}}
// A filter only shows when this medium's data has something for it: granulation means
// little for oil, and a brand that doesn't publish series has nothing to pick from.
const HAS={brand:()=>DATA.brands.length>1,lf:p=>p.lf,pig:p=>p.single!=null,trans:p=>p.trans,stain:p=>p.stain,gran:p=>p.gran,
 inf:p=>inferred(p,"stain")||inferred(p,"gran"),dry:p=>p.dry,series:p=>p.series,avail:p=>p.disc};
function showGroups(){document.querySelectorAll(".chips").forEach(box=>{const k=box.dataset.key,on=k==="brand"?HAS.brand():P.some(HAS[k]);
 box.closest(".fgroup").hidden=!on;if(!on)st.f[k]=clone(DEFF[k])})}
function buildChips(){const G=groups();
 st.f.series=st.f.series.filter(s=>G.series.some(o=>o[0]===s));
 document.querySelectorAll(".chips").forEach(box=>{const key=box.dataset.key,many=box.dataset.mode==="many";box.innerHTML="";
  const opts=many?[["__any",key==="brand"?"All":"Any"],...G[key]]:G[key];
  opts.forEach(([v,label])=>{const b=document.createElement("button");b.className="chip";b.textContent=label;
   const on=many?(v==="__any"?st.f[key].length===0:st.f[key].includes(v)):st.f[key][0]===v;b.setAttribute("aria-pressed",on);
   b.onclick=()=>{if(many){if(v==="__any")st.f[key]=[];else{const i=st.f[key].indexOf(v);if(i>=0)st.f[key].splice(i,1);else st.f[key].push(v);if(st.f[key].length===G[key].length)st.f[key]=[]}}else st.f[key]=[v];save();buildChips();render()};
   box.appendChild(b)})});
 const n=["brand","lf","trans","stain","dry","series"].filter(k=>st.f[k].length).length+(st.f.pig[0]!=="any")+(st.f.gran[0]!=="any")+(st.f.inf[0]!=="inc")+(st.f.avail[0]!=="cur")+(st.f.light[0]!==0||st.f.light[1]!==100);
 $("fBadge").textContent=n;$("fBadge").hidden=!n;quickBrands()}
const valueBrands=()=>(cur.value||[]).filter(k=>BRANDS[k]);
// one tap narrows the wheel to the medium's good-value brands; tapping again shows every brand
function quickBrands(){const vb=valueBrands(),box=$("quick");box.hidden=!vb.length;if(!vb.length)return;
 const on=st.f.brand.length===vb.length&&vb.every(k=>st.f.brand.includes(k));
 box.innerHTML=`<button class="chip vchip" aria-pressed="${on}">Good value</button><span class="note">${esc(vb.map(k=>BRANDS[k].short).join(" and "))}: lower-priced lines with mostly lightfast colors, a good place to start. Prices vary by country.</span>`;
 box.querySelector("button").onclick=()=>{st.f.brand=on?[]:[...vb];save();buildChips();render()}}
$("clearF").onclick=()=>{st.f=clone(DEFF);save();buildChips();syncLight();render()};
const filterBtn=$("filterBtn"),filtersEl=$("filters");
filterBtn.onclick=()=>{const open=!filtersEl.classList.contains("open");filtersEl.classList.toggle("open",open);filterBtn.setAttribute("aria-expanded",open)};
const lmin=$("lmin"),lmax=$("lmax");
function syncLight(){const[a,b]=st.f.light;lmin.value=a;lmax.value=b;const fl=$("lfill");fl.style.left=a+"%";fl.style.right=(100-b)+"%";
 const any=a===0&&b===100;$("lval").textContent=any?"Any":`${a}–${b}`;$("lreset").hidden=any;
 lmin.style.zIndex=a>90?5:3}
function onLight(which){let a=+lmin.value,b=+lmax.value;if(a>b){if(which==="min")a=b;else b=a}st.f.light=[a,b];syncLight();render()}
lmin.addEventListener("input",()=>onLight("min"));lmax.addEventListener("input",()=>onLight("max"));
[lmin,lmax].forEach(e=>e.addEventListener("change",()=>{save();buildChips()}));
$("lreset").onclick=()=>{st.f.light=[0,100];save();syncLight();buildChips();render()};
syncLight();

// ---- reach from curved mixing paths (Mixbox) ----
// The reachable region is the envelope of every two-paint mixing curve: for each hue angle,
// the furthest point from the neutral center any pair's mix passes through.
const BINS=360,SEG=16,DTH=2*Math.PI/BINS;
function rgb2lab(c){const l=c.map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4});
 const X=(l[0]*.4124+l[1]*.3576+l[2]*.1805)/.95047,Y=l[0]*.2126+l[1]*.7152+l[2]*.0722,Z=(l[0]*.0193+l[1]*.1192+l[2]*.9505)/1.08883;
 const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;return[116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))]}
// Mixbox works inside the sRGB gamut, so vivid paints get pulled inward at the ends of the path.
// Shift the simulated path by the endpoint error so it starts and ends on each paint's measured color.
function mixPath(A,B,n){const z=new Array(mixbox.LATENT_SIZE),M=[];
 for(let s=0;s<=n;s++){const t=s/n;for(let j=0;j<z.length;j++)z[j]=A.lat[j]*(1-t)+B.lat[j]*t;M.push(rgb2lab(mixbox.latentToRgb(z)))}
 const e0=[A.L-M[0][0],A.a-M[0][1],A.b-M[0][2]],e1=[B.L-M[n][0],B.a-M[n][1],B.b-M[n][2]];
 return M.map((m,s)=>{const t=s/n;return m.map((v,k)=>v+(1-t)*e0[k]+t*e1[k])})}
function curve(A,B){const k=A.i<B.i?A.i*65536+B.i:B.i*65536+A.i;let c=curveCache.get(k);if(c)return c;
 const[a,b]=A.i<B.i?[A,B]:[B,A];c=new Float64Array((SEG+1)*2);
 mixPath(a,b,SEG).forEach((L,s)=>{c[s*2]=L[1];c[s*2+1]=L[2]});
 curveCache.set(k,c);return c}
const binOf=th=>{let k=Math.floor(((th%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/DTH);return k>=BINS?0:k};
function addPoint(env,x,y){const r=Math.hypot(x,y),k=binOf(Math.atan2(y,x));if(r>env[k])env[k]=r}
const COSB=new Float64Array(BINS),SINB=new Float64Array(BINS);for(let k=0;k<BINS;k++){COSB[k]=Math.cos((k+.5)*DTH);SINB[k]=Math.sin((k+.5)*DTH)}
function addSeg(env,x1,y1,x2,y2){addPoint(env,x2,y2);const dx=x2-x1,dy=y2-y1,den0=x1*dy-y1*dx;
 const k1=binOf(Math.atan2(y1,x1)),k2=binOf(Math.atan2(y2,x2));let d=k2-k1;if(d>BINS/2)d-=BINS;if(d<-BINS/2)d+=BINS;if(!d)return;
 const rmax=Math.max(Math.hypot(x1,y1),Math.hypot(x2,y2)),sg=d>0?1:-1;for(let s=0,k=k1;s<=Math.abs(d);s++,k=(k+sg+BINS)%BINS){const den=COSB[k]*dy-SINB[k]*dx;if(Math.abs(den)<1e-9)continue;let r=den0/den;if(r<=0)continue;if(r>rmax)r=rmax;if(r>env[k])env[k]=r}}
function addPair(env,A,B){const c=curve(A,B);addPoint(env,c[0],c[1]);for(let s=0;s<SEG;s++)addSeg(env,c[s*2],c[s*2+1],c[s*2+2],c[s*2+3])}
function envOf(paints){const env=new Float64Array(BINS);paints.forEach(p=>addPoint(env,p.a,p.b));for(let i=0;i<paints.length;i++)for(let j=i+1;j<paints.length;j++)addPair(env,paints[i],paints[j]);return env}
function envArea(env){if(!env.some(r=>r>0))return 0;let s=0;for(const r of env)s+=r*r;return s*DTH/2}
function envPts(env){let o=[];for(let k=0;k<BINS;k++){const th=(k+.5)*DTH;o.push(`${(env[k]*Math.cos(th)).toFixed(2)},${(-env[k]*Math.sin(th)).toFixed(2)}`)}return o.join(" ")}
// the full range only needs the most chromatic paints in each hue sector
function envPool(pool){const sec=new Map();pool.forEach(p=>{const k=Math.floor(p.h/15);(sec.get(k)||sec.set(k,[]).get(k)).push(p)});
 const pick=[];sec.forEach(v=>v.sort((a,b)=>b.C-a.C).slice(0,4).forEach(p=>pick.push(p)));return envOf(pick)}
function poolArea(pool){const key=pool.map(p=>p.i).join(",");if(!poolCache.has(key))poolCache.set(key,envArea(envPool(pool)));return poolCache.get(key)}
let reachKey="",reachMemo={};
function render(){
 const sel=st.sel.map(id=>byId[id]);
 // reach math is slow-ish; reuse it when only hover or display state changed
 const RK=JSON.stringify([st.sel,st.base,st.f]);if(RK!==reachKey){reachKey=RK;reachMemo={}}const M=reachMemo;
 const E=M.E??=envOf(sel),A=M.A??=envArea(E);
 const bE=M.bE??=envOf(st.base.map(id=>byId[id])),bA=M.bA??=envArea(bE);
 const wg=$("washg");wg.innerHTML="";
 const mine=$("showMine").checked;
 if(mine&&A>0){el("polygon",{points:envPts(E),fill:"var(--wash)","fill-opacity":"var(--washop)",stroke:"none",filter:"url(#wet)"},wg);el("polygon",{points:envPts(E),fill:"none",stroke:"var(--wash)","stroke-opacity":.45,"stroke-width":.7,"stroke-linejoin":"round",filter:"url(#wet)"},wg)}
 const bg=$("baseg");bg.innerHTML="";
 if(mine&&$("showBase").checked&&bA>0)el("polygon",{points:envPts(bE),fill:"none",stroke:"var(--graphite)","stroke-width":.45,"stroke-dasharray":"1.6 1.2"},bg);
 const showAll=$("showAll").checked;
 P.forEach(p=>{const s=mine&&inPal(p),ok=passes(p);p.dot.setAttribute("r",s?2.6:1.4);p.dot.setAttribute("stroke",s?"var(--ink)":"var(--paper)");p.dot.setAttribute("stroke-width",s?.5:.3);p.dot.setAttribute("stroke-dasharray",s&&!ok?"0.8 0.6":"none");p.dot.style.display=(s||(showAll&&ok))?"":"none";if(s)allg.appendChild(p.dot)});
 const lg=$("labg");lg.innerHTML="";
 if(mine&&$("showLab").checked)sel.forEach(p=>{const r=Math.max(p.C,6),ux=p.x/r,uy=p.y/r,small=p.C<3;const t=el("text",{x:small?p.x+3.5:p.x+ux*4,y:small?p.y+1:p.y+uy*4+1,"font-size":3.1,fill:"var(--ink)","text-anchor":small?"start":(Math.abs(ux)<.25?"middle":(ux>0?"start":"end")),"paint-order":"stroke",stroke:"var(--paper)","stroke-width":1,"pointer-events":"none"},lg);t.textContent=nameIn(p,sel)});
 $("palCount").textContent=sel.length?`(${sel.length})`:"";
 $("palBadge").textContent=sel.length;$("palBadge").hidden=!sel.length;
 const R=(k,f)=>document.querySelectorAll(`[data-r="${k}"]`).forEach(f);
 // reach shows in both Pigments and Palette
 const pv=FULL?Math.min(100,Math.round(A/FULL*100)):0;R("pct",e=>e.textContent=pv+"%");R("fullabel",e=>e.textContent=`of the full ${cur.name.toLowerCase()} range across all brands`);R("pctBar",e=>e.style.width=pv+"%");
 const pool=P.filter(passes),fA=poolArea(pool),selOk=sel.filter(passes),Ef=M.Ef??=(selOk.length===sel.length?E:envOf(selOk)),sA=M.sA??=(selOk.length===sel.length?A:envArea(Ef)),out=sel.length-selOk.length;
 const fv=fA?Math.min(100,Math.round(sA/fA*100)):0;R("fpct",e=>e.textContent=fA?fv+"%":"–");R("fpctBar",e=>e.style.width=fv+"%");
 // the second number only counts your paints that meet the filters; say so when that's not all of them
 const fl=out?`of the range that meets your filters, from the ${selOk.length} of your ${sel.length} paints that meet them`:"of the range that meets your filters";R("flabel",e=>e.textContent=fl);
 R("fnote",e=>e.textContent=out?`The first number counts all your paints; ${out} ${out===1?"is":"are"} outside your filters, so the second leaves ${out===1?"it":"them"} out.`:"");
 // say how many were dropped only for lack of data, so a short list is explainable
 // many brands don't publish staining or granulation: say so while those filters are on
 const inBrands=P.filter(p=>!st.f.brand.length||st.f.brand.includes(p.brand));
 [["stain","staining",st.f.stain.length>0],["gran","granulation",st.f.gran[0]!=="any"]].forEach(([k,label,on])=>{const n=document.querySelector(`.fwarn[data-note="${k}"]`);n.hidden=!on;if(!on)return;
  const miss=inBrands.filter(p=>!known(p,k)),by=[...new Set(miss.map(p=>p.bs))],guess=inBrands.filter(p=>p[k]&&inferred(p,k)).length,inc=st.f.inf[0]==="inc";
  const from=st.f.brand.length?" from the brands you chose":"";
  n.textContent=(guess?(inc?`${guess} values are inferred from the pigment (hollow dot in the details), not stated by the brand. `:`${guess} values inferred from the pigment are left out. `):"")+
   (miss.length?`${miss.length} of ${inBrands.length} paints${from} have ${inc?"no value, even inferred":"no brand-stated value"}${by.length<=3?` (${by.join(", ")})`:""}, so this filter leaves them out.`:`Every paint${from} has ${label} data.`)});
 const noData=P.filter(p=>{const w=fails(p);return w.length&&w.every(r=>r.startsWith("no "))}).length;
 const cnt=`${pool.length} of ${P.length} paints match.`+(noData?` ${noData} more have no data for a filter you set.`:"");$("fcount").textContent=cnt;$("fcountTop").textContent=cnt;
 const d=bA?((A-bA)/bA*100):0;const dt=bA?(Math.abs(d)<0.05?"Same reach as your stored palette.":`${d>0?"+":""}${d.toFixed(1)}% compared with your stored palette.`):"";R("delta",e=>e.textContent=dt);
 // only paints near or past the current edge can push it out; skip the rest to stay quick with many brands
 // gains are measured against the reach of your paints that meet the filters (the second Reach number),
 // and only paints near or past that edge can push it out, which keeps this quick with many brands
 const gains=M.gains??=(sA&&selOk.length>1?pool.filter(p=>!inPal(p)&&p.C>=.85*Ef[binOf(Math.atan2(p.b,p.a))]):[]).map(p=>{const e=Ef.slice();addPoint(e,p.a,p.b);selOk.forEach(q=>addPair(e,p,q));return{p,g:(envArea(e)-sA)/sA*100}}).filter(o=>o.g>=0.5).sort((a,b)=>b.g-a.g).slice(0,6);
 const gu=$("gains");gu.innerHTML="";
 if(sel.length<2)gu.innerHTML='<li class="fine">Add at least two paints to see your outline and what would widen it.</li>';
 else if(selOk.length<2)gu.innerHTML='<li class="fine">Fewer than two of your paints meet your filters, so there\'s no filtered reach to widen yet.</li>';
 else if(!gains.length)gu.innerHTML='<li class="fine">Nothing that meets your filters adds more than half a percent.</li>';
 gains.forEach(o=>gu.appendChild(addRow(o.p,"",`+${o.g.toFixed(1)}%`,r=>paintAdded(r))));
 const pu=$("pal");pu.innerHTML="";
 [...sel].sort(hueSort).forEach(p=>{const parts=[];if(A){const loss=(M.loss??={})[p.id]??=(A-envArea(envOf(sel.filter(q=>q!==p))))/A*100;if(loss>=0.1)parts.push(`Sets the edge · removing it loses ${loss.toFixed(1)}%`)}const w=fails(p);if(w.length)parts.push("Outside your filters: "+w.join(", "));pu.appendChild(palRow(p,parts.join("<br>")))});
 if(!sel.length){pu.innerHTML=`<li class="fine startli">Your ${cur.name.toLowerCase()} palette is empty. Add paints from the wheel or the search in Pigments, or start with a basic set: a warm and a cool of each primary.<br><button class="starter">Add a basic set</button></li>`;
  pu.querySelector(".starter").onclick=e=>addStarter(e.currentTarget.getBoundingClientRect())}
 search();drawFocus()}
const q=$("q"),res=$("results");
function search(){const v=q.value.trim().toLowerCase();res.innerHTML="";if(!v)return;
 const hit=p=>p.n.toLowerCase().includes(v)||p.bs.toLowerCase().includes(v)||(p.pig||[]).some(c=>c.toLowerCase()===v.replace(/\s/g,""));
 // paints already in the palette are left out; ones outside the filters come last, with the reason
 const m=P.filter(p=>!inPal(p)&&hit(p)).map(p=>({p,w:fails(p)})).sort((a,b)=>(a.w.length>0)-(b.w.length>0)||a.p.n.localeCompare(b.p.n)).slice(0,40);
 if(!m.length){res.innerHTML='<li class="fine">No paints outside your palette match that search.</li>';return}
 m.forEach(({p,w})=>res.appendChild(addRow(p,w.length?"outside filters: "+w.join(", "):"","",()=>{const r=q.getBoundingClientRect();q.value="";search();paintAdded(r);if(!touchy())q.focus()})))}
q.addEventListener("input",search);
["showMine","showAll","showLab","showBase"].forEach(id=>$(id).addEventListener("change",render));
$("setBase").onclick=()=>{st.base=[...st.sel];save();render()};
$("reset").onclick=()=>{st.sel=[...st.base];save();render()};
$("clearPal").onclick=()=>{st.sel=[];save();render()};

// ---- mixing ----
const TEX=`url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .22  0 0 0 0 .2  0 0 0 -2.6 1.35"/></filter><rect width="120" height="120" filter="url(#n)"/></svg>')}")`;
// Mixbox mix of any number of paints (weights sum to 1), shifted by each paint's endpoint error
// so pure paints land on their measured colors, the same correction mixPath applies.
const errOf=p=>p.err??=(m=>[p.L-m[0],p.a-m[1],p.b-m[2]])(rgb2lab(mixbox.latentToRgb(p.lat)));
function mixLab(ps,w){const z=new Array(mixbox.LATENT_SIZE).fill(0);ps.forEach((p,k)=>{for(let j=0;j<z.length;j++)z[j]+=w[k]*p.lat[j]});
 return rgb2lab(mixbox.latentToRgb(z)).map((v,i)=>v+ps.reduce((s,p,k)=>s+w[k]*errOf(p)[i],0))}
const hexOf=L=>"#"+lab2arr(...L).map(v=>v.toString(16).padStart(2,"0")).join("");
const verb=()=>noHover.matches?"Tap":"Click";
let mixFocus=null,sheetCtx=null,mixPts=[],mixSvg=null,markG=null;
function renderMix(){
 const box=$("mixPal");box.innerHTML="";
 st.mix=st.mix.filter(id=>st.sel.includes(id));if(st.mix3)st.mix=st.mix.slice(0,3);
 const full=st.mix3&&st.mix.length>=3;$("mixClear").disabled=!st.mix.length;
 $("mix2btn").setAttribute("aria-pressed",!st.mix3);$("mix3btn").setAttribute("aria-pressed",!!st.mix3);
 $("mixHelp").textContent=(st.mix3?`Pick three paints to see every color they can make together. ${verb()} any dot for its color and recipe.`:`Pick two or more paints to see the mixing path between every pair. ${verb()} a dot on the chart, or anywhere along a strip, for the mixed color and its ratio.`)+(cur.white?" Mixes here leave out white: add it on your palette to lighten.":"");
 if(!st.sel.length)box.innerHTML='<li class="fine">Your palette is empty. Add paints in Pigments first.</li>';
 else if(st.sel.length<2)box.insertAdjacentHTML("beforeend",'<li class="fine" style="grid-column:1/-1">Add at least one more paint to your palette to see how they mix.</li>');
 st.sel.map(id=>byId[id]).sort(hueSort).forEach(p=>{const on=st.mix.includes(p.id),li=document.createElement("li"),b=document.createElement("button");
  b.className="pchip";b.setAttribute("aria-pressed",on);b.disabled=full&&!on;
  b.setAttribute("aria-label",`${p.n}, ${p.bs}${p.gran==="G"?(inferred(p,"gran")?", granulating (inferred)":", granulating"):""}`);b.title=p.n;
  b.innerHTML=`<span class="sw" style="background:${p.rgb}"><svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span><span class="pt" aria-hidden="true"><span class="pn">${esc(p.n)}</span><span class="gr">${esc(p.bs)}${p.gran==="G"?(inferred(p,"gran")?" · ○ Gran.":" · Gran."):""}</span></span>`;
  b.onclick=()=>{if(on)st.mix=st.mix.filter(m=>m!==p.id);else st.mix.push(p.id);save();renderMix()};li.appendChild(b);box.appendChild(li)});
 if(st.mix3||!st.mix.includes(mixFocus))mixFocus=null;
 const ms=st.mix.map(id=>byId[id]).sort(hueSort),bars=$("bars");bars.innerHTML="";
 bars.appendChild(mixChart(ms));
 const tri=st.mix3&&ms.length===3;
 if(!tri&&ms.length>1){const pw=document.createElement("div");pw.className="pairs";pw.id="pairs";bars.appendChild(pw);renderPairs(ms)}
 // keep an open recipe only while its paints are still in the mix
 if(sheetCtx&&sheetCtx.kind==="mix"&&!(sheetCtx.ps.every(p=>st.mix.includes(p.id))&&(sheetCtx.ps.length===3)===tri))closeSheet();
 drawMark();updateTicks()
}
function hilite(sel){document.querySelectorAll(".mchart .mpath").forEach(g=>{const on=sel==null||g.dataset.a===sel||g.dataset.b===sel||g.dataset.k===sel;g.style.opacity=on?1:.12})}
const recipeTxt=(ps,w)=>ps.map((p,k)=>w[k]?`${w[k]}% ${nameIn(p,ps)}`:null).filter(Boolean).join("\n");
function nearestMix(pt,R){let best=null,bd=R;for(const m of mixPts){if(mixFocus&&!m.ps.some(p=>p.id===mixFocus))continue;const d=Math.hypot(m.x-pt.x,m.y-pt.y);if(d<bd){bd=d;best=m}}return best}
function mixChart(ms){
 const fig=document.createElement("figure");fig.className="mchart";
 const svg=el("svg",{viewBox:"-124 -124 248 248",role:"img","aria-label":ms.length?`Mixing paths between ${ms.map(p=>p.n).join(", ")} on the a*b* color plane`:"Empty a*b* color plane for mixing"},fig);
 mixSvg=svg;mixPts=[];
 for(const r of [20,40,60,80,100]){el("circle",{r,fill:"none",stroke:"var(--rule)","stroke-width":r===100?.5:.3},svg);const t=el("text",{x:1.2,y:-r-1,"font-size":3.2,fill:"var(--graphite)"},svg);t.textContent=r}
 // same grid and hue ring as the wheel
 for(let d=0;d<360;d+=30){const rad=d*Math.PI/180;el("line",{x1:0,y1:0,x2:100*Math.cos(rad),y2:-100*Math.sin(rad),stroke:"var(--rule)","stroke-width":.25},svg);const t=el("text",{x:117*Math.cos(rad),y:-117*Math.sin(rad)+1.1,"font-size":3.2,fill:"var(--graphite)","text-anchor":"middle"},svg);t.textContent=d+"°"}
 svg.appendChild(ring.cloneNode(true)).removeAttribute("id");
 const tri=st.mix3&&ms.length===3;
 if(tri){const g=el("g",{},svg),n=20;
  for(let i=0;i<=n;i++)for(let j=0;j<=n-i;j++){const w=[i*5,j*5,(n-i-j)*5],lab=mixLab(ms,w.map(v=>v/100));
   el("circle",{cx:lab[1],cy:-lab[2],r:1.5,fill:hexOf(lab),"fill-opacity":.95},g);mixPts.push({x:lab[1],y:-lab[2],ps:ms,w})}}
 else{const n=ms.length>6?10:20,rad=ms.length>6?1.6:2.1;
  for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){const A=ms[i],B=ms[j];
   const g=el("g",{class:"mpath"},svg);g.dataset.a=A.id;g.dataset.b=B.id;g.dataset.k=A.id+"|"+B.id;
   mixPath(A,B,n).forEach((L,k)=>{if(k===0||k===n)return;const pb=Math.round(k/n*100);el("circle",{cx:L[1],cy:-L[2],r:rad,fill:hexOf(L)},g);mixPts.push({x:L[1],y:-L[2],ps:[A,B],w:[100-pb,pb],k:g.dataset.k})})}}
 const placed=[];
 const label=p=>{const r=Math.hypot(p.a,p.b)||1,ux=p.a/r,uy=-p.b/r;let off=6,x,y;
  for(let k=0;k<8;k++){x=p.a+ux*off;y=-p.b+uy*off+1.2;if(!placed.some(q=>Math.abs(q[0]-x)<22&&Math.abs(q[1]-y)<4.6))break;off+=5}
  placed.push([x,y]);const t=el("text",{x,y,"font-size":3.8,fill:"var(--ink)","text-anchor":Math.abs(ux)<.3?"middle":ux>0?"start":"end","paint-order":"stroke",stroke:"var(--paper)","stroke-width":1.2,"pointer-events":"none"},svg);t.textContent=nameIn(p,ms)};
 ms.forEach(p=>el("circle",{cx:p.a,cy:-p.b,r:3.6,fill:p.rgb,stroke:"var(--ink)","stroke-width":.6,style:"cursor:pointer"},svg));
 ms.forEach(label);
 markG=el("g",{"pointer-events":"none"},svg);
 // hit testing by distance, so dots a few pixels wide still work under a finger
 const paintAt=(pt,R)=>tri?null:ms.map(p=>({p,d:Math.hypot(p.a-pt.x,-p.b-pt.y)})).filter(o=>o.d<R).sort((a,b)=>a.d-b.d)[0]?.p;
 svg.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const pt=svgPt(svg,e),u=unitsPerPx(svg),p=paintAt(pt,Math.max(4.5,8*u));
  if(p){svg.style.cursor="pointer";showTip(`${p.n} · ${p.bs}${p.gran==="G"?" (granulating)":""}`,e);if(!mixFocus)hilite(p.id);return}
  const m=nearestMix(pt,10*u);svg.style.cursor=m?"pointer":"";
  if(m){showTip(recipeTxt(m.ps,m.w),e);if(!mixFocus&&m.k)hilite(m.k)}else{hideTip();hilite(mixFocus)}});
 svg.addEventListener("pointerleave",()=>{hideTip();hilite(mixFocus)});
 svg.addEventListener("click",e=>{const pt=svgPt(svg,e),u=unitsPerPx(svg),p=paintAt(pt,Math.max(4.5,(touchy()?12:8)*u));
  if(p){mixFocus=mixFocus===p.id?null:p.id;hilite(mixFocus);renderPairs(ms);updateTicks();return}
  const m=nearestMix(pt,(touchy()?24:12)*u);if(m)openMix(m.ps,m.w,e.clientY)});
 const cap=document.createElement("figcaption");cap.className="fine";
 cap.textContent=tri?`Each dot is a mix of the three paints in 5% steps, from the pure paints at the corners to equal parts in the middle. ${verb()} a dot for its color and recipe.`
  :st.mix3&&ms.length?`Pick ${3-ms.length} more paint${ms.length===2?"":"s"} to see everything the three make together.`
  :ms.length>1?`Each dot is one ${ms.length>6?10:5}% step of a two-paint mix. ${verb()} a dot for its color and ratio, or a paint to focus on its mixes.`
  :ms.length?`Pick another paint to draw its mixing path from ${ms[0].n}.`:`Pick paints from your palette to draw their mixing paths here.`;
 fig.appendChild(cap);if(mixFocus)requestAnimationFrame(()=>hilite(mixFocus));return fig}
// gradient strips, one per pair: easy to tap anywhere along on a phone
function renderPairs(ms){const box=$("pairs");if(!box)return;box.innerHTML="";
 let pairs=[];for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++)pairs.push([ms[i],ms[j]]);
 if(mixFocus)pairs=pairs.filter(([A,B])=>A.id===mixFocus||B.id===mixFocus);
 else if(pairs.length>21){box.innerHTML=`<p class="fine">${pairs.length} pairs is a lot of strips. ${verb()} a paint on the chart to list just its mixes.</p>`;return}
 if(mixFocus){const f=document.createElement("p");f.className="fine";f.innerHTML=`Showing mixes with ${esc(byId[mixFocus].n)}. <button class="link">Show all pairs</button>`;f.querySelector("button").onclick=()=>{mixFocus=null;hilite(null);renderPairs(ms);updateTicks()};box.appendChild(f)}
 pairs.forEach(([A,B])=>{const d=document.createElement("div");d.className="pair";
  const stops=mixPath(A,B,20).map((L,k)=>`${hexOf(L)} ${k*5}%`).join(",");const gran=A.gran==="G"||B.gran==="G";
  d.innerHTML=`<div class="bl"><span>${esc(nameIn(A,ms))}</span><span>${esc(nameIn(B,ms))}</span></div><div class="strip" role="button" tabindex="0" aria-label="Mix ${esc(A.n)} with ${esc(B.n)}" style="background:linear-gradient(to right,${stops})">${gran?`<div class="tex" style="background-image:${TEX}"></div>`:""}</div>`;
  const s=d.querySelector(".strip");s.dataset.k=A.id+"|"+B.id;
  const share=e=>{const r=s.getBoundingClientRect();return Math.round(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*20)*5};
  s.addEventListener("click",e=>{const pb=share(e);openMix([A,B],[100-pb,pb],e.clientY)});
  s.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openMix([A,B],[50,50])}});
  if(!noHover.matches){s.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const pb=share(e);showTip(recipeTxt([A,B],[100-pb,pb]),e)});s.addEventListener("pointerleave",hideTip)}
  box.appendChild(d)})}
function updateTicks(){document.querySelectorAll(".strip .tick").forEach(t=>t.remove());
 if(!sheetCtx||sheetCtx.kind!=="mix"||sheetCtx.ps.length!==2)return;const[A,B]=sheetCtx.ps,s=document.querySelector(`.strip[data-k="${CSS.escape(A.id+"|"+B.id)}"]`);
 if(s){const t=document.createElement("span");t.className="tick";t.style.left=sheetCtx.w[1]+"%";s.appendChild(t)}}
function drawMark(){if(!markG)return;markG.innerHTML="";if(!sheetCtx||sheetCtx.kind!=="mix")return;
 const L=mixLab(sheetCtx.ps,sheetCtx.w.map(v=>v/100));
 el("circle",{cx:L[1],cy:-L[2],r:4.6,fill:"none",stroke:"var(--paper)","stroke-width":1.6},markG);
 el("circle",{cx:L[1],cy:-L[2],r:4.6,fill:hexOf(L),stroke:"var(--ink)","stroke-width":.8},markG)}
function drawFocus(){focusg.innerHTML="";if(!sheetCtx||sheetCtx.kind!=="paint")return;const p=sheetCtx.p;
 el("circle",{cx:p.x,cy:p.y,r:4.6,fill:"none",stroke:"var(--paper)","stroke-width":1.6},focusg);
 el("circle",{cx:p.x,cy:p.y,r:4.6,fill:"none",stroke:"var(--ink)","stroke-width":.8},focusg)}
// simplest whole-number parts that stay within about 2.5% of each share
function partsOf(w){const nz=w.filter(v=>v>0).length;if(nz<2)return null;
 for(let N=2;N<=24;N++){const parts=w.map(v=>Math.round(v/100*N));if(w.some((v,i)=>v>0&&!parts[i]))continue;const s=parts.reduce((a,b)=>a+b,0);
  if(w.every((v,i)=>Math.abs(parts[i]/s-v/100)<=.026))return parts}
 const g=(a,b)=>b?g(b,a%b):a,d=w.reduce((a,v)=>g(a,v),0);return w.map(v=>v/d)}

// ---- detail sheet ----
const sheet=$("sheet");
const closeBtn='<button class="x sh-close" aria-label="Close">×</button>';
function openPaint(p,near=[],y){sheetCtx={kind:"paint",p,near};drawSheet();drawFocus();drawMark();updateTicks();keepVisible(y)}
function openMix(ps,w,y){sheetCtx={kind:"mix",ps,w:[...w]};drawSheet();drawFocus();drawMark();updateTicks();keepVisible(y)}
function closeSheet(){if(!sheetCtx)return;sheetCtx=null;sheet.hidden=true;sheet.innerHTML="";document.body.style.paddingBottom="";drawFocus();drawMark();updateTicks()}
// on phones the sheet covers the bottom of the screen: leave room to scroll, and lift what was tapped above it
const phone=matchMedia("(max-width:759px)");
function keepVisible(y){if(!phone.matches){document.body.style.paddingBottom="";return}
 const nav=document.querySelector(".tabs").offsetHeight,h=sheet.offsetHeight;document.body.style.paddingBottom=(h+nav)+"px";
 if(y==null)return;const top=innerHeight-nav-h-56;if(y>top)scrollBy({top:y-top,behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"})}
function drawSheet(){const c=sheetCtx;sheet.hidden=false;
 if(c.kind==="paint"){const p=c.p,has=inPal(p),w=fails(p),s=srcNote(p);
  sheet.innerHTML=`<div class="sh-head"><span class="sh-sw" style="background:${p.rgb}"></span><div class="sh-t"><h3 id="sheetTitle">${esc(p.n)} ${extLink(p)}</h3><p class="note">${esc(makerTxt(p))}<br>${numsOf(p)}</p></div>${closeBtn}</div>
<p class="sh-props">${propsOf(p)}${infNote(p)?"<br>"+infNote(p):""}${s?"<br>"+s:""}</p>${w.length?`<p class="sh-warn">Outside your filters: ${w.join(", ")}</p>`:""}
<button class="primary${has?" rm":""}" data-act="toggle">${has?"Remove from palette":"Add to palette"}</button>
${c.near.length?`<div class="sh-near"><span class="flabel">Also near your tap</span><div class="chips">${c.near.map((q,i)=>`<button class="chip" data-i="${i}" aria-label="${esc(q.n+", "+q.bs)}"><span class="sw" style="background:${q.rgb}"></span>${esc(q.n)}</button>`).join("")}</div></div>`:""}`;
  const tb=sheet.querySelector("[data-act=toggle]");tb.onclick=()=>{toggle(p.id,tb.getBoundingClientRect());drawSheet()};
  sheet.querySelectorAll(".sh-near .chip").forEach(b=>b.onclick=()=>{const q=c.near[+b.dataset.i];openPaint(q,[p,...c.near.filter(o=>o!==q)])})}
 else{const{ps}=c,gran=ps.filter(p=>p.gran==="G");
  sheet.innerHTML=`<div class="sh-head"><span class="sh-sw mix" id="mixSw">${gran.length?`<span class="tex" style="background-image:${TEX}"></span>`:""}</span><div class="sh-t"><h3 id="sheetTitle"><span class="parts" id="mixParts"></span></h3><p class="note" id="mixNums"></p></div>${closeBtn}</div>
<div class="ratio" id="mixBar">${ps.map(p=>`<span style="background:${p.rgb}"></span>`).join("")}</div>
<div class="rec">${ps.map((p,k)=>`<span class="sw" style="background:${p.rgb}"></span><span class="nm">${esc(nameIn(p,ps))} <span class="note" id="pp${k}"></span></span><span class="pc" id="pc${k}"></span>${ps.length===3?`<input type="range" min="0" max="100" step="5" data-k="${k}" aria-label="Share of ${esc(p.n)}">`:""}`).join("")}</div>
${ps.length===2?`<div class="two"><span class="sw" style="background:${ps[0].rgb}"></span><input type="range" min="0" max="100" step="5" data-k="1" aria-label="Share of ${esc(ps[1].n)}"><span class="sw" style="background:${ps[1].rgb}"></span></div>`:""}
<p class="fine" style="margin:0">${gran.length?`${esc(gran.map(p=>p.n+(inferred(p,"gran")?" (inferred)":"")).join(" and "))} granulate${gran.length===1?"s":""}, so expect texture. `:""}Drag to adjust. Assumes equal strength, so ${cur.strong||"a strong paint takes over faster in real mixes"}.</p>`;
  sheet.querySelectorAll("input[type=range]").forEach(r=>r.addEventListener("input",()=>setShare(+r.dataset.k,+r.value)));
  updateMixSheet()}
 sheet.querySelector(".sh-close").onclick=closeSheet}
function setShare(k,v){const w=sheetCtx.w;if(w.length===2){w[k]=v;w[1-k]=100-v}
 else{const o=[0,1,2].filter(i=>i!==k),rem=100-v,s=w[o[0]]+w[o[1]],a=s?Math.round(rem*w[o[0]]/s/5)*5:Math.round(rem/10)*5;w[o[0]]=a;w[o[1]]=rem-a;w[k]=v}
 updateMixSheet()}
function updateMixSheet(){const{ps,w}=sheetCtx,L=mixLab(ps,w.map(v=>v/100)),hex=hexOf(L),parts=partsOf(w);
 $("mixSw").style.background=hex;
 $("mixParts").textContent=parts?parts.filter(Boolean).join(" : ")+" mix":"Pure paint";
 $("mixNums").textContent=`${hex.toUpperCase()} · L ${L[0].toFixed(0)}, a ${L[1].toFixed(0)}, b ${L[2].toFixed(0)}`;
 document.querySelectorAll("#mixBar span").forEach((s,k)=>s.style.width=w[k]+"%");
 ps.forEach((p,k)=>{$("pc"+k).textContent=w[k]+"%";$("pp"+k).textContent=parts?`· ${parts[k]} part${parts[k]===1?"":"s"}`:"";
  const r=sheet.querySelector(`input[type=range][data-k="${k}"]`);if(r&&+r.value!==w[k])r.value=w[k]});
 drawMark();updateTicks()}
addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
$("mixClear").onclick=()=>{st.mix=[];save();renderMix()};
$("mix2btn").onclick=()=>{st.mix3=false;save();renderMix()};
$("mix3btn").onclick=()=>{st.mix3=true;save();renderMix()};

// ---- sections: a bottom menu switches them on phones; on wider screens they stack and the menu scrolls ----
const tabLinks=[...document.querySelectorAll(".tabs a")],VIEWS=tabLinks.map(a=>a.dataset.tab);
function markTab(t){tabLinks.forEach(a=>a.setAttribute("aria-current",a.dataset.tab===t))}
function setTab(t){if(!VIEWS.includes(t))t="pigments";document.body.dataset.tab=t;markTab(t);hideTip()}
tabLinks.forEach(a=>a.addEventListener("click",e=>{if(!phone.matches)return;e.preventDefault();const t=a.dataset.tab;
 if(document.body.dataset.tab!==t){closeSheet();setTab(t);history.replaceState(null,"","#"+t)}scrollTo({top:0})}));
addEventListener("scroll",()=>{if(phone.matches)return;let cur=VIEWS[0];for(const v of VIEWS)if($(v).getBoundingClientRect().top<140)cur=v;markTab(cur)},{passive:true});
phone.addEventListener("change",()=>{closeSheet();markTab(document.body.dataset.tab)});
setTab(location.hash.slice(1));

// theme: Auto follows the device; Light or Dark is remembered in this browser
function setTheme(t){const r=document.documentElement;if(t==="auto")delete r.dataset.theme;else r.dataset.theme=t;try{localStorage.setItem("wpb:theme",t);localStorage.removeItem("dswheel:theme")}catch(e){}
 const bg=getComputedStyle(r).getPropertyValue("--paper").trim();document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute("content",t==="auto"?(m.media.includes("dark")?"#151618":"#F3F1EC"):bg));
 document.querySelectorAll(".theme button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.t===t));
 // phones get one small button that steps Auto → Light → Dark
 const nx=THEMES[(THEMES.indexOf(t)+1)%3],tb=$("themeBtn");tb.dataset.t=t;tb.querySelector("svg").innerHTML=THEME_ICON[t];
 tb.setAttribute("aria-label",`Color theme: ${TNAMES[t]}. Switch to ${TNAMES[nx]}`);tb.title=`Theme: ${TNAMES[t]}`}
const THEMES=["auto","light","dark"],TNAMES={auto:"Auto",light:"Light",dark:"Dark"};
const THEME_ICON={auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/>',
 light:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 dark:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>'};
document.querySelectorAll(".theme button").forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
$("themeBtn").onclick=()=>{const t=$("themeBtn").dataset.t||"auto";setTheme(THEMES[(THEMES.indexOf(t)+1)%3])};
setTheme(document.documentElement.dataset.theme||"auto");

const _render=render;render=function(){_render();renderMix()};

// ---- starter set: a warm and a cool of each primary ----
// Target CIELAB hue angles of masstones: lemon and deep yellow, scarlet and rose, ultramarine and a greener blue.
const STARTER=[97,80,38,14,290,255];
const hueGap=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
// a mix with white is a tint, not a primary to mix from
// and fluorescents, metallics and the like are bright but aren't primaries (fluorescents fade)
const effect=/fluor|neon|metallic|iridescent|pearl|glitter|interference/i;
const tinted=p=>(p.pig||[]).length>1&&p.pig.some(c=>/^PW/.test(c));
// the most chromatic paint near each target hue, favoring single pigments and good lightfastness
function fitSet(ps,win,partial){const out=[];let tot=0;
 for(const h of STARTER){let best=null,bs=-Infinity;
  for(const p of ps){if(out.includes(p))continue;const d=hueGap(p.h,h);if(d>win)continue;if(effect.test(p.n))continue;const sc=p.C-2.5*d+(p.single?15:0)-(p.lf>2?40:!p.lf?10:0)-(tinted(p)?30:0);if(sc>bs){bs=sc;best=p}}
  if(best){out.push(best);tot+=bs}else if(!partial)return null}
 return{out,tot}}
// one brand's set when a brand covers all six well, otherwise the best across brands
function starterSet(){const inProd=P.filter(p=>!p.disc),ok=inProd.filter(passes),pool=ok.length>=6?ok:inProd;
 const bestOf=keys=>{let best=null;for(const k of keys){const r=fitSet(pool.filter(p=>p.brand===k),14);if(r&&(!best||r.tot>best.tot))best=r}return best};
 // a good-value brand first, so a first palette doesn't start with the priciest paints
 const best=bestOf(valueBrands())||bestOf(DATA.brands.map(b=>b.key));
 return(best||fitSet(pool,14)||fitSet(pool,30,true)).out}
function addStarter(rect){const add=starterSet().filter(p=>!inPal(p));add.forEach(p=>st.sel.push(p.id));save();render();
 toast(add.length?`Added ${add.length} paint${add.length===1?"":"s"}`:"Those paints are already in your palette",rect,2200)}

// ---- mediums: each has its own paints, palette, stored palette, filters and mixes ----
const loading={},blankMedium=m=>({m,data:null,B:{},P:[],byId:{},FULL:0,curveCache:new Map(),poolCache:new Map()});
function prep(m,data){const B=Object.fromEntries((data.brands||[]).map(b=>[b.key,b]));
 const ps=data.paints.filter(d=>d&&d.id&&[d.L,d.a,d.b].every(Number.isFinite)).map((d,i)=>({...d,i,n:d.name,bs:B[d.brand]?.short||d.brand||"",C:Math.hypot(d.a,d.b),h:((Math.atan2(d.b,d.a)*180/Math.PI)+360)%360,rgb:lab2rgb(d.L,d.a,d.b),arr:lab2arr(d.L,d.a,d.b),x:d.a,y:-d.b,lf:d.lf||0,stain:d.stain||0,gran:d.gran||"",trans:d.trans||"",series:d.series||""}));
 ps.forEach(p=>{p.lat=mixbox.rgbToLatent(p.arr);makeDot(p)});
 return{m,data:{...data,brands:data.brands||[]},B,P:ps,byId:Object.fromEntries(ps.map(p=>[p.id,p])),FULL:null,curveCache:new Map(),poolCache:new Map()}}
// a missing file means that medium's paints aren't ready yet
function getMedium(m){return loading[m.key]??=fetch(m.file+(ASSET_V?"?v="+ASSET_V:"")).then(r=>{if(r.status===404)return null;if(!r.ok)throw new Error(r.status+" "+r.statusText);return r.json()})
 .then(data=>data&&Array.isArray(data.paints)&&data.paints.length?prep(m,data):blankMedium(m)).catch(err=>{delete loading[m.key];throw err})}
const loaded={};
let want=null;
function useMedium(key,{push=false}={}){const m=MBY[key]||MEDIA[0];want=m.key;
 if(!S.shown.includes(m.key))S.shown=MEDIA.map(x=>x.key).filter(k=>k===m.key||S.shown.includes(k));
 if(m.key!=="watercolor"&&S.news)S.news=false;
 closeSheet();closeMenu();setURL(m.key,push);
 if(!loaded[m.key]){allg.replaceChildren();info.textContent="Loading paints…";$("mediumName").textContent=m.name;mBtn.dataset.m=m.key}
 return getMedium(m).then(e=>{loaded[m.key]=e;if(want===m.key)apply(e)}).catch(err=>{if(want!==m.key)return;
  info.innerHTML=`<div class="loaderr">Couldn't load the ${esc(m.name.toLowerCase())} paints (${esc(String(err.message||err))}). If you opened this file directly, serve the folder instead, e.g. <code>python3 -m http.server</code>.</div>`;console.error(err)})}
function apply(e){cur=e.m;({B:BRANDS,P,byId,curveCache,poolCache}=e);DATA=e.data||{brands:[],paints:[]};
 if(e.FULL==null)e.FULL=poolArea(P);FULL=e.FULL;
 S.medium=cur.key;st=S.media[cur.key]??=blank();
 if(P.length){const ok=id=>!!byId[id];st.sel=st.sel.filter(ok);st.base=st.base.filter(ok);st.mix=st.mix.filter(ok)}
 mixFocus=null;reachKey="";reachMemo={};q.value="";
 allg.replaceChildren(...P.map(p=>p.dot));
 document.body.dataset.medium=cur.key;document.body.classList.toggle("nodata",!P.length);
 wheel.setAttribute("aria-label",`Hue and chroma wheel of ${cur.name.toLowerCase()} paints`);
 document.title=`${cur.name} · Palette Builder`;
 $("soonTitle").textContent=`${cur.name} paints are on their way`;
 $("soonText").textContent=`The ${cur.name.toLowerCase()} paint data isn't ready yet. Once it's added, you can browse ${cur.name.toLowerCase()} paints on the wheel, build a palette and see how they mix. Your other palettes are where you left them: switch mediums from the menu next to the title.`;
 showGroups();buildChips();syncLight();render();info.textContent=DEFAULT_INFO();mediumUI();save()}

// the medium is in the URL (?medium=oil), so links open it and Back returns to the last one
const urlMedium=()=>{const k=new URLSearchParams(location.search).get("medium");return MBY[k]?k:null};
function setURL(k,push){const u=new URL(location.href);u.searchParams.set("medium",k);if(u.href!==location.href)history[push?"pushState":"replaceState"](null,"",u)}
addEventListener("popstate",()=>{const k=urlMedium()||"watercolor";if(k!==want)useMedium(k)});

// ---- medium switcher: a pill next to the title opens the list ----
const mBtn=$("mediumBtn"),mMenu=$("mediumMenu");
const strip=k=>{const c=S.media[k]?.sw||[];return c.length?c.map(x=>`<span style="background:${x}"></span>`).join(""):""};
function countTxt(k){if(loaded[k]&&!loaded[k].P.length)return"Paint data coming soon";const n=S.media[k]?.sel.length||0;return n?`${n} paint${n===1?"":"s"}`:"Empty palette"}
function mediumUI(){mBtn.dataset.m=cur.key;$("mediumName").textContent=cur.name;mBtn.setAttribute("aria-label",`Medium: ${cur.name}. Switch medium`);
 $("news").hidden=!S.news;if(!mMenu.hidden)drawMenu()}
function drawMenu(){const others=MEDIA.filter(m=>!S.shown.includes(m.key));
 const row=(m,mine)=>`<button class="mrow" data-m="${m.key}"${m===cur?' aria-current="true"':""}><span class="mdot" aria-hidden="true"></span><span class="mname">${m.name}<span class="note">${mine?countTxt(m.key):esc(m.about)}</span></span>${mine?`<span class="mstrip" aria-hidden="true">${strip(m.key)}</span>`:'<span class="plus" aria-hidden="true">+</span>'}</button>`;
 mMenu.innerHTML=`<div class="mlist">${MEDIA.filter(m=>S.shown.includes(m.key)).map(m=>row(m,true)).join("")}</div>`+
  (others.length?`<p class="mlabel">Add a medium</p><div class="mlist">${others.map(m=>row(m,false)).join("")}</div>`:"")+
  `<div class="mfoot"><button class="link" data-act="start">Getting started</button></div>`;
 mMenu.querySelectorAll(".mrow").forEach(b=>b.onclick=()=>{const k=b.dataset.m;closeMenu();if(k===cur.key)return;
  useMedium(k,{push:true}).then(()=>{if(cur.key===k)toast(`Switched to ${cur.name}`,mBtn.getBoundingClientRect(),1800)})});
 mMenu.querySelector("[data-act=start]").onclick=openOnboard}
function openMenu(){drawMenu();mMenu.hidden=false;mBtn.setAttribute("aria-expanded","true");mMenu.querySelector(".mrow")?.focus()}
function closeMenu(){if(mMenu.hidden)return;mMenu.hidden=true;mBtn.setAttribute("aria-expanded","false")}
mBtn.onclick=()=>mMenu.hidden?openMenu():closeMenu();
document.addEventListener("click",e=>{if(!mMenu.hidden&&!e.target.closest(".medium"))closeMenu()});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!mMenu.hidden){closeMenu();mBtn.focus()}});
$("startAgain").onclick=openOnboard;
$("newsClose").onclick=()=>{S.news=false;save();mediumUI()};
$("newsOpen").onclick=e=>{e.stopPropagation();S.news=false;save();mediumUI();openMenu()};

// ---- getting started: pick mediums, then start from a basic set or an empty palette ----
const ob=$("onboard");let obPick=[],obKeys=[];
function openOnboard(){closeMenu();obPick=S.onboarded?[...S.shown]:[linked].filter(Boolean);obStep1();clearTimeout(toastTimer);toastEl.classList.remove("show");if(!ob.open)ob.showModal()}
function obStep1(){
 ob.innerHTML=`<h2 id="obTitle" tabindex="-1" autofocus>What do you paint with?</h2><p class="fine obsub">Pick one or more. Each medium keeps its own palette, and you can add the others any time from the menu next to the title.</p>
<div class="obgrid">${MEDIA.map(m=>`<button class="obcard" data-m="${m.key}" aria-pressed="${obPick.includes(m.key)}"><span class="mdot" aria-hidden="true"></span><b>${m.name}</b><span class="note">${esc(m.about)}</span></button>`).join("")}</div>
<div class="obfoot"><button class="link" data-act="skip">${S.onboarded?"Cancel":"Just let me explore"}</button><button class="primary" data-act="next">Continue</button></div>`;
 const next=ob.querySelector("[data-act=next]"),sync=()=>next.disabled=!obPick.length;sync();
 ob.querySelectorAll(".obcard").forEach(b=>b.onclick=()=>{const k=b.dataset.m;obPick=obPick.includes(k)?obPick.filter(x=>x!==k):[...obPick,k];b.setAttribute("aria-pressed",obPick.includes(k));sync()});
 next.onclick=obStep2;if(ob.open)ob.querySelector("h2").focus();
 ob.querySelector("[data-act=skip]").onclick=()=>ob.close()}
function obStep2(){const keys=MEDIA.map(m=>m.key).filter(k=>obPick.includes(k)),m=MBY[keys.includes(cur.key)?cur.key:keys[0]];
 obKeys=keys;
 ob.innerHTML=`<button class="link obback" data-act="back">‹ Back</button><h2 id="obTitle" tabindex="-1">Your ${m.name.toLowerCase()} palette</h2><p class="fine obsub">Loading ${m.name.toLowerCase()} paints…</p>`;
 ob.querySelector("[data-act=back]").onclick=obStep1;ob.querySelector("h2").focus();
 useMedium(m.key,{push:true}).then(()=>{if(!ob.open||cur!==m||!ob.querySelector(".obback"))return;
  const more=keys.length>1?` Your ${keys.filter(k=>k!==m.key).map(k=>MBY[k].name.toLowerCase()).join(" and ")} palette${keys.length>2?"s are":" is"} in the menu next to the title.`:"";
  if(!P.length){ob.querySelector(".obsub").textContent=`The ${m.name.toLowerCase()} paint data isn't ready yet, so there's nothing to pick from. You can look around in the meantime.${more}`;
   ob.insertAdjacentHTML("beforeend",'<div class="obfoot"><span></span><button class="primary" data-act="done">Got it</button></div>');ob.querySelector("[data-act=done]").onclick=()=>finish(false);return}
  const set=starterSet(),has=st.sel.length>0,brands=[...new Set(set.map(p=>p.bs))];
  ob.querySelector(".obsub").textContent=(has?`You already have ${st.sel.length} paint${st.sel.length===1?"":"s"} here. Add a basic set, or keep your palette as it is.`:"How would you like to start?")+more;
  ob.insertAdjacentHTML("beforeend",`<div class="obgrid two"><button class="obcard" data-act="set"><span class="obsw" role="img" aria-label="${esc(set.map(p=>p.n).join(", "))}">${set.map(p=>`<span style="background:${p.rgb}" title="${esc(p.n)}"></span>`).join("")}</span><b>${has?"Add":"Start with"} a basic set</b><span class="note">A warm and a cool of each primary, so you can mix most colors right away${brands.length===1?`, all from ${esc(brands[0])}`:""}.</span></button>
<button class="obcard" data-act="empty"><span class="obsw empty" aria-hidden="true"></span><b>${has?"Keep my palette":"Start empty"}</b><span class="note">${has?"Leave your paints as they are.":"Pick paints yourself on the color wheel."}</span></button></div>`);
  ob.querySelector("[data-act=set]").onclick=()=>finish(true);ob.querySelector("[data-act=empty]").onclick=()=>finish(false)})}
function finish(withSet){S.onboarded=true;S.news=false;S.shown=MEDIA.map(m=>m.key).filter(k=>obKeys.includes(k)||k===cur.key);ob.close();setTab("pigments");history.replaceState(null,"",location.pathname+location.search+"#pigments");
 if(withSet)addStarter();else save();mediumUI()}
// closing without finishing (Esc, or "Just let me explore") still counts as done, with every medium in the menu
ob.addEventListener("close",()=>{if(S.onboarded)return;S.onboarded=true;S.shown=MEDIA.map(m=>m.key);save();mediumUI()});

// a link to one medium (?medium=oil) preselects it for someone new
const linked=urlMedium();
useMedium(linked||S.medium).then(()=>{if(!S.onboarded)openOnboard()});
}
