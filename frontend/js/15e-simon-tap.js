/* ---------- rhythm minigames: Simon (repeat the sequence) and rapid tap ---------- */
function mgSeq(g,n){
  let seed=0;for(const ch of g.id)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  return Array.from({length:n},()=>Math.floor(rnd()*g.lanes))}
function mgPlay2(g,cb){
  if(!g||MGP)return;
  const it=mgMi(g),isV=it&&it.type.startsWith('video'),isS=g.type==='simon';
  const col=g.col,key=(g.key||'').trim(),keys=isS?mgKeys(g):[],N=g.lanes;
  const total=isS?g.rounds:1,seq=isS?mgSeq(g,g.start+g.rounds):[];
  const hue=i=>Math.round(i*360/N+10);
  const el=document.createElement('div');el.id='mgPlay';el.className='mgplay';
  const field=isS?`<div class="mgsimon" style="--n:${Math.min(N,4)}">${keys.map((k,i)=>`<button class="mgsp" data-l="${i}" style="--c:hsl(${hue(i)} 70% 42%);--lit:hsl(${hue(i)} 95% 68%)">${esc(k.toUpperCase())}</button>`).join('')}</div>`
   :`<div class="mgprog" style="background:${col.bar}"><i style="background:${col.zone}"></i></div><button class="mgtap" style="background:${col.zone}">${esc(key||'●')}</button>`;
  el.innerHTML=`${isV?`<video class="mgvid" playsinline loop preload="auto" src="${esc(it.url)}"></video>`:''}
   <button class="mgx" aria-label="${t('close')}">✕</button>
   <div class="mghud"><b>${esc(g.name)}</b><span class="mgsc"></span></div>
   <div class="mgrot" hidden>↻ ${t('mgRotate')}</div>
   <div class="mgmid"><div class="mgfb" aria-live="polite"></div></div>
   <div class="mgcount"></div>${field}
   <div class="mgstart"><button class="btn primary big">${t('mgStart')}</button></div>
   <div class="mgres" hidden></div>`;
  document.body.appendChild(el);
  const media=isV?el.querySelector('video'):(it?Object.assign(new Audio(it.url),{loop:true}):null);
  const $q=s=>el.querySelector(s),S={phase:'ready',res:[],timers:[],taps:0,raf:0};MGP=S;
  const later=(fn,ms)=>{const h=setTimeout(fn,ms);S.timers.push(h);return h};
  const say=(txt,c)=>{const f=$q('.mgfb');f.textContent=txt;f.style.color=c;f.classList.remove('pop');void f.offsetWidth;f.classList.add('pop')};
  const counts=()=>({h:S.res.filter(x=>x==='h').length,m:S.res.filter(x=>x==='m').length});
  const hud=()=>{const c=counts();$q('.mgsc').textContent=isS?`✔${c.h}  ✘${c.m}  /${total}`:`${S.taps} / ${g.goal}`};
  function finish(){
    if(S.phase==='done')return;S.phase='done';S.timers.forEach(clearTimeout);cancelAnimationFrame(S.raf);if(media)media.pause();
    for(let k=0;k<total;k++)if(S.res[k]==null)S.res[k]='m';
    const c=counts(),dmg=mgRollDmg(g.dmg,c.m);S.out={perfect:0,hit:c.h,miss:c.m,dmg};if(cb)cb(S.out);
    const r=$q('.mgres');r.hidden=false;
    r.innerHTML=`<h2>${t('mgDone')}</h2><p>${isS?`✔ ${c.h} · ✘ ${c.m}`:`${S.taps} / ${g.goal} ${t('mgTaps')}`}</p>${g.dmg?`<p class="mgdmg">${c.m?t('mgDmgTaken').replace('{n}',dmg).replace('{d}',g.dmg):t('mgNoDmg')}</p>`:''}<div class="mgbtns">${cb?'':`<button class="btn primary" data-r="again">${t('mgAgain')}</button>`}<button class="btn" data-r="close">${t('close')}</button></div>`}
  const pads=()=>[...el.querySelectorAll('.mgsp')];
  function flash(l,ms){const p=pads()[l];if(!p)return;p.classList.add('on');later(()=>p.classList.remove('on'),ms)}
  function level(L){
    if(L>=total){finish();return}
    S.L=L;S.cur=seq.slice(0,g.start+L);S.idx=0;S.mode='show';hud();
    const step=60000/g.bpm;say(`${t('mgLevel')} ${L+1}`,'#fff');
    S.cur.forEach((l,i)=>later(()=>flash(l,step*.6),700+i*step));
    later(()=>{S.mode='input';S.idx=0;say(t('mgYou'),'#fff');arm()},700+S.cur.length*step)}
  function arm(){clearTimeout(S.tm);S.tm=later(()=>{if(S.mode==='input')fail()},g.tmo)}
  function fail(){S.mode='wait';S.res[S.L]='m';hud();say(t('mgMiss'),'#ef4444');later(()=>level(S.L+1),900)}
  function ok(){S.mode='wait';S.res[S.L]='h';hud();say(t('mgHit'),col.zone);later(()=>level(S.L+1),700)}
  function pressS(l){
    if(S.phase!=='run'||S.mode!=='input')return;flash(l,140);
    if(S.cur[S.idx]!==l){clearTimeout(S.tm);fail();return}
    S.idx++;if(S.idx>=S.cur.length){clearTimeout(S.tm);ok()}else arm()}
  function pressT(){
    if(S.phase!=='run'||S.mode!=='go')return;S.taps++;hud();
    $q('.mgprog i').style.width=Math.min(100,S.taps/g.goal*100)+'%'}
  function start(){
    S.res=[];S.taps=0;hud();$q('.mgstart').hidden=true;$q('.mgres').hidden=true;
    mgLandscape(true);S.phase='count';mgCountdown(el,g.cd,S,begin)}
  function begin(){
    S.phase='run';
    if(media){try{media.currentTime=0;const p=media.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
    if(isS)later(()=>level(0),400);
    else{
      S.mode='go';$q('.mgprog i').style.width='0%';S.endAt=performance.now()+g.dur*1000;say(t('mgGo'),col.perfect);
      const tick=()=>{if(S.phase!=='run')return;const left=S.endAt-performance.now();$q('.mgsc').textContent=`${S.taps} / ${g.goal} · ${Math.max(0,left/1000).toFixed(1)}s`;
        if(left<=0){S.mode='end';S.res=[S.taps>=g.goal?'h':'m'];finish();return}S.raf=requestAnimationFrame(tick)};tick()}}
  function close(){clearTimeout(S.cdT);mgLandscape(false);window.removeEventListener('resize',rc);S.timers.forEach(clearTimeout);cancelAnimationFrame(S.raf);if(media)media.pause();document.removeEventListener('keydown',kd);el.remove();MGP=null}
  const kd=e=>{if(e.key==='Escape'){close();return}const k=e.key.toLowerCase();
    if(isS){if(e.repeat)return;const l=keys.indexOf(k);if(l>=0){e.preventDefault();pressS(l)}return}
    if(k===(key?key.toLowerCase():' ')){e.preventDefault();pressT()}};
  document.addEventListener('keydown',kd);
  const rc=()=>mgRotCheck(el);window.addEventListener('resize',rc);rc();
  $q('.mgx').onclick=close;$q('.mgstart .big').onclick=start;
  if(isS)pads().forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();pressS(Number(b.dataset.l))}));
  else $q('.mgtap').addEventListener('pointerdown',e=>{e.preventDefault();pressT()});
  el.addEventListener('click',e=>{const r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='close')close();else{S.timers.forEach(clearTimeout);clearTimeout(S.cdT);S.phase='ready';start()}});
}
Object.assign(TX.th,{mgLevels:'จำนวนด่าน',mgPads:'จำนวนปุ่ม',mgStartLen:'ความยาวลำดับเริ่มต้น',mgStartLenH:'ด่านถัดไปยาวขึ้นทีละ 1',mgTmo:'เวลารอกดแต่ละครั้ง (ms)',mgTmoH:'เกินนี้ถือว่าพลาด',mgDur:'เวลา (วินาที)',mgGoal:'เป้าหมายจำนวนครั้ง',mgGoalH:'กดไม่ถึง = พลาด 1 ครั้ง',mgLevel:'ด่าน',mgYou:'ตาคุณ!',mgGo:'กด!',mgTaps:'ครั้ง'});
Object.assign(TX.en,{mgLevels:'Levels',mgPads:'Pads',mgStartLen:'Starting sequence length',mgStartLenH:'Each level adds 1',mgTmo:'Time to press each step (ms)',mgTmoH:'Slower counts as a miss',mgDur:'Time (seconds)',mgGoal:'Target taps',mgGoalH:'Falling short = 1 miss',mgLevel:'Level',mgYou:'Your turn!',mgGo:'Tap!',mgTaps:'taps'});
