// ---- shared palettes: ?medium=oil&p=id|id replaces that medium's palette, asking first if it would lose paints ----
const shDlg=$("shareDlg");
const sharedIds=()=>{const v=new URLSearchParams(location.search).get("p");return v==null?null:v.split("|").filter(Boolean)};
function dropShared(){const u=new URL(location.href);if(u.searchParams.has("p")){u.searchParams.delete("p");history.replaceState(null,"",u)}}
function openShared(ids){dropShared();
 const ok=[...new Set(ids)].filter(id=>byId[id]),lost=new Set(ids).size-ok.length;
 if(!ok.length){toast("None of the paints in that shared palette were found",null,2600);return}
 const same=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
 const take=store=>{shDlg.close();if(store)st.base=[...st.sel];st.sel=ok;st.mix=st.mix.filter(id=>ok.includes(id));save();render();
  setTab("palette");history.replaceState(null,"","#palette");if(!phone.matches)$("palette").scrollIntoView();
  toast(`Opened a shared palette of ${nPaints(ok.length)}${lost?` (${lost} not found)`:""}${store?" · yours is stored":""}`,null,2600)};
 if(!st.sel.length||same(st.sel,ok)){take(false);return}
 const stored=same(st.sel,st.base),n=st.sel.length,med=cur.name.toLowerCase();
 shDlg.innerHTML=`<h2 id="shTitle" tabindex="-1">Open a shared palette?</h2>
<div class="obsw" role="img" aria-label="${esc(ok.map(id=>byId[id].n).join(", "))}">${ok.map(id=>`<span style="background:${byId[id].rgb}" title="${esc(byId[id].n)}"></span>`).join("")}</div>
<p class="fine obsub">Someone shared ${nPaints(ok.length)} with you${lost?` (${lost} more ${lost===1?"isn't":"aren't"} in this app's ${med} paints)`:""}. Opening it clears your current ${med} palette of ${nPaints(n)}. ${stored?"Your palette is stored, so Reset to stored brings it back.":`Store it first to get it back later with Reset to stored${st.base.length?" (this replaces the palette you stored before)":""}.`}</p>
<div class="shbtns">${stored?'<button class="primary" data-act="open">Open shared palette</button>':'<button class="primary" data-act="store">Store mine and open</button><button data-act="open">Open without storing</button>'}<button class="link" data-act="keep">Keep my palette</button></div>`;
 shDlg.querySelector("[data-act=open]").onclick=()=>take(false);
 shDlg.querySelector("[data-act=store]")?.addEventListener("click",()=>take(true));
 shDlg.querySelector("[data-act=keep]").onclick=()=>shDlg.close();
 shDlg.showModal();shDlg.querySelector("h2").focus()}
