/* ---------- grid note editor for lane games (click to place notes; play the clip with a moving playhead) ---------- */
let CE=null;
function mgChartEdit(){
  const g=GD;if(!g||CE)return;
  const ty=g.type,isLane=ty==='lane',isSimon=ty==='simon',isTap=ty==='tap',multi=isLane||isSimon,mi=mgMi(g),isV=mi&&mi.type.startsWith('video'),L=multi?g.lanes:1,RW=56;let rowH=26;const EC=3,laneW=Math.max(34,Math.min(64,Math.floor((Math.min(window.innerWidth,900)-RW-6)/(L+EC))));const keysL=multi?mgKeys(g):[(g.key||'').trim()||'●'];const defLen=()=>isTap?Math.round(4*60000/g.bpm):0;
  const E=CE={notes:(g.chart||[]).map(n=>({t:n.t,l:Math.min(n.l,L-1),len:(isLane||isTap)?(n.len||0):0})),events:(g.events||[]).map(e=>({...e})),ev:{type:'shake',l:0,v:3,beats:4},tool:isTap?'hold':'tap',held:{},snap:1,T:0,playing:false,undo:[],hit:true,pk:null,wave:true,metro:false,rate:1,raf:0,last:0,dur:60000,ac:null};
  const hue=i=>Math.round(i*360/L+10);
  const el=document.createElement('div');el.className='mgedit';
  el.innerHTML=`<div class="mgeh">
    <button class="btn primary mgeplay" data-e="play" ${mi?'':'disabled'} aria-label="play">▶</button><b class="mget">0.00 s</b>
    <span class="mgez"><button class="btn small" data-e="zout" aria-label="zoom out">－</button><button class="btn small" data-e="zin" aria-label="zoom in">＋</button></span>
    ${isLane?`<button class="btn small" data-e="tool" aria-pressed="false">▮ ${t('mgToolHold')}</button>`:''}
    <label>${t('mgSnap')} <select data-e="snap">${[1,2,3,4,6,8,12,16,24,32,64].map(n=>`<option value="${n}">1/${n}</option>`).join('')}</select></label>
    <button class="btn small" data-e="help" aria-label="help">?</button>
    <span class="mgecount muted"></span>
    ${isV?`<video class="mgevid" playsinline src="${esc(mi.url)}" preload="auto"></video>`:''}
    <details class="mgeset"><summary>⚙ ${t('mgSet')}</summary><div class="mgesetbox">
     <label>BPM <input type="number" data-e="bpm" value="${g.bpm}" style="width:62px"></label>
     <label>Offset <input type="number" data-e="off" value="${g.offset}" style="width:78px"></label>
     <label class="mgechk"><input type="checkbox" data-e="hit" checked> ${t('mgHitSnd')}</label>
     <label class="mgechk"><input type="checkbox" data-e="metro"> ${t('mgMetro')}</label>
     <label class="mgechk"><input type="checkbox" data-e="wave" checked> ${t('mgWave')}</label>
     <label>${t('mgRate')} <select data-e="rate">${[.5,.75,1,1.25,1.5].map(r=>`<option value="${r}" ${r===1?'selected':''}>×${r}</option>`).join('')}</select></label></div></details>
    <span class="mgeev"><b>✨ ${t('mgEv')}</b>
     <select data-e="evtype">${MG_EVT.map(([k,ic])=>`<option value="${k}">${ic} ${t('mgEv_'+k)}</option>`).join('')}</select>
     <label class="mgevl" hidden ${multi?'':'data-off="1"'}>${t('mgLaneNo')} <select data-e="evlane">${keysL.map((k,i)=>`<option value="${i}">${i+1} (${esc(k.toUpperCase())})</option>`).join('')}</select></label>
     <label class="mgevs">${t('mgEvStr')} <input type="number" min="1" max="5" value="3" data-e="evv" style="width:48px"></label>
     <label>${t('mgEvLen')} <input type="number" min="0.25" max="64" step="0.25" value="4" data-e="evbeats" style="width:58px"></label></span>
    <small class="mgewst muted"></small>
    <small class="muted mgehint" hidden>${t('mgEditHint').replace('{k}','1-'+L)}</small></div>
   <div class="mgelanes" style="width:${RW+(L+EC)*laneW}px;padding-left:${RW}px">${keysL.map((k,i)=>`<button data-e="lane" data-l="${i}" style="width:${laneW}px;background:hsl(${hue(i)} 70% 42%)"><b>${i+1}</b><small>${esc(k.toUpperCase())}</small></button>`).join('')}${[0,1,2].map(c=>`<span class="mgeevh" style="width:${laneW}px"><b>✨</b><small>E${c+1}</small></span>`).join('')}</div>
   <div class="mgescroll"><div class="mgeinner"><div class="mgeruler"></div><div class="mgegrid"><div class="mgeevbg"></div><canvas class="mgewave"></canvas><div class="mgenotes"></div><div class="mgehead"></div></div></div></div>
   <div class="mgefoot"><button class="btn small" data-e="undo">↶ ${t('mgUndo')}</button><button class="btn small" data-e="clear">${t('mgChartClear')}</button><button class="btn" data-e="test">▶ ${t('mgTest')}</button><button class="btn primary" data-e="save">${t('save')}</button><button class="btn" data-e="cancel">${t('mgCancel')}</button></div>`;
  document.body.appendChild(el);
  const media=isV?el.querySelector('video'):(mi?new Audio(mi.url):null);
  const $q=s=>el.querySelector(s),sc=$q('.mgescroll'),grid=$q('.mgegrid');
  const stepMs=()=>60000/g.bpm/E.snap,yOf=t=>t/stepMs()*rowH;
  function layout(){
    const sm=stepMs(),rows=Math.ceil(E.dur/sm),H=rows*rowH,beat=rowH*E.snap;
    const inner=$q('.mgeinner');inner.style.height=H+'px';inner.style.width=(RW+(L+EC)*laneW)+'px';
    $q('.mgeevbg').style.cssText=`left:${L*laneW}px;width:${EC*laneW}px`;
    grid.style.cssText=`left:${RW}px;width:${(L+EC)*laneW}px;height:${H}px;background-image:linear-gradient(to bottom,rgba(255,255,255,.55) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.28) 1px,transparent 1px),repeating-linear-gradient(to right,rgba(255,255,255,.3) 0 1px,transparent 1px ${laneW}px);background-size:100% ${beat*4}px,100% ${beat}px,100% 100%`;
    const nb=Math.ceil(E.dur/(60000/g.bpm));let lab='';
    for(let b=0;b<nb;b++){const ms=b*60000/g.bpm;lab+=`<span style="top:${ms/sm*rowH}px">${(ms/1000).toFixed(b%4?1:1)}s</span>`}
    $q('.mgeruler').innerHTML=lab;drawNotes();head();drawWave()}
  function drawNotes(){
    const sm=stepMs();
    $q('.mgenotes').innerHTML=E.notes.map(n=>{const hh=Math.max(8,rowH-3),len=n.len>0?n.len/sm*rowH:0,c=hue(n.l);
      return`<div class="mgen${len?' hold':''}" style="left:${n.l*laneW+3}px;top:${yOf(n.t)}px;width:${laneW-6}px;height:${hh+len}px;background:${len?`linear-gradient(to bottom,hsl(${c} 75% 58%) 0 ${hh}px,hsl(${c} 60% 36%) ${hh}px)`:`hsl(${c} 70% 50%)`}"></div>`}).join('')+
      E.events.map(e=>{const d=MG_EVT_OF[e.type],h=Math.max(rowH-3,e.len/sm*rowH);
        return`<div class="mgen mgee" title="${esc(t('mgEv_'+e.type))}" style="left:${(L+e.c)*laneW+3}px;top:${yOf(e.t)}px;width:${laneW-6}px;height:${h}px;background:${d[1]}"><span>${d[0]}${multi&&(e.type==='hide'||e.type==='show')?`<small>${e.l+1}</small>`:''}</span></div>`}).join('');cnt()}
  function cnt(){$q('.mgecount').textContent=E.notes.length+' '+t('mgNotesUnit')+(E.events.length?' · '+E.events.length+' '+t('mgEvUnit'):'')}
  function head(){const y=yOf(Math.max(0,E.T));$q('.mgehead').style.top=y+'px';$q('.mget').textContent=(E.T/1000).toFixed(2)+' s';return y}
  function push(){E.undo.push(JSON.stringify({n:E.notes,e:E.events}));if(E.undo.length>60)E.undo.shift()}
  function toggle(l,t){
    const sm=stepMs(),i=E.notes.findIndex(n=>n.l===l&&t>=n.t-sm/2&&t<=n.t+(n.len||0)+sm/2);push();
    if(i>=0)E.notes.splice(i,1);else E.notes.push({t:Math.max(0,Math.round(t)),l,len:defLen()});
    drawNotes()}
  function addAt(l){const sm=stepMs(),t=Math.round(Math.round(Math.max(0,E.T)/sm)*sm);
    if(E.notes.some(n=>n.l===l&&Math.abs(n.t-t)<sm/2))return null;push();const n={t,l,len:defLen()};E.notes.push(n);drawNotes();return n}
  function holdStart(l){const n=addAt(l);E.held[l]=n?{n}:null}
  function holdEnd(l){const h=E.held[l];E.held[l]=null;if(!h||!E.playing||!(isLane||isTap))return;const sm=stepMs(),dur=E.T-h.n.t;
    if(dur>=Math.max(150,sm*1.5)){h.n.len=Math.round(Math.max(sm,Math.round(dur/sm)*sm));drawNotes()}}
  /* long notes: in the long-note tool, drag down over the cells (or hold a key while the clip plays) */
  let dr=null;
  const rowOf=e=>Math.floor((e.clientY-grid.getBoundingClientRect().top)/rowH);
  function prev(){let p=$q('.mgen.prev');if(!p){p=document.createElement('div');p.className='mgen prev';$q('.mgenotes').appendChild(p)}
    p.style.cssText=`left:${(dr.ev?L+dr.c:dr.l)*laneW+3}px;top:${dr.row0*rowH}px;width:${laneW-6}px;height:${(dr.row1-dr.row0+1)*rowH-3}px;background:${dr.ev?'#a78bfa':`hsl(${hue(dr.l)} 70% 50%)`};opacity:.6`}
  function dragEnd(){
    if(!dr)return;const d=dr;dr=null;const p=$q('.mgen.prev');if(p)p.remove();const sm=stepMs();
    if(d.ev){const t=Math.round(d.row0*sm),i=E.events.findIndex(e=>e.c===d.c&&t>=e.t-sm/2&&t<=e.t+Math.max(e.len,0)+sm/2);push();
      if(d.row1>d.row0)E.events=E.events.filter(e=>!(e.c===d.c&&Math.abs(e.t-t)<sm/2));
      if(d.row1===d.row0&&i>=0)E.events.splice(i,1);
      else{const ev=E.ev,len=d.row1>d.row0?Math.round((d.row1-d.row0)*sm):Math.round(ev.beats*60000/g.bpm);E.events.push({t,type:ev.type,len,c:d.c,l:ev.l,v:ev.v})}
      drawNotes();return}
    if(d.row1>d.row0){push();const t=Math.round(d.row0*sm);E.notes=E.notes.filter(n=>!(n.l===d.l&&Math.abs(n.t-t)<sm/2));E.notes.push({t,l:d.l,len:Math.round((d.row1-d.row0)*sm)});drawNotes()}
    else toggle(d.l,d.row0*sm)}
  grid.addEventListener('pointerdown',e=>{const l=Math.floor((e.clientX-grid.getBoundingClientRect().left)/laneW),row=rowOf(e);if(row<0||l<0)return;
    if(l>=L){if(l>=L+EC)return;dr={ev:true,c:l-L,row0:row,row1:row}}
    else{if(E.tool!=='hold'||l>=L)return;dr={l,row0:row,row1:row}}try{grid.setPointerCapture(e.pointerId)}catch(x){}e.preventDefault();prev()});
  grid.addEventListener('pointermove',e=>{if(!dr)return;const row=Math.max(dr.row0,rowOf(e));if(row!==dr.row1){dr.row1=row;prev()}});
  grid.addEventListener('pointerup',dragEnd);grid.addEventListener('pointercancel',()=>{dr=null;const p=$q('.mgen.prev');if(p)p.remove()});
  const lanesBar=$q('.mgelanes');
  lanesBar.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-l]');if(b){e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(x){}holdStart(Number(b.dataset.l))}});
  ['pointerup','pointercancel'].forEach(ev=>lanesBar.addEventListener(ev,e=>{const b=e.target.closest('[data-l]');if(b)holdEnd(Number(b.dataset.l))}));
  grid.addEventListener('click',e=>{if(E.tool==='hold')return;if(Math.floor((e.clientX-grid.getBoundingClientRect().left)/laneW)>=L)return;const r=grid.getBoundingClientRect(),l=Math.floor((e.clientX-r.left)/laneW),row=Math.floor((e.clientY-r.top)/rowH);if(l<0||l>=L||row<0)return;toggle(l,row*stepMs())});
  $q('.mgeruler').addEventListener('click',e=>{const r=$q('.mgeruler').getBoundingClientRect();seek(Math.max(0,(e.clientY-r.top)/rowH*stepMs()))});
  /* ---- waveform of the clip's sound, drawn behind the lanes (only the visible window is painted) ---- */
  const wst=m=>{const e=$q('.mgewst');if(e)e.textContent=m||''};
  async function loadWave(){
    const it=g.media?mgItem(g.media):null;if(!mi)return;
    if(it&&it.size>60e6){wst(t('mgWaveBig'));return}
    wst(t('mgWaveLoad'));
    try{
      const buf=await (await fetch(mi.url)).arrayBuffer();
      const ab=await new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,1,44100).decodeAudioData(buf);
      const RES=2,pk=new Float32Array(Math.ceil(ab.duration*1000/RES)+2),sr=ab.sampleRate;let mx=0;
      for(let c=0;c<ab.numberOfChannels;c++){const d=ab.getChannelData(c),k=1000/sr/RES;
        for(let i=0;i<d.length;i++){const v=d[i]<0?-d[i]:d[i],j=(i*k)|0;if(v>pk[j])pk[j]=v}}
      for(let i=0;i<pk.length;i++)if(pk[i]>mx)mx=pk[i];
      if(mx>0)for(let i=0;i<pk.length;i++)pk[i]/=mx;
      E.pk=pk;E.pkRes=RES;wst('');if(CE!==E)return;drawWave()
    }catch(x){wst(t('mgWaveFail'))}}
  let wq=0;
  function drawWave(){
    const cv=$q('.mgewave');if(!cv)return;
    if(!E.pk||!E.wave){cv.style.display='none';return}
    cv.style.display='block';
    const W=L*laneW,Hv=sc.clientHeight,y0=sc.scrollTop;
    if(cv.width!==W)cv.width=W;if(cv.height!==Hv)cv.height=Hv;
    cv.style.top=y0+'px';cv.style.width=W+'px';cv.style.height=Hv+'px';
    const c=cv.getContext('2d');c.clearRect(0,0,W,Hv);c.fillStyle='rgba(70,130,255,.5)';
    const msPer=stepMs()/rowH,pk=E.pk,R=E.pkRes;
    for(let r=0;r<Hv;r++){
      const clip=(y0+r)*msPer+g.offset;if(clip<0)continue;
      const i0=(clip/R)|0,i1=Math.max(i0,((clip+msPer)/R)|0);let a=0;
      for(let i=i0;i<=i1&&i<pk.length;i++)if(pk[i]>a)a=pk[i];
      if(a>0){const w=Math.max(1,a*W);c.fillRect((W-w)/2,r,w,1)}}}
  sc.addEventListener('scroll',()=>{if(wq)return;wq=requestAnimationFrame(()=>{wq=0;drawWave()})});
  function seek(T){E.T=T;if(media)try{media.currentTime=(g.offset+T)/1000}catch(x){}head()}
  function blip(fq){try{E.ac=E.ac||new (window.AudioContext||window.webkitAudioContext)();const o=E.ac.createOscillator(),gn=E.ac.createGain();o.frequency.value=fq||880;gn.gain.value=.12;o.connect(gn);gn.connect(E.ac.destination);o.start();o.stop(E.ac.currentTime+.05)}catch(x){}}
  function tick(){
    if(!E.playing)return;const T=media.currentTime*1000-g.offset;
    if(E.hit&&E.notes.some(n=>n.t>E.T&&n.t<=T))blip();
    if(E.metro){const bm=60000/g.bpm;if(Math.floor(T/bm)>Math.floor(E.T/bm)&&T>=0)blip(520)}
    E.T=T;const y=head();
    if(y<sc.scrollTop+sc.clientHeight*.1||y>sc.scrollTop+sc.clientHeight*.7)sc.scrollTop=y-sc.clientHeight*.3;
    if(media.ended||T>E.dur){pause();return}
    E.raf=requestAnimationFrame(tick)}
  function play(){if(!media)return;try{E.ac=E.ac||new (window.AudioContext||window.webkitAudioContext)()}catch(x){}
    media.currentTime=Math.max(0,(g.offset+E.T)/1000);media.playbackRate=E.rate;const p=media.play();if(p&&p.catch)p.catch(()=>{});E.playing=true;$q('[data-e=play]').textContent='⏸';E.raf=requestAnimationFrame(tick)}
  function pause(){E.playing=false;cancelAnimationFrame(E.raf);if(media)media.pause();$q('[data-e=play]').textContent='▶'}
  function apply(){g.chart=E.notes.slice().sort((a,b)=>a.t-b.t||a.l-b.l);g.events=E.events.slice().sort((a,b)=>a.t-b.t||a.c-b.c)}
  function close(){pause();document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);el.remove();CE=null;render()}
  const kd=e=>{if(e.target.matches&&e.target.matches('select'))return;
    if(e.target.matches&&e.target.matches('input[type=number]'))return;
    if(e.key==='Escape'){close();return}
    if(e.key===' '){e.preventDefault();E.playing?pause():play();return}
    if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();undo();return}
    const n=Number(e.key);if(n>=1&&n<=L&&!e.repeat){e.preventDefault();holdStart(n-1)}};
  const ku=e=>{const n=Number(e.key);if(n>=1&&n<=L)holdEnd(n-1)};document.addEventListener('keyup',ku);
  function undo(){const s=E.undo.pop();if(s){const o=JSON.parse(s);E.notes=o.n;E.events=o.e;drawNotes()}}
  document.addEventListener('keydown',kd);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT'||b.tagName==='SUMMARY')return;const a=b.dataset.e;
    if(a==='play')E.playing?pause():play();
    else if(a==='undo')undo();
    else if(a==='clear'){push();E.notes=[];E.events=[];drawNotes()}
    else if(a==='cancel')close();
    else if(a==='zin'){rowH=Math.min(80,Math.round(rowH*1.25));layout()}
    else if(a==='zout'){rowH=Math.max(8,Math.round(rowH*.8));layout()}
    else if(a==='help'){const h=$q('.mgehint');h.hidden=!h.hidden}
    else if(a==='tool'){E.tool=E.tool==='hold'?'tap':'hold';b.classList.toggle('primary',E.tool==='hold');b.setAttribute('aria-pressed',E.tool==='hold');grid.classList.toggle('holdtool',E.tool==='hold')}
    else if(a==='save'){apply();close()}
    else if(a==='test'){pause();apply();mgPlay(g)}});
  el.addEventListener('change',e=>{const x=e.target.closest('[data-e]');if(!x)return;const a=x.dataset.e;
    if(a==='snap'){E.snap=Number(x.value);rowH=E.snap>=32?12:E.snap>=16?16:26;layout()}
    else if(a==='hit')E.hit=x.checked;
    else if(a==='metro')E.metro=x.checked;
    else if(a==='wave'){E.wave=x.checked;drawWave()}
    else if(a==='rate'){E.rate=Number(x.value);if(media)media.playbackRate=E.rate}
    else if(a==='evtype'){E.ev.type=x.value;const k=x.value;$q('.mgevl').hidden=!(multi&&(k==='hide'||k==='show'));$q('.mgevs').hidden=!['shake','pulse','sway','flash','spin','tilt','fog'].includes(k)}
    else if(a==='evlane')E.ev.l=Number(x.value);
    else if(a==='evv')E.ev.v=Math.max(1,Math.min(5,Math.round(Number(x.value)||3)));
    else if(a==='evbeats')E.ev.beats=Math.max(.25,Math.min(64,Number(x.value)||4));
    else if(a==='bpm'){g.bpm=Math.max(30,Math.min(300,Number(x.value)||100));layout()}
    else if(a==='off'){g.offset=Math.round(Number(x.value)||0);layout()}});
  function dur(){const d=media&&isFinite(media.duration)?media.duration*1000-g.offset:60000;E.dur=Math.max(10000,Math.min(600000,d));layout()}
  if(media&&media.addEventListener){media.addEventListener('loadedmetadata',dur);media.addEventListener('ended',pause)}
  layout();loadWave();
}
const MG_EVT=[['shake','〰'],['hide','◌'],['show','◉'],['flip','⇅'],['pulse','♥'],['sway','⇋'],['flash','✦'],['spin','↻'],['tilt','⟋'],['fog','☁']],
 MG_EVT_OF={shake:['〰','#f97316'],hide:['◌','#64748b'],show:['◉','#22c55e'],flip:['⇅','#06b6d4'],pulse:['♥','#ec4899'],sway:['⇋','#a855f7'],flash:['✦','#eab308'],spin:['↻','#14b8a6'],tilt:['⟋','#f43f5e'],fog:['☁','#475569']};
Object.assign(TX.th,{mgEv:'Event',mgEv_shake:'โน้ตสั่น',mgEv_hide:'เลนค่อยๆ หายไป',mgEv_show:'เลนค่อยๆ กลับมา',mgEv_flip:'โน้ตกลับทิศ (ตกขึ้นไป)',mgEv_pulse:'เลนเต้นตามจังหวะ',mgEv_sway:'เลนโยกตามจังหวะ',mgEv_flash:'แฟลชตามจังหวะ',mgEv_spin:'หมุนรอบตัว (แรง 4-5 = ย้อนทิศ)',mgEv_tilt:'เอียงโยกตามจังหวะ',mgEv_fog:'หมอกบังด้านบน',mgLaneNo:'เลนที่',mgEvStr:'แรง (1-5)',mgEvLen:'นาน (บีต)',mgEvUnit:'event',mgToolHold:'โน้ตยาว',mgSet:'ตั้งค่า',mgMetro:'เสียงเมโทรนอม (ทุกบีต)',mgWave:'คลื่นเสียงจากคลิป',mgRate:'ความเร็วเล่น',mgWaveLoad:'กำลังวิเคราะห์เสียงจากคลิป…',mgWaveFail:'อ่านเสียงจากไฟล์นี้ไม่ได้ (ยังวางโน้ตและเล่นได้ตามปกติ)',mgWaveBig:'ไฟล์ใหญ่เกินไปสำหรับแสดงคลื่นเสียง (เกิน 60 MB)',mgUndo:'ย้อน',mgNotesUnit:'โน้ต',mgSnap:'ความละเอียด',mgHitSnd:'เสียงตอนผ่านโน้ต',mgEditHint:'แตะช่องเพื่อวาง/ลบโน้ต · แตะปุ่มเลนด้านบนหรือกดเลข {k} เพื่อวางที่เส้นเล่น (ขณะเล่น กดค้างเพื่ออัดโน้ตยาว) · ปุ่ม ▮ โน้ตยาว = ลากลงบนช่องเพื่อสร้างโน้ตยาว · Space เล่น/หยุด · คลิกไม้บรรทัดซ้ายเพื่อข้ามไป'});
Object.assign(TX.en,{mgEv:'Event',mgEv_shake:'Notes shake',mgEv_hide:'Lane fades away',mgEv_show:'Lane fades back',mgEv_flip:'Flip direction (notes rise)',mgEv_pulse:'Lanes pulse to the beat',mgEv_sway:'Lanes sway to the beat',mgEv_flash:'Flash to the beat',mgEv_spin:'Spin around (strength 4-5 = reverse)',mgEv_tilt:'Tilt to the beat',mgEv_fog:'Fog hides the top',mgLaneNo:'Lane',mgEvStr:'Strength (1-5)',mgEvLen:'Length (beats)',mgEvUnit:'events',mgToolHold:'Long notes',mgSet:'Settings',mgMetro:'Metronome (every beat)',mgWave:'Waveform of the clip',mgRate:'Playback speed',mgWaveLoad:'Reading the clip sound…',mgWaveFail:'Could not read the sound of this file (you can still place notes and play)',mgWaveBig:'File too large to draw a waveform (over 60 MB)',mgUndo:'Undo',mgNotesUnit:'notes',mgSnap:'Snap',mgHitSnd:'Hit sound',mgEditHint:'Tap a cell to place/remove a note · tap a lane button above or press {k} to place at the playhead (hold it while the clip plays to record a long note) · the ▮ Long notes tool = drag down over the cells to make a long note · Space play/pause · click the left ruler to seek'});
