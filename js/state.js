// Palette Builder: shared constants, color conversion, the current medium's data, saved state and the filter test
const ROMAN={1:"I",2:"II",3:"III",4:"IV"};
const TNAME={T:"Transparent",ST:"Semi-transparent",SO:"Semi-opaque",O:"Opaque"};
const SNAME={1:"Non-staining",2:"Semi-staining",3:"Staining"};
const NS="http://www.w3.org/2000/svg";
const MBY=Object.fromEntries(MEDIA.map(m=>[m.key,m]));
// the current medium's data; useMedium swaps these
let cur=MEDIA[0],DATA={brands:[],paints:[]},BRANDS={},P=[],byId={},FULL=0,curveCache=new Map(),poolCache=new Map();
function lab2rgb(L,a,b){let y=(L+16)/116,x=a/500+y,z=y-b/200;const f=t=>t**3>0.008856?t**3:(t-16/116)/7.787;x=0.95047*f(x);y=f(y);z=1.08883*f(z);let r=x*3.2406+y*-1.5372+z*-0.4986,g=x*-0.9689+y*1.8758+z*0.0415,bl=x*0.0557+y*-0.2040+z*1.0570;const c=v=>{v=v>0.0031308?1.055*v**(1/2.4)-0.055:12.92*v;return Math.round(Math.max(0,Math.min(1,v))*255)};return `rgb(${c(r)},${c(g)},${c(bl)})`}
function lab2arr(L,a,b){return lab2rgb(L,a,b).match(/\d+/g).map(Number)}
const $=id=>document.getElementById(id);

// ---- state ----
const DEFF={brand:[],lf:[],pig:["any"],trans:[],stain:[],gran:["any"],inf:["inc"],dry:[],series:[],avail:["cur"],light:[0,100]};
const KEY="wpb:v3";
const clone=o=>JSON.parse(JSON.stringify(o));
// a mix set is one painting's plan: the paints picked in Mixing (mix, mix3) and its saved mixes,
// named once saved as a set (an unnamed set is the working list),
// each a name, paint ids and whole-percent shares (w) that add up to 100
const newSet=n=>({n,mix:[],mix3:false,mixes:[]});
const blank=()=>({sel:[],base:[],mix:[],mix3:false,f:clone(DEFF),sets:[newSet("")],set:0});
function cleanSets(v,s){const txt=(t,d)=>typeof t==="string"&&t.trim()?t.trim().slice(0,60):d;
 const ids=a=>Array.isArray(a)?a.filter(id=>typeof id==="string"):[];
 const sets=(Array.isArray(v.sets)?v.sets:[]).filter(o=>o&&typeof o==="object").map(o=>({n:txt(o.n,""),mix:ids(o.mix),mix3:!!o.mix3,
  mixes:(Array.isArray(o.mixes)?o.mixes:[]).filter(m=>m&&typeof m==="object"&&ids(m.ps).length>1&&Array.isArray(m.w)&&m.w.length===m.ps.length&&m.w.every(x=>Number.isInteger(x)&&x>0)&&m.w.reduce((a,b)=>a+b,0)===100)
   .map((m,k)=>({n:txt(m.n,"Mix "+(k+1)),ps:ids(m.ps),w:[...m.w]}))}));
 if(!sets.length){const d=newSet("");d.mix=s.mix;d.mix3=s.mix3;sets.push(d)}
 s.sets=sets;s.set=Number.isInteger(v.set)&&v.set>=0&&v.set<sets.length?v.set:0;
 s.mix=[...sets[s.set].mix];s.mix3=sets[s.set].mix3}
// one medium's saved state; paint ids are checked against the data once that medium loads
function clean(v){const s=blank();if(!v||typeof v!=="object")return s;
 const ids=a=>Array.isArray(a)?a.filter(id=>typeof id==="string"):[];
 s.sel=ids(v.sel);s.base=ids(v.base);s.mix=ids(v.mix);s.mix3=!!v.mix3;if(Array.isArray(v.sw))s.sw=v.sw.filter(c=>typeof c==="string").slice(0,6);
 if(v.f&&typeof v.f==="object")for(const k in DEFF)if(Array.isArray(DEFF[k])&&Array.isArray(v.f[k]))s.f[k]=v.f[k];
 cleanSets(v,s);
 if(s.f.light.length!==2)s.f.light=[0,100];if(!s.f.pig.length)s.f.pig=["any"];if(!s.f.gran.length)s.f.gran=["any"];if(!s.f.inf.length)s.f.inf=["inc"];if(!s.f.avail.length)s.f.avail=["cur"];
 return s}
// S: everything saved. shown: the mediums in the switcher. onboarded: the first-visit questions are done.
// news: someone who used the watercolor-only app hasn't yet dismissed the note about the new mediums.
function load(){const S={medium:"watercolor",shown:[],media:{},onboarded:false,news:false,hinted:false};
 try{const v=JSON.parse(localStorage.getItem(KEY)||"null");
  if(v&&typeof v==="object"){if(MBY[v.medium])S.medium=v.medium;
   if(Array.isArray(v.shown))S.shown=MEDIA.map(m=>m.key).filter(k=>v.shown.includes(k));
   for(const m of MEDIA)if(v.media&&v.media[m.key])S.media[m.key]=clean(v.media[m.key]);
   S.onboarded=!!v.onboarded;S.news=!!v.news;S.hinted=!!v.hinted;return S}
  // the watercolor-only app kept one palette; it becomes the Watercolor palette
  let w=JSON.parse(localStorage.getItem("wpb:v2")||"null");
  // earlier versions stored a single-brand palette by paint name
  if(!w){const old=JSON.parse(localStorage.getItem("dswheel:public:v1")||"null");
   if(old){const m=a=>Array.isArray(a)?a.map(n=>"ds:"+n):[];w={sel:m(old.sel),base:m(old.base),mix:m(old.mix),mix3:!!old.mix3}}}
  if(w){S.media.watercolor=clean(w);S.shown=["watercolor"];S.onboarded=true;S.news=true;S.hinted=true}
 }catch(e){}
 return S}
const S=load();
let st=S.media[S.medium]??=blank();
// the switcher shows a few colors from each palette, so keep them with the palette
function save(){const cs=st.sets[st.set];cs.mix=[...st.mix];cs.mix3=st.mix3;
 if(P.length)st.sw=st.sel.slice(0,6).map(id=>byId[id]?.rgb).filter(Boolean);try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const inPal=p=>st.sel.includes(p.id);
// Staining and granulation filled in from the pigment (see tools/infer_properties.py) are
// inferred, not the maker's claim. "Brand-stated only" treats them as unknown.
const inferred=(p,k)=>p[k+"Src"]==="pigment"||p[k+"Src"]==="family";
const known=(p,k)=>!!p[k]&&(st.f.inf[0]==="inc"||!inferred(p,k));

// why a paint fails the filters (empty array = passes)
// A paint with no data for a filter you have set is left out: unknown is not a match.
function fails(p){const f=st.f,w=[];
 if(f.brand.length&&!f.brand.includes(p.brand))w.push(p.bs);
 if(f.lf.length){if(!p.lf){w.push("no lightfastness data")}else if(!f.lf.includes(String(p.lf)))w.push("lightfastness "+ROMAN[p.lf])}
 if(f.pig[0]==="single"){if(p.single===false)w.push("mixture");else if(p.single==null)w.push("no pigment data")}
 if(f.trans.length){if(!p.trans){w.push("no transparency data")}else if(!f.trans.includes(p.trans))w.push(TNAME[p.trans].toLowerCase())}
 if(f.stain.length){if(!known(p,"stain")){w.push(p.stain?"no brand staining data":"no staining data")}else if(!f.stain.includes(String(p.stain)))w.push(SNAME[p.stain].toLowerCase())}
 const g=f.gran[0];if(g!=="any"){if(!known(p,"gran")){w.push(p.gran?"no brand granulation data":"no granulation data")}else if(p.gran!==g)w.push(p.gran==="G"?"granulating":"smooth")}
 if(f.dry.length){if(!p.dry){w.push("no drying time data")}else if(!f.dry.includes(p.dry))w.push(p.dry+" drying")}
 if(f.series.length){if(!p.series){w.push("no series data")}else if(!f.series.includes(p.series))w.push("series "+p.series)}
 if(f.avail[0]==="cur"&&p.disc)w.push("discontinued");
 if(p.L<f.light[0]||(f.light[1]<100&&p.L>f.light[1]))w.push("lightness "+p.L);
 return w}
const passes=p=>fails(p).length===0;
