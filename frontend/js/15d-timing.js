/* ---------- rhythm minigames: game list + editor (GM) and the timing-bar engine ---------- */
let GAMES=[],GD=null,mgMsg='',mgBusy=false;
const MG_COL=['bar','zone','perfect','marker'];
function mgNew(){return{id:'g'+Math.random().toString(36).slice(2,10),name:'',type:'timing',media:'',bpm:100,offset:0,rounds:8,beats:2,zone:75,zw:16,key:'',col:{bar:'#2a2a30',zone:'#3b82f6',perfect:'#facc15',marker:'#ffffff'},dmg:'1d6',dmgMode:'confirm',play:'all'}}
function mgItem(id){return MEDIA.find(m=>m.id===id)}
function gamesPanel(){
  if(!isAdmin())return'';
  if(GD)return mgForm();
  return`<section class="panel mgpanel"><div class="ph"><h2>${t('mgTitle')}</h2><button class="btn small primary" data-mg="new">${t('mgNew')}</button></div>
   ${mgMsg?`<p class="err" role="alert">${esc(mgMsg)}</p>`:''}
   ${GAMES.length?`<ul class="mglist">${GAMES.map(g=>`<li><div class="mm"><b>${esc(g.name)}</b><small>${t('mgType_'+g.type)} · ${g.bpm} BPM · ${g.rounds} ${t('mgRounds')}${g.media&&mgItem(g.media)?' · '+esc(mgItem(g.media).name):''}</small></div>
     <div class="mgbtns"><button class="btn small" data-mg="play" data-id="${esc(g.id)}">${t('mgTest')}</button><button class="btn small" data-mg="edit" data-id="${esc(g.id)}">${t('edit')}</button><button class="btn small danger" data-mg="del" data-id="${esc(g.id)}">${t('del')}</button></div></li>`).join('')}</ul>`:`<p class="muted" style="padding:0 16px 16px">${t('mgNone')}</p>`}
  </section>`;
}
function mgForm(){
  const g=GD,f=(k,lab,inner,hint)=>`<div class="field"><label>${lab}</label>${inner}${hint?`<small class="muted">${hint}</small>`:''}</div>`;
  const num=(k,min,max,lab,hint)=>f(k,lab,`<input type="number" data-mgf="${k}" min="${min}" max="${max}" value="${g[k]}">`,hint);
  const clips=MEDIA.filter(m=>m.type.startsWith('video')||m.type.startsWith('audio'));
  return`<section class="panel mgpanel mgform"><div class="ph"><h2>${t('mgEdit')}</h2></div>
   <div class="mggrid">
    ${f('name',t('mgName'),`<input data-mgf="name" maxlength="60" value="${esc(g.name)}">`)}
    ${f('media',t('mgMedia'),`<select data-mgf="media"><option value="">${t('mgNoMedia')}</option>${clips.map(m=>`<option value="${esc(m.id)}" ${g.media===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`)}
    ${num('bpm',30,300,'BPM')}
    ${num('offset',-5000,60000,t('mgOffset'),t('mgOffsetH'))}
    ${num('rounds',1,64,t('mgRounds'))}
    ${num('beats',1,8,t('mgBeats'),t('mgBeatsH'))}
    ${num('zone',10,95,t('mgZone'),t('mgZoneH'))}
    ${num('zw',4,50,t('mgZw'))}
    ${f('key',t('mgKey'),`<input data-mgf="key" maxlength="12" value="${esc(g.key)}" placeholder="${t('mgKeyPh')}">`,t('mgKeyH'))}
    ${f('dmg',t('mgDmg'),`<input data-mgf="dmg" maxlength="12" value="${esc(g.dmg)}" placeholder="1d6">`,t('mgDmgH'))}
    ${f('dmgMode',t('mgDmgMode'),`<select data-mgf="dmgMode"><option value="confirm" ${g.dmgMode==='confirm'?'selected':''}>${t('mgConfirm')}</option><option value="auto" ${g.dmgMode==='auto'?'selected':''}>${t('mgAuto')}</option></select>`)}
    ${f('play',t('mgPlayMode'),`<select data-mgf="play"><option value="all" ${g.play==='all'?'selected':''}>${t('mgAll')}</option><option value="one" ${g.play==='one'?'selected':''}>${t('mgOne')}</option></select>`)}
   </div>
   <div class="mgcols">${MG_COL.map(k=>`<label class="mgc"><input type="color" data-mgc="${k}" value="${g.col[k]}"><span>${t('mgc_'+k)}</span></label>`).join('')}</div>
   ${mgMsg?`<p class="err" role="alert">${esc(mgMsg)}</p>`:''}
   <div class="mgbtns" style="padding:12px 16px 16px"><button class="btn primary" data-mg="save" ${mgBusy?'disabled':''}>${t('save')}</button><button class="btn" data-mg="play-draft">${t('mgTest')}</button><button class="btn" data-mg="cancel">${t('mgCancel')}</button></div>
  </section>`;
}
async function mgSave(){
  const g=GD;if(!g.name.trim()){mgMsg=t('mgNeedName');return render()}
  const lst=GAMES.some(x=>x.id===g.id)?GAMES.map(x=>x.id===g.id?g:x):[...GAMES,g];
  mgBusy=true;mgMsg='';
  try{const r=await api('POST','api/games',{games:lst});GAMES=r.games;GD=null}catch(e){mgMsg=t('mgFail')}
  mgBusy=false;render()}
async function mgDelete(id){
  if(!confirm(t('mgDelAsk')))return;
  try{const r=await api('POST','api/games',{games:GAMES.filter(x=>x.id!==id)});GAMES=r.games}catch(e){mgMsg=t('mgFail')}render()}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-mg]');if(!b)return;const a=b.dataset.mg,id=b.dataset.id;
  if(a==='new'){GD=mgNew();mgMsg=''}
  else if(a==='edit'){GD=JSON.parse(JSON.stringify(GAMES.find(x=>x.id===id)));mgMsg=''}
  else if(a==='cancel'){GD=null;mgMsg=''}
  else if(a==='save'){mgSave();return}
  else if(a==='del'){mgDelete(id);return}
  else if(a==='play'){mgPlay(GAMES.find(x=>x.id===id));return}
  else if(a==='play-draft'){mgPlay(GD);return}
  render()});
document.addEventListener('input',e=>{
  const c=e.target.closest('[data-mgc]');if(c&&GD){GD.col[c.dataset.mgc]=c.value;return}
  const x=e.target.closest('[data-mgf]');if(!x||!GD)return;const k=x.dataset.mgf;
  GD[k]=x.type==='number'?(x.value===''?0:Number(x.value)):x.value});
/* ---- engine ---- */
function mgRollDmg(s,n){
  const m=/^(\d+)(?:d(\d+))?([+-]\d+)?$/.exec(s||'');if(!m||!n)return 0;let tot=0;
  for(let i=0;i<n;i++){let v=Number(m[3]||0);if(m[2]){for(let j=0;j<Number(m[1]);j++)v+=1+Math.floor(Math.random()*Number(m[2]))}else v+=Number(m[1]);tot+=Math.max(0,v)}
  return tot}
function mgCal(v){try{if(v==null)return Number(localStorage.getItem('mg_cal'))||0;localStorage.setItem('mg_cal',String(v))}catch(e){return 0}}
let MGP=null;
function mgPlay(g){
  if(!g||MGP)return;
  const it=g.media?mgItem(g.media):null,isV=it&&it.type.startsWith('video');
  const col=g.col,key=(g.key||'').trim(),keyLab=key||'●';
  const el=document.createElement('div');el.id='mgPlay';el.className='mgplay';
  el.innerHTML=`${isV?`<video class="mgvid" playsinline preload="auto" src="${esc(it.url)}"></video>`:''}
   <button class="mgx" aria-label="${t('close')}">✕</button>
   <div class="mghud"><b>${esc(g.name)}</b><span class="mgsc"></span></div>
   <div class="mgmid"><div class="mgfb" aria-live="polite"></div></div>
   <div class="mgcount"></div>
   <div class="mgbar" style="background:${col.bar}"><div class="mgzone" style="left:${g.zone-g.zw/2}%;width:${g.zw}%;background:${col.zone}"><i style="background:${col.perfect}"></i></div><div class="mgmark" style="background:${col.marker}"></div></div>
   <button class="mgtap" style="background:${col.zone}">${esc(keyLab)}</button>
   <div class="mgstart"><button class="btn primary big">${t('mgStart')}</button><div class="mgcal">${t('mgCal')}: <button class="btn small" data-c="-10">−</button> <b>${mgCal()}</b> ms <button class="btn small" data-c="10">+</button></div></div>
   <div class="mgres" hidden></div>`;
  document.body.appendChild(el);
  const media=isV?el.querySelector('video'):(it?new Audio(it.url):null);
  const $q=s=>el.querySelector(s),D=g.beats*60000/g.bpm;
  const S={phase:'ready',res:[],t0:0,raf:0},sweepMs=D;
  MGP=S;
  const clock=()=>media&&!media.paused?media.currentTime*1000:performance.now()-S.t0;
  const offs=()=>(media?g.offset:Math.max(g.offset,3000))+mgCal();
  function say(txt,c){const f=$q('.mgfb');f.textContent=txt;f.style.color=c;f.classList.remove('pop');void f.offsetWidth;f.classList.add('pop')}
  function counts(){const r=S.res;return{p:r.filter(x=>x==='p').length,h:r.filter(x=>x==='h').length,m:r.filter(x=>x==='m').length}}
  function hud(){const c=counts();$q('.mgsc').textContent=`✦${c.p}  ✔${c.h}  ✘${c.m}  /${g.rounds}`}
  function resolve(k,v){if(S.res[k]!=null)return;S.res[k]=v;hud();say(v==='p'?t('mgPerfect'):v==='h'?t('mgHit'):t('mgMiss'),v==='p'?col.perfect:v==='h'?col.zone:'#ef4444')}
  function finish(){
    if(S.phase==='done')return;S.phase='done';cancelAnimationFrame(S.raf);if(media)media.pause();
    for(let k=0;k<g.rounds;k++)if(S.res[k]==null)S.res[k]='m';
    const c=counts(),dmg=mgRollDmg(g.dmg,c.m);S.out={perfect:c.p,hit:c.h,miss:c.m,dmg};
    const r=$q('.mgres');r.hidden=false;
    r.innerHTML=`<h2>${t('mgDone')}</h2><p>✦ ${t('mgPerfect')} ${c.p} · ✔ ${t('mgHit')} ${c.h} · ✘ ${t('mgMiss')} ${c.m}</p>${g.dmg?`<p class="mgdmg">${c.m?t('mgDmgTaken').replace('{n}',dmg).replace('{d}',g.dmg):t('mgNoDmg')}</p>`:''}<div class="mgbtns"><button class="btn primary" data-r="again">${t('mgAgain')}</button><button class="btn" data-r="close">${t('close')}</button></div>`}
  function loop(){
    if(S.phase!=='run')return;
    const T=clock()-offs(),cd=$q('.mgcount');
    if(T<0){cd.textContent=Math.ceil(-T/1000);$q('.mgmark').style.left='0%'}
    else{
      cd.textContent='';const k=Math.floor(T/D);
      for(let i=0;i<Math.min(k,g.rounds);i++)resolve(i,'m');
      if(k>=g.rounds){finish();return}
      $q('.mgmark').style.left=((T-k*D)/D*100)+'%'}
    S.raf=requestAnimationFrame(loop)}
  function press(){
    if(S.phase!=='run')return;const T=clock()-offs();if(T<0)return;
    const k=Math.floor(T/D);if(k>=g.rounds||S.res[k]!=null)return;
    const dist=Math.abs((T-k*D)/D*100-g.zone),half=g.zw/2;
    resolve(k,dist<=half*.3?'p':dist<=half?'h':'m')}
  function start(){
    S.phase='run';S.res=[];S.t0=performance.now();hud();$q('.mgstart').hidden=true;$q('.mgres').hidden=true;
    if(media){try{media.currentTime=0;const p=media.play();if(p&&p.catch)p.catch(()=>{S.t0=performance.now()})}catch(e){}}
    S.raf=requestAnimationFrame(loop)}
  function close(){cancelAnimationFrame(S.raf);if(media){media.pause()}document.removeEventListener('keydown',kd);el.remove();MGP=null}
  const kd=e=>{if(e.key==='Escape'){close();return}const want=key?key.toLowerCase():' ';if(e.key.toLowerCase()===want&&!e.repeat){e.preventDefault();press()}};
  document.addEventListener('keydown',kd);
  $q('.mgx').onclick=close;
  $q('.mgtap').addEventListener('pointerdown',e=>{e.preventDefault();press()});
  $q('.mgstart .big').onclick=start;
  el.addEventListener('click',e=>{
    const c=e.target.closest('[data-c]');if(c){const v=mgCal()+Number(c.dataset.c);mgCal(v);c.parentNode.querySelector('b').textContent=mgCal();return}
    const r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='close')close();else{S.phase='ready';start()}});
  if(media&&media.addEventListener)media.addEventListener('ended',()=>{if(S.phase==='run')finish()});
}
Object.assign(TX.th,{mgCancel:'ยกเลิก',mgTitle:'เกมจังหวะ',mgNew:'+ เกมใหม่',mgTest:'ทดลองเล่น',mgNone:'ยังไม่มีเกม กด "เกมใหม่" เพื่อสร้าง',mgType_timing:'แถบจังหวะ',mgType_lane:'เลนโน้ต',mgType_simon:'Simon',mgType_tap:'กดรัว',mgRounds:'รอบ',mgEdit:'ตั้งค่าเกม (แถบจังหวะ)',mgName:'ชื่อเกม',mgMedia:'วิดีโอ/เสียงพื้นหลัง',mgNoMedia:'ไม่ใช้ (ใช้นับเวลาเอง)',mgOffset:'Offset (มิลลิวินาที)',mgOffsetH:'เวลาที่เกมเริ่มนับจังหวะแรก นับจากเริ่มคลิป',mgBeats:'จำนวนบีตต่อ 1 รอบ',mgBeatsH:'ยิ่งมาก แถบยิ่งวิ่งช้า',mgZone:'ตำแหน่งโซน (%)',mgZoneH:'0 = ซ้ายสุด 100 = ขวาสุด',mgZw:'ความกว้างโซน (%)',mgKey:'ปุ่มกด',mgKeyPh:'เว้นว่าง = Space',mgKeyH:'ปุ่มบนแป้นพิมพ์ ป้ายบนปุ่มจอสัมผัสด้วย',mgDmg:'ดาเมจต่อการพลาด 1 ครั้ง',mgDmgH:'เช่น 3 หรือ 1d6 หรือ 2d4+1 (ว่าง = ไม่มี)',mgDmgMode:'การหักเลือด',mgConfirm:'เสนอให้ GM ยืนยัน',mgAuto:'หักอัตโนมัติ',mgPlayMode:'วิธีเล่น',mgAll:'ทุกคนพร้อมกัน',mgOne:'ทีละคน',mgc_bar:'สีแถบ',mgc_zone:'สีโซน',mgc_perfect:'สีจุดเป๊ะ',mgc_marker:'สีตัวชี้',mgNeedName:'ใส่ชื่อเกมก่อน',mgFail:'บันทึกไม่สำเร็จ',mgDelAsk:'ลบเกมนี้?',mgStart:'เริ่ม',mgCal:'ชดเชยหน่วงของเครื่อง',mgPerfect:'เป๊ะ!',mgHit:'โดน',mgMiss:'พลาด',mgDone:'จบเกม',mgAgain:'เล่นอีกครั้ง',mgDmgTaken:'ได้รับดาเมจ {n} ({d} ต่อครั้งที่พลาด)',mgNoDmg:'ไม่พลาดเลย ไม่เสียเลือด'});
Object.assign(TX.en,{mgCancel:'Cancel',mgTitle:'Rhythm games',mgNew:'+ New game',mgTest:'Test play',mgNone:'No games yet. Press "New game" to make one.',mgType_timing:'Timing bar',mgType_lane:'Note lanes',mgType_simon:'Simon',mgType_tap:'Rapid tap',mgRounds:'rounds',mgEdit:'Game settings (timing bar)',mgName:'Game name',mgMedia:'Background video / audio',mgNoMedia:'None (own timer)',mgOffset:'Offset (ms)',mgOffsetH:'When the first beat starts, counted from the clip start',mgBeats:'Beats per sweep',mgBeatsH:'More beats = slower bar',mgZone:'Zone position (%)',mgZoneH:'0 = far left, 100 = far right',mgZw:'Zone width (%)',mgKey:'Button',mgKeyPh:'empty = Space',mgKeyH:'Keyboard key; also the label on the touch button',mgDmg:'Damage per miss',mgDmgH:'e.g. 3 or 1d6 or 2d4+1 (empty = none)',mgDmgMode:'HP loss',mgConfirm:'Propose to GM to confirm',mgAuto:'Apply automatically',mgPlayMode:'Play mode',mgAll:'Everyone together',mgOne:'One at a time',mgc_bar:'Bar colour',mgc_zone:'Zone colour',mgc_perfect:'Perfect spot',mgc_marker:'Marker',mgNeedName:'Enter a game name first',mgFail:'Could not save',mgDelAsk:'Delete this game?',mgStart:'Start',mgCal:'Device delay offset',mgPerfect:'Perfect!',mgHit:'Hit',mgMiss:'Miss',mgDone:'Game over',mgAgain:'Play again',mgDmgTaken:'Took {n} damage ({d} per miss)',mgNoDmg:'No misses, no damage'});
