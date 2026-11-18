/* ---------- watching somebody else play a rhythm game: little live windows ----------
   The player's browser posts snapshots (see mgPlay opt.live), we long-poll them here and replay the same game in a
   small window, a moment behind. Nobody who is busy playing sees the windows; the GM always does. */
const WATCH={run:false,ac:null,minis:{},hid:new Set(),fails:0,v:null,rid:''};
function watchRoom(){for(const rid in MGS){const s=MGS[rid];if(s&&s.status==='open')return rid}return''}
function watchDock(){let d=document.getElementById('mgDock');if(!d){d=document.createElement('div');d.id='mgDock';document.body.appendChild(d)}return d}
function watchDrop(pc){const m=WATCH.minis[pc];if(!m)return;try{m.close()}catch(e){}delete WATCH.minis[pc]}
function watchClear(){Object.keys(WATCH.minis).forEach(watchDrop)}
function watchApply(rid,list){
  const s=MGS[rid];if(!s||s.status!=='open'||MGP)return watchClear();
  const cap=isAdmin()?6:3,seen=new Set();let n=Object.keys(WATCH.minis).length;
  for(const st of list){
    if(st.uid===session||st.run!==s.run)continue;
    const key=s.run+':'+st.pc;if(WATCH.hid.has(key))continue;
    seen.add(st.pc);let m=WATCH.minis[st.pc];
    if(!m){if(n>=cap)continue;
      m=mgPlay(s.game,null,{watch:true,host:watchDock(),who:st.name,onclose:()=>{WATCH.hid.add(key);watchDrop(st.pc)},ended:()=>setTimeout(()=>watchDrop(st.pc),4000),onsound:()=>{WATCH.snd=st.pc;watchSound()},onblocked:()=>{if(WATCH.snd===st.pc)WATCH.snd=''}});
      if(!m)continue;m.__key=key;m.__at=0;WATCH.minis[st.pc]=m;n++}
    m.__at=performance.now();m.feed(Object.assign({},st.snap,{age:st.age}));
    if(st.snap.ph==='x')watchDrop(st.pc)}
  for(const pc of Object.keys(WATCH.minis))if(!seen.has(pc)&&performance.now()-WATCH.minis[pc].__at>1500)watchDrop(pc);
  watchSound()}
function watchSound(){const ks=Object.keys(WATCH.minis);if(!ks.length)return;if(!WATCH.snd||!WATCH.minis[WATCH.snd])WATCH.snd=ks[0];ks.forEach(pc=>{const m=WATCH.minis[pc];if(m.setMute)m.setMute(pc!==WATCH.snd)})}
async function watchLoop(){
  if(WATCH.run)return;WATCH.run=true;
  try{
    while(REMOTE&&session&&!document.hidden){
      const rid=watchRoom();
      if(!rid||MGP){watchClear();WATCH.v=null;await liveSleep(1000);continue}
      if(rid!==WATCH.rid){watchClear();WATCH.rid=rid;WATCH.v=null}
      const ac=WATCH.ac=new AbortController(),tm=setTimeout(()=>ac.abort(),30000);let j;
      try{
        const r=await fetch('api/mgfeed?room='+encodeURIComponent(rid)+(WATCH.v==null?'':'&v='+WATCH.v),{credentials:'same-origin',headers:{'X-Requested-With':'dd'},signal:ac.signal});
        if(!r.ok){const e=new Error('feed');e.status=r.status;throw e}
        j=await r.json();WATCH.fails=0}
      catch(e){clearTimeout(tm);if(document.hidden)break;if(e&&e.status===401)break;WATCH.fails=Math.min(WATCH.fails+1,5);await liveSleep(1000*2**WATCH.fails);continue}
      clearTimeout(tm);WATCH.v=j.v;watchApply(rid,j.streams||[]);
      if(!j.streams||!j.streams.length)await liveSleep(300)}
  }finally{WATCH.run=false;WATCH.ac=null}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(WATCH.ac)WATCH.ac.abort();watchClear()}});
setInterval(()=>{
  if(REMOTE&&session&&!document.hidden&&!WATCH.run&&watchRoom()&&!MGP)watchLoop();
  const now=performance.now();for(const pc of Object.keys(WATCH.minis))if(now-WATCH.minis[pc].__at>6000)watchDrop(pc)},1000);
