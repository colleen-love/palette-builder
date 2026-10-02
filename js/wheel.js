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
