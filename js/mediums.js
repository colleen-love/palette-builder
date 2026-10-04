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
 if(P.length){const ok=id=>!!byId[id];st.sel=st.sel.filter(ok);st.base=st.base.filter(ok);st.mix=st.mix.filter(ok);
  st.sets.forEach(t=>{t.mix=t.mix.filter(ok);t.mixes=t.mixes.filter(m=>m.ps.every(ok))})}
 swap=null;
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
$("startAgain").onclick=()=>openOnboard();
$("newsClose").onclick=()=>{S.news=false;save();mediumUI()};
$("newsOpen").onclick=e=>{e.stopPropagation();S.news=false;save();mediumUI();openMenu()};
