/* ---------- page background scenes + "window opens" effects (per person: PREFS.bgfx / bgc / bgq / bgi / win / winms) ----------
   Everything here only moves things with transform + opacity (the cheap kind, done by the graphics chip), the scene sits in its own
   fixed layer OUTSIDE #root (so the page redrawing never restarts it), pauses when the tab is hidden or a minigame is running,
   and quietly lowers its own quality if the device can't keep ~30 frames per second. */
const BGFX_LIST=['','geo','dice','runes','light','aurora','gradient','stars','embers','fireflies','fog','rain','waves','bokeh'];
const BGFX_ICON={'':'⛔',geo:'🔷',dice:'🎲',runes:'ᚱ',light:'🔦',aurora:'🌌',gradient:'🌈',stars:'✨',embers:'🔥',fireflies:'🪲',fog:'🌫️',rain:'🌧️',waves:'🌊',bokeh:'🫧'};
const BGFX_PAL={geo:['#7aa2ff','#b08cff','#6fe0d0'],dice:['#e3b449','#f0d48a','#c9954a'],runes:['#a78bfa','#7dd3fc','#f0abfc'],light:['#ffe9b0','#ffd27a','#fff5d6'],aurora:['#3df5b0','#4aa8ff','#b46bff'],gradient:['#4f46e5','#06b6d4','#ec4899'],stars:['#ffffff','#bcd4ff','#ffe9c4'],embers:['#ff8a3d','#ffb347','#ff5a36'],fireflies:['#d8ff6a','#fff59d','#9dffb0'],fog:['#aab4c8','#aab4c8','#aab4c8'],rain:['#8fb4ff','#b8c9e8','#7aa0d8'],waves:['#3b82f6','#06b6d4','#6366f1'],bokeh:['#ffd27a','#ff9ec4','#9ad0ff']};
const BGFX_TINT={blue:['#60a5fa','#38bdf8','#818cf8'],violet:['#a78bfa','#c084fc','#818cf8'],pink:['#f472b6','#fb7185','#f9a8d4'],green:['#34d399','#86efac','#6ee7b7'],gold:['#e3b449','#f0d48a','#fbbf24'],white:['#ffffff','#e5e7eb','#cbd5e1']};
const WIN_LIST=['rise','fade','zoom','slide','drop','pop','blur','flip','none'];
const BG={key:'',rt:'',note:'',el:null,seed:7};
const FX={key:'',ov:new Set()};
const bgRank={off:0,mid:1,hi:2};
const bgRand=()=>{let t=(BG.seed+=0x6D2B79F5);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
const bgR=(a,b)=>a+bgRand()*(b-a);
const bgPick=a=>a[Math.floor(bgRand()*a.length)];
function bgAuto(){const mem=navigator.deviceMemory||8,cpu=navigator.hardwareConcurrency||8;
  return(mem<=4||cpu<=4||matchMedia('(max-width:700px)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)?'mid':'hi'}
function bgEl(){let e=BG.el;if(!e||!e.isConnected){e=BG.el=document.createElement('div');e.id='bgfx';e.setAttribute('aria-hidden','true');document.body.appendChild(e)}return e}
/* ----- the shapes ----- */
const SV=(body,v='0 0 40 40')=>`<svg viewBox="${v}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
const GEO=[SV('<polygon points="20,4 37,35 3,35"/>'),SV('<rect x="6" y="6" width="28" height="28" rx="2"/>'),SV('<polygon points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"/>'),SV('<circle cx="20" cy="20" r="15"/>'),SV('<polygon points="20,3 36,20 20,37 4,20"/>'),SV('<polygon points="20,3 37,15 31,35 9,35 3,15"/>'),SV('<path d="M20 5v30M5 20h30"/>'),SV('<circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="7"/>')];
const DICE=[SV('<polygon points="20,4 37,34 3,34"/><path d="M20,4 L20,24 M3,34 L20,24 L37,34"/>'),
  SV('<polygon points="20,3 35,11 35,29 20,37 5,29 5,11"/><path d="M5,11 L20,19 L35,11 M20,19 L20,37"/>'),
  SV('<polygon points="20,2 36,20 20,38 4,20"/><path d="M4,20 H36 M20,2 L12,20 L20,38 L28,20 Z"/>'),
  SV('<polygon points="20,3 36,15 30,35 10,35 4,15"/><polygon points="20,12 28,18 25,28 15,28 12,18"/>'),
  SV('<polygon points="20,2 35,11 35,29 20,38 5,29 5,11"/><polygon points="20,12 28,26 12,26"/><path d="M20,2 V12 M35,11 L28,26 M5,11 L12,26 M20,38 V26 M35,29 L28,26 M5,29 L12,26"/>')];
function runeSvg(){let p='M20 4V36';const n=2+Math.floor(bgRand()*3);for(let i=0;i<n;i++){const y1=6+Math.floor(bgRand()*24),y2=y1+8+Math.floor(bgRand()*10),right=bgRand()<.5,x=right?32:8;p+=bgRand()<.5?`M20 ${y1}L${x} ${y2}`:`M${x} ${y1}L20 ${y2}`}return SV(`<path d="${p}"/>`)}
/* ----- builders ----- */
function bgBuild(style,q,el){
  const k=q==='hi'?1:.5,cnt=n=>Math.max(3,Math.round(n*k)),add=(cls,html,css)=>{const i=document.createElement('i');i.className=cls;if(html)i.innerHTML=html;if(css)i.style.cssText=css;el.appendChild(i);return i};
  const rise=(cls,n,mk,o={})=>{for(let i=0;i<cnt(n);i++){const d=bgR(o.d0||20,o.d1||40),s=bgR(o.s0||16,o.s1||56);
    add('bgp '+cls,mk(i),`--x:${bgR(2,96).toFixed(1)}%;--s:${s.toFixed(0)}px;--d:${d.toFixed(1)}s;--dl:-${(bgRand()*d).toFixed(1)}s;--dx:${bgR(-9,9).toFixed(1)}vw;--r:${bgR(-200,200).toFixed(0)}deg;--o:${bgR(o.o0||.25,o.o1||.55).toFixed(2)};--c:var(--bc${1+Math.floor(bgRand()*3)});${o.dy?`--dy:${o.dy};`:''}`)}};
  switch(style){
    case'geo':rise('bgg',26,()=>bgPick(GEO));break;
    case'dice':rise('bgg',16,()=>bgPick(DICE),{s0:26,s1:70,d0:26,d1:50,o0:.22,o1:.45});break;
    case'runes':rise('bgg bgrune',22,runeSvg,{s0:20,s1:46,d0:24,d1:46,o0:.25,o1:.6});break;
    case'embers':rise('bgem',34,()=>'',{s0:3,s1:9,d0:9,d1:20,o0:.5,o1:.95});break;
    case'bokeh':rise('bgbk',18,()=>'',{s0:40,s1:150,d0:26,d1:55,o0:.25,o1:.55,dy:'-45vh'});break;
    case'light':
      for(let i=0;i<3;i++)add('bgl-pool',0,`--x:${[8,55,85][i]}%;--y:${[12,60,25][i]}%;--d:${[46,58,40][i]}s;--dl:-${i*11}s;--c:var(--bc${i+1})`);
      add('bgl-beam',0,'--x:12%;--d:34s;--dl:0s');if(q==='hi')add('bgl-beam b2',0,'--x:58%;--d:46s;--dl:-15s');
      add('bgl-vig');break;
    case'aurora':
      for(let i=0;i<(q==='hi'?4:2);i++)add('bga',0,`--y:${[2,10,-2,18][i]}vh;--d:${[22,30,26,34][i]}s;--dl:-${i*7}s;--c:var(--bc${(i%3)+1});--w:${[120,150,130,160][i]}vw`);
      add('bga-cur');break;
    case'gradient':add('bgg1');if(q==='hi')add('bgg2');break;
    case'stars':
      for(let i=0;i<cnt(80);i++)add('bgs',0,`left:${bgR(0,100).toFixed(1)}%;top:${bgR(0,100).toFixed(1)}%;--s:${bgR(1,3).toFixed(1)}px;--d:${bgR(2,7).toFixed(1)}s;--dl:-${bgR(0,7).toFixed(1)}s;--c:var(--bc${1+Math.floor(bgRand()*3)})`);
      for(let i=0;i<(q==='hi'?2:1);i++)add('bgsh',0,`--x:${bgR(10,70).toFixed(0)}%;--y:${bgR(0,30).toFixed(0)}%;--dl:${(i*7+3)}s`);break;
    case'fireflies':
      for(let i=0;i<cnt(24);i++){const d=bgR(9,20);add('bgf',0,`left:${bgR(3,95).toFixed(1)}%;top:${bgR(8,92).toFixed(1)}%;--d:${d.toFixed(1)}s;--b:${bgR(2,5).toFixed(1)}s;--dl:-${(bgRand()*d).toFixed(1)}s;--x1:${bgR(-9,9).toFixed(1)}vw;--y1:${bgR(-9,9).toFixed(1)}vh;--x2:${bgR(-9,9).toFixed(1)}vw;--y2:${bgR(-9,9).toFixed(1)}vh;--c:var(--bc${1+Math.floor(bgRand()*3)})`)}break;
    case'fog':for(let i=0;i<(q==='hi'?3:2);i++)add('bgfog',0,`--y:${[8,38,64][i]}vh;--d:${[70,95,120][i]}s;--dl:-${i*23}s;--h:${[40,46,52][i]}vh`);break;
    case'rain':
      for(let i=0;i<cnt(40);i++){const d=bgR(.9,1.8);add('bgr',0,`left:${bgR(-5,105).toFixed(1)}%;--s:${bgR(40,110).toFixed(0)}px;--d:${d.toFixed(2)}s;--dl:-${(bgRand()*d).toFixed(2)}s;--o:${bgR(.25,.6).toFixed(2)};--c:var(--bc${1+Math.floor(bgRand()*3)})`)}break;
    case'waves':{const path='<path d="M0 60 Q150 15 300 60 T600 60 T900 60 T1200 60 V120 H0Z"/>';
      for(let i=0;i<(q==='hi'?3:2);i++)add('bgw',`<svg viewBox="0 0 1200 120" preserveAspectRatio="none" fill="currentColor">${path}</svg>`,`--b:${[0,5,10][i]}vh;--h:${[22,26,30][i]}vh;--d:${[26,38,54][i]}s;--o:${[.28,.2,.14][i]};--c:var(--bc${i+1});--dr:${i%2?'reverse':'normal'}`)}break;
  }
}
/* ----- apply: called from applySite() on every render, so it must be cheap when nothing changed ----- */
function bgApply(s){
  const h=document.documentElement,style=BGFX_LIST.includes(s.bgfx)?s.bgfx:'';
  let q=bgRank[s.bgq]!==undefined?s.bgq:bgAuto();if(BG.rt&&bgRank[BG.rt]<bgRank[q])q=BG.rt;
  h.dataset.win=WIN_LIST.includes(s.win)?s.win:'rise';
  h.style.setProperty('--win-ms',(Math.max(150,Math.min(900,Number(s.winms)||380)))+'ms');
  const on=!!style&&q!=='off',pal=(BGFX_TINT[s.bgc]||BGFX_PAL[style]||BGFX_PAL.geo),key=style+'|'+q+'|'+(s.bgc||'');
  h.classList.toggle('has-bgfx',on);
  if(!on&&!BG.el)return;
  const el=bgEl();el.style.setProperty('--bgi',String(Math.max(10,Math.min(100,Number(s.bgi)||60))/100));
  if(key===BG.key)return;BG.key=key;BG.seed=7;el.innerHTML='';el.className='bgfx bg-'+style+' q-'+q;
  pal.forEach((c,i)=>el.style.setProperty('--bc'+(i+1),c));
  if(on){bgBuild(style,q,el);bgGuard()}}
/* ----- if the device can't keep up, drop quality by itself (this session only; the person's choice is kept) ----- */
let bgGuardOn=false;
function bgGuard(){
  if(bgGuardOn||document.hidden)return;bgGuardOn=true;let last=0,n=0,sum=0,t0=0;
  const step=t=>{if(document.hidden||!document.documentElement.classList.contains('has-bgfx')||document.documentElement.classList.contains('mgplaying')){bgGuardOn=false;return}
    if(last){const dt=t-last;if(dt<250){n++;if(n>6)sum+=dt}}last=t;if(!t0)t0=t;
    if(t-t0<3500){requestAnimationFrame(step);return}
    bgGuardOn=false;const m=n>6?sum/(n-6):0;
    if(m>40){const cur=BG.rt||(bgRank[(curTheme()||{}).bgq]!==undefined?curTheme().bgq:bgAuto());BG.rt=cur==='hi'?'mid':'off';BG.note=BG.rt==='mid'?'mid':'off';BG.key='';applySite(curTheme());const nt=document.getElementById('bgNote');if(nt)nt.textContent=t('bgAutoDown_'+BG.note)}};
  requestAnimationFrame(step)}
/* ----- "window opens" effects: the page (or the tab / character you just opened) eases in; popups ease in the first time they show ----- */
const FX_OV='.cpop,.cropwrap,.mgedit';
function fxEnter(main){
  if(!main||(document.documentElement.dataset.win||'rise')==='none')return;
  let i=0;main.querySelectorAll(':scope>*, :scope .wgrid>*, :scope .stagebody>*').forEach(e=>{e.style.setProperty('--i',Math.min(i++,9))});
  main.classList.remove('fx-in');void main.offsetWidth;main.classList.add('fx-in');
  clearTimeout(FX.t);FX.t=setTimeout(()=>main.classList.remove('fx-in'),1600)}
function fxAfterRender(){
  const h=document.documentElement,main=document.getElementById('main');
  h.classList.toggle('mgplaying',!!(typeof MGP!=='undefined'&&MGP)||!!document.querySelector('.mgedit'));
  if(!main){FX.key='';FX.ov.clear();return}
  const key=[typeof view!=='undefined'?view:'',typeof roomOpen!=='undefined'?roomOpen:'',typeof advGame!=='undefined'?advGame:'',(main.querySelector('h1')||{}).textContent||''].join('|');
  if(key!==FX.key){FX.key=key;fxEnter(main)}
  const now=new Set();document.querySelectorAll(FX_OV).forEach(e=>{const k=e.className+':'+(e.getAttribute('aria-label')||'');now.add(k);if(!FX.ov.has(k)&&(h.dataset.win||'rise')!=='none')e.classList.add('fx-ov')});
  FX.ov=now}
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=fx-prev]');if(!b)return;e.stopPropagation();e.preventDefault();fxEnter(document.getElementById('main'))},true);
document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('fx-pause',document.hidden);if(!document.hidden&&document.documentElement.classList.contains('has-bgfx'))bgGuard()});
/* ----- settings panel texts + the style chips ----- */
Object.assign(TX.th,{sBgfx:'ฉากหลังและเอฟเฟกต์หน้าต่าง',sBgfxNote:'เลือกได้เฉพาะของคุณเอง ใช้แรงเครื่องน้อย และหยุดเองตอนเล่นมินิเกม',
 bg_none:'ไม่มี',bg_geo:'เรขาคณิตลอยขึ้น',bg_dice:'เต๋า D&D ลอยขึ้น',bg_runes:'อักขระรูนลอยขึ้น',bg_light:'แสงและเงา',bg_aurora:'แสงออโรรา',bg_gradient:'ไล่สีเคลื่อนไหว',bg_stars:'ดาวระยิบและดาวตก',bg_embers:'ประกายไฟลอยขึ้น',bg_fireflies:'หิ่งห้อย',bg_fog:'หมอกลอยผ่าน',bg_rain:'ฝนโปรย',bg_waves:'คลื่นน้ำ',bg_bokeh:'ลูกกลมเรืองแสง',
 bgColor:'โทนสีฉากหลัง',bgc_auto:'ตามแต่ละฉาก',bgc_blue:'ฟ้า',bgc_violet:'ม่วง',bgc_pink:'ชมพู',bgc_green:'เขียว',bgc_gold:'ทอง',bgc_white:'ขาว',
 bgQual:'คุณภาพ',bgq_auto:'อัตโนมัติ',bgq_hi:'สูง',bgq_mid:'กลาง (เบากว่า)',bgq_off:'ปิดฉากหลัง',bgInt:'ความเข้ม',
 winFx:'ท่าตอนเปิดหน้าต่าง/หน้าใหม่',win_rise:'ค่อยๆ ลอยขึ้นมา',win_fade:'ค่อยๆ ชัดขึ้น',win_zoom:'ซูมเข้า',win_slide:'เลื่อนเข้าจากข้าง',win_drop:'หย่อนลงมา',win_pop:'เด้งขึ้น',win_blur:'จากเบลอเป็นชัด',win_flip:'พลิกลงมา',win_none:'ไม่มีเอฟเฟกต์',winSpeed:'ความเร็วท่าเปิดหน้าต่าง',winPrev:'ลองท่าเปิดหน้าต่าง',
 bgAutoDown_mid:'เครื่องนี้เล่นไม่ลื่น ลดฉากหลังเป็นคุณภาพกลางให้ชั่วคราวแล้ว',bgAutoDown_off:'เครื่องนี้ยังไม่ลื่น ปิดฉากหลังชั่วคราวแล้ว (เลือกใหม่ได้ตอนเปิดหน้านี้อีกครั้ง)'});
Object.assign(TX.en,{sBgfx:'Background scene & window effects',sBgfxNote:'Only for you. Light on the device, and it pauses while a minigame runs.',
 bg_none:'None',bg_geo:'Rising shapes',bg_dice:'Rising D&D dice',bg_runes:'Rising runes',bg_light:'Light & shadow',bg_aurora:'Aurora',bg_gradient:'Moving gradient',bg_stars:'Twinkling stars',bg_embers:'Rising embers',bg_fireflies:'Fireflies',bg_fog:'Drifting mist',bg_rain:'Soft rain',bg_waves:'Waves',bg_bokeh:'Glowing orbs',
 bgColor:'Scene color',bgc_auto:'Scene default',bgc_blue:'Blue',bgc_violet:'Violet',bgc_pink:'Pink',bgc_green:'Green',bgc_gold:'Gold',bgc_white:'White',
 bgQual:'Quality',bgq_auto:'Automatic',bgq_hi:'High',bgq_mid:'Medium (lighter)',bgq_off:'Scene off',bgInt:'Strength',
 winFx:'How windows / new pages open',win_rise:'Float up',win_fade:'Fade in',win_zoom:'Zoom in',win_slide:'Slide in',win_drop:'Drop down',win_pop:'Pop',win_blur:'Blur to sharp',win_flip:'Flip down',win_none:'No effect',winSpeed:'Opening speed',winPrev:'Try the opening effect',
 bgAutoDown_mid:'This device is not smooth, so the scene was lowered to medium for now.',bgAutoDown_off:'Still not smooth, so the scene was switched off for now (pick it again when you reopen this page).'});
function renderBgfxPanel(d){
  const sel=(k,list,pre,def)=>`<select id="s_${k}" data-s="${k}">${list.map(o=>`<option value="${o}" ${(d[k]||def||'')===o?'selected':''}>${t(pre+(o||'auto'))}</option>`).join('')}</select>`;
  return`<section class="panel" data-w="bgfx">${wc('site','bgfx')}<div class="ph"><h2>${t('sBgfx')}</h2><span class="note">${t('sBgfxNote')}</span></div>
   <div class="bgfxrow" role="group" aria-label="${t('sBgfx')}">${BGFX_LIST.map(k=>`<button type="button" class="bgchip" aria-pressed="${(d.bgfx||'')===k}" data-act="bgset" data-v="${k}">${BGFX_ICON[k]} ${t('bg_'+(k||'none'))}</button>`).join('')}</div>
   <div class="grid wide">
    <div class="field"><label for="s_bgc">${t('bgColor')}</label>${sel('bgc',['','blue','violet','pink','green','gold','white'],'bgc_')}</div>
    <div class="field"><label for="s_bgq">${t('bgQual')}</label>${sel('bgq',['','hi','mid','off'],'bgq_')}</div>
    <div class="field"><label for="s_bgi">${t('bgInt')}: <span id="v_bgi">${d.bgi??60}</span>%</label><input id="s_bgi" data-s="bgi" type="range" min="10" max="100" step="5" value="${d.bgi??60}" style="padding:0"></div>
    <div class="field"><label for="s_win">${t('winFx')}</label>${sel('win',WIN_LIST,'win_','rise')}</div>
    <div class="field"><label for="s_winms">${t('winSpeed')}: <span id="v_winms">${d.winms||380}</span> ms</label><input id="s_winms" data-s="winms" type="range" min="150" max="900" step="50" value="${d.winms||380}" style="padding:0"></div>
    <div class="field" style="align-self:end"><button type="button" class="btn" data-act="fx-prev">▶ ${t('winPrev')}</button></div></div>
   <p class="note" id="bgNote" style="padding:0 16px 14px">${BG.note?t('bgAutoDown_'+BG.note):''}</p></section>`}
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=bgset]');if(!b||typeof siteDraft==='undefined'||!siteDraft)return;e.stopPropagation();e.preventDefault();
  siteDraft.bgfx=b.dataset.v;BG.rt='';BG.note='';applySite(siteDraft);document.querySelectorAll('[data-act=bgset]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===b.dataset.v)))},true);
