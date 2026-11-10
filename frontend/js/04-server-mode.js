/* ---------- server mode (used when the page is served by server.py) ---------- */
async function api(method,path,body){
  const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'dd'},body:body===undefined?undefined:JSON.stringify(body)});
  let j={};try{j=await r.json()}catch(e){}
  if(!r.ok){const e=new Error(j.error||('http'+r.status));e.status=r.status;e.code=j.error;throw e}
  return j;
}
function netBar(msg){let el=document.getElementById('netbar');if(!msg){if(el)el.remove();return}if(!el){el=document.createElement('div');el.id='netbar';el.className='netbar';el.setAttribute('role','alert');document.body.appendChild(el)}el.textContent=msg}
function netErr(e){
  if(e&&e.status===401&&session){session=null;users=[];pcs=[];npcs=[];rooms=[];edit=null;dedit=null;siteDraft=null;authTab='signin';authErr=t('netLogin');netBar('');render();return}
  netBar(t(e&&e.code==='rejected'?'netRejected':'netSaveFail'));
}
let prooms=[];  /* players only: the rooms they sit in, as the server lets them see them */
const synced={pc:new Map(),npc:new Map()};
let syncChain=Promise.resolve(),inflight=0;const kvTimers={};
function resetSynced(){synced.pc=new Map(pcs.map(r=>[r.id,JSON.stringify(r)]));synced.npc=new Map(npcs.map(r=>[r.id,JSON.stringify(r)]))}
function applyBoot(j){
  REMOTE=true;SITE=Object.assign({},j.site||{});firstRun=!j.hasUsers;
  if(j.me){users=j.users||[j.me];session=j.me.id;PREFS=j.prefs||{};put('dd_theme',PREFS);pcs=j.pcs||[];npcs=j.npcs||[];rooms=j.rooms||[];prooms=j.prooms||[];CAT=j.cat||clone(SEED);normCat();
    if(!j.cat&&j.me.role==='admin')api('POST','api/kv/cat',{value:CAT}).catch(netErr)}
  else{users=[];session=null;pcs=[];npcs=[];rooms=[];prooms=[]}
  resetSynced();
}
function pushKv(k,v){
  clearTimeout(kvTimers[k]);inflight++;
  kvTimers[k]=setTimeout(()=>{syncChain=syncChain.then(async()=>{try{await api('POST','api/kv/'+REMOTE_KEYS[k],{value:v});netBar('')}catch(e){netErr(e)}finally{inflight--}})},350);
}
function syncKind(k){
  const L=list(k),cur=new Map(L.map(r=>[r.id,JSON.stringify(r)]));
  const up=L.filter(r=>synced[k].get(r.id)!==cur.get(r.id)),del=[...synced[k].keys()].filter(id=>!cur.has(id));
  if(!up.length&&!del.length)return;
  synced[k]=cur;inflight++;
  syncChain=syncChain.then(async()=>{
    try{const j=await api('POST','api/sync',{kind:k,upsert:up,del});
      (j.records||[]).forEach(srv=>{const L2=list(k),i=L2.findIndex(x=>x.id===srv.id);if(i>=0){L2[i]=srv;synced[k].set(srv.id,JSON.stringify(srv))}});
      if((j.rejected||[]).length)netErr({code:'rejected'});else netBar('');
      if(!edit&&!dedit&&session)render();
    }catch(e){netErr(e)}finally{inflight--}});
}
async function pull(){
  if(!REMOTE||!session||edit||dedit||inflight)return;
  if(view!=='players'&&view!=='npcs'&&view!=='conditions')return;
  try{applyBoot(await api('GET','api/boot'));if(!edit&&!dedit&&!inflight)render()}catch(e){if(e.status===401)netErr(e)}
}

let lang=load('dd_lang',null)||((navigator.language||'').startsWith('th')?'th':'en');
let users=load('dd_users',[]), pcs=load('dd_pcs',[]), npcs=load('dd_npcs',[]);
let CAT=load('dd_cat',null)||clone(SEED);
const BGSK={Acolyte:['insight','religion'],Charlatan:['deception','sleight'],Criminal:['deception','stealth'],Entertainer:['acrobatics','performance'],'Folk Hero':['animal','survival'],'Guild Artisan':['insight','persuasion'],Hermit:['medicine','religion'],Noble:['history','persuasion'],Outlander:['athletics','survival'],Sage:['arcana','history'],Sailor:['athletics','perception'],Soldier:['athletics','intimidation'],Urchin:['sleight','stealth']};
function crMig(r){if(r&&('save' in r||'acts' in r)){const sv=r.save,acts=(r.acts||[]).map(a=>a.t==='noact'?{t:'flag',f:'noact',ab:''}:a);
  r.chk=sv?{k:'save',ab:sv.ab,dc:sv.dc,skill:'',dice:''}:null;if(sv&&sv.on!=='pass'){r.ok=[];r.no=acts}else{r.ok=acts;r.no=[]}delete r.save;delete r.acts}
  if(r){if(!r.every)r.every=1;if(!r.rest)r.rest='any';if(!Array.isArray(r.ok))r.ok=[];if(!Array.isArray(r.no))r.no=[]}return r}
function normCat(){for(const k in SEED)if(!Array.isArray(CAT[k]))CAT[k]=clone(SEED[k]);
CAT.backgrounds.forEach(b=>{if(!Array.isArray(b.sk))b.sk=clone(BGSK[b.name]||[]);if(typeof b.equip!=='string')b.equip='';if(!Array.isArray(b.feats))b.feats=[]});
CAT.classes.forEach(c=>{if(!Array.isArray(c.feats))c.feats=[]});
CAT.conditions.forEach(c=>{if(!Array.isArray(c.rules)){const sd=SEED.conditions.find(x=>x.name===c.name);c.rules=sd?clone(sd.rules):[]}if(!c.dur||typeof c.dur!=='object')c.dur={u:'',n:0};if(!c.stack){c.stack='no';c.maxLv=0}if(!Array.isArray(c.ends))c.ends=[];c.rules.forEach(crMig);delete c.th});
CAT.backgrounds.forEach(b=>{const sd=SEED.backgrounds.find(x=>x.name===b.name);['nLang','nTool','nVeh'].forEach(k=>{if(b[k]===undefined||b[k]==='')b[k]=sd?sd[k]:0})});
}
normCat();
const names=k=>CAT[k].map(x=>x.name);
const subsOf=c=>(CAT.classes.find(x=>x.name===c)?.subs||[]).map(s=>s.name);
const pick=(arr,pref)=>arr.includes(pref)?pref:(arr[0]||'');
let session=load('dd_session',null);
let view='players', edit=null, authTab='signin', authErr='', delArm=null, flashMsg='';
let dataTab='races', dedit=null, dataArm=null, dataErr='';
let SITE=Object.assign({},load('dd_site',{})), siteDraft=null, siteMsg='';  /* SITE: name, tagline, logo, cover (shared by everyone, admin edits) */
let PREFS=load('dd_theme',{}), prefsFor;  /* PREFS: this user's own colors, effects, shape, rows per page */
const GLOBAL_KEYS=['name','tagline','logo','cover'],PREF_KEYS=['bg','surface','ink','accent','side','fxc','tnow','tnext','tdone','navb','fx','fxms','fxamt','radius','font','pg','imgBg','imgPanel','imgDeco','dim','pdim','decoPos','decoSize','decoOp','anim','lay'];
const THEME_DEF={bg:'#050505',surface:'#1e1e20',ink:'#dcdcdf',accent:'#121213',side:'#000000',fxc:'#000000',tnow:'#ffffff',tnext:'#999999',tdone:'#1e1e20',navb:'#999999'};
const IMG_KEYS=['imgBg','imgPanel','imgDeco'];
const siteInit=()=>Object.assign({},clone(SITE),clone(PREFS));
const curTheme=()=>(view==='site'&&siteDraft&&me())?siteDraft:PREFS;
const pageSize=()=>Math.max(3,Math.min(100,Math.round(Number(PREFS.pg))||10));
function syncPrefsUser(){if(!REMOTE&&session&&prefsFor!==session){prefsFor=session;PREFS=load('dd_prefs_'+session,{})}}
function savePrefs(){
  let ok=put('dd_theme',PREFS);
  if(REMOTE){inflight++;syncChain=syncChain.then(async()=>{try{await api('POST','api/prefs',{value:PREFS});netBar('')}catch(e){netErr(e)}finally{inflight--}});return ok}
  return put('dd_prefs_'+session,PREFS)&&ok;
}
let rooms=load('dd_rooms',[]), roomOpen=null, roomEdit=null, roomErr='', advGame='dice';
const curSite=()=>(view==='site'&&siteDraft&&isAdmin())?siteDraft:SITE;
const brandName=()=>(curSite().name||'').trim()||t('brand');
const brandMark=()=>curSite().logo?`<img class="logo" src="${esc(curSite().logo)}" alt="">`:ICON.d20;
const brandHtml=()=>`${brandMark()}<span>${esc(brandName())}</span>`;
const FONTS={Alegreya:"'Alegreya','Sarabun',Georgia,serif",Cinzel:"'Cinzel','Sarabun',Georgia,serif",Sarabun:"'Sarabun','Segoe UI',system-ui,sans-serif",Plex:"'IBM Plex Mono',ui-monospace,monospace"};
function lum(h){return hexRgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)}
function hexRgb(h){h=String(h).replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const n=parseInt(h,16)||0;return[n>>16&255,n>>8&255,n&255]}
const onColor=h=>{const L=lum(h)+.05;return L/0.062>1.05/L?'#14201d':'#ffffff'};
const FONT_URL={Cinzel:'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap',Plex:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&display=swap'},fontOn={};
function ensureFont(n){const u=FONT_URL[n];if(!u||fontOn[n])return;fontOn[n]=1;const l=document.createElement('link');l.rel='stylesheet';l.href=u;document.head.appendChild(l)}
function applySite(s0){
  const s=Object.assign({},THEME_DEF);for(const k in s0||{})if(s0[k]!==undefined&&s0[k]!==''&&s0[k]!==null)s[k]=s0[k];
  const st=document.documentElement.style,set=(k,v)=>v?st.setProperty(k,v):st.removeProperty(k);
  set('--bg',s.bg);set('--surface',s.surface);set('--ink',s.ink);
  const base=s.bg||s.surface||s.ink;
  set('--line',base?'color-mix(in srgb,var(--ink) 18%,var(--bg))':'');
  set('--muted',base?'color-mix(in srgb,var(--ink) 62%,var(--bg))':'');
  set('color-scheme',s.bg?(lum(s.bg)>.4?'light':'dark'):'');
  set('--accent',s.accent);set('--accent-ink',s.accent?onColor(s.accent):'');
  set('--side',s.side);set('--side-ink',s.side?onColor(s.side):'');
  set('--side-muted',s.side?'color-mix(in srgb,var(--side-ink) 62%,var(--side))':'');
  set('--side-line',s.side?'color-mix(in srgb,var(--side-ink) 16%,var(--side))':'');
  set('--side-active',s.side?'color-mix(in srgb,var(--side-ink) 12%,var(--side))':'');
  document.documentElement.dataset.fx=s.fx||'lift';ensureFont(s.font);
  set('--fx-ms',s.fxms?s.fxms+'ms':'');set('--fx-amt',s.fxamt!==undefined&&s.fxamt!==''?String(s.fxamt):'');set('--fx-color',s.fxc);
  set('--nav-edge',s.navb);set('--turn-now',s.tnow);set('--turn-next',s.tnext);set('--turn-done',s.tdone);
  set('--r',s.radius!==undefined&&s.radius!==''&&s.radius!==null?s.radius+'px':'');
  set('--display',FONTS[s.font]||'');
  applyDecor(s);
}
let diceSides=20, diceCount=1, diceMod=0, diceMode='normal', rolls=[], lastRoll=null;
const t=k=>TX[lang][k];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const me=()=>users.find(u=>u.id===session)||null;
const isAdmin=()=>me()?.role==='admin';
const mod=v=>Math.floor((Number(v)-10)/2);
const sgn=n=>(n>=0?'+':'−')+Math.abs(n);
const prof=l=>2+Math.floor((Math.max(1,Number(l)||1)-1)/4);

async function hashPw(pw,salt){
  try{const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pw));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=5381;for(const c of salt+pw)h=((h*33)^c.charCodeAt(0))>>>0;return'x'+h.toString(16)}
}

