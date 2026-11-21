/* ---------- performance tuning for weak phones (per device; the person can also pick a mode: PREFS.perf = hi | mid | low) ----------
   Auto mode: a first guess from the hardware (memory, cores, small screen, data-saver), then short frame-rate checks while the page is in use.
   Two bad checks in a row lower the level by one step (hi -> mid -> low) and the device remembers it for two weeks. It never goes back up by itself
   (that would flap); "Test again" in the settings forgets what was learned.
   hi  = everything as chosen.   mid = scenes at medium, gentler window effects.   low = no scene, plain fade, no glow / blur. */
const PERF={mode:'',tier:'hi',hw:'hi',hwWhy:'',learned:'',manual:false,busy:false,bad:0,good:0,timer:0,note:''};
const PERF_RANK={low:0,mid:1,hi:2},PERF_NAMES=['low','mid','hi'];
const perfStore={
  get(){try{const j=JSON.parse(localStorage.getItem('dd_perf')||'null');if(j&&PERF_RANK[j.t]!==undefined&&Date.now()-j.ts<14*864e5)return j}catch(e){}return null},
  set(t){try{localStorage.setItem('dd_perf',JSON.stringify({t,ts:Date.now()}))}catch(e){}},
  clear(){try{localStorage.removeItem('dd_perf')}catch(e){}}};
function perfDetect(){
  const mem=navigator.deviceMemory||8,cpu=navigator.hardwareConcurrency||8,small=matchMedia('(max-width:700px)').matches,
    sd=!!(navigator.connection&&navigator.connection.saveData),rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(mem<=2||cpu<=2)return{t:'low',w:'hw'};if(sd)return{t:'low',w:'save'};
  if(mem<=4||cpu<=4)return{t:'mid',w:'hw'};if(rm)return{t:'mid',w:'motion'};if(small)return{t:'mid',w:'small'};
  return{t:'hi',w:''}}
/* called from bgApply (on every render, so it stays cheap) */
function perfApply(s){
  const m=s&&PERF_RANK[s.perf]!==undefined?s.perf:'',h=document.documentElement;
  PERF.mode=m;PERF.manual=!!m;
  const hw=perfDetect(),L=perfStore.get();PERF.hw=hw.t;PERF.hwWhy=hw.w;PERF.learned=L?L.t:'';
  const tier=m||(L&&PERF_RANK[L.t]<PERF_RANK[hw.t]?L.t:hw.t);
  if(h.dataset.perf!==tier){h.dataset.perf=tier}PERF.tier=tier;
  const n=document.getElementById('perfNote');if(n)n.textContent=perfStatus();
  if(!PERF.timer&&!m)perfSchedule(2500)}
const perfCapQ=q=>PERF.manual&&PERF.mode==='hi'?q:(PERF.tier==='low'?'off':PERF.tier==='mid'&&q==='hi'?'mid':q);
function perfWin(w){const T=PERF.tier;if(T==='hi'||!w||w==='none')return w;if(T==='low')return'fade';return(w==='blur'||w==='flip'||w==='pop')?'fade':w}
const perfMs=ms=>PERF.tier==='low'?Math.min(ms,200):PERF.tier==='mid'?Math.min(ms,280):ms;
function perfStatus(){const k=PERF.manual?'perfManual':PERF.learned&&PERF_RANK[PERF.learned]<PERF_RANK[PERF.hw]?'perfLearned':PERF.hwWhy?'perfHw':'perfFull';
  return fill(t(k),{t:t('perf_'+PERF.tier),w:PERF.hwWhy?t('perfw_'+PERF.hwWhy):''})}
/* ----- watch the frame rate for a few seconds ----- */
function perfSchedule(ms){clearTimeout(PERF.timer);PERF.timer=setTimeout(()=>{PERF.timer=0;perfSample()},ms)}
function perfSample(){
  const h=document.documentElement;
  if(PERF.manual)return;if(PERF.busy||document.hidden||h.classList.contains('mgplaying')||(typeof bgGuardOn!=='undefined'&&bgGuardOn)){perfSchedule(8000);return}
  PERF.busy=true;let last=0,n=0,slow=0,sum=0,t0=0,lt=0,po=null;
  try{po=new PerformanceObserver(l=>{l.getEntries().forEach(e=>{lt+=e.duration})});po.observe({entryTypes:['longtask']})}catch(e){po=null}
  const end=abort=>{try{po&&po.disconnect()}catch(e){}PERF.busy=false;if(abort||n<20){perfSchedule(8000);return}
    const avg=sum/n,bad=avg>38||slow/n>.2||lt>1100;perfVerdict(bad,avg)};
  const step=t=>{if(document.hidden){end(true);return}
    if(last){const dt=t-last;if(dt<500){n++;sum+=dt;if(dt>50)slow++}}last=t;if(!t0)t0=t;
    if(t-t0<2500)requestAnimationFrame(step);else end(false)};
  requestAnimationFrame(step)}
function perfVerdict(bad,avg){
  if(bad){PERF.good=0;PERF.bad++;if(PERF.bad>=2){PERF.bad=0;perfDown();return}perfSchedule(4000);return}
  PERF.bad=0;PERF.good++;perfSchedule(PERF.good>=3?240000:45000)}
function perfDown(){
  const cur=PERF_RANK[PERF.tier];if(cur<=0||PERF.manual){perfSchedule(240000);return}
  const nx=PERF_NAMES[cur-1];perfStore.set(nx);PERF.note=nx;BG.key='';
  try{applySite(curTheme())}catch(e){}
  try{turnBanner(fill(t('perfDown'),{t:t('perf_'+nx)}))}catch(e){}
  perfSchedule(45000)}
function perfRetest(){perfStore.clear();PERF.bad=0;PERF.good=0;BG.key='';BG.rt='';try{applySite(curTheme())}catch(e){}perfSchedule(1500)}
window.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-act=perf-retest]');if(!b)return;e.stopPropagation();e.preventDefault();perfRetest()},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!PERF.manual)perfSchedule(3000)});
/* settings: one select + the status line (sits in the background panel) */
function perfFieldHtml(d){return`<div class="field"><label for="s_perf">${t('perfTitle')}</label><select id="s_perf" data-s="perf">${['','hi','mid','low'].map(o=>`<option value="${o}" ${(d.perf||'')===o?'selected':''}>${t('perf_'+(o||'auto'))}</option>`).join('')}</select></div>`}
function perfNoteHtml(){return`<p class="note" style="padding:0 16px 14px"><span id="perfNote">${esc(perfStatus())}</span> <button type="button" class="btn small" data-act="perf-retest">${t('perfRetest')}</button></p>`}
Object.assign(TX.th,{perfTitle:'ประสิทธิภาพเครื่อง',perf_auto:'อัตโนมัติ (แนะนำ)',perf_hi:'เต็มรูปแบบ',perf_mid:'สมดุล',perf_low:'ประหยัด',
  perfw_hw:'สเปกเครื่อง',perfw_save:'โหมดประหยัดดาต้า',perfw_motion:'ตั้งลดแอนิเมชันไว้',perfw_small:'หน้าจอเล็ก',
  perfFull:'ตอนนี้ใช้โหมด: {t} (เครื่องแรงพอ)',perfHw:'ตอนนี้ใช้โหมด: {t} ({w})',perfLearned:'ตอนนี้ใช้โหมด: {t} (เครื่องเคยกระตุก จึงลดให้เองและจำไว้ 2 สัปดาห์)',perfManual:'ตอนนี้ใช้โหมด: {t} (คุณเลือกเอง)',
  perfRetest:'ตรวจใหม่',perfDown:'เครื่องเริ่มกระตุก ลดเอฟเฟกต์เป็นโหมด "{t}" ให้อัตโนมัติ (เปลี่ยนได้ที่ตั้งค่า)'});
Object.assign(TX.en,{perfTitle:'Device performance',perf_auto:'Automatic (recommended)',perf_hi:'Full',perf_mid:'Balanced',perf_low:'Lite',
  perfw_hw:'device specs',perfw_save:'data saver is on',perfw_motion:'reduced motion is on',perfw_small:'small screen',
  perfFull:'Now using: {t} (this device is fast enough)',perfHw:'Now using: {t} ({w})',perfLearned:'Now using: {t} (this device lagged before, so it was lowered and remembered for 2 weeks)',perfManual:'Now using: {t} (your choice)',
  perfRetest:'Test again',perfDown:'The page is lagging, so effects were lowered to "{t}" automatically (change it in settings).'});
