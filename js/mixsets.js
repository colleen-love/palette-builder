// ---- mix sets: a named plan per painting, its saved mixes, and comparing a paint swap ----
// swap: {from,to} while comparing what the set's mixes become with another palette paint (to is null until picked)
// setMode: "rename" or "delete" while the set bar is asking
let swap=null,setMode=null,savedPts=[];
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

function selectSet(i){st.set=i;const t=curSet();st.mix=[...t.mix];st.mix3=t.mix3;swap=null;setMode=null;mixFocus=null;
 if(sheetCtx&&sheetCtx.kind==="mix")closeSheet();save();renderMix()}
function renderSetBar(){const bar=$("setBar"),cs=curSet();
 if(setMode==="rename"){
  bar.innerHTML=`<label class="flabel" for="setName">Mix set</label><input id="setName" class="txt" maxlength="60" autocomplete="off" value="${esc(cs.n)}"><span class="setacts"><button class="link" data-act="done">Done</button></span>`;
  const inp=$("setName");let fin=false;
  const done=keep=>{if(fin)return;fin=true;if(keep)cs.n=inp.value.trim().slice(0,60)||cs.n;setMode=null;save();renderSaved()};
  inp.onkeydown=e=>{if(e.key==="Enter")done(true);else if(e.key==="Escape"){e.stopPropagation();done(false)}};
  inp.onblur=()=>done(true);bar.querySelector("[data-act=done]").onclick=()=>done(true);
  inp.focus();inp.select();return}
 if(setMode==="delete"){const n=cs.mixes.length;
  bar.innerHTML=`<p class="setask">Delete <b>${esc(cs.n)}</b> and its ${n} saved mix${n===1?"":"es"}?</p><span class="setacts"><button data-act="yes">Delete</button><button class="link" data-act="no">Keep it</button></span>`;
  bar.querySelector("[data-act=yes]").onclick=()=>delSet();
  bar.querySelector("[data-act=no]").onclick=()=>{setMode=null;renderSetBar()};
  bar.querySelector("[data-act=no]").focus();return}
 bar.innerHTML=`<label class="flabel" for="setSel">Mix set</label><select id="setSel">${st.sets.map((t,i)=>`<option value="${i}"${i===st.set?" selected":""}>${esc(t.n)}${t.mixes.length?` (${t.mixes.length})`:""}</option>`).join("")}</select>
<span class="setacts"><button class="link" data-act="new">New</button><button class="link" data-act="ren">Rename</button><button class="link" data-act="del">Delete</button></span>`;
 $("setSel").onchange=e=>selectSet(+e.target.value);
 bar.querySelector("[data-act=new]").onclick=()=>{let k=st.sets.length+1;while(st.sets.some(t=>t.n==="Mix set "+k))k++;
  const t=newSet("Mix set "+k);t.mix=[...st.mix];t.mix3=st.mix3;st.sets.push(t);selectSet(st.sets.length-1);setMode="rename";renderSetBar()};
 bar.querySelector("[data-act=ren]").onclick=()=>{setMode="rename";renderSetBar()};
 bar.querySelector("[data-act=del]").onclick=()=>{if(curSet().mixes.length){setMode="delete";renderSetBar()}else delSet()}}
function delSet(){const n=curSet().n;st.sets.splice(st.set,1);if(!st.sets.length)st.sets.push(newSet("My mixes"));
 selectSet(Math.min(st.set,st.sets.length-1));toast(`Deleted ${n}`,null,1800);$("setSel")?.focus()}

function renderSaved(){renderSetBar();const box=$("saved"),cs=curSet();
 if(!P.length){box.innerHTML="";return}
 const used=[...new Set(cs.mixes.filter(okMix).flatMap(m=>m.ps))].map(id=>byId[id]).sort(hueSort);
 if(swap&&(!used.some(p=>p.id===swap.from)||(swap.to&&(swap.to===swap.from||!st.sel.includes(swap.to)))))swap=null;
 const n=cs.mixes.length;
 let h=`<div class="savedhead"><span class="flabel">Saved mixes</span>${n?`<span class="note">${n}</span>`:""}</div>`;
 if(!n)h+=`<p class="fine">None yet. ${verb()} a mix on the chart or a strip, then Save it to keep its color and ratio in ${esc(cs.n)}.</p>`;
 else{const from=swap?swap.from:used[0]?.id,tos=st.sel.filter(id=>id!==from).map(id=>byId[id]).sort(hueSort);
  if(used.length&&tos.length)h+=`<div class="swapbar"><span class="flabel">Compare a swap</span><div class="swsel"><label class="note" for="swFrom">Swap</label><select id="swFrom">${used.map(p=>`<option value="${esc(p.id)}"${p.id===from?" selected":""}>${esc(nameIn(p,used))}</option>`).join("")}</select>
<label class="note" for="swTo">for</label><select id="swTo"><option value="">another palette paint…</option>${tos.map(p=>`<option value="${esc(p.id)}"${swap&&p.id===swap.to?" selected":""}>${esc(nameIn(p,tos))}</option>`).join("")}</select></div></div>`;
  h+=`<ol class="smixes">${cs.mixes.map((m,i)=>{if(!okMix(m))return"";const ps=mixOf(m),hex=hexOf(labOf(m)),r=swappedOf(m),out=m.ps.some(id=>!st.sel.includes(id));
   let cmp="";if(r)cmp=r.ps.length<2?`<p class="scmp note">The closest is pure ${esc(r.ps[0].n)} (${closeness(r.d)}), so this mix stays as it is.</p>`
    :`<button class="scmp" data-cmp="${i}"><span class="sw" style="background:${hexOf(r.lab)}"></span><span class="st"><span class="sr"><b>${esc(partsTxt(r.ps,r.w))}</b></span><span class="note">Closest match with ${esc(byId[swap.to].n)}: ${closeness(r.d)}</span></span></button>`;
   else if(swap&&swap.to)cmp=`<p class="scmp note">Doesn't use ${esc(byId[swap.from].n)}.</p>`;
   return `<li class="smix${swap&&swap.to&&!r?" dim":""}"><button class="sopen" data-i="${i}"><span class="snum">${i+1}</span><span class="sw" style="background:${hex}"></span><span class="st"><span class="sn">${esc(m.n)}</span><span class="sr">${esc(partsTxt(ps,m.w))}${out?' <span class="note">· not in palette</span>':""}</span></span></button>
<span class="sord"><button data-up="${i}" aria-label="Move ${esc(m.n)} up"${i?"":" disabled"}>↑</button><button data-dn="${i}" aria-label="Move ${esc(m.n)} down"${i<n-1?"":" disabled"}>↓</button></span>${cmp}</li>`}).join("")}</ol>`;
  if(swap&&swap.to){const k=cs.mixes.filter(m=>{const r=swappedOf(m);return r&&r.ps.length>1}).length,to=byId[swap.to];
   h+=`<div class="swapbtns"><p class="fine">${k?`Using ${esc(to.n)} changes ${k} mix${k===1?"":"es"} to ${k===1?"its":"their"} closest match.`:`None of these mixes can use ${esc(to.n)} instead.`}</p>
<button class="primary" data-act="keep"${k?"":" disabled"}>Use ${esc(shortName(to))} in this set</button><button data-act="variant"${k?"":" disabled"}>Save as a new set</button><button class="link" data-act="cancel">Cancel</button></div>`}}
 box.innerHTML=h;
 const pick=()=>{const f=$("swFrom").value,t=$("swTo").value;swap={from:f,to:t&&t!==f?t:null};renderMix()};
 if($("swFrom")){$("swFrom").onchange=pick;$("swTo").onchange=pick}
 box.querySelectorAll("[data-i]").forEach(b=>b.onclick=e=>openSaved(cs.mixes[+b.dataset.i],e.clientY));
 box.querySelectorAll("[data-cmp]").forEach(b=>b.onclick=e=>{const r=swappedOf(cs.mixes[+b.dataset.cmp]);openMix(r.ps,r.w,e.clientY,{keep:true})});
 const move=(i,j)=>{[cs.mixes[i],cs.mixes[j]]=[cs.mixes[j],cs.mixes[i]];save();renderMix();box.querySelector(`[data-${j<i?"up":"dn"}="${j}"]`)?.focus()};
 box.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,+b.dataset.up-1));
 box.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>move(+b.dataset.dn,+b.dataset.dn+1));
 box.querySelector("[data-act=keep]")?.addEventListener("click",()=>{const to=byId[swap.to],k=applySwap(cs);st.mix=swapIds(st.mix);
  swap=null;if(sheetCtx&&sheetCtx.kind==="mix")closeSheet();save();renderMix();toast(`${to.n} now in ${k} mix${k===1?"":"es"}`,null,2000)});
 box.querySelector("[data-act=variant]")?.addEventListener("click",()=>{const to=byId[swap.to],t=clone(cs);
  t.n=`${cs.n} · ${shortName(to)}`.slice(0,60);t.mix=swapIds(st.mix);t.mix3=st.mix3;applySwap(t);
  st.sets.splice(st.set+1,0,t);selectSet(st.set+1);toast(`Saved ${t.n}`,null,2000)});
 box.querySelector("[data-act=cancel]")?.addEventListener("click",()=>{swap=null;renderMix()})}
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
 return `<div class="savebox"><label class="flabel" for="mixName">${i>=0?`Mix ${i+1} in ${esc(cs.n)}`:`Save to ${esc(cs.n)}`}</label>
<input id="mixName" class="txt" maxlength="60" autocomplete="off" placeholder="Name it, e.g. shadow side of the boat" value="${i>=0?esc(c.saved.n):""}">
<div class="savebtns">${i>=0?'<button data-act="upd">Update ratio</button><button data-act="new">Save as new</button><button class="link" data-act="del">Delete</button>':'<button class="primary" data-act="save">Save mix</button>'}</div></div>`}
function wireSaveBox(c){const cs=curSet(),inp=$("mixName"),b=a=>sheet.querySelector(`.savebtns [data-act=${a}]`);
 // a saved mix keeps only the paints it uses
 const used=()=>{const ks=c.w.map((v,k)=>v?k:-1).filter(k=>k>=0);return{ps:ks.map(k=>c.ps[k].id),w:ks.map(k=>c.w[k])}};
 const after=msg=>{save();renderMix();drawSheet();toast(msg,null,1600)};
 const add=at=>{const m={n:inp.value.trim().slice(0,60)||"Mix "+(cs.mixes.length+1),...used()};cs.mixes.splice(at,0,m);c.saved=m;c.ps=mixOf(m);c.w=[...m.w];after(`Saved to ${cs.n}`)};
 if(c.saved){const m=c.saved;
  inp.addEventListener("input",()=>{const v=inp.value.trim().slice(0,60);if(v){m.n=v;save();renderSaved()}});
  b("upd").onclick=()=>{Object.assign(m,used());c.ps=mixOf(m);c.w=[...m.w];after("Updated "+m.n)};
  b("new").onclick=()=>{if(inp.value.trim()===m.n)inp.value=m.n.slice(0,55)+" (2)";add(cs.mixes.indexOf(m)+1)};
  b("del").onclick=()=>{cs.mixes.splice(cs.mixes.indexOf(m),1);closeSheet();save();renderMix();toast("Deleted "+m.n,null,1600)}}
 else{b("save").onclick=()=>add(cs.mixes.length);inp.onkeydown=e=>{if(e.key==="Enter"&&!b("save").disabled)b("save").click()}}}
// called as the sliders move: a single paint isn't a mix, and Update only when the ratio changed
function syncSaveBox(parts){const c=sheetCtx;sheet.querySelectorAll(".savebtns button:not(.link)").forEach(x=>{
 x.disabled=!parts||(x.dataset.act==="upd"&&c.saved&&c.w.filter(Boolean).join()===c.saved.w.join()&&c.ps.filter((p,k)=>c.w[k]).map(p=>p.id).join()===c.saved.ps.join())})}
