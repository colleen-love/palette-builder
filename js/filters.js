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
 const n=activeFilters();
 $("fBadge").textContent=n;$("fBadge").hidden=!n;quickBrands()}
const activeFilters=()=>["brand","lf","trans","stain","dry","series"].filter(k=>st.f[k].length).length+(st.f.pig[0]!=="any")+(st.f.gran[0]!=="any")+(st.f.inf[0]!=="inc")+(st.f.avail[0]!=="cur")+(st.f.light[0]!==0||st.f.light[1]!==100);
const valueBrands=()=>(cur.value||[]).filter(k=>BRANDS[k]);
// one tap narrows the wheel to the medium's good-value brands; tapping again shows every brand
function quickBrands(){const vb=valueBrands(),box=$("quick");box.hidden=!vb.length;if(!vb.length)return;
 const on=st.f.brand.length===vb.length&&vb.every(k=>st.f.brand.includes(k));
 box.innerHTML=`<button class="chip vchip" aria-pressed="${on}">Good value</button><span class="note">${esc(vb.map(k=>BRANDS[k].short).join(" and "))}: among the least expensive lines in US art stores with lightfast (I or II) paints for every basic color. Prices vary by store and country.</span>`;
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
