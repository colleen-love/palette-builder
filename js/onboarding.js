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
  ob.insertAdjacentHTML("beforeend",`<div class="obgrid two"><button class="obcard" data-act="set"><span class="obsw" role="img" aria-label="${esc(set.map(p=>p.n).join(", "))}">${set.map(p=>`<span style="background:${p.rgb}" title="${esc(p.n)}"></span>`).join("")}</span><b>${has?"Add":"Start with"} a basic set</b><span class="note">A warm and a cool of each primary${cur.white?", plus white and black,":","} so you can mix most colors right away${set.sound?`. Each is rated lightfast (${set.every(p=>p.lf===1)?"I":"I or II"})${set.every(p=>p.single)?" and a single pigment":""}`:""}${brands.length===1?`, all from ${esc(brands[0])}`:""}.</span></button>
<button class="obcard" data-act="empty"><span class="obsw empty" aria-hidden="true"></span><b>${has?"Keep my palette":"Start empty"}</b><span class="note">${has?"Leave your paints as they are.":"Pick paints yourself on the color wheel."}</span></button></div>`);
  ob.querySelector("[data-act=set]").onclick=()=>finish(true);ob.querySelector("[data-act=empty]").onclick=()=>finish(false)})}
function finish(withSet){S.onboarded=true;S.news=false;S.shown=MEDIA.map(m=>m.key).filter(k=>obKeys.includes(k)||k===cur.key);ob.close();setTab("pigments");history.replaceState(null,"",location.pathname+location.search+"#pigments");
 if(withSet)addStarter();else save();mediumUI()}
// closing without finishing (Esc, or "Just let me explore") still counts as done, with every medium in the menu
ob.addEventListener("close",()=>{if(S.onboarded)return;S.onboarded=true;S.shown=MEDIA.map(m=>m.key);save();mediumUI()});
