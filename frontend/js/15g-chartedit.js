/* ---------- grid note editor for lane games (click to place notes; play the clip with a moving playhead) ---------- */
let CE=null;
function mgChartEdit(){
  const g=GD;if(!g||CE)return;
  const mi=mgMi(g),isV=mi&&mi.type.startsWith('video'),L=g.lanes,rowH=26,laneW=64,RW=60;
  const E=CE={notes:(g.chart||[]).map(n=>({t:n.t,l:n.l})),snap:1,T:0,playing:false,undo:[],hit:true,raf:0,last:0,dur:60000,ac:null};
  const hue=i=>Math.round(i*360/L+10);
  const el=document.createElement('div');el.className='mgedit';
  el.innerHTML=`<div class="mgeh">
    <button class="btn primary" data-e="play" ${mi?'':'disabled'}>▶</button><b class="mget">0.00 s</b>
    <label>${t('mgSnap')} <select data-e="snap">${[1,2,3,4,6,8].map(n=>`<option value="${n}">1/${n}</option>`).join('')}</select></label>
    <label>BPM <input type="number" data-e="bpm" value="${g.bpm}" style="width:62px"></label>
    <label>Offset <input type="number" data-e="off" value="${g.offset}" style="width:72px"></label>
    <label class="mgechk"><input type="checkbox" data-e="hit" checked> ${t('mgHitSnd')}</label>
    <span class="mgebtns"><button class="btn small" data-e="undo">↶</button><button class="btn small" data-e="clear">${t('mgChartClear')}</button><button class="btn small" data-e="test">${t('mgTest')}</button><button class="btn small primary" data-e="save">${t('save')}</button><button class="btn small" data-e="cancel">${t('mgCancel')}</button></span>
    <small class="muted mgehint">${t('mgEditHint').replace('{k}','1-'+L)}</small>
    ${isV?`<video class="mgevid" playsinline src="${esc(mi.url)}" preload="auto"></video>`:''}</div>
   <div class="mgescroll"><div class="mgeinner"><div class="mgeruler"></div><div class="mgegrid"><div class="mgenotes"></div><div class="mgehead"></div></div></div></div>`;
  document.body.appendChild(el);
  const media=isV?el.querySelector('video'):(mi?new Audio(mi.url):null);
  const $q=s=>el.querySelector(s),sc=$q('.mgescroll'),grid=$q('.mgegrid');
  const stepMs=()=>60000/g.bpm/E.snap,yOf=t=>t/stepMs()*rowH;
  function layout(){
    const sm=stepMs(),rows=Math.ceil(E.dur/sm),H=rows*rowH,beat=rowH*E.snap;
    const inner=$q('.mgeinner');inner.style.height=H+'px';inner.style.width=(RW+L*laneW)+'px';
    grid.style.cssText=`left:${RW}px;width:${L*laneW}px;height:${H}px;background-image:linear-gradient(to bottom,rgba(255,255,255,.55) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.28) 1px,transparent 1px),repeating-linear-gradient(to right,rgba(255,255,255,.3) 0 1px,transparent 1px ${laneW}px);background-size:100% ${beat*4}px,100% ${beat}px,100% 100%`;
    const nb=Math.ceil(E.dur/(60000/g.bpm));let lab='';
    for(let b=0;b<nb;b++){const ms=b*60000/g.bpm;lab+=`<span style="top:${ms/sm*rowH}px">${(ms/1000).toFixed(b%4?1:1)}s</span>`}
    $q('.mgeruler').innerHTML=lab;drawNotes();head()}
  function drawNotes(){
    $q('.mgenotes').innerHTML=E.notes.map(n=>`<div class="mgen" style="left:${n.l*laneW+3}px;top:${yOf(n.t)}px;width:${laneW-6}px;height:${rowH-3}px;background:hsl(${hue(n.l)} 70% 50%)"></div>`).join('')}
  function head(){const y=yOf(Math.max(0,E.T));$q('.mgehead').style.top=y+'px';$q('.mget').textContent=(E.T/1000).toFixed(2)+' s';return y}
  function push(){E.undo.push(JSON.stringify(E.notes));if(E.undo.length>60)E.undo.shift()}
  function toggle(l,t){
    const sm=stepMs(),i=E.notes.findIndex(n=>n.l===l&&Math.abs(n.t-t)<sm/2);push();
    if(i>=0)E.notes.splice(i,1);else E.notes.push({t:Math.max(0,Math.round(t)),l});
    drawNotes()}
  function addAt(l){const sm=stepMs(),t=Math.round(Math.max(0,E.T)/sm)*sm;
    if(E.notes.some(n=>n.l===l&&Math.abs(n.t-t)<sm/2))return;push();E.notes.push({t:Math.round(t),l});drawNotes()}
  grid.addEventListener('click',e=>{const r=grid.getBoundingClientRect(),l=Math.floor((e.clientX-r.left)/laneW),row=Math.floor((e.clientY-r.top)/rowH);if(l<0||l>=L||row<0)return;toggle(l,row*stepMs())});
  $q('.mgeruler').addEventListener('click',e=>{const r=$q('.mgeruler').getBoundingClientRect();seek(Math.max(0,(e.clientY-r.top)/rowH*stepMs()))});
  function seek(T){E.T=T;if(media)try{media.currentTime=(g.offset+T)/1000}catch(x){}head()}
  function blip(){try{E.ac=E.ac||new (window.AudioContext||window.webkitAudioContext)();const o=E.ac.createOscillator(),gn=E.ac.createGain();o.frequency.value=880;gn.gain.value=.12;o.connect(gn);gn.connect(E.ac.destination);o.start();o.stop(E.ac.currentTime+.05)}catch(x){}}
  function tick(){
    if(!E.playing)return;const T=media.currentTime*1000-g.offset;
    if(E.hit&&E.notes.some(n=>n.t>E.T&&n.t<=T))blip();
    E.T=T;const y=head();
    if(y<sc.scrollTop+sc.clientHeight*.1||y>sc.scrollTop+sc.clientHeight*.7)sc.scrollTop=y-sc.clientHeight*.3;
    if(media.ended||T>E.dur){pause();return}
    E.raf=requestAnimationFrame(tick)}
  function play(){if(!media)return;try{E.ac=E.ac||new (window.AudioContext||window.webkitAudioContext)()}catch(x){}
    media.currentTime=Math.max(0,(g.offset+E.T)/1000);const p=media.play();if(p&&p.catch)p.catch(()=>{});E.playing=true;$q('[data-e=play]').textContent='⏸';E.raf=requestAnimationFrame(tick)}
  function pause(){E.playing=false;cancelAnimationFrame(E.raf);if(media)media.pause();$q('[data-e=play]').textContent='▶'}
  function apply(){g.chart=E.notes.slice().sort((a,b)=>a.t-b.t||a.l-b.l)}
  function close(){pause();document.removeEventListener('keydown',kd);el.remove();CE=null;render()}
  const kd=e=>{
    if(e.target.matches&&e.target.matches('input[type=number]'))return;
    if(e.key==='Escape'){close();return}
    if(e.key===' '){e.preventDefault();E.playing?pause():play();return}
    if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();return}
    const n=Number(e.key);if(n>=1&&n<=L&&!e.repeat){e.preventDefault();addAt(n-1)}};
  function undo(){const s=E.undo.pop();if(s){E.notes=JSON.parse(s);drawNotes()}}
  document.addEventListener('keydown',kd);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const a=b.dataset.e;
    if(a==='play')E.playing?pause():play();
    else if(a==='undo')undo();
    else if(a==='clear'){push();E.notes=[];drawNotes()}
    else if(a==='cancel')close();
    else if(a==='save'){apply();close()}
    else if(a==='test'){pause();apply();mgPlay(g)}});
  el.addEventListener('change',e=>{const x=e.target.closest('[data-e]');if(!x)return;const a=x.dataset.e;
    if(a==='snap'){E.snap=Number(x.value);layout()}
    else if(a==='hit')E.hit=x.checked;
    else if(a==='bpm'){g.bpm=Math.max(30,Math.min(300,Number(x.value)||100));layout()}
    else if(a==='off'){g.offset=Math.round(Number(x.value)||0);layout()}});
  function dur(){const d=media&&isFinite(media.duration)?media.duration*1000-g.offset:60000;E.dur=Math.max(10000,Math.min(600000,d));layout()}
  if(media&&media.addEventListener){media.addEventListener('loadedmetadata',dur);media.addEventListener('ended',pause)}
  layout();
}
Object.assign(TX.th,{mgSnap:'ความละเอียด',mgHitSnd:'เสียงตอนผ่านโน้ต',mgEditHint:'คลิกช่องเพื่อวาง/ลบโน้ต · กดเลข {k} เพื่อวางที่เส้นเล่น · Space เล่น/หยุด · คลิกไม้บรรทัดซ้ายเพื่อข้ามไป'});
Object.assign(TX.en,{mgSnap:'Snap',mgHitSnd:'Hit sound',mgEditHint:'Click a cell to place/remove a note · press {k} to place at the playhead · Space play/pause · click the left ruler to seek'});
