// ---- sections: a bottom menu switches them on phones; on wider screens they stack and the menu scrolls ----
const tabLinks=[...document.querySelectorAll(".tabs a")],VIEWS=tabLinks.map(a=>a.dataset.tab);
function markTab(t){tabLinks.forEach(a=>a.setAttribute("aria-current",a.dataset.tab===t))}
function setTab(t){if(!VIEWS.includes(t))t="pigments";document.body.dataset.tab=t;markTab(t);hideTip()}
tabLinks.forEach(a=>a.addEventListener("click",e=>{if(!phone.matches)return;e.preventDefault();const t=a.dataset.tab;
 if(document.body.dataset.tab!==t){closeSheet();setTab(t);history.replaceState(null,"","#"+t)}scrollTo({top:0})}));
addEventListener("scroll",()=>{if(phone.matches)return;let cur=VIEWS[0];for(const v of VIEWS)if($(v).getBoundingClientRect().top<140)cur=v;markTab(cur)},{passive:true});
phone.addEventListener("change",()=>{closeSheet();markTab(document.body.dataset.tab)});
setTab(location.hash.slice(1));

// theme: Auto follows the device; Light or Dark is remembered in this browser
function setTheme(t){const r=document.documentElement;if(t==="auto")delete r.dataset.theme;else r.dataset.theme=t;try{localStorage.setItem("wpb:theme",t);localStorage.removeItem("dswheel:theme")}catch(e){}
 const bg=getComputedStyle(r).getPropertyValue("--paper").trim();document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute("content",t==="auto"?(m.media.includes("dark")?"#151618":"#F3F1EC"):bg));
 document.querySelectorAll(".theme button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.t===t));
 // phones get one small button that steps Auto → Light → Dark
 const nx=THEMES[(THEMES.indexOf(t)+1)%3],tb=$("themeBtn");tb.dataset.t=t;tb.querySelector("svg").innerHTML=THEME_ICON[t];
 tb.setAttribute("aria-label",`Color theme: ${TNAMES[t]}. Switch to ${TNAMES[nx]}`);tb.title=`Theme: ${TNAMES[t]}`}
const THEMES=["auto","light","dark"],TNAMES={auto:"Auto",light:"Light",dark:"Dark"};
const THEME_ICON={auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/>',
 light:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 dark:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>'};
document.querySelectorAll(".theme button").forEach(b=>b.onclick=()=>setTheme(b.dataset.t));
$("themeBtn").onclick=()=>{const t=$("themeBtn").dataset.t||"auto";setTheme(THEMES[(THEMES.indexOf(t)+1)%3])};
setTheme(document.documentElement.dataset.theme||"auto");
