/* ---------- the play screen ----------
   One song can mix three ways of playing: note lanes ("lane"), a Rhythm-Doctor style pulse line ("timing") and rapid tap ("tap").
   A game of type lane/timing/tap uses one way for the whole song; type "mix" switches ways at the m_lane / m_timing / m_tap events. */
let _mgAC=null;
function mgBeep(f,d){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;_mgAC=_mgAC||new A();const o=_mgAC.createOscillator(),gn=_mgAC.createGain(),n=_mgAC.currentTime;o.frequency.value=f;gn.gain.setValueAtTime(.09,n);gn.gain.exponentialRampToValueAtTime(.0001,n+(d||.09));o.connect(gn);gn.connect(_mgAC.destination);o.start(n);o.stop(n+(d||.09)+.02)}catch(e){}}
function mgModes(g){
  if(g.type!=='mix')return[{t:-1e9,mode:g.type,tr:1}];
  const ev=(g.events||[]).filter(e=>/^m_(lane|timing|tap)$/.test(e.type)).sort((a,b)=>a.t-b.t).map(e=>({t:e.t,mode:e.type.slice(2),tr:e.v||1}));
  if(!ev.length)return[{t:-1e9,mode:'lane',tr:1}];
  if(ev[0].t<=0)ev[0]={...ev[0],t:-1e9};else ev.unshift({t:-1e9,mode:'lane',tr:1});
  return ev}
/* Rhythm-Doctor style: before every hit, (n-1) lead-in pulses cross the line one per beat; the n-th is the one to hit. */
function mgRdPlan(g,times){
  const beat=60000/Math.max(30,g.bpm),n=Math.max(2,Math.min(8,g.rn||4)),R=Math.max(1,Math.min(3,g.rows||1));
  let hits=times?times.map(x=>typeof x==='number'?{t:x,r:0}:{t:x.t,r:(x.r||0)%R}).sort((a,b)=>a.t-b.t):[];
  if(!times)for(let i=0;i<g.rounds;i++)hits.push({t:Math.round(1200+(n-1)*beat+i*(n+1)*beat),r:i%R});
  const H=[];for(const h of hits){if(H.length&&h.t-H[H.length-1].t<beat*.5)continue;H.push(h)}
  const map=new Map();
  H.forEach(h=>{for(let j=0;j<n;j++){const tp=h.t-(n-1-j)*beat,k=Math.round(tp/25)*4+h.r,last=j===n-1,o=map.get(k);if(!o||last)map.set(k,{t:tp,hit:last,r:h.r,done:false})}});
  return{hits:H.map(h=>({t:h.t,r:h.r})),pulses:[...map.values()].sort((a,b)=>a.t-b.t),n,beat,R}}
function mgPlans(g){
  const modes=mgModes(g),mix=g.type==='mix',beat=60000/Math.max(30,g.bpm);
  const modeAt=t=>{let m=modes[0].mode;for(const x of modes){if(x.t<=t)m=x.mode;else break}return m};
  const ch=(g.chart||[]).slice().sort((a,b)=>a.t-b.t||a.l-b.l),has=m=>modes.some(x=>x.mode===m);
  let laneNotes=[],rd=null,wins=[];
  if(has('lane'))laneNotes=mgLanePlan(mix?{...g,_mix:true,chart:ch.filter(n=>modeAt(n.t)==='lane')}:g);
  if(has('timing')){const c=mix?ch.filter(n=>modeAt(n.t)==='timing'):ch;rd=mgRdPlan(g,c.length||mix?c.map(n=>({t:n.t,r:n.l})):null)}
  if(has('tap')){const c=mix?ch.filter(n=>modeAt(n.t)==='tap'):ch;wins=c.length?c.map(n=>({t:n.t,len:n.len>0?n.len:Math.round(4*beat)})):(mix?[]:[{t:1500,len:Math.max(3,g.dur)*1000}])}
  const hits=rd?rd.hits:[],pulses=rd?rd.pulses:[];
  /* when each section starts showing: a little before its first thing appears */
  const secOf=t=>{let i=0;modes.forEach((x,k)=>{if(x.t<=t)i=k});return i},first=modes.map(()=>1e12);
  laneNotes.forEach(n=>{const i=secOf(n.t);first[i]=Math.min(first[i],n.t-n.fall)});
  pulses.forEach(p=>{const i=secOf(p.t);first[i]=Math.min(first[i],p.t-2*beat)});
  wins.forEach(w=>{const i=secOf(w.t);first[i]=Math.min(first[i],w.t)});
  modes.forEach((x,i)=>{x.ts=i===0?-1e9:Math.min(x.t,first[i]-500);if(i>0&&x.ts<=modes[i-1].ts)x.ts=modes[i-1].ts+1});
  /* quiet stretches: from the end of one thing to the start of the next */
  const act=[];
  laneNotes.forEach(n=>act.push({s:n.t,e:n.t+n.len,m:'lane'}));
  hits.forEach(h=>act.push({s:h.t-(rd.n-1)*beat,e:h.t,m:'timing'}));
  wins.forEach(w=>act.push({s:w.t,e:w.t+w.len,m:'tap'}));
  act.sort((a,b)=>a.s-b.s);
  const breaks=[],bs=(g.brk||0)*1000,cdn=g.cd||0;let mx=-1e9;
  act.forEach((a,i)=>{if(i&&bs>0&&a.s-mx>=bs&&a.s-mx>(cdn+2)*beat)breaks.push({a:mx,b:a.s,m:a.m});mx=Math.max(mx,a.e)});
  const lastEnd=act.reduce((m,a)=>Math.max(m,a.e),0);
  return{modes,laneNotes,hits,pulses,rd,wins,breaks,lastEnd,beat}}

function mgPlay(g,cb,opt){
  opt=opt||{};const watch=!!opt.watch;
  if(!g||(MGP&&!watch))return;
  if(g.type==='simon')g={...g,type:'lane'};
  const it=watch?null:mgMi(g),isV=it&&it.type.startsWith('video'),beep=watch?()=>{}:mgBeep;
  const P=mgPlans(g),modes=P.modes,notes=P.laneNotes,hits=P.hits,pulses=P.pulses,wins=P.wins,beat=P.beat,cdn=g.cd||0;
  const mset=new Set(modes.map(x=>x.mode)),useL=mset.has('lane'),useR=mset.has('timing'),useT=mset.has('tap');
  const col=g.col,key=(g.key||'').trim(),keyLab=key.split(/\s+/)[0]||'●',keys=mgKeys(g),WIN=150,PERF=60;
  const total=notes.length+hits.length+wins.length;
  const el=document.createElement('div');el.id=watch?'':'mgPlay';el.className='mgplay'+(watch?' mini':'');
  const imgOf=i=>(g.nimgs&&g.nimgs[i])||'';
  const charH=imgOf(8)?`<img src="${esc(imgOf(8))}" alt="">`:'<span>🧑‍⚕️</span>';
  const heartH=imgOf(9)?`<img src="${esc(imgOf(9))}" alt="">`:`<svg viewBox="0 0 24 22" aria-hidden="true"><path fill="currentColor" d="M12 21C5 15.5 1 12 1 7.2 1 4 3.5 2 6.2 2c2.3 0 4.2 1.3 5.8 3.6C13.6 3.3 15.5 2 17.8 2 20.5 2 23 4 23 7.2 23 12 19 15.5 12 21z"/></svg>`;
  const viewL=`<div class="mgv v-lane"><div class="mglanes" style="--n:${g.lanes}">${keys.map(()=>`<div class="mglane" style="background:${col.bar}"></div>`).join('')}<div class="mgline" style="background:${col.perfect};${g.dir==='up'?'top':'bottom'}:0"></div></div>
   <div class="mgpads" style="--n:${g.lanes}">${keys.map((k,i)=>`<button class="mgpad" data-l="${i}" style="background:${col.zone}">${g.ns==='arrow'?['←','↓','↑','→'][i%4]+' ':''}${esc(k.toUpperCase())}</button>`).join('')}</div></div>`;
  const RR=Math.max(1,Math.min(3,g.rows||1)),rcol=['',"#f472b6","#34d399"],PS=[
   '<path d="M1 22H9L12 7L17 37L20.5 15L22.5 22H29" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
   '<circle cx="15" cy="22" r="11" fill="currentColor"/>',
   '<path d="M20 7v20.5a6.2 6.2 0 1 1-3-5.3V12.5l-8 2V9.5z" fill="currentColor" transform="translate(-1 3)"/>',
   '<path d="M15 5l3.2 10.6L29 16l-8.6 6.6L23.4 34 15 27.6 6.6 34l3-11.4L1 16l10.8-.4z" fill="currentColor"/>',
   '<path d="M3 22h20M15 11l12 11-12 11" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'],
   pulseSvg=`<svg viewBox="0 0 30 44" aria-hidden="true">${PS[Math.max(0,Math.min(4,Number(g.ps)||0))]}</svg>`;
  const rowH=r=>`<div class="mgrd" data-r="${r}" style="--lc:${col.marker};--rc:${r?rcol[r]:col.zone};--pc:${col.perfect}"><div class="mgrdc">${charH}</div><div class="mgrdline"><i></i><svg class="mgrdw" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg></div><div class="mgrdh">${heartH}<em class="mgrdx"></em></div></div>`;
  const viewR=`<div class="mgv v-timing"><div class="mgrds r${RR}">${Array.from({length:RR},(_,r)=>rowH(r)).join('')}<div class="mgcombo" aria-hidden="true"></div></div>
   <button class="mgtap" style="background:${col.zone}">${esc(keyLab)}</button></div>`;
  const viewT=`<div class="mgv v-tap"><div class="mgprog idle" style="background:${col.bar}"><i style="background:${col.zone}"></i><span class="mgprogn">0 / ${g.goal}</span></div>
   <button class="mgtap" style="background:${col.zone}">${esc(keyLab)}</button></div>`;
  el.innerHTML=`${isV?`<video class="mgvid" playsinline preload="auto" src="${esc(it.url)}"></video>`:''}
   <button class="mgx" aria-label="${t('close')}">✕</button>
   <div class="mghud"><b>${esc(watch?(opt.who||g.name):g.name)}</b><span class="mgsc"></span></div>
   <div class="mgrot" hidden>↻ ${t('mgRotate')}</div>
   <div class="mgvig"></div><div class="mgmid"><div class="mgfb" aria-live="polite"></div></div>
   <div class="mgcount"></div><div class="mgbrk">♪ ${t('mgBreak')}</div>
   <div class="mgviews" data-tr="1">${useL?viewL:''}${useR?viewR:''}${useT?viewT:''}</div>
   <div class="mgstart"><button class="btn primary big">${t('mgStart')}</button><div class="mgcal">${t('mgCal')}: <button class="btn small" data-c="-10">−</button> <b>${mgCal()}</b> ms <button class="btn small" data-c="10">+</button></div></div>
   <div class="mgres" hidden></div>`;
  (watch&&opt.host||document.body).appendChild(el);
  const media=isV?el.querySelector('video'):(it?new Audio(it.url):null);
  const $q=s=>el.querySelector(s),views={lane:$q('.v-lane'),timing:$q('.v-timing'),tap:$q('.v-tap')},vwrap=$q('.mgviews');
  const S={phase:'ready',res:[],resR:[],resT:[],t0:0,raf:0,H:0,holds:new Set(),holdL:{},mi:0,view:null,mode:null,bi:0,ctxt:'',taps:0,ti:0,rh:0,pi:0};
  if(!watch)MGP=S;
  const W=watch?{snap:null,last:-1e9,DELAY:900}:null;
  let liveAt=0;const liveSend=(ph)=>{if(!opt.live)return;const str=(a,n)=>{let o='';for(let i=0;i<n;i++)o+=a[i]||'.';return o};opt.live({ph,T:Math.round(S.lastT||0),r:str(S.res,notes.length),rr:str(S.resR,hits.length),rt:str(S.resT,wins.length),tp:S.taps||0})};
  const FX=['lane','timing','tap'].filter(m=>mset.has(m)).map(m=>mgFxMake(el,g,m));
  /* lane notes */
  let noteEls=[];
  if(useL){const lanes=el.querySelectorAll('.mglane');noteEls=notes.map(n=>{const d=document.createElement('div');d.className='mgnote';d.style.color=n.cz||col.zone;d.style.display='none';
    d.style.flexDirection=n.dir==='up'?'column':'column-reverse';
    d.innerHTML=`<div class="mgnh ${mgShapeOf(g,n.l)}">${mgHeadInner(g,n.l)}</div>${n.len>0?'<div class="mgnt"></div>':''}`;
    lanes[n.l].appendChild(d);return d})}
  const pEl=[];
  const clock=()=>media&&!media.paused?media.currentTime*1000:performance.now()-S.t0;
  const lead=Math.max(g.cd>0?0:3000,useL?g.fall+200:0,useR?(P.rd.n*beat+300):0,600);
  const offs=()=>(media?g.offset:Math.max(g.offset,lead))+mgCal();
  function say(txt,c){const f=$q('.mgfb');f.textContent=txt;f.style.color=c;f.classList.remove('pop','out');void f.offsetWidth;f.classList.add('pop');clearTimeout(S.fbT);S.fbT=setTimeout(()=>f.classList.add('out'),650)}
  function setCount(txt){if(S.ctxt===txt)return;S.ctxt=txt;const c=$q('.mgcount');c.textContent=txt;if(txt){c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop')}}
  const all=()=>[...S.res,...S.resR,...S.resT];
  function counts(){const r=all();return{p:r.filter(x=>x==='p').length,h:r.filter(x=>x==='h').length,m:r.filter(x=>x==='m').length}}
  function hud(){const c=counts();$q('.mgsc').textContent=`✦${c.p}  ✔${c.h}  ✘${c.m}  /${total}`}
  const vcol=v=>v==='p'?col.perfect:v==='h'?col.zone:'#ef4444',vtxt=v=>v==='p'?t('mgPerfect'):v==='h'?t('mgHit'):t('mgMiss');
  function vig(){const e=$q('.mgvig');e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
  function resolve(arr,k,v,extra){if(arr[k]!=null)return;arr[k]=v;if(v==='m')vig();hud();say(vtxt(v)+(extra||''),vcol(v))}
  function resolveL(k,v){if(S.res[k]!=null)return;S.res[k]=v;if(v==='m')vig();hud();if(noteEls[k]&&!(v!=='m'&&notes[k].len>0))noteEls[k].style.display='none';say(vtxt(v),vcol(v))}
  function finish(){
    if(S.phase==='done')return;if(watch)applySnap(1e9);S.holds.clear();S.phase='done';cancelAnimationFrame(S.raf);clearTimeout(S.cdT);if(media)media.pause();setCount('');$q('.mgbrk').classList.remove('on');
    for(let k=0;k<notes.length;k++)if(S.res[k]==null)S.res[k]='m';
    for(let k=0;k<hits.length;k++)if(S.resR[k]==null)S.resR[k]='m';
    for(let k=0;k<wins.length;k++)if(S.resT[k]==null)S.resT[k]='m';
    const c=counts();
    if(watch){const r=$q('.mgres');r.hidden=false;r.innerHTML=`<p>✦${c.p} ✔${c.h} ✘${c.m}</p>`;opt.ended&&opt.ended();return}
    const dmg=mgRollDmg(g.dmg,c.m);S.out={perfect:c.p,hit:c.h,miss:c.m,dmg};if(cb)cb(S.out);if(opt.live)liveSend('done');
    const r=$q('.mgres');r.hidden=false;
    r.innerHTML=`<h2>${t('mgDone')}</h2><p>✦ ${t('mgPerfect')} ${c.p} · ✔ ${t('mgHit')} ${c.h} · ✘ ${t('mgMiss')} ${c.m}</p>${g.dmg?`<p class="mgdmg">${c.m?t('mgDmgTaken').replace('{n}',dmg).replace('{d}',g.dmg):t('mgNoDmg')}</p>`:''}<div class="mgbtns">${cb?'':`<button class="btn primary" data-r="again">${t('mgAgain')}</button>`}<button class="btn" data-r="close">${t('close')}</button></div>`}
  /* views and the change from one to another */
  function measure(){if(views.lane&&views.lane.classList.contains('on')){S.H=$q('.mglanes').clientHeight;S.LW=$q('.mglane').clientWidth;S.NHS=Math.max(24,Math.min(S.LW*.84,S.H*.2))}}
  function showView(mode,tr){
    const nv=views[mode];if(!nv)return;const cur=S.view&&views[S.view];
    if(cur&&cur!==nv){vwrap.dataset.tr=String(tr||1);cur.classList.remove('on','enter');cur.classList.add('leave');setTimeout(()=>cur.classList.remove('leave'),750);nv.classList.add('on','enter');setTimeout(()=>nv.classList.remove('enter'),750)}
    else nv.classList.add('on');
    S.view=mode;S.mode=mode;measure()}
  /* lane notes */
  function laneTick(T){
    const sq=g.ns!=='bar',NHM=sq?S.NHS:Math.max(24,S.H*.08);
    for(let i=0;i<notes.length;i++){
      const n=notes[i],e=noteEls[i],ppm=(S.H-NHM)/n.fall;
      if(S.holds.has(i)){
        const rem=n.t+n.len-T;if(rem<=60){endHold(i,true);continue}
        const hn=sq?NHM:NHM*.6,h=hn+rem*ppm;e.style.setProperty('--nh',hn+'px');e.style.height=h+'px';e.style.transform=`translateY(${n.dir==='up'?0:S.H-h}px)`;continue}
      if(S.res[i]!=null)continue;const dt=n.t-T;
      if(-dt>WIN){resolveL(i,'m');continue}
      const p=1-dt/n.fall;
      if(p<0){e.style.display='none';continue}
      const NH=sq?NHM:Math.max(10,Math.min(NHM,n.gap/n.fall*(S.H-NHM)-4)),tail=n.len>0?n.len*ppm:0;e.style.display='flex';e.style.setProperty('--nh',NH+'px');e.style.height=(NH+tail)+'px';
      const y=n.dir==='up'?(1-p)*(S.H-NH):p*(S.H-NH)+NH-(NH+tail);e.style.transform=`translateY(${y}px)`}
    const nx=notes.find((n,i)=>S.res[i]==null),dr=nx?nx.dir:g.dir;
    if(S.dir!==dr){S.dir=dr;const ln=$q('.mgline');ln.style.top=dr==='up'?'0':'auto';ln.style.bottom=dr==='up'?'auto':'0'}}
  function endHold(i,done){
    if(!S.holds.has(i))return;const n=notes[i];S.holds.delete(i);delete S.holdL[n.l];
    const pad=el.querySelector('.mgpad[data-l="'+n.l+'"]');if(pad)pad.classList.remove('on');
    if(noteEls[i])noteEls[i].style.display='none';
    if(!done){S.res[i]='m';hud();say(t('mgMiss'),'#ef4444')}}
  function release(l){const i=S.holdL[l];if(i==null||S.phase!=='run')return;const n=notes[i],T=clock()-offs();endHold(i,T>=n.t+n.len-120)}
  /* the pulse line */
  /* Rhythm Doctor extras: events r_wave / r_ghost / r_ease / r_hop and flip(=sides swap), beat bounce, hit rings, combo */
  const REV=(g.events||[]).filter(e=>/^r_|^flip$/.test(e.type)).sort((a,b)=>a.t-b.t),rds=[...el.querySelectorAll('.mgrd')],rdv=$q('.mgrds');
  const rdState=T=>{const o={wave:0,ghost:0,ease:0,hop:0,rev:false};for(const e of REV){if(e.t>T)break;if(T-e.t>=Math.max(e.len,1))continue;const v=e.v||3;
    if(e.type==='flip')o.rev=true;else o[e.type.slice(2)]=v}return o};
  const wy=(xp,T,v)=>Math.sin(xp*12.566+T/220)*(4+v*3);
  let lastRev=false,lastBeat=-1;
  function rdTick(T){
    while(S.rh<hits.length&&(S.resR[S.rh]!=null||T-hits[S.rh].t>WIN)){if(S.resR[S.rh]==null){resolve(S.resR,S.rh,'m');rdFx(S.rh,'m')}S.rh++}
    const D=2*beat,st=rdState(T);
    if(st.rev!==lastRev){lastRev=st.rev;rdv.classList.toggle('rev',st.rev)}
    const bi=Math.floor(T/beat);if(bi!==lastBeat&&T>=0){lastBeat=bi;rds.forEach(r=>{const c=r.firstChild;c.classList.remove('bop');void c.offsetWidth;c.classList.add('bop')})}
    rds.forEach(r=>{const w=r.querySelector('.mgrdw'),i=r.querySelector('.mgrdline>i');
      if(st.wave){if(w.style.display!=='block'){w.style.display='block';i.style.opacity=0}
        let d='';for(let k=0;k<=40;k++){const xp=k/40;d+=(k?'L':'M')+(xp*100).toFixed(1)+' '+(20+wy(xp,T,st.wave)*.5).toFixed(2)+' '}w.firstChild.setAttribute('d',d)}
      else if(w.style.display==='block'){w.style.display='';i.style.opacity=''}});
    while(S.pi<pulses.length&&T>pulses[S.pi].t+260){if(pEl[S.pi]){pEl[S.pi].remove();pEl[S.pi]=null}S.pi++}
    for(let j=S.pi;j<pulses.length;j++){const p=pulses[j];if(p.t-D>T)break;
      let e=pEl[j];if(!e){e=document.createElement('div');e.className='mgp'+(p.hit?' hit':'');e.innerHTML=pulseSvg;rds[p.r||0].querySelector('.mgrdline').appendChild(e);pEl[j]=e}
      let x=(T-(p.t-D))/D;const xc=Math.max(0,Math.min(1.02,x)),xe=st.ease?Math.pow(xc,1+st.ease*.3):xc,xp=st.rev?1-xe:xe;
      e.style.left=(xp*100)+'%';
      let y=st.wave?wy(xp,T,st.wave):0;if(st.hop)y-=Math.abs(Math.sin(xe*Math.PI*3))*(6+st.hop*5);
      e.style.transform=y?`translateY(${y.toFixed(1)}px)`:'';
      let o=1;if(x>1)o=Math.max(0,1-(x-1)*5);
      if(st.ghost)o=Math.min(o,Math.max(p.hit?.14:.03,1-Math.max(0,(xc-.2)/(.8-.07*st.ghost))));
      e.style.opacity=o<1?o.toFixed(2):'';
      if(x>=1&&!p.done){p.done=true;const h=rds[p.r||0].querySelector('.mgrdh');h.classList.remove('beat','beat2');void h.offsetWidth;h.classList.add(p.hit?'beat2':'beat')}}}
  function rdFx(i,v){
    const r=hits[i]?hits[i].r||0:0,h=rds[r].querySelector('.mgrdh'),x=h.querySelector('.mgrdx');
    if(v==='m'){S.combo=0;h.classList.remove('crack');void h.offsetWidth;h.classList.add('crack');rdCombo();return}
    S.combo=(S.combo||0)+1;rdCombo();
    const ring=document.createElement('b');ring.className='mgring'+(v==='p'?' p':'');x.appendChild(ring);setTimeout(()=>ring.remove(),700);
    if(v==='p')for(let k=0;k<10;k++){const d=document.createElement('i');d.className='mgspark';d.style.setProperty('--a',(k*36+Math.random()*20)+'deg');d.style.setProperty('--d',(30+Math.random()*26)+'px');x.appendChild(d);setTimeout(()=>d.remove(),700)}}
  function rdCombo(){const c=$q('.mgcombo');if(!c)return;if((S.combo||0)>=3){c.textContent='×'+S.combo;c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop','on');c.style.setProperty('--k',Math.min(1,S.combo/20))}else c.classList.remove('on')}
  function rdPress(T){
    for(let i=S.rh;i<hits.length;i++){if(S.resR[i]!=null)continue;const d=T-hits[i].t;if(-d>WIN)break;
      if(Math.abs(d)<=WIN){const v=Math.abs(d)<=PERF?'p':'h';resolve(S.resR,i,v,`  ${d>0?'+':''}${Math.round(d)}ms`);rdFx(i,v);break}}}
  /* rapid tap */
  function progUpd(){const p=$q('.mgprog'),act=S.tact;p.classList.toggle('idle',!act);p.classList.toggle('done',S.taps>=g.goal);
    $q('.mgprogn').textContent=`${S.taps} / ${g.goal}`;p.firstChild.style.width=Math.min(100,S.taps/g.goal*100)+'%'}
  function tapTick(T){
    while(S.ti<wins.length&&T>=wins[S.ti].t+wins[S.ti].len){if(S.resT[S.ti]==null)resolve(S.resT,S.ti,'m');S.ti++;S.taps=0;S.tact=false;S.tann=-1;progUpd()}
    const w=wins[S.ti],on=!!(w&&T>=w.t);
    if(on!==!!S.tact){S.tact=on;progUpd()}
    if(on&&S.tann!==S.ti){S.tann=S.ti;say(t('mgTapGo'),col.perfect)}}
  function tapPress(){
    if(!S.tact)return;S.taps++;progUpd();
    if(S.taps===g.goal&&S.resT[S.ti]==null)resolve(S.resT,S.ti,'h')}
  /* quiet stretches: "BREAK", then 3 · 2 · 1 on the beat, landing on the first note */
  function breakTick(T){
    const bk=P.breaks;while(S.bi<bk.length&&T>=bk[S.bi].b+beat)S.bi++;
    const c=bk[S.bi],lab=$q('.mgbrk');
    if(!c||T<c.a+400){lab.classList.remove('on');return}
    const counting=cdn>0&&c.m!=='timing',k=Math.ceil((c.b-T)/beat-1e-6);
    if(T>=c.b){lab.classList.remove('on');if(counting&&T<c.b+beat*.9)setCount('GO!');else if(S.ctxt==='GO!')setCount('');return}
    if(counting&&k<=cdn){lab.classList.remove('on');if(S.ctxt!==String(k)){setCount(String(k));beep(k===1?660:520)}}
    else lab.classList.add('on')}
  function loop(){
    if(S.phase!=='run')return;
    const T=watch?W.T():clock()-offs();S.lastT=T;
    if(watch)applySnap(T);else if(opt.live&&performance.now()-liveAt>500){liveAt=performance.now();liveSend('run')}
    while(S.mi+1<modes.length&&T>=modes[S.mi+1].ts){S.mi++;showView(modes[S.mi].mode,modes[S.mi].tr)}
    FX.forEach(f=>f.tick(T));
    if(useL)laneTick(T);if(useR)rdTick(T);if(useT)tapTick(T);
    breakTick(T);
    if(T>P.lastEnd+400&&(watch||!S.holds.size)){finish();return}
    S.raf=requestAnimationFrame(loop)}
  function press(l){
    if(S.phase!=='run')return;const T=clock()-offs();
    if(S.mode==='lane'){
      const pad=el.querySelector('.mgpad[data-l="'+l+'"]');if(pad){pad.classList.add('on');setTimeout(()=>{if(S.holdL[l]==null)pad.classList.remove('on')},110)}
      /* one press = one note, and the earliest note still waiting in that lane goes first (close notes are never taken together) */
      for(let i=0;i<notes.length;i++){if(S.res[i]!=null||notes[i].l!==l)continue;const d=Math.abs(T-notes[i].t);
        if(notes[i].t-T>WIN)break;
        if(d<=WIN){resolveL(i,d<=PERF?'p':'h');if(notes[i].len>0){S.holds.add(i);S.holdL[l]=i;if(pad)pad.classList.add('on')}break}}}
    else if(S.mode==='timing')rdPress(T);
    else if(S.mode==='tap')tapPress()}
  function start(){
    FX.forEach(f=>f.reset());Object.assign(S,{res:[],resR:[],resT:[],mi:0,bi:0,ti:0,rh:0,pi:0,taps:0,tact:false,tann:-1,combo:0,dir:null,view:null,ctxt:''});S.holds.clear();S.holdL={};
    pulses.forEach(p=>p.done=false);pEl.forEach(e=>e&&e.remove());pEl.length=0;
    Object.values(views).forEach(v=>v&&v.classList.remove('on','enter','leave'));
    $q('.mgstart').hidden=true;$q('.mgres').hidden=true;$q('.mgbrk').classList.remove('on');
    showView(modes[0].mode,1);hud();if(useT)progUpd();
    mgLandscape(true);S.phase='count';liveSend('count');
    let k=cdn;const step=()=>{
      if(S.phase!=='count'||!el.isConnected)return;
      if(k<=0){setCount('GO!');beep(880,.16);begin();S.cdT=setTimeout(()=>{if(S.ctxt==='GO!')setCount('')},beat*.9);return}
      setCount(String(k));beep(k===1?660:520);liveSend('count');k--;S.cdT=setTimeout(step,beat)};
    step()}
  function begin(){
    S.phase='run';S.t0=performance.now();measure();
    if(media){try{media.currentTime=0;const p=media.play();if(p&&p.catch)p.catch(()=>{S.t0=performance.now()})}catch(e){}}
    S.raf=requestAnimationFrame(loop)}
  function close(){if(opt.live&&S.phase!=='done')liveSend('x');clearTimeout(S.cdT);clearTimeout(S.fbT);if(!watch)mgLandscape(false);window.removeEventListener('resize',rc);cancelAnimationFrame(S.raf);if(media){media.pause()}document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);window.removeEventListener('resize',rs);el.remove();if(!watch)MGP=null}
  const one=(key||' ').split(/\s+/)[0].toLowerCase();
  const kd=e=>{if(e.key==='Escape'){close();return}if(e.repeat)return;const k=e.key.toLowerCase();
    if(S.mode==='lane'){const l=keys.indexOf(k);if(l>=0){e.preventDefault();press(l)}return}
    if(k===' '||k===one||keys.includes(k)){e.preventDefault();press()}};
  const ku=e=>{if(S.mode==='lane'){const l=keys.indexOf(e.key.toLowerCase());if(l>=0)release(l)}};
  const rs=()=>{if(S.phase==='run')measure()};
  const rc=()=>mgRotCheck(el);
  if(!watch){window.addEventListener('resize',rc);rc();document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);window.addEventListener('resize',rs)}
  $q('.mgx').onclick=close;
  el.querySelectorAll('.mgpad').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}press(Number(b.dataset.l))});['pointerup','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>release(Number(b.dataset.l))))});
  el.querySelectorAll('.mgtap').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();press()}));
  $q('.mgstart .big').onclick=start;
  el.addEventListener('click',e=>{
    const c=e.target.closest('[data-c]');if(c){const v=mgCal()+Number(c.dataset.c);mgCal(v);c.parentNode.querySelector('b').textContent=mgCal();return}
    const r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='close')close();else{S.phase='ready';start()}});
  if(media&&media.addEventListener)media.addEventListener('ended',()=>{if(S.phase==='run')finish()});
  /* ---- watching somebody else play: the same game replays here, a little behind, driven by their snapshots ---- */
  if(watch){
    $q('.mgstart').hidden=true;$q('.mgres').hidden=true;
    W.T=()=>{const sn=W.snap;if(!sn)return -1e9;const e=sn.T+(performance.now()-sn.at)-W.DELAY;if(e>W.last||e<W.last-1500)W.last=e;return W.last};
    function applySnap(T){
      const sn=W.snap;if(!sn)return;
      for(let i=0;i<notes.length;i++){const v=sn.r[i];if(!v||v==='.'||S.res[i]!=null)continue;
        if(T>=notes[i].t-30&&(v!=='m'||T>=notes[i].t+WIN-30)){resolveL(i,v);if(v!=='m'&&notes[i].len>0)S.holds.add(i)}}
      for(let i=0;i<hits.length;i++){const v=sn.rr[i];if(!v||v==='.'||S.resR[i]!=null)continue;
        if(T>=hits[i].t-20&&(v!=='m'||T>=hits[i].t+WIN-30)){resolve(S.resR,i,v);rdFx(i,v)}}
      for(let i=0;i<wins.length;i++){const v=sn.rt[i];if(!v||v==='.'||S.resT[i]!=null)continue;if(T>=wins[i].t+400)resolve(S.resT,i,v)}
      if(S.tact&&sn.tp>S.taps){S.taps=sn.tp;progUpd()}}
    S.feed=sn=>{
      W.snap={...sn,at:performance.now()-(sn.age||0)};
      if(sn.ph==='run'&&S.phase!=='run'){
        FX.forEach(f=>f.reset());S.phase='run';setCount('');showView(modes[0].mode,1);hud();if(useT)progUpd();S.raf=requestAnimationFrame(loop)}
      else if(sn.ph==='count'&&S.phase==='ready'){setCount('…')}
      else if(sn.ph==='done'&&S.phase==='run'&&!W.fin){W.fin=setTimeout(finish,W.DELAY+300)}};
    S.phase='ready';showView(modes[0].mode,1);hud();setCount('…');
    S.close=close;
  }
  return watch?S:undefined;
}
