/* ---------- rhythm minigames: game list + editor (GM) and the timing-bar engine ---------- */
let MGS={},GAMES=[],GD=null,mgMsg='',mgBusy=false;
const MG_COL=['bar','zone','perfect','marker'];
function mgNew(){return{id:'g'+Math.random().toString(36).slice(2,10),name:'',type:'timing',media:'',bpm:100,offset:0,rounds:8,beats:2,zone:75,zw:16,key:'',lanes:4,chart:[],ns:'bar',nimgs:[],cd:3,rows:1,ps:0,rn:4,brk:8,dur:10,goal:30,tmo:4000,start:2,fall:1500,sub:1,pat:'',dir:'down',col:{bar:'#2a2a30',zone:'#3b82f6',perfect:'#facc15',marker:'#ffffff'},dmg:'1d6',dmgMode:'confirm',play:'all'}}
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
  const sel=(k,lab,opts)=>f(k,lab,`<select data-mgf="${k}">${opts.map(([v,l])=>`<option value="${v}" ${String(g[k])===String(v)?'selected':''}>${l}</option>`).join('')}</select>`);
  const sec=(ico,title,inner,open)=>`<details class="mgsec" ${open?'open':''}><summary><span>${ico}</span> ${title}</summary>${inner}</details>`;
  const clips=MEDIA.filter(m=>m.type.startsWith('video')||m.type.startsWith('audio'));
  const ty=g.type,L=ty==='lane'||ty==='mix',R=ty==='timing'||ty==='mix',K=ty==='tap'||ty==='mix',pure=ty!=='mix';
  const basic=`<div class="mggrid">
    ${sel('type',t('mgTypeL'),[['timing',t('mgType_timing')],['lane',t('mgType_lane')],['tap',t('mgType_tap')],['mix',t('mgType_mix')]])}
    ${txt('name',t('mgName'),60)}
    ${f('media',t('mgMedia'),`<select data-mgf="media"><option value="">${t('mgNoMedia')}</option>${clips.map(m=>`<option value="${esc(m.id)}" ${g.media===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>`)}</div>
    ${ty==='mix'?`<p class="muted small" style="padding:0 16px">${t('mgMixHint')}</p>`:''}`;
  const rhythm=`<div class="mggrid">
    ${num('bpm',30,300,'BPM',t('mgBpmH'))}${num('offset',-5000,60000,t('mgOffset'),t('mgOffsetH'))}
    ${num('cd',0,10,t('mgCd'),t('mgCdH'))}${num('brk',0,120,t('mgBrk'),t('mgBrkH'))}
    ${L?`${num('lanes',2,8,t('mgLanes'))}${num('sub',1,4,t('mgSub'),t('mgSubH'))}${num('fall',400,4000,t('mgFall'),t('mgFallH'))}${sel('dir',t('mgDir'),[['down',t('mgDown')],['up',t('mgUp')]])}${sel('ns',t('mgShape'),[['bar',t('mgSh_bar')],['arrow',t('mgSh_arrow')],['circle',t('mgSh_circle')],['diamond',t('mgSh_diamond')],['star',t('mgSh_star')],['img',t('mgSh_img')]])}`:''}
    ${R?`${num('rn',2,8,t('mgRn'),t('mgRnH'))}${num('rows',1,3,t('mgRows'),t('mgRowsH'))}${sel('ps',t('mgPs'),[['0',t('mgPs0')],['1',t('mgPs1')],['2',t('mgPs2')],['3',t('mgPs3')],['4',t('mgPs4')]])}${pure?num('rounds',1,64,t('mgRounds'),t('mgRoundsH')):''}`:''}
    ${K?`${num('goal',1,500,t('mgGoal'),t('mgGoalH'))}${ty==='tap'?num('dur',3,60,t('mgDur')):''}`:''}
    ${txt('key',t('mgKeys'),40,'d f j k',t('mgKeysH'))}</div>`;
  const n=(g.chart||[]).length;
  const ND=(g.events||[]).length,notes0=`<div class="mgchartf"><button class="btn primary big" data-mg="chart-edit">🎼 ${t('mgChartEdit')}</button>${n?`<button class="btn small danger" data-mg="chart-clear">${t('mgChartClear')}</button>`:''}<small class="muted">${n?t('mgChartN').replace('{n}',n):t('mgChartNone')}${ND?' · '+ND+' '+t('mgEvUnit'):''}</small></div>`,
    notes=ty==='lane'?notes0+`<div class="mggrid">${num('rounds',1,64,t('mgNotes'))}${txt('pat',t('mgPat'),80,'1 2 3 4 3 2',t('mgPatH'))}</div>`:notes0+`<p class="muted small">${t('mgChartHint_'+ty)}</p>`;
  const pen=`<div class="mggrid">${txt('dmg',t('mgDmg'),12,'1d6',t('mgDmgH'))}${sel('dmgMode',t('mgDmgMode'),[['confirm',t('mgConfirm')],['auto',t('mgAuto')]])}${sel('play',t('mgPlayMode'),[['all',t('mgAll')],['one',t('mgOne')]])}</div>`;
  const cols=`<div class="mgcols" style="padding:10px 16px">${MG_COL.map(k=>`<label class="mgc"><input type="color" data-mgc="${k}" value="${g.col[k]}"><span>${t('mgc_'+k)}</span></label>`).join('')}</div>`;
  return`<section class="panel mgpanel mgform"><div class="ph"><h2>${t('mgEdit')}</h2></div>
   ${basic}
   ${sec('🎚',t('mgSecRhythm'),rhythm,true)}
   ${(L&&g.ns==='img')||R?sec('🖼',t('mgImgs'),mgImgForm(g),true):''}
   ${sec('🎼',t(ty==='lane'?'mgSecNotes':'mgSecChart'),notes,true)}
   ${ty==='timing'||ty==='lane'?sec('🎬',t('mgTimeline'),mgTimeline(),!!(g.segs&&g.segs.length)):''}
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
  const rows=[];
  if((g.type==='lane'||g.type==='mix')&&g.ns==='img')mgKeys(g).forEach((k,i)=>rows.push([i,k.toUpperCase()]));
  if(g.type==='timing'||g.type==='mix'){rows.push([8,t('mgImgChar')]);rows.push([9,t('mgImgHeart')])}
  return`<div class="mgimgs"><p class="muted small">${t('mgImgsH')}</p>${rows.map(([i,lab])=>{const u=(g.nimgs||[])[i]||'';return`<div class="mgimgrow"><b>${esc(lab)}</b>${u?`<img src="${esc(u)}" alt="">`:'<span class="mgimgph">—</span>'}<label class="btn small">${t('mgImgPick')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-mgimg="${i}" hidden></label>${u?`<button class="btn small" data-mg="img-clr" data-i="${i}">✕</button>`:''}</div>`}).join('')}<p class="mgimgmsg small" aria-live="polite"></p></div>`}
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
function mgSegAt(g,t){let c=0;for(const x of g.segs||[]){const len=x.len*1000;if(t>=c&&t<c+len)return x;c+=len}return null}
function mgLanePlan(g){
  const out=mgLanePlan0(g).sort((a,b)=>a.t-b.t||a.l-b.l),next={};
  for(let i=out.length-1;i>=0;i--){const n=out[i];n.len=n.len||0;n.gap=next[n.l]!=null?next[n.l]-n.t-n.len:1e9;next[n.l]=n.t}
  return out}
function mgLanePlan0(g){
  if(g._mix||(g.chart&&g.chart.length)){const out=[];for(const n of g.chart){const x=mgSegAt(g,n.t);if(x&&x.kind==='cut')continue;out.push({t:n.t,len:n.len||0,l:Math.min(n.l,g.lanes-1),dir:(x&&x.dir)||g.dir,fall:(x&&x.fall)||g.fall,cz:(x&&x.cz)||''})}return out}
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
function mgLandscape(on){/* phones: full screen + try to lock sideways (the layout is the same, pads stay at the bottom) */
  try{if(!(window.matchMedia&&matchMedia('(pointer:coarse)').matches))return;
    if(on){const d=document.documentElement,p=d.requestFullscreen?d.requestFullscreen():null;Promise.resolve(p).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')).catch(()=>{})}
    else{if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}}catch(e){}}
function mgRotCheck(el){const b=el.querySelector('.mgrot');if(!b)return;b.hidden=!(window.matchMedia&&matchMedia('(pointer:coarse)').matches&&innerHeight>innerWidth)}
/* stage events (shake, lane fades, flip, pulse, sway, flash, spin, tilt, fog) for every game type — a pure function of the game time */
function mgFxMake(el,g,mode){
  const EV=(g.events||[]).slice().sort((a,b)=>a.t-b.t),q=s=>el.querySelector(s);
  const tg=(mode==='lane'?[q('.mglanes')]:mode==='timing'?[q('.mgrds')]:[q('.mgprog')]).filter(Boolean);
  if(!EV.length||!tg.length)return{tick(){},reset(){}};
  const units=mode==='lane'?[...el.querySelectorAll('.mglane')]:null,base=.9,beat=60000/(g.bpm||100);
  const HL=units?units.map((_,l)=>EV.filter(e=>(e.type==='hide'||e.type==='show')&&e.l===l)):[EV.filter(e=>e.type==='hide'||e.type==='show')];
  const host=tg[0];if(getComputedStyle(host).position==='static')host.style.position='relative';
  const mk=c=>{let d=host.querySelector('.'+c);if(!d){d=document.createElement('div');d.className=c;host.appendChild(d)}return d},fl=mk('mgflash'),fg=mk('mgfog');
  const lastO=[],cl=v=>v<0?0:v>1?1:v;let lastTf='',lastHf=1;
  const reset=()=>{tg.forEach(e=>{e.style.transform='';e.style.removeProperty('--fo')});tg[0].style.setProperty('--hf',1);fl.style.opacity=0;fg.style.opacity=0;(units||[]).forEach(e=>e.style.opacity='');lastO.length=0;lastTf='';lastHf=1};
  const opac=(list,T)=>{let v0=1,t0=-1e9,tgt=1,len=1;
    for(const e of list){if(e.t>T)break;v0=v0+(tgt-v0)*cl((e.t-t0)/len);t0=e.t;tgt=e.type==='hide'?0:1;len=Math.max(200,e.len)}
    return v0+(tgt-v0)*cl((T-t0)/len)};
  function tick(T){
    let sx=0,sy=0,sc=1,f=0,fa=0,rot=0,fog=0,fp=.5;
    for(const e of EV){if(e.t>T)break;const dt=T-e.t;if(dt>=Math.max(e.len,1))continue;const v=e.v||3;
      if(e.type==='shake'){sx+=(Math.random()-.5)*3*v;sy+=(Math.random()-.5)*3*v}
      else if(e.type==='flip'){if(mode!=='timing')f=Math.max(f,cl(Math.min(dt/400,(e.len-dt)/400)))}
      else if(e.type==='pulse'){const ph=(dt/beat)%1;sc=Math.max(sc,1+.02*v*Math.pow(1-ph,3))}
      else if(e.type==='sway')sx+=Math.sin(dt/beat*Math.PI)*v*5;
      else if(e.type==='flash'){const ph=(dt/beat)%1;fa=Math.max(fa,.12*v/3*Math.pow(1-ph,2))}
      else if(e.type==='spin'){const x=cl(dt/Math.max(e.len,1));rot+=360*x*x*(3-2*x)*(v>3?-1:1)}
      else if(e.type==='tilt')rot+=Math.sin(dt/beat*Math.PI)*v*2;
      else if(e.type==='fog'){const r=cl(Math.min(dt/500,(e.len-dt)/500));if(r>fog){fog=r;fp=.2+v*.1}}}
    const tf=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)}) scaleY(${(1-2*f).toFixed(3)})`;
    if(tf!==lastTf){tg.forEach(e=>{e.style.transform=tf});lastTf=tf}
    const hf=f>.5?-1:1;if(hf!==lastHf){tg[0].style.setProperty('--hf',hf);lastHf=hf}
    fl.style.opacity=fa.toFixed(3);fg.style.opacity=fog.toFixed(2);if(fog>0)fg.style.setProperty('--fp',(fp*100)+'%');
    if(units){for(let l=0;l<units.length;l++){const list=HL[l];if(!list.length)continue;
      const o=opac(list,T),k=Math.round(o*50);if(lastO[l]!==k){lastO[l]=k;units[l].style.opacity=(o*base).toFixed(2)}}}
    else if(HL[0].length){const o=opac(HL[0],T),k=Math.round(o*50);if(lastO[0]!==k){lastO[0]=k;tg.forEach(e=>e.style.setProperty('--fo',o.toFixed(2)))}}}
  return{tick,reset}}
Object.assign(TX.th,{mgRows:'จำนวนแถวคนไข้ (1–3)',mgRowsH:'หลายแถวพร้อมกัน: ในตัวแก้โน้ต แต่ละคอลัมน์ = 1 แถว ใช้ปุ่มเดียวกดทุกแถว',mgPs:'รูปพัลส์',mgPs0:'คลื่นหัวใจ',mgPs1:'วงกลม',mgPs2:'โน้ตเพลง',mgPs3:'ดาว',mgPs4:'ลูกศร',mgType_mix:'ผสมหลายแบบในเพลงเดียว',mgMixHint:'เพลงเดียวสลับได้ทั้ง เลนโน้ต / Rhythm Doctor / กดรัว: ในตัวแก้โน้ตวาง Event "เปลี่ยนเป็น…" ตรงจุดที่จะเปลี่ยน แล้วเลือกท่าเปลี่ยนฉาก',mgBpmH:'ใช้กับการนับถอยหลังตามจังหวะและเส้นพัลส์ด้วย',mgBrk:'ช่วงเงียบนานเท่าไรถึงเรียก Break (วินาที)',mgBrkH:'0 = ปิด; หลัง Break จะนับถอยหลังตามจังหวะก่อนโน้ตใหม่',mgRn:'จำนวนพัลส์ต่อ 1 ครั้งที่ต้องกด',mgRnH:'พัลส์นำ 1 ตัวต่อ 1 จังหวะ ตัวสุดท้ายคือตัวที่ต้องกด (Rhythm Doctor ใช้ 7)',mgRoundsH:'ใช้เมื่อไม่ได้วางจุดกดเอง',mgImgChar:'ตัวละคร (ซ้าย)',mgImgHeart:'เป้าหมาย / หัวใจ (ขวา)',mgBreak:'BREAK',mgTapGo:'กด!',mgSecChart:'โน้ต / Event ที่วางเอง',mgChartHint_timing:'วางจังหวะที่ต้องกด: พัลส์นำจะวิ่งเข้ามาเองก่อนถึงจังหวะนั้น (ถ้าไม่วางเลย จะสร้างจาก BPM และจำนวนรอบ)',mgChartHint_mix:'วางโน้ตตามปกติ แล้ววาง Event "เปลี่ยนเป็น…" ในคอลัมน์ Event เพื่อเปลี่ยนวิธีเล่น: ช่วงเลนโน้ตใช้เลนตามคอลัมน์ ช่วง Rhythm Doctor ใช้ทุกโน้ตเป็นจังหวะกด ช่วงกดรัวใช้โน้ตยาวเป็นช่วงรัว',mgChartHint_simon:'วางลำดับปุ่มตามเวลาจากบนลงล่าง: ด่านที่ 1 ใช้ตัวแรกตามความยาวเริ่มต้น แล้วเพิ่มทีละตัว (ถ้าไม่วาง จะสุ่มลำดับ)',mgChartHint_tap:'วางช่วงรัวกดเป็นแท่งยาว: ต้องกดให้ถึงเป้าหมายภายในช่วงนั้น (ถ้าไม่วาง จะใช้เวลา/เป้าหมายด้านบน)',mgRotate:'หมุนมือถือเป็นแนวนอนเพื่อเล่น',mgShape:'รูปแบบโน้ต',mgSh_bar:'แท่ง',mgSh_arrow:'ลูกศร',mgSh_circle:'วงกลม',mgSh_diamond:'เพชร',mgSh_star:'ดาว',mgSh_img:'ภาพของฉัน',mgCd:'นับถอยหลังก่อนเริ่ม (จังหวะ)',mgCdH:'0 = ไม่นับ',mgImgs:'ภาพโน้ตแต่ละเลน',mgImgsH:'เลือกภาพให้แต่ละเลน (เลนที่ไม่มีภาพจะใช้ภาพของเลนแรก; ไม่มีเลยจะใช้ลูกศร) — ภาพจะถูกย่อให้อัตโนมัติ',mgImgPick:'เลือกภาพ',mgSecRhythm:'จังหวะและกติกา',mgSecNotes:'โน้ต',mgSecPen:'เมื่อพลาด / วิธีเล่น',mgSecCol:'สี',mgChartL:'โน้ตแบบวาดเอง',mgChartEdit:'เปิดตัวแก้โน้ต (กริด)',mgChartClear:'ล้างโน้ต',mgChartN:'วางไว้ {n} ตัว — ใช้แทนรูปแบบตัวเลข/สุ่ม',mgChartNone:'ยังไม่มี (ใช้รูปแบบตัวเลข/สุ่มด้านล่าง)',mgTimeline:'ไทม์ไลน์',mgTimelineH:'แบ่งเกมเป็นช่วง ๆ ตามลำดับ ช่วงเล่นปรับ BPM/ทิศทาง/สี/ปุ่มได้ ช่วงคัตซีนไม่มีโน้ต คลิปเล่นต่อ ช่องว่าง = ใช้ค่าของเกม',mgNoSeg:'ยังไม่มีช่วง (ใช้ค่าของเกมทั้งเกม)',mgTotal:'ความยาวรวม',mgPlaySeg:'ช่วงเล่น',mgCutSeg:'คัตซีน',mgLen:'ยาว',mgCancel:'ยกเลิก',mgTypeL:'ประเภทเกม',mgNotes:'จำนวนโน้ต',mgLanes:'จำนวนเลน',mgSub:'โน้ตต่อบีต',mgSubH:'1 = ทุกบีต 2 = ครึ่งบีต',mgFall:'เวลาตกถึงเส้น (ms)',mgFallH:'น้อย = โน้ตเร็ว',mgDir:'ทิศทางโน้ต',mgDown:'ตกลงมา',mgUp:'ขึ้นไป',mgPat:'รูปแบบโน้ต',mgPatH:'เลขเลน เช่น 1 2 3 4 3 2 (0 = เว้น) ว่าง = สุ่ม (คงที่ทุกครั้ง)',mgKeys:'ปุ่มแต่ละเลน',mgKeysH:'คั่นด้วยเว้นวรรค เช่น d f j k',mgTitle:'เกมจังหวะ',mgNew:'+ เกมใหม่',mgTest:'ทดลองเล่น',mgNone:'ยังไม่มีเกม กด "เกมใหม่" เพื่อสร้าง',mgType_timing:'แถบจังหวะ',mgType_lane:'เลนโน้ต',mgType_simon:'Simon',mgType_tap:'กดรัว',mgRounds:'รอบ',mgEdit:'ตั้งค่าเกม',mgName:'ชื่อเกม',mgMedia:'วิดีโอ/เสียงพื้นหลัง',mgNoMedia:'ไม่ใช้ (ใช้นับเวลาเอง)',mgOffset:'Offset (มิลลิวินาที)',mgOffsetH:'เวลาที่เกมเริ่มนับจังหวะแรก นับจากเริ่มคลิป',mgBeats:'จำนวนบีตต่อ 1 รอบ',mgBeatsH:'ยิ่งมาก แถบยิ่งวิ่งช้า',mgZone:'ตำแหน่งโซน (%)',mgZoneH:'0 = ซ้ายสุด 100 = ขวาสุด',mgZw:'ความกว้างโซน (%)',mgKey:'ปุ่มกด',mgKeyPh:'เว้นว่าง = Space',mgKeyH:'ปุ่มบนแป้นพิมพ์ ป้ายบนปุ่มจอสัมผัสด้วย',mgDmg:'ดาเมจต่อการพลาด 1 ครั้ง',mgDmgH:'เช่น 3 หรือ 1d6 หรือ 2d4+1 (ว่าง = ไม่มี)',mgDmgMode:'การหักเลือด',mgConfirm:'เสนอให้ GM ยืนยัน',mgAuto:'หักอัตโนมัติ',mgPlayMode:'วิธีเล่น',mgAll:'ทุกคนพร้อมกัน',mgOne:'ทีละคน',mgc_bar:'สีแถบ',mgc_zone:'สีโซน / โน้ต',mgc_perfect:'สีจุดเป๊ะ / เส้นตี',mgc_marker:'สีตัวชี้',mgNeedName:'ใส่ชื่อเกมก่อน',mgFail:'บันทึกไม่สำเร็จ',mgDelAsk:'ลบเกมนี้?',mgStart:'เริ่ม',mgCal:'ชดเชยหน่วงของเครื่อง',mgPerfect:'เป๊ะ!',mgHit:'โดน',mgMiss:'พลาด',mgDone:'จบเกม',mgAgain:'เล่นอีกครั้ง',mgDmgTaken:'ได้รับดาเมจ {n} ({d} ต่อครั้งที่พลาด)',mgNoDmg:'ไม่พลาดเลย ไม่เสียเลือด'});
Object.assign(TX.en,{mgRows:'Patient rows (1-3)',mgRowsH:'Several rows at once: in the note editor each column = one row; one button hits them all',mgPs:'Pulse shape',mgPs0:'Heartbeat',mgPs1:'Dot',mgPs2:'Music note',mgPs3:'Star',mgPs4:'Arrow',mgType_mix:'Mix several styles in one song',mgMixHint:'One song can switch between note lanes / Rhythm Doctor / rapid tap: in the note editor place a "switch to…" Event where it should change, and pick the scene transition.',mgBpmH:'Also drives the beat count-in and the pulse line',mgBrk:'Quiet gap that counts as a Break (seconds)',mgBrkH:'0 = off; after a Break the new notes are counted in on the beat',mgRn:'Pulses per hit',mgRnH:'One lead-in pulse per beat; the last one is the one to hit (Rhythm Doctor uses 7)',mgRoundsH:'Used when you do not place the hits yourself',mgImgChar:'Character (left)',mgImgHeart:'Target / heart (right)',mgBreak:'BREAK',mgTapGo:'Tap!',mgSecChart:'Hand-placed notes / events',mgChartHint_timing:'Place the beats to hit: lead-in pulses run in by themselves before each one (none placed = built from BPM and rounds)',mgChartHint_mix:'Place notes as usual, then place "switch to…" Events in the Event columns to change how it plays: lane sections use the lane columns, Rhythm-Doctor sections treat every note as a beat to hit, rapid-tap sections use long notes as the mash windows.',mgChartHint_simon:'Place the pad order by time, top to bottom: level 1 uses the first notes (starting length), each level adds one (none placed = random).',mgChartHint_tap:'Place mash windows as long bars: reach the target taps inside each window (none placed = use the time/target above).',mgRotate:'Rotate your phone to landscape to play',mgShape:'Note style',mgSh_bar:'Bar',mgSh_arrow:'Arrow',mgSh_circle:'Circle',mgSh_diamond:'Diamond',mgSh_star:'Star',mgSh_img:'My pictures',mgCd:'Count-in before start (beats)',mgCdH:'0 = none',mgImgs:'Note picture per lane',mgImgsH:'Pick a picture per lane (a lane without one uses lane 1\'s; none at all falls back to arrows). Pictures are resized automatically.',mgImgPick:'Choose picture',mgSecRhythm:'Rhythm and rules',mgSecNotes:'Notes',mgSecPen:'On a miss / play mode',mgSecCol:'Colours',mgChartL:'Hand-placed notes',mgChartEdit:'Open note editor (grid)',mgChartClear:'Clear notes',mgChartN:'{n} notes placed — used instead of the number pattern / random',mgChartNone:'None yet (the number pattern / random below is used)',mgTimeline:'Timeline',mgTimelineH:'Split the game into stretches in order. A play stretch can change BPM / direction / colour / button; a cutscene has no notes and the clip just plays. Empty = the game value',mgNoSeg:'No stretches (the game settings apply to the whole game)',mgTotal:'Total length',mgPlaySeg:'Play',mgCutSeg:'Cutscene',mgLen:'Length',mgCancel:'Cancel',mgTypeL:'Game type',mgNotes:'Number of notes',mgLanes:'Lanes',mgSub:'Notes per beat',mgSubH:'1 = every beat, 2 = half beat',mgFall:'Fall time to line (ms)',mgFallH:'Lower = faster notes',mgDir:'Note direction',mgDown:'Falling',mgUp:'Rising',mgPat:'Note pattern',mgPatH:'Lane numbers, e.g. 1 2 3 4 3 2 (0 = rest). Empty = random (same every time)',mgKeys:'Key per lane',mgKeysH:'Separated by spaces, e.g. d f j k',mgTitle:'Rhythm games',mgNew:'+ New game',mgTest:'Test play',mgNone:'No games yet. Press "New game" to make one.',mgType_timing:'Timing bar',mgType_lane:'Note lanes',mgType_simon:'Simon',mgType_tap:'Rapid tap',mgRounds:'rounds',mgEdit:'Game settings',mgName:'Game name',mgMedia:'Background video / audio',mgNoMedia:'None (own timer)',mgOffset:'Offset (ms)',mgOffsetH:'When the first beat starts, counted from the clip start',mgBeats:'Beats per sweep',mgBeatsH:'More beats = slower bar',mgZone:'Zone position (%)',mgZoneH:'0 = far left, 100 = far right',mgZw:'Zone width (%)',mgKey:'Button',mgKeyPh:'empty = Space',mgKeyH:'Keyboard key; also the label on the touch button',mgDmg:'Damage per miss',mgDmgH:'e.g. 3 or 1d6 or 2d4+1 (empty = none)',mgDmgMode:'HP loss',mgConfirm:'Propose to GM to confirm',mgAuto:'Apply automatically',mgPlayMode:'Play mode',mgAll:'Everyone together',mgOne:'One at a time',mgc_bar:'Bar colour',mgc_zone:'Zone / note colour',mgc_perfect:'Perfect spot',mgc_marker:'Marker',mgNeedName:'Enter a game name first',mgFail:'Could not save',mgDelAsk:'Delete this game?',mgStart:'Start',mgCal:'Device delay offset',mgPerfect:'Perfect!',mgHit:'Hit',mgMiss:'Miss',mgDone:'Game over',mgAgain:'Play again',mgDmgTaken:'Took {n} damage ({d} per miss)',mgNoDmg:'No misses, no damage'});
