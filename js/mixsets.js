// ---- mix sets: a named plan per painting, its saved mixes, and comparing a paint swap ----
// swap: {from,to} while comparing what the set's mixes become with another palette paint (to is null until picked)
// swapOpen: the Swap out a paint section is open. setMode: "name" or "delete" while the mix set row is asking
let swap=null,swapOpen=false,setMode=null,savedPts=[];
const curSet=()=>st.sets[st.set];
const okMix=m=>m.ps.every(id=>byId[id]);
const mixOf=m=>m.ps.map(id=>byId[id]);
const labOf=m=>mixLab(mixOf(m),m.w.map(v=>v/100));
// "2 Ultramarine Blue + 1 Hansa Yellow"
const partsTxt=(ps,w)=>{const parts=partsOf(w)||w;return ps.map((p,k)=>w[k]?`${parts[k]} ${nameIn(p,ps)}`:null).filter(Boolean).join(" + ")};
// CIEDE2000 color difference: about 1 is barely visible side by side, 5 or more is a clearly different color
function dE00([L1,a1,b1],[L2,a2,b2]){const r=Math.PI/180,C7=c=>c**7/(c**7+25**7),Cm=(Math.hypot(a1,b1)+Math.hypot(a2,b2))/2,G=.5*(1-Math.sqrt(C7(Cm))),
 A1=a1*(1+G),A2=a2*(1+G),c1=Math.hypot(A1,b1),c2=Math.hypot(A2,b2),hue=(b,a)=>{const v=Math.atan2(b,a)/r;return v<0?v+360:v},h1=hue(b1,A1),h2=hue(b2,A2);
 let dh=c1*c2?h2-h1:0;if(dh>180)dh-=360;else if(dh<-180)dh+=360;
 let hm=h1+h2;if(c1*c2)hm=Math.abs(h1-h2)<=180?hm/2:hm<360?(hm+360)/2:(hm-360)/2;
 const Lm=(L1+L2)/2,cm=(c1+c2)/2,dL=L2-L1,dC=c2-c1,dH=2*Math.sqrt(c1*c2)*Math.sin(dh*r/2),
  T=1-.17*Math.cos((hm-30)*r)+.24*Math.cos(2*hm*r)+.32*Math.cos((3*hm+6)*r)-.2*Math.cos((4*hm-63)*r),
  SL=1+.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+.045*cm,SH=1+.015*cm*T,
  RT=-2*Math.sqrt(C7(cm))*Math.sin(60*Math.exp(-(((hm-275)/25)**2))*r);
 return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH))}
const closeness=d=>d<2?"very close":d<5?"close":d<10?"noticeably different":"can't get close";
// the 5% mix of ps nearest the target color, leaving out paints it doesn't need
function closest(ps,target){let best=null;
 const tryW=w=>{const d=dE00(target,mixLab(ps,w.map(v=>v/100)));if(!best||d<best.d)best={w,d}};
 if(ps.length===1)tryW([100]);else if(ps.length===2)for(let i=0;i<=100;i+=5)tryW([i,100-i]);
 else for(let i=0;i<=100;i+=5)for(let j=0;j<=100-i;j+=5)tryW([i,j,100-i-j]);
 const ks=best.w.map((v,k)=>v?k:-1).filter(k=>k>=0),out={ps:ks.map(k=>ps[k]),w:ks.map(k=>best.w[k]),d:best.d};out.lab=mixLab(out.ps,out.w.map(v=>v/100));return out}
// what a saved mix becomes with the swap: null when the swap doesn't touch it
const swapMemo=new Map();
function swappedOf(m){if(!swap||!swap.to||!m.ps.includes(swap.from)||!okMix(m))return null;
 const key=`${m.ps}/${m.w}/${swap.from}>${swap.to}`;if(swapMemo.has(key))return swapMemo.get(key);
 const ps=[...new Set(m.ps.map(id=>id===swap.from?swap.to:id))].map(id=>byId[id]),res=closest(ps,labOf(m));
 if(swapMemo.size>200)swapMemo.clear();swapMemo.set(key,res);return res}

// a set with no name is the working list; leaving it while it's empty drops it, so New mix set doesn't pile up empty ones
function useSet(i){st.set=i;const t=curSet();st.mix=[...t.mix];st.mix3=t.mix3;swap=null;swapOpen=false;setMode=null;mixFocus=null;
 if(sheetCtx&&sheetCtx.kind==="mix")closeSheet();save();renderMix()}
function selectSet(i){const old=curSet(),next=st.sets[i];if(old!==next&&!old.n&&!old.mixes.length)st.sets.splice(st.set,1);useSet(st.sets.indexOf(next))}
function delSet(){const n=curSet().n;st.sets.splice(st.set,1);if(!st.sets.length)st.sets.push(newSet(""));useSet(Math.min(st.set,st.sets.length-1));toast(`Deleted ${n}`,null,1800)}
const setLabel=t=>(t.n||"Unsaved mixes")+(t.mixes.length?` (${t.mixes.length})`:"");

// under the chart: the saved mixes, then naming or switching the set, then swapping out a paint
function renderSaved(){const box=$("saved");if(!box)return;const cs=curSet(),n=cs.mixes.length;
 // the toggle event comes a moment after a click, so read the section's state before redrawing it
 const was=$("swapBox");if(was)swapOpen=was.open;
 if(!P.length){box.innerHTML="";return}
 let h=`<h3 class="savedh">Saved mixes${cs.n?` <span class="note">· ${esc(cs.n)}</span>`:""}</h3>`;
 h+=n?`<ol class="smixes">${cs.mixes.map((m,i)=>{if(!okMix(m))return"";const out=m.ps.some(id=>!st.sel.includes(id));
   return `<li class="srow"><button class="sopen" data-i="${i}"><span class="snum">${i+1}</span><span class="sw" style="background:${hexOf(labOf(m))}"></span><span class="st"><span class="sn">${esc(m.n)}</span><span class="sr">${esc(partsTxt(mixOf(m),m.w))}${out?" · not in palette":""}</span></span></button>${n>1?`<span class="sord"><button data-up="${i}" aria-label="Move ${esc(m.n)} up"${i?"":" disabled"}>↑</button><button data-dn="${i}" aria-label="Move ${esc(m.n)} down"${i<n-1?"":" disabled"}>↓</button></span>`:""}</li>`}).join("")}</ol>`
  :`<p class="fine">${verb()} a mix on the chart${st.mix3?"":" or a strip"}, then Save it to keep its color and ratio here.</p>`;
 box.innerHTML=h+`<div class="setrow" id="setRow"></div>`+swapHtml();
 box.querySelectorAll("[data-i]").forEach(b=>b.onclick=e=>openSaved(cs.mixes[+b.dataset.i],e.clientY));
 // moving a mix renumbers it on the chart too; keep focus on the arrow that moved with it
 const move=(i,j)=>{[cs.mixes[i],cs.mixes[j]]=[cs.mixes[j],cs.mixes[i]];save();renderMix();$("saved").querySelector(`[data-${j<i?"up":"dn"}="${j}"]:not(:disabled)`)?.focus()};
 box.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,+b.dataset.up-1));
 box.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>move(+b.dataset.dn,+b.dataset.dn+1));
 renderSetRow();wireSwap(box)}

function renderSetRow(){const row=$("setRow"),cs=curSet(),n=cs.mixes.length;
 if(setMode==="name"){
  row.innerHTML=`<label class="flabel" for="setName">${cs.n?"Rename this mix set":"Name this mix set"}</label><div class="setform"><input id="setName" class="txt" maxlength="60" autocomplete="off" placeholder="e.g. Harbor study" value="${esc(cs.n)}"><button data-act="ok">Save</button><button class="link" data-act="no">Cancel</button></div>`;
  const inp=$("setName"),ok=()=>{const v=inp.value.trim().slice(0,60);if(!v){inp.focus();return}const was=cs.n;cs.n=v;setMode=null;save();renderSaved();toast(was?`Renamed to ${v}`:`Saved as ${v}`,null,1800)},
   no=()=>{setMode=null;renderSetRow()};
  inp.onkeydown=e=>{if(e.key==="Enter")ok();else if(e.key==="Escape"){e.stopPropagation();no()}};
  row.querySelector("[data-act=ok]").onclick=ok;row.querySelector("[data-act=no]").onclick=no;inp.focus();inp.select();return}
 if(setMode==="delete"){
  row.innerHTML=`<p class="setask">Delete <b>${esc(cs.n)}</b> and its ${n} saved mix${n===1?"":"es"}?</p><div class="setform"><button data-act="yes">Delete</button><button class="link" data-act="no">Keep it</button></div>`;
  row.querySelector("[data-act=yes]").onclick=delSet;row.querySelector("[data-act=no]").onclick=()=>{setMode=null;renderSetRow()};return}
 const others=st.sets.length>1;
 if(!cs.n){row.innerHTML=!n&&!others?"":`${n?'<button data-act="name">Save as a mix set</button>':""}${others?`<select id="setSel" aria-label="Open a mix set"><option value="" selected>Open a mix set…</option>${st.sets.map((t,i)=>i===st.set?"":`<option value="${i}">${esc(setLabel(t))}</option>`).join("")}</select>`:""}`}
 else row.innerHTML=`<label class="flabel" for="setSel">Mix set</label><select id="setSel">${st.sets.map((t,i)=>`<option value="${i}"${i===st.set?" selected":""}>${esc(setLabel(t))}</option>`).join("")}
<option disabled>──────────</option><option value="new">Start a new mix set</option><option value="ren">Rename ${esc(cs.n)}…</option><option value="del">Delete ${esc(cs.n)}…</option></select>`;
 row.querySelector("[data-act=name]")?.addEventListener("click",()=>{setMode="name";renderSetRow()});
 const sel=$("setSel");if(!sel)return;
 sel.onchange=()=>{const v=sel.value;
  if(v==="new"){const t=newSet("");t.mix=[...st.mix];t.mix3=st.mix3;st.sets.push(t);selectSet(st.sets.length-1);toast("Started a new mix set",null,1600)}
  else if(v==="ren"){setMode="name";renderSetRow()}
  else if(v==="del"){if(n){setMode="delete";renderSetRow()}else delSet()}
  else if(v!=="")selectSet(+v)}}

function swapHtml(){const cs=curSet(),used=[...new Set(cs.mixes.filter(okMix).flatMap(m=>m.ps))].map(id=>byId[id]).sort(hueSort);
 if(swap&&(!used.some(p=>p.id===swap.from)||(swap.to&&(swap.to===swap.from||!st.sel.includes(swap.to)))))swap=null;
 const from=swap?swap.from:used[0]?.id,tos=st.sel.filter(id=>id!==from).map(id=>byId[id]).sort(hueSort);
 if(!used.length||!tos.length)return"";
 let h=`<details class="swapbox" id="swapBox"${swapOpen?" open":""}><summary>Swap out a paint</summary>
<p class="fine">See how your saved mixes would change with another paint from your palette, and the ratio that gets closest to each color.</p>
<div class="swsel"><label class="note" for="swFrom">Swap</label><select id="swFrom">${used.map(p=>`<option value="${esc(p.id)}"${p.id===from?" selected":""}>${esc(nameIn(p,used))}</option>`).join("")}</select>
<label class="note" for="swTo">for</label><select id="swTo"><option value="">Choose a paint…</option>${tos.map(p=>`<option value="${esc(p.id)}"${swap&&p.id===swap.to?" selected":""}>${esc(nameIn(p,tos))}</option>`).join("")}</select>${swap&&swap.to?'<button class="link swclear" data-act="clear">Clear swap</button>':""}</div>`;
 if(swap&&swap.to){const to=byId[swap.to],fromP=byId[swap.from];let k=0,skip=0;
  const rows=cs.mixes.map((m,i)=>{const r=swappedOf(m);if(!r){if(okMix(m))skip++;return""}
   if(r.ps.length<2)return `<li class="note swone">${i+1}. ${esc(m.n)}: the closest is just ${esc(r.ps[0].n)}, so it stays as it is.</li>`;k++;
   return `<li><button class="sopen" data-cmp="${i}"><span class="snum">${i+1}</span><span class="sw" style="background:${hexOf(labOf(m))}" title="Now"></span><span class="arr" aria-hidden="true">→</span><span class="sw" style="background:${hexOf(r.lab)}" title="With ${esc(to.n)}"></span><span class="st"><span class="sn">${esc(m.n)}</span><span class="sr">${esc(partsTxt(r.ps,r.w))}</span><span class="note">${closeness(r.d)}</span></span></button></li>`}).join("");
  h+=`<ol class="smixes swres">${rows}</ol>${skip?`<p class="fine">${skip} other mix${skip===1?" doesn't":"es don't"} use ${esc(fromP.n)}.</p>`:""}
<div class="swapbtns"><button class="primary" data-act="keep"${k?"":" disabled"}>Use ${esc(shortName(to))} in ${cs.n?esc(cs.n):"these mixes"}</button><button data-act="variant"${k?"":" disabled"}>Save as a new mix set</button><button class="link" data-act="clear">Clear swap</button></div>`}
 return h+"</details>"}
function wireSwap(box){const d=$("swapBox");if(!d)return;const cs=curSet();
 d.addEventListener("toggle",()=>{swapOpen=d.open;if(!d.open&&swap){swap=null;renderMix()}});
 const pick=()=>{const f=$("swFrom").value,t=$("swTo").value;swap={from:f,to:t&&t!==f?t:null};renderMix()};
 $("swFrom").onchange=pick;$("swTo").onchange=pick;
 box.querySelectorAll("[data-cmp]").forEach(b=>b.onclick=e=>{const r=swappedOf(cs.mixes[+b.dataset.cmp]);openMix(r.ps,r.w,e.clientY,{keep:true})});
 box.querySelector("[data-act=keep]")?.addEventListener("click",()=>{const to=byId[swap.to],k=applySwap(cs);st.mix=swapIds(st.mix);
  swap=null;swapOpen=false;if(sheetCtx&&sheetCtx.kind==="mix")closeSheet();save();renderMix();toast(`${to.n} now in ${k} mix${k===1?"":"es"}`,null,2000)});
 box.querySelector("[data-act=variant]")?.addEventListener("click",()=>{const to=byId[swap.to],t=clone(cs);
  t.n=(cs.n?`${cs.n} · ${shortName(to)}`:`With ${shortName(to)}`).slice(0,60);t.mix=swapIds(st.mix);t.mix3=st.mix3;applySwap(t);
  st.sets.splice(st.set+1,0,t);selectSet(st.set+1);toast(`Saved ${t.n}`,null,2000)});
// clearing leaves the section open with the menus back at the start
 box.querySelectorAll("[data-act=clear]").forEach(b=>b.onclick=()=>{swap=null;renderMix();$("swTo")?.focus()})}
// replace the swapped-out paint in a list of ids, and each affected mix with its closest match
const swapIds=ids=>[...new Set(ids.map(id=>id===swap.from?swap.to:id))];
function applySwap(t){let k=0;t.mixes.forEach(m=>{const r=swappedOf(m);if(r&&r.ps.length>1){m.ps=r.ps.map(p=>p.id);m.w=[...r.w];k++}});return k}

// saved mixes on the mixing chart: numbered dots, and with a swap a dashed line to the closest match
function drawSaved(svg){const g=el("g",{"pointer-events":"none"},svg);savedPts=[];
 curSet().mixes.forEach((m,i)=>{if(!okMix(m))return;const L=labOf(m),x=L[1],y=-L[2],r=swappedOf(m);
  if(r&&r.ps.length>1){const N=r.lab;el("line",{x1:x,y1:y,x2:N[1],y2:-N[2],stroke:"var(--ink)","stroke-width":.5,"stroke-dasharray":"1.4 1"},g);
   el("circle",{cx:N[1],cy:-N[2],r:2.8,fill:hexOf(N),stroke:"var(--ink)","stroke-width":.6,"stroke-dasharray":"1.2 .8"},g)}
  el("circle",{cx:x,cy:y,r:3.4,fill:hexOf(L),stroke:"var(--ink)","stroke-width":.8},g);
  const t=el("text",{x:x+4.4,y:y-2.6,"font-size":3.8,"font-weight":600,fill:"var(--ink)","paint-order":"stroke",stroke:"var(--paper)","stroke-width":1.2},g);t.textContent=i+1;
  savedPts.push({x,y,m,i})})}
const savedAt=(pt,R)=>savedPts.map(s=>({s,d:Math.hypot(s.x-pt.x,s.y-pt.y)})).filter(o=>o.d<R).sort((a,b)=>a.d-b.d)[0]?.s;
const savedTip=s=>`${s.i+1}. ${s.m.n}\n${partsTxt(mixOf(s.m),s.m.w)}`;
function openSaved(m,y){openMix(mixOf(m),m.w,y,{saved:m,keep:true})}

// the save controls at the bottom of a mix's sheet
function saveBox(c){const cs=curSet();if(c.saved&&!cs.mixes.includes(c.saved))c.saved=null;const i=c.saved?cs.mixes.indexOf(c.saved):-1;
 return `<div class="savebox"><label class="flabel" for="mixName">${i>=0?`Saved mix ${i+1}`:"Save this mix"}</label>
<input id="mixName" class="txt" maxlength="60" autocomplete="off" placeholder="Name it, e.g. shadow side of the boat" value="${i>=0?esc(c.saved.n):""}">
<div class="savebtns">${i>=0?'<button data-act="upd">Update ratio</button><button data-act="new">Save as new</button><button class="link" data-act="del">Delete</button>':'<button class="primary" data-act="save">Save mix</button>'}</div></div>`}
function wireSaveBox(c){const cs=curSet(),inp=$("mixName"),b=a=>sheet.querySelector(`.savebtns [data-act=${a}]`);
 // a saved mix keeps only the paints it uses
 const used=()=>{const ks=c.w.map((v,k)=>v?k:-1).filter(k=>k>=0);return{ps:ks.map(k=>c.ps[k].id),w:ks.map(k=>c.w[k])}};
 const after=msg=>{save();renderMix();drawSheet();toast(msg,null,1600)};
 const add=at=>{const m={n:inp.value.trim().slice(0,60)||"Mix "+(cs.mixes.length+1),...used()};cs.mixes.splice(at,0,m);c.saved=m;c.ps=mixOf(m);c.w=[...m.w];after(cs.n?`Saved to ${cs.n}`:"Mix saved")};
 if(c.saved){const m=c.saved;
  inp.addEventListener("input",()=>{const v=inp.value.trim().slice(0,60);if(v){m.n=v;save();renderSaved()}});
  b("upd").onclick=()=>{Object.assign(m,used());c.ps=mixOf(m);c.w=[...m.w];after("Updated "+m.n)};
  b("new").onclick=()=>{if(inp.value.trim()===m.n)inp.value=m.n.slice(0,55)+" (2)";add(cs.mixes.indexOf(m)+1)};
  b("del").onclick=()=>{cs.mixes.splice(cs.mixes.indexOf(m),1);closeSheet();save();renderMix();toast("Deleted "+m.n,null,1600)}}
 else{b("save").onclick=()=>add(cs.mixes.length);inp.onkeydown=e=>{if(e.key==="Enter"&&!b("save").disabled)b("save").click()}}}
// called as the sliders move: a single paint isn't a mix, and Update only when the ratio changed
function syncSaveBox(parts){const c=sheetCtx;sheet.querySelectorAll(".savebtns button:not(.link)").forEach(x=>{
 x.disabled=!parts||(x.dataset.act==="upd"&&c.saved&&c.w.filter(Boolean).join()===c.saved.w.join()&&c.ps.filter((p,k)=>c.w[k]).map(p=>p.id).join()===c.saved.ps.join())})}
