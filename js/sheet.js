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
