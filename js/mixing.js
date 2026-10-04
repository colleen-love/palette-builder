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
 const sv=document.createElement("section");sv.id="saved";sv.className="saved";sv.setAttribute("aria-label","Saved mixes");bars.appendChild(sv);
 const tri=st.mix3&&ms.length===3;
 if(!tri&&ms.length>1){const pw=document.createElement("div");pw.className="pairs";pw.id="pairs";bars.appendChild(pw);renderPairs(ms)}
 // keep an open recipe only while its paints are still in the mix
 if(sheetCtx&&sheetCtx.kind==="mix"&&!sheetCtx.keep&&!(sheetCtx.ps.every(p=>st.mix.includes(p.id))&&(sheetCtx.ps.length===3)===tri))closeSheet();
 drawMark();updateTicks();renderSaved()
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
 drawSaved(svg);
 markG=el("g",{"pointer-events":"none"},svg);
 // hit testing by distance, so dots a few pixels wide still work under a finger
 const paintAt=(pt,R)=>tri?null:ms.map(p=>({p,d:Math.hypot(p.a-pt.x,-p.b-pt.y)})).filter(o=>o.d<R).sort((a,b)=>a.d-b.d)[0]?.p;
 svg.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const pt=svgPt(svg,e),u=unitsPerPx(svg),p=paintAt(pt,Math.max(4.5,8*u));
  if(p){svg.style.cursor="pointer";showTip(`${p.n} · ${p.bs}${p.gran==="G"?" (granulating)":""}`,e);if(!mixFocus)hilite(p.id);return}
  const s=savedAt(pt,Math.max(4,7*u));if(s){svg.style.cursor="pointer";showTip(savedTip(s),e);return}
  const m=nearestMix(pt,10*u);svg.style.cursor=m?"pointer":"";
  if(m){showTip(recipeTxt(m.ps,m.w),e);if(!mixFocus&&m.k)hilite(m.k)}else{hideTip();hilite(mixFocus)}});
 svg.addEventListener("pointerleave",()=>{hideTip();hilite(mixFocus)});
 svg.addEventListener("click",e=>{const pt=svgPt(svg,e),u=unitsPerPx(svg),p=paintAt(pt,Math.max(4.5,(touchy()?12:8)*u));
  if(p){mixFocus=mixFocus===p.id?null:p.id;hilite(mixFocus);renderPairs(ms);updateTicks();return}
  const s=savedAt(pt,Math.max(4,(touchy()?12:7)*u));if(s){openSaved(s.m,e.clientY);return}
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
