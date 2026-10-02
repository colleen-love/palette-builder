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
 if(!sel.length){pu.innerHTML=`<li class="fine startli">Your ${cur.name.toLowerCase()} palette is empty. Add paints from the wheel or the search in Pigments, or start with a basic set: a warm and a cool of each primary${cur.white?", plus white and black":""}, rated lightfast where the brands allow.<br><button class="starter">Add a basic set</button></li>`;
  pu.querySelector(".starter").onclick=e=>openSetDlg(e.currentTarget.getBoundingClientRect())}
 search();drawFocus();renderMix();if(setStep===2)setPreview()}
const q=$("q"),res=$("results");
function search(){const v=q.value.trim().toLowerCase();res.innerHTML="";if(!v)return;
 const hit=p=>p.n.toLowerCase().includes(v)||p.bs.toLowerCase().includes(v)||(p.pig||[]).some(c=>c.toLowerCase()===v.replace(/\s/g,""));
 // paints already in the palette are left out; ones outside the filters come last, with the reason
 const m=P.filter(p=>!inPal(p)&&hit(p)).map(p=>({p,w:fails(p)})).sort((a,b)=>(a.w.length>0)-(b.w.length>0)||a.p.n.localeCompare(b.p.n)).slice(0,40);
 if(!m.length){res.innerHTML='<li class="fine">No paints outside your palette match that search.</li>';return}
 m.forEach(({p,w})=>res.appendChild(addRow(p,w.length?"outside filters: "+w.join(", "):"","",()=>{const r=q.getBoundingClientRect();q.value="";search();paintAdded(r);if(!touchy())q.focus()})))}
q.addEventListener("input",search);
["showMine","showAll","showLab","showBase"].forEach(id=>$(id).addEventListener("change",render));
const nPaints=n=>`${n} paint${n===1?"":"s"}`;
const btnRect=e=>e.currentTarget.getBoundingClientRect();
$("setBase").onclick=e=>{st.base=[...st.sel];save();render();toast(st.sel.length?`Stored ${nPaints(st.sel.length)}`:"Stored an empty palette",btnRect(e),1800)};
$("reset").onclick=e=>{st.sel=[...st.base];st.mix=st.mix.filter(id=>st.sel.includes(id));save();render();toast(st.base.length?`Reset to your stored ${nPaints(st.base.length)}`:"Reset to your stored palette, which is empty",btnRect(e),1800)};
$("clearPal").onclick=e=>{const n=st.sel.length;st.sel=[];st.mix=[];save();render();toast(n?`Cleared ${nPaints(n)}`:"Your palette is already empty",btnRect(e),1800)};
// a link to this palette: its medium and paint ids (no id contains "|")
function shareURL(){const u=new URL(location.href);u.search="";u.hash="palette";u.searchParams.set("medium",cur.key);u.searchParams.set("p",st.sel.join("|"));return u.href}
$("sharePal").onclick=async e=>{const r=btnRect(e);if(!st.sel.length){toast("Add some paints to share first",r,1800);return}
 const url=shareURL();
 if(navigator.share&&touchy()){try{await navigator.share({title:`${cur.name} palette`,url})}catch(err){}return}
 try{await navigator.clipboard.writeText(url);toast("Link to your palette copied",r,1800)}catch(err){prompt("Copy this link to share your palette:",url)}};
