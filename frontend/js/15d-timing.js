/* ---------- rhythm minigames: game list + editor (GM) and the timing-bar engine ---------- */
let MGS={},GAMES=[],GD=null,mgMsg='',mgBusy=false;
const MG_COL=['bar','zone','perfect','marker'];
function mgNew(){return{id:'g'+Math.random().toString(36).slice(2,10),name:'',type:'timing',media:'',bpm:100,offset:0,rounds:8,beats:2,zone:75,zw:16,key:'',lanes:4,chart:[],ns:'bar',nimgs:[],cd:3,dur:10,goal:30,tmo:4000,start:2,fall:1500,sub:1,pat:'',dir:'down',col:{bar:'#2a2a30',zone:'#3b82f6',perfect:'#facc15',marker:'#ffffff'},dmg:'1d6',dmgMode:'confirm',play:'all'}}
function mgItem(id){return MEDIA.find(m=>m.id===id)}
function mgMi(g){return g.mi||(g.media?mgItem(g.media):null)}
function gamesPanel(){
  if(!isAdmin())return'';
  if(GD)return mgForm();
  return`<section class="panel mgpanel"><div class="ph"><h2>${t('mgTitle')}</h2><button class="btn small primary" data-mg="new">${t('mgNew')}</button></div>
   ${mgMsg?`<p class="err" role="alert">${esc(mgMsg)}</p>`:''}
   ${GAMES.length?`<ul class="mglist">${GAMES.map(g=>`<li><div class="mm"><b>${esc(g.name)}</b><small>${t('mgType_'+g.type)} · ${g.bpm} BPM · ${g.rounds} ${t('mgRounds')}${g.media&&mgItem(g.media)?' · '+esc(mgItem(g.media).name):''}</small></div>
     <div class="mgbtns"><button class="btn small" data-mg="play" data-id="${esc(g.id)}">${t('mgTest')}</button><button class="btn small" data-mg="edit" data-id="${esc(g.id)}">${t('edit')}</button><button class="btn small danger" data-mg="del" data-id="${esc(g.id)}">${t('del')}</button></div></li>`).join('')}</ul>`:`<p class="muted" style="padding:0 16px 16px">${t('mgNone')}</p>`}
  </section>`;
}
function mgBarHtml(){const g=GD,S=g.segs||[];return S.map((x,i)=>`<span class="mgseg ${x.kind}" style="flex:${Math.max(.5,Number(x.len)||.5)};${x.kind==='play'?`background:${x.cz||g.col.zone}`:''}" title="${i+1}">${i+1}</span>`).join('')}
function mgTlRefresh(){const b=document.querySelector('.mgtlbar'),tt=document.querySelector('.mgtotal');if(!b||!GD)return;b.innerHTML=mgBarHtml();if(tt)tt.textContent=`${t('mgTotal')}: ${(GD.segs||[]).reduce((a,x)=>a+(Number(x.len)||0),0).toFixed(1)} s`}
function mgTimeline(){
  const g=GD,S=g.segs||(g.segs=[]),tot=S.reduce((a,x)=>a+(Number(x.len)||0),0)||1,lane=g.type==='lane';
  const bar=mgBarHtml();
  const nf=(i,f,ph,v,w)=>`<input type="number" step="any" class="mgsn" data-mgs="${i}:${f}" placeholder="${ph}" value="${v?v:''}" style="width:${w||70}px" aria-label="${ph}">`;
  const rows=S.map((x,i)=>{const play=x.kind==='play';return`<li class="mgrow ${x.kind}"><div class="mgrh"><b>${i+1}. ${play?t('mgPlaySeg'):t('mgCutSeg')}</b> <span class="mgrb"><button class="btn small" data-mg="seg-up" data-i="${i}" ${i?'':'disabled'} aria-label="up">↑</button><button class="btn small" data-mg="seg-down" data-i="${i}" ${i<S.length-1?'':'disabled'} aria-label="down">↓</button><button class="btn small danger" data-mg="seg-del" data-i="${i}" aria-label="${t('del')}">✕</button></span></div>
    <div class="mgrf"><label>${t('mgLen')} ${nf(i,'len','s',x.len,64)}</label>
    ${play?`<label>BPM ${nf(i,'bpm','='+g.bpm,x.bpm,64)}</label>
    ${lane?`<label>${t('mgSub')} ${nf(i,'sub','='+g.sub,x.sub,52)}</label><label>${t('mgFall')} ${nf(i,'fall','='+g.fall,x.fall,72)}</label><label>${t('mgDir')} <select data-mgs="${i}:dir"><option value="">=</option><option value="down" ${x.dir==='down'?'selected':''}>${t('mgDown')}</option><option value="up" ${x.dir==='up'?'selected':''}>${t('mgUp')}</option></select></label>`
    :`<label>${t('mgBeats')} ${nf(i,'beats','='+g.beats,x.beats,52)}</label><label>${t('mgZone')} ${nf(i,'zone','='+g.zone,x.zone,60)}</label><label>${t('mgZw')} ${nf(i,'zw','='+g.zw,x.zw,60)}</label><label>${t('mgKey')} <input class="mgsn" data-mgs="${i}:key" maxlength="12" style="width:60px" value="${esc(x.key)}" placeholder="="></label>`}
    <label>${t('mgc_zone')} <input type="color" data-mgs="${i}:cz" value="${x.cz||g.col.zone}">${x.cz?`<button class="btn small" data-mg="seg-clr" data-i="${i}" aria-label="clear">↺</button>`:''}</label>`:''}</div></li>`}).join('');
  return`<div class="mgtl"><small class="muted">${t('mgTimelineH')}</small>
   <div class="mgtlbar">${bar||`<span class="muted" style="padding:6px">${t('mgNoSeg')}</span>`}</div><div class="muted mgtotal" style="font-size:.85rem">${S.length?`${t('mgTotal')}: ${tot.toFixed(1)} s`:''}</div>
   ${S.length?`<ul class="mgrows">${rows}</ul>`:''}
   <div class="mgbtns" style="margin-top:8px"><button class="btn small" data-mg="seg-add-play">+ ${t('mgPlaySeg')}</button><button class="btn small" data-mg="seg-add-cut">+ ${t('mgCutSeg')}</button></div></div>`}
function mgForm(){
  const g=GD,f=(k,lab,inner,hint)=>`<div class="field"><label>${lab}</label>${inner}${hint?`<small class="muted">${hint}</small>`:''}</div>`;
  const num=(k,min,max,lab,hint)=>f(k,lab,`<input type="number" data-mgf="${k}" min="${min}" max="${max}" value="${g[k]}">`,hint);
  const txt=(k,lab,max,ph,hint)=>f(k,lab,`<input data-mgf="${k}" maxlength="${max}" value="${esc(g[k])}" placeholder="${ph||''}">`,hint);
  const sel=(k,lab,opts)=>f(k,lab,`<select data-mgf="${k}">${opts.map(([v,l])=>`<option value="${v}" ${g[k]===v?'selected':''}>${l}</option>`).join('')}</select>`);
  const sec=(ico,title,inner,open)=>`<details class="mgsec" ${open?'open':''}><summary><span>${ico}</span> ${title}</summary>${inner}</details>`;
  const clips=MEDIA.filter(m=>m.type.startsWith('video')||m.type.startsWith('audio'));
  const ty=g.type,L=ty==='lane',T=ty==='timing',S=ty==='simon',K=ty==='tap';
  const basic=`<div class="mggrid">
    ${sel('type',t('mgTypeL'),[['timing',t('mgType_timing')],['lane',t('mgType_lane')],['simon',t('mgType_simon')],['tap',t('mgType_tap')]])}
    ${txt('name',t('mgName'),60)}
    ${f('media',t('mgMedia'),`<select data-mgf="media"><option value="">${t('mgNoMedia')}</option>${clips.map(m=>`<option value="${esc(m.id)}" ${g.media===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`)}</div>`;
  const rhythm=`<div class="mggrid">
    ${num('cd',0,10,t('mgCd'),t('mgCdH'))}${K?'':num('bpm',30,300,'BPM')}
    ${S||K?'':num('offset',-5000,60000,t('mgOffset'),t('mgOffsetH'))}
    ${K?`${num('dur',3,60,t('mgDur'))}${num('goal',1,500,t('mgGoal'),t('mgGoalH'))}${txt('key',t('mgKey'),12,t('mgKeyPh'),t('mgKeyH'))}`
    :S?`${num('rounds',1,64,t('mgLevels'))}${num('lanes',2,8,t('mgPads'))}${num('start',1,8,t('mgStartLen'),t('mgStartLenH'))}${num('tmo',1000,10000,t('mgTmo'),t('mgTmoH'))}${txt('key',t('mgKeys'),40,'d f j k',t('mgKeysH'))}`
    :L?`${num('lanes',2,8,t('mgLanes'))}${num('sub',1,4,t('mgSub'),t('mgSubH'))}${num('fall',400,4000,t('mgFall'),t('mgFallH'))}${sel('dir',t('mgDir'),[['down',t('mgDown')],['up',t('mgUp')]])}${sel('ns',t('mgShape'),[['bar',t('mgSh_bar')],['arrow',t('mgSh_arrow')],['circle',t('mgSh_circle')],['diamond',t('mgSh_diamond')],['star',t('mgSh_star')],['img',t('mgSh_img')]])}${txt('key',t('mgKeys'),40,'d f j k',t('mgKeysH'))}`
    :`${num('rounds',1,64,t('mgRounds'))}${num('beats',1,8,t('mgBeats'),t('mgBeatsH'))}${num('zone',10,95,t('mgZone'),t('mgZoneH'))}${num('zw',4,50,t('mgZw'))}${txt('key',t('mgKey'),12,t('mgKeyPh'),t('mgKeyH'))}`}</div>`;
  const n=(g.chart||[]).length;
  const notes=L?`<div class="mgchartf"><button class="btn primary big" data-mg="chart-edit">🎼 ${t('mgChartEdit')}</button>${n?`<button class="btn small danger" data-mg="chart-clear">${t('mgChartClear')}</button>`:''}<small class="muted">${n?t('mgChartN').replace('{n}',n):t('mgChartNone')}</small></div>
    <div class="mggrid">${num('rounds',1,64,t('mgNotes'))}${txt('pat',t('mgPat'),80,'1 2 3 4 3 2',t('mgPatH'))}</div>`:'';
  const pen=`<div class="mggrid">${txt('dmg',t('mgDmg'),12,'1d6',t('mgDmgH'))}${sel('dmgMode',t('mgDmgMode'),[['confirm',t('mgConfirm')],['auto',t('mgAuto')]])}${sel('play',t('mgPlayMode'),[['all',t('mgAll')],['one',t('mgOne')]])}</div>`;
  const cols=`<div class="mgcols" style="padding:10px 16px">${MG_COL.map(k=>`<label class="mgc"><input type="color" data-mgc="${k}" value="${g.col[k]}"><span>${t('mgc_'+k)}</span></label>`).join('')}</div>`;
  return`<section class="panel mgpanel mgform"><div class="ph"><h2>${t('mgEdit')}</h2></div>
   ${basic}
   ${sec('🎚',t('mgSecRhythm'),rhythm,true)}
   ${L&&g.ns==='img'?sec('🖼',t('mgImgs'),mgImgForm(g),true):''}
   ${L?sec('🎼',t('mgSecNotes'),notes,true):''}
   ${T||L?sec('🎬',t('mgTimeline'),mgTimeline(),!!(g.segs&&g.segs.length)):''}
   ${sec('💥',t('mgSecPen'),pen,true)}
   ${sec('🎨',t('mgSecCol'),cols,false)}
   ${mgMsg?`<p class="err" role="alert" style="padding:0 16px">${esc(mgMsg)}</p>`:''}
   <div class="mgbtns mgsave"><button class="btn primary" data-mg="save" ${mgBusy?'disabled':''}>${t('save')}</button><button class="btn" data-mg="play-draft">▶ ${t('mgTest')}</button><button class="btn" data-mg="cancel">${t('mgCancel')}</button></div>
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
  else if(a==='chart-edit'){mgChartEdit();return}
  else if(a==='chart-clear'){GD.chart=[]}
  else if(a==='img-clr'&&GD){GD.nimgs=(GD.nimgs||[]).slice();GD.nimgs[Number(b.dataset.i)]=''}
  else if(a.startsWith('seg-')&&GD){const S=GD.segs||(GD.segs=[]),i=Number(b.dataset.i);
    if(a==='seg-add-play')S.push({kind:'play',len:10,bpm:0,beats:0,sub:0,fall:0,zone:0,zw:0,dir:'',key:'',cz:'',cp:''});
    else if(a==='seg-add-cut')S.push({kind:'cut',len:5,bpm:0,beats:0,sub:0,fall:0,zone:0,zw:0,dir:'',key:'',cz:'',cp:''});
    else if(a==='seg-del')S.splice(i,1);
    else if(a==='seg-up'&&i>0)[S[i-1],S[i]]=[S[i],S[i-1]];
    else if(a==='seg-down'&&i<S.length-1)[S[i+1],S[i]]=[S[i],S[i+1]];
    else if(a==='seg-clr')S[i].cz=''}
  else if(a==='save'){mgSave();return}
  else if(a==='del'){mgDelete(id);return}
  else if(a==='play'){mgPlay(GAMES.find(x=>x.id===id));return}
  else if(a==='play-draft'){mgPlay(GD);return}
  render()});
function mgSegInput(e){
  const x=e.target.closest('[data-mgs]');if(!x||!GD)return false;const[i,f]=x.dataset.mgs.split(':'),sg=(GD.segs||[])[Number(i)];if(!sg)return true;
  sg[f]=x.type==='number'?(x.value===''?0:Number(x.value)):x.value;
  mgTlRefresh();return true}
document.addEventListener('change',e=>{if(e.target.closest('[data-mgs]'))mgSegInput(e)});
document.addEventListener('input',e=>{
  if(mgSegInput(e))return;
  const c=e.target.closest('[data-mgc]');if(c&&GD){GD.col[c.dataset.mgc]=c.value;return}
  const x=e.target.closest('[data-mgf]');if(!x||!GD)return;const k=x.dataset.mgf;
  GD[k]=x.type==='number'?(x.value===''?0:Number(x.value)):x.value;if(k==='type'||k==='ns')render()});
function mgImgForm(g){
  const keys=mgKeys(g);
  return`<div class="mgimgs"><p class="muted small">${t('mgImgsH')}</p>${keys.map((k,i)=>{const u=(g.nimgs||[])[i]||'';return`<div class="mgimgrow"><b>${esc(k.toUpperCase())}</b>${u?`<img src="${esc(u)}" alt="">`:'<span class="mgimgph">—</span>'}<label class="btn small">${t('mgImgPick')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-mgimg="${i}" hidden></label>${u?`<button class="btn small" data-mg="img-clr" data-i="${i}">✕</button>`:''}</div>`}).join('')}<p class="mgimgmsg small" aria-live="polite"></p></div>`}
document.addEventListener('change',async e=>{
  const x=e.target.closest('[data-mgimg]');if(!x||!GD)return;const i=Number(x.dataset.mgimg),file=x.files&&x.files[0];if(!file)return;
  const msg=document.querySelector('.mgimgmsg');if(msg)msg.textContent=t('rWorking');
  try{const p=await prepImage(file,'note');let url;
    if(REMOTE){const r=await api('POST','api/img',{slot:'note',data:p.b64});url=r.url}else url='data:'+p.mime+';base64,'+p.b64;
    GD.nimgs=(GD.nimgs||[]).slice();while(GD.nimgs.length<=i)GD.nimgs.push('');GD.nimgs[i]=url;render()}
  catch(err){if(msg)msg.textContent=imgErrText(err.code||err.message,'note')}});
/* ---- engine ---- */
function mgRollDmg(s,n){
  const m=/^(\d+)(?:d(\d+))?([+-]\d+)?$/.exec(s||'');if(!m||!n)return 0;let tot=0;
  for(let i=0;i<n;i++){let v=Number(m[3]||0);if(m[2]){for(let j=0;j<Number(m[1]);j++)v+=1+Math.floor(Math.random()*Number(m[2]))}else v+=Number(m[1]);tot+=Math.max(0,v)}
  return tot}
function mgCal(v){try{if(v==null)return Number(localStorage.getItem('mg_cal'))||0;localStorage.setItem('mg_cal',String(v))}catch(e){return 0}}
let MGP=null;
function mgKeys(g){const d='dfjkasl;'.split(''),k=(g.key||'').toLowerCase().split(/\s+/).filter(Boolean);return Array.from({length:g.lanes},(_,i)=>k[i]||d[i])}
function mgChart(g){
  const N=g.rounds,L=g.lanes,pat=(g.pat||'').replace(/\s+/g,'').split('').map(Number);
  let seed=0;for(const ch of g.id)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const step=60000/g.bpm/(g.sub||1),out=[],hasP=pat.some(x=>x>0);let s=0,guard=0;
  while(out.length<N&&guard++<2000){
    let l;if(hasP){l=pat[s%pat.length];if(l>0)l=((l-1)%L)+1}else l=1+Math.floor(rnd()*L);
    if(l>0)out.push({t:s*step,l:l-1});s++}
  return out}
function mgTimingPlan(g){
  const out=[];
  if(!(g.segs&&g.segs.length)){const D=g.beats*60000/g.bpm;for(let i=0;i<g.rounds;i++)out.push({t:i*D,D,zone:g.zone,zw:g.zw,key:'',cz:'',cp:''});return out}
  let t=0;for(const x of g.segs){const len=x.len*1000;
    if(x.kind==='play'){const D=(x.beats||g.beats)*60000/(x.bpm||g.bpm);for(let k=0;(k+1)*D<=len+1;k++)out.push({t:t+k*D,D,zone:x.zone||g.zone,zw:x.zw||g.zw,key:x.key||'',cz:x.cz||'',cp:x.cp||''})}
    t+=len}
  return out}
function mgSegAt(g,t){let c=0;for(const x of g.segs||[]){const len=x.len*1000;if(t>=c&&t<c+len)return x;c+=len}return null}
function mgLanePlan(g){
  const out=mgLanePlan0(g).sort((a,b)=>a.t-b.t||a.l-b.l),next={};
  for(let i=out.length-1;i>=0;i--){const n=out[i];n.len=n.len||0;n.gap=next[n.l]!=null?next[n.l]-n.t-n.len:1e9;next[n.l]=n.t}
  return out}
function mgLanePlan0(g){
  if(g.chart&&g.chart.length){const out=[];for(const n of g.chart){const x=mgSegAt(g,n.t);if(x&&x.kind==='cut')continue;out.push({t:n.t,len:n.len||0,l:Math.min(n.l,g.lanes-1),dir:(x&&x.dir)||g.dir,fall:(x&&x.fall)||g.fall,cz:(x&&x.cz)||''})}return out}
  if(!(g.segs&&g.segs.length))return mgChart(g).map(n=>({...n,dir:g.dir,fall:g.fall,cz:''}));
  const L=g.lanes,pat=(g.pat||'').replace(/\s+/g,'').split('').map(Number),hasP=pat.some(x=>x>0),out=[];
  let seed=0;for(const ch of g.id)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  let t=0,s=0;
  for(const x of g.segs){const len=x.len*1000;
    if(x.kind==='play'){const step=60000/(x.bpm||g.bpm)/(x.sub||g.sub||1);
      for(let k=0;k*step<len&&out.length<400;k++){
        let l;if(hasP){l=pat[s%pat.length];if(l>0)l=((l-1)%L)+1}else l=1+Math.floor(rnd()*L);s++;
        if(l>0)out.push({t:t+k*step,l:l-1,dir:x.dir||g.dir,fall:x.fall||g.fall,cz:x.cz||''})}}
    t+=len}
  return out}
/* ---- note looks (shapes / your own pictures), landscape on phones, and the count-in ---- */
const MG_SHAPES={arrow:'<polygon points="8,36 54,36 54,10 94,50 54,90 54,64 8,64"/>',circle:'<circle cx="50" cy="50" r="42"/>',diamond:'<polygon points="50,5 95,50 50,95 5,50"/>',star:'<polygon points="50,5 62,37 96,38 69,59 79,93 50,73 21,93 31,59 4,38 38,37"/>'};
const MG_ARROW_DEG=[180,90,270,0];  /* left, down, up, right (lane 1..4, then the same again) */
function mgImgOf(g,l){return (g.nimgs&&(g.nimgs[l]||g.nimgs[0]))||''}
function mgShapeOf(g,l){return g.ns==='img'&&!mgImgOf(g,l)?'arrow':(g.ns||'bar')}
function mgHeadInner(g,l){
  const sh=mgShapeOf(g,l);
  if(sh==='bar')return'';
  if(sh==='img')return`<img src="${esc(mgImgOf(g,l))}" alt="" draggable="false">`;
  const rot=sh==='arrow'?` style="transform:rotate(${MG_ARROW_DEG[l%4]}deg)"`:'';
  return`<svg viewBox="0 0 100 100"${rot} fill="currentColor" stroke="#fff" stroke-width="4" stroke-linejoin="round" aria-hidden="true">${MG_SHAPES[sh]}</svg>`}
function mgLandscape(on){
  try{if(!(window.matchMedia&&matchMedia('(pointer:coarse)').matches))return;
    if(on){const d=document.documentElement,p=d.requestFullscreen?d.requestFullscreen():null;Promise.resolve(p).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')).catch(()=>{})}
    else{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}}catch(e){}}
function mgRotCheck(el){const b=el.querySelector('.mgrot');if(!b)return;b.hidden=!(window.matchMedia&&matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth)}
function mgCountdown(el,secs,S,done,goTxt){
  const c=el.querySelector('.mgcount');let n=secs;
  const step=()=>{
    if(S.phase!=='count'||!el.isConnected)return;
    if(n<=0){c.textContent='';done();return}
    c.textContent=n;c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');n--;S.cdT=setTimeout(step,1000)};
  step()}
function mgPlay(g,cb){
  if(!g||MGP)return;
  if(g.type==='simon'||g.type==='tap')return mgPlay2(g,cb);
  const it=mgMi(g),isV=it&&it.type.startsWith('video'),isL=g.type==='lane';
  const col=g.col,key=(g.key||'').trim(),keyLab=key||'●',keys=isL?mgKeys(g):[],notes=isL?mgLanePlan(g):[],sweeps=isL?[]:mgTimingPlan(g);
  const total=isL?notes.length:sweeps.length,WIN=150,PERF=60;
  const el=document.createElement('div');el.id='mgPlay';el.className='mgplay';
  const field=isL?`<div class="mglanes" style="--n:${g.lanes}">${keys.map((k,i)=>`<div class="mglane" style="background:${col.bar}"></div>`).join('')}<div class="mgline" style="background:${col.perfect};${g.dir==='up'?'top':'bottom'}:0"></div></div>
   <div class="mgpads" style="--n:${g.lanes}">${keys.map((k,i)=>`<button class="mgpad" data-l="${i}" style="background:${col.zone}">${g.ns==='arrow'?['←','↓','↑','→'][i%4]+' ':''}${esc(k.toUpperCase())}</button>`).join('')}</div>`
   :`<div class="mgbar" style="background:${col.bar}"><div class="mgzone" style="left:${g.zone-g.zw/2}%;width:${g.zw}%;background:${col.zone}"><i style="background:${col.perfect}"></i></div><div class="mgmark" style="background:${col.marker}"></div></div>
   <button class="mgtap" style="background:${col.zone}">${esc(keyLab)}</button>`;
  el.innerHTML=`${isV?`<video class="mgvid" playsinline preload="auto" src="${esc(it.url)}"></video>`:''}
   <button class="mgx" aria-label="${t('close')}">✕</button>
   <div class="mghud"><b>${esc(g.name)}</b><span class="mgsc"></span></div>
   <div class="mgrot" hidden>↻ ${t('mgRotate')}</div>
   <div class="mgmid"><div class="mgfb" aria-live="polite"></div></div>
   <div class="mgcount"></div>
   ${field}
   <div class="mgstart"><button class="btn primary big">${t('mgStart')}</button><div class="mgcal">${t('mgCal')}: <button class="btn small" data-c="-10">−</button> <b>${mgCal()}</b> ms <button class="btn small" data-c="10">+</button></div></div>
   <div class="mgres" hidden></div>`;
  document.body.appendChild(el);
  const media=isV?el.querySelector('video'):(it?new Audio(it.url):null);
  const $q=s=>el.querySelector(s);
  const S={phase:'ready',res:[],t0:0,raf:0,H:0,holds:new Set(),holdL:{}};
  MGP=S;
  let noteEls=[];
  if(isL){const lanes=el.querySelectorAll('.mglane');noteEls=notes.map(n=>{const d=document.createElement('div');d.className='mgnote';d.style.color=n.cz||col.zone;d.style.display='none';
    d.style.flexDirection=n.dir==='up'?'column':'column-reverse';
    d.innerHTML=`<div class="mgnh ${mgShapeOf(g,n.l)}">${mgHeadInner(g,n.l)}</div>${n.len>0?'<div class="mgnt"></div>':''}`;
    lanes[n.l].appendChild(d);return d})}
  const clock=()=>media&&!media.paused?media.currentTime*1000:performance.now()-S.t0;
  const lead=g.cd>0?(isL?g.fall+200:600):3000;
  const offs=()=>(media?g.offset:Math.max(g.offset,lead))+mgCal();
  function say(txt,c){const f=$q('.mgfb');f.textContent=txt;f.style.color=c;f.classList.remove('pop');void f.offsetWidth;f.classList.add('pop')}
  function counts(){const r=S.res;return{p:r.filter(x=>x==='p').length,h:r.filter(x=>x==='h').length,m:r.filter(x=>x==='m').length}}
  function hud(){const c=counts();$q('.mgsc').textContent=`✦${c.p}  ✔${c.h}  ✘${c.m}  /${total}`}
  function resolve(k,v){if(S.res[k]!=null)return;S.res[k]=v;hud();if(isL&&noteEls[k]&&!(v!=='m'&&notes[k].len>0))noteEls[k].style.display='none';say(v==='p'?t('mgPerfect'):v==='h'?t('mgHit'):t('mgMiss'),v==='p'?col.perfect:v==='h'?col.zone:'#ef4444')}
  function finish(){
    if(S.phase==='done')return;S.holds.clear();S.phase='done';cancelAnimationFrame(S.raf);if(media)media.pause();
    for(let k=0;k<total;k++)if(S.res[k]==null)S.res[k]='m';
    const c=counts(),dmg=mgRollDmg(g.dmg,c.m);S.out={perfect:c.p,hit:c.h,miss:c.m,dmg};if(cb)cb(S.out);
    const r=$q('.mgres');r.hidden=false;
    r.innerHTML=`<h2>${t('mgDone')}</h2><p>✦ ${t('mgPerfect')} ${c.p} · ✔ ${t('mgHit')} ${c.h} · ✘ ${t('mgMiss')} ${c.m}</p>${g.dmg?`<p class="mgdmg">${c.m?t('mgDmgTaken').replace('{n}',dmg).replace('{d}',g.dmg):t('mgNoDmg')}</p>`:''}<div class="mgbtns">${cb?'':`<button class="btn primary" data-r="again">${t('mgAgain')}</button>`}<button class="btn" data-r="close">${t('close')}</button></div>`}
  function loop(){
    if(S.phase!=='run')return;
    const T=clock()-offs(),cd=$q('.mgcount');
    cd.textContent=g.cd===0&&T<0?Math.ceil(-T/1000):'';
    if(isL){
      const sq=g.ns!=='bar',NHM=sq?S.NHS:Math.max(24,S.H*.08);let open=0;
      for(let i=0;i<notes.length;i++){
        const n=notes[i],e=noteEls[i],ppm=(S.H-NHM)/n.fall;
        if(S.holds.has(i)){/* being held: the head stays on the line while the tail runs out */
          const rem=n.t+n.len-T;if(rem<=60){endHold(i,true);continue}
          const hn=sq?NHM:NHM*.6,h=hn+rem*ppm;e.style.setProperty('--nh',hn+'px');e.style.height=h+'px';e.style.transform=`translateY(${n.dir==='up'?0:S.H-h}px)`;continue}
        if(S.res[i]!=null)continue;open++;const dt=n.t-T;
        if(-dt>WIN){resolve(i,'m');continue}
        const p=1-dt/n.fall;
        if(p<0){e.style.display='none';continue}
        const NH=sq?NHM:Math.max(10,Math.min(NHM,n.gap/n.fall*(S.H-NHM)-4)),tail=n.len>0?n.len*ppm:0;e.style.display='flex';e.style.setProperty('--nh',NH+'px');e.style.height=(NH+tail)+'px';
        const y=n.dir==='up'?(1-p)*(S.H-NH):p*(S.H-NH)+NH-(NH+tail);e.style.transform=`translateY(${y}px)`}
      if(!open&&!S.holds.size&&(!notes.length||T>lastEnd+300)){finish();return}
      const nx=notes.find((n,i)=>S.res[i]==null),dr=nx?nx.dir:g.dir;
      if(S.dir!==dr){S.dir=dr;const ln=$q('.mgline');ln.style.top=dr==='up'?'0':'auto';ln.style.bottom=dr==='up'?'auto':'0'}
    }else{
      while(S.si<sweeps.length&&T>=sweeps[S.si].t+sweeps[S.si].D){resolve(S.si,'m');S.si++}
      if(S.si>=sweeps.length){finish();return}
      const sw=sweeps[S.si],mk=$q('.mgmark'),bar=$q('.mgbar');
      if(S.zi!==S.si){S.zi=S.si;const z=$q('.mgzone');z.style.left=(sw.zone-sw.zw/2)+'%';z.style.width=sw.zw+'%';z.style.background=sw.cz||col.zone;z.firstChild.style.background=sw.cp||col.perfect;S.key=sw.key;$q('.mgtap').textContent=sw.key||keyLab;$q('.mgtap').style.background=sw.cz||col.zone}
      if(T<sw.t){bar.style.opacity='.35';mk.style.left='0%'}else{bar.style.opacity='1';mk.style.left=((T-sw.t)/sw.D*100)+'%'}
    }
    S.raf=requestAnimationFrame(loop)}
  const lastEnd=notes.reduce((a,n)=>Math.max(a,n.t+n.len),0);
  function endHold(i,done){
    if(!S.holds.has(i))return;const n=notes[i];S.holds.delete(i);delete S.holdL[n.l];
    const pad=el.querySelector('.mgpad[data-l="'+n.l+'"]');if(pad)pad.classList.remove('on');
    if(noteEls[i])noteEls[i].style.display='none';
    if(!done){S.res[i]='m';hud();say(t('mgMiss'),'#ef4444')}}
  function release(l){
    const i=S.holdL[l];if(i==null||S.phase!=='run')return;const n=notes[i],T=clock()-offs();
    endHold(i,T>=n.t+n.len-120)}
  function press(l){
    if(S.phase!=='run')return;const T=clock()-offs();
    if(isL){
      const pad=el.querySelector('.mgpad[data-l="'+l+'"]');if(pad){pad.classList.add('on');setTimeout(()=>{if(S.holdL[l]==null)pad.classList.remove('on')},110)}
      /* one press = one note, and the earliest note still waiting in that lane goes first (close notes are never taken together) */
      for(let i=0;i<notes.length;i++){if(S.res[i]!=null||notes[i].l!==l)continue;const d=Math.abs(T-notes[i].t);
        if(notes[i].t-T>WIN)break;
        if(d<=WIN){resolve(i,d<=PERF?'p':'h');if(notes[i].len>0){S.holds.add(i);S.holdL[l]=i;if(pad)pad.classList.add('on')}break}}
      return}
    const k=S.si,sw=sweeps[k];if(!sw||T<sw.t||S.res[k]!=null)return;
    const dist=Math.abs((T-sw.t)/sw.D*100-sw.zone),half=sw.zw/2;
    resolve(k,dist<=half*.3?'p':dist<=half?'h':'m')}
  function start(){
    S.res=[];S.si=0;S.zi=-1;S.dir=null;S.key='';S.holds.clear();S.holdL={};hud();$q('.mgstart').hidden=true;$q('.mgres').hidden=true;
    if(isL){S.H=$q('.mglanes').clientHeight;S.LW=$q('.mglane').clientWidth;S.NHS=Math.max(24,Math.min(S.LW*.84,S.H*.2))}
    mgLandscape(true);S.phase='count';mgCountdown(el,g.cd,S,begin)}
  function begin(){
    S.phase='run';S.t0=performance.now();say(t('mgGo'),col.perfect);
    if(media){try{media.currentTime=0;const p=media.play();if(p&&p.catch)p.catch(()=>{S.t0=performance.now()})}catch(e){}}
    S.raf=requestAnimationFrame(loop)}
  function close(){clearTimeout(S.cdT);mgLandscape(false);window.removeEventListener('resize',rc);cancelAnimationFrame(S.raf);if(media){media.pause()}document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);window.removeEventListener('resize',rs);el.remove();MGP=null}
  const kd=e=>{if(e.key==='Escape'){close();return}if(e.repeat)return;const k=e.key.toLowerCase();
    if(isL){const l=keys.indexOf(k);if(l>=0){e.preventDefault();press(l)}return}
    const kk=S.key||key;if(k===(kk?kk.toLowerCase():' ')){e.preventDefault();press()}};
  const rs=()=>{if(isL&&S.phase==='run'){S.H=$q('.mglanes').clientHeight;S.LW=$q('.mglane').clientWidth;S.NHS=Math.max(24,Math.min(S.LW*.84,S.H*.2))}};
  const rc=()=>mgRotCheck(el);window.addEventListener('resize',rc);rc();
  const ku=e=>{if(isL){const l=keys.indexOf(e.key.toLowerCase());if(l>=0)release(l)}};
  document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);window.addEventListener('resize',rs);
  $q('.mgx').onclick=close;
  if(isL)el.querySelectorAll('.mgpad').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}press(Number(b.dataset.l))});['pointerup','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>release(Number(b.dataset.l))))});
  else $q('.mgtap').addEventListener('pointerdown',e=>{e.preventDefault();press()});
  $q('.mgstart .big').onclick=start;
  el.addEventListener('click',e=>{
    const c=e.target.closest('[data-c]');if(c){const v=mgCal()+Number(c.dataset.c);mgCal(v);c.parentNode.querySelector('b').textContent=mgCal();return}
    const r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='close')close();else{S.phase='ready';start()}});
  if(media&&media.addEventListener)media.addEventListener('ended',()=>{if(S.phase==='run')finish()});
}
Object.assign(TX.th,{mgRotate:'หมุนมือถือเป็นแนวนอนเพื่อเล่น',mgShape:'รูปแบบโน้ต',mgSh_bar:'แท่ง',mgSh_arrow:'ลูกศร',mgSh_circle:'วงกลม',mgSh_diamond:'เพชร',mgSh_star:'ดาว',mgSh_img:'ภาพของฉัน',mgCd:'นับถอยหลังก่อนเริ่ม (วินาที)',mgCdH:'0 = ไม่นับ',mgImgs:'ภาพโน้ตแต่ละเลน',mgImgsH:'เลือกภาพให้แต่ละเลน (เลนที่ไม่มีภาพจะใช้ภาพของเลนแรก; ไม่มีเลยจะใช้ลูกศร) — ภาพจะถูกย่อให้อัตโนมัติ',mgImgPick:'เลือกภาพ',mgSecRhythm:'จังหวะและกติกา',mgSecNotes:'โน้ต',mgSecPen:'เมื่อพลาด / วิธีเล่น',mgSecCol:'สี',mgChartL:'โน้ตแบบวาดเอง',mgChartEdit:'เปิดตัวแก้โน้ต (กริด)',mgChartClear:'ล้างโน้ต',mgChartN:'วางไว้ {n} ตัว — ใช้แทนรูปแบบตัวเลข/สุ่ม',mgChartNone:'ยังไม่มี (ใช้รูปแบบตัวเลข/สุ่มด้านล่าง)',mgTimeline:'ไทม์ไลน์',mgTimelineH:'แบ่งเกมเป็นช่วง ๆ ตามลำดับ ช่วงเล่นปรับ BPM/ทิศทาง/สี/ปุ่มได้ ช่วงคัตซีนไม่มีโน้ต คลิปเล่นต่อ ช่องว่าง = ใช้ค่าของเกม',mgNoSeg:'ยังไม่มีช่วง (ใช้ค่าของเกมทั้งเกม)',mgTotal:'ความยาวรวม',mgPlaySeg:'ช่วงเล่น',mgCutSeg:'คัตซีน',mgLen:'ยาว',mgCancel:'ยกเลิก',mgTypeL:'ประเภทเกม',mgNotes:'จำนวนโน้ต',mgLanes:'จำนวนเลน',mgSub:'โน้ตต่อบีต',mgSubH:'1 = ทุกบีต 2 = ครึ่งบีต',mgFall:'เวลาตกถึงเส้น (ms)',mgFallH:'น้อย = โน้ตเร็ว',mgDir:'ทิศทางโน้ต',mgDown:'ตกลงมา',mgUp:'ขึ้นไป',mgPat:'รูปแบบโน้ต',mgPatH:'เลขเลน เช่น 1 2 3 4 3 2 (0 = เว้น) ว่าง = สุ่ม (คงที่ทุกครั้ง)',mgKeys:'ปุ่มแต่ละเลน',mgKeysH:'คั่นด้วยเว้นวรรค เช่น d f j k',mgTitle:'เกมจังหวะ',mgNew:'+ เกมใหม่',mgTest:'ทดลองเล่น',mgNone:'ยังไม่มีเกม กด "เกมใหม่" เพื่อสร้าง',mgType_timing:'แถบจังหวะ',mgType_lane:'เลนโน้ต',mgType_simon:'Simon',mgType_tap:'กดรัว',mgRounds:'รอบ',mgEdit:'ตั้งค่าเกม',mgName:'ชื่อเกม',mgMedia:'วิดีโอ/เสียงพื้นหลัง',mgNoMedia:'ไม่ใช้ (ใช้นับเวลาเอง)',mgOffset:'Offset (มิลลิวินาที)',mgOffsetH:'เวลาที่เกมเริ่มนับจังหวะแรก นับจากเริ่มคลิป',mgBeats:'จำนวนบีตต่อ 1 รอบ',mgBeatsH:'ยิ่งมาก แถบยิ่งวิ่งช้า',mgZone:'ตำแหน่งโซน (%)',mgZoneH:'0 = ซ้ายสุด 100 = ขวาสุด',mgZw:'ความกว้างโซน (%)',mgKey:'ปุ่มกด',mgKeyPh:'เว้นว่าง = Space',mgKeyH:'ปุ่มบนแป้นพิมพ์ ป้ายบนปุ่มจอสัมผัสด้วย',mgDmg:'ดาเมจต่อการพลาด 1 ครั้ง',mgDmgH:'เช่น 3 หรือ 1d6 หรือ 2d4+1 (ว่าง = ไม่มี)',mgDmgMode:'การหักเลือด',mgConfirm:'เสนอให้ GM ยืนยัน',mgAuto:'หักอัตโนมัติ',mgPlayMode:'วิธีเล่น',mgAll:'ทุกคนพร้อมกัน',mgOne:'ทีละคน',mgc_bar:'สีแถบ',mgc_zone:'สีโซน / โน้ต',mgc_perfect:'สีจุดเป๊ะ / เส้นตี',mgc_marker:'สีตัวชี้',mgNeedName:'ใส่ชื่อเกมก่อน',mgFail:'บันทึกไม่สำเร็จ',mgDelAsk:'ลบเกมนี้?',mgStart:'เริ่ม',mgCal:'ชดเชยหน่วงของเครื่อง',mgPerfect:'เป๊ะ!',mgHit:'โดน',mgMiss:'พลาด',mgDone:'จบเกม',mgAgain:'เล่นอีกครั้ง',mgDmgTaken:'ได้รับดาเมจ {n} ({d} ต่อครั้งที่พลาด)',mgNoDmg:'ไม่พลาดเลย ไม่เสียเลือด'});
Object.assign(TX.en,{mgRotate:'Rotate your phone to landscape to play',mgShape:'Note style',mgSh_bar:'Bar',mgSh_arrow:'Arrow',mgSh_circle:'Circle',mgSh_diamond:'Diamond',mgSh_star:'Star',mgSh_img:'My pictures',mgCd:'Countdown before start (s)',mgCdH:'0 = none',mgImgs:'Note picture per lane',mgImgsH:'Pick a picture per lane (a lane without one uses lane 1\'s; none at all falls back to arrows). Pictures are resized automatically.',mgImgPick:'Choose picture',mgSecRhythm:'Rhythm and rules',mgSecNotes:'Notes',mgSecPen:'On a miss / play mode',mgSecCol:'Colours',mgChartL:'Hand-placed notes',mgChartEdit:'Open note editor (grid)',mgChartClear:'Clear notes',mgChartN:'{n} notes placed — used instead of the number pattern / random',mgChartNone:'None yet (the number pattern / random below is used)',mgTimeline:'Timeline',mgTimelineH:'Split the game into stretches in order. A play stretch can change BPM / direction / colour / button; a cutscene has no notes and the clip just plays. Empty = the game value',mgNoSeg:'No stretches (the game settings apply to the whole game)',mgTotal:'Total length',mgPlaySeg:'Play',mgCutSeg:'Cutscene',mgLen:'Length',mgCancel:'Cancel',mgTypeL:'Game type',mgNotes:'Number of notes',mgLanes:'Lanes',mgSub:'Notes per beat',mgSubH:'1 = every beat, 2 = half beat',mgFall:'Fall time to line (ms)',mgFallH:'Lower = faster notes',mgDir:'Note direction',mgDown:'Falling',mgUp:'Rising',mgPat:'Note pattern',mgPatH:'Lane numbers, e.g. 1 2 3 4 3 2 (0 = rest). Empty = random (same every time)',mgKeys:'Key per lane',mgKeysH:'Separated by spaces, e.g. d f j k',mgTitle:'Rhythm games',mgNew:'+ New game',mgTest:'Test play',mgNone:'No games yet. Press "New game" to make one.',mgType_timing:'Timing bar',mgType_lane:'Note lanes',mgType_simon:'Simon',mgType_tap:'Rapid tap',mgRounds:'rounds',mgEdit:'Game settings',mgName:'Game name',mgMedia:'Background video / audio',mgNoMedia:'None (own timer)',mgOffset:'Offset (ms)',mgOffsetH:'When the first beat starts, counted from the clip start',mgBeats:'Beats per sweep',mgBeatsH:'More beats = slower bar',mgZone:'Zone position (%)',mgZoneH:'0 = far left, 100 = far right',mgZw:'Zone width (%)',mgKey:'Button',mgKeyPh:'empty = Space',mgKeyH:'Keyboard key; also the label on the touch button',mgDmg:'Damage per miss',mgDmgH:'e.g. 3 or 1d6 or 2d4+1 (empty = none)',mgDmgMode:'HP loss',mgConfirm:'Propose to GM to confirm',mgAuto:'Apply automatically',mgPlayMode:'Play mode',mgAll:'Everyone together',mgOne:'One at a time',mgc_bar:'Bar colour',mgc_zone:'Zone / note colour',mgc_perfect:'Perfect spot',mgc_marker:'Marker',mgNeedName:'Enter a game name first',mgFail:'Could not save',mgDelAsk:'Delete this game?',mgStart:'Start',mgCal:'Device delay offset',mgPerfect:'Perfect!',mgHit:'Hit',mgMiss:'Miss',mgDone:'Game over',mgAgain:'Play again',mgDmgTaken:'Took {n} damage ({d} per miss)',mgNoDmg:'No misses, no damage'});
