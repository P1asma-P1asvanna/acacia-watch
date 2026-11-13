/* ---------- live updates (server mode only): long polling ----------
   api/poll holds the question "did anything change since version V?" open on the server (no database work)
   and answers the moment somebody saves. We then reload the data, and redraw only if it really differs
   and nobody is typing, so the page never jumps under a finger. */
const LIVE={v:null,run:false,ac:null,fails:0,dirty:false,timer:0};
const liveSleep=ms=>new Promise(r=>setTimeout(r,ms));
const liveSig=()=>JSON.stringify([users,pcs,npcs,rooms,prooms,SITE,PREFS,CAT,FEEDS,MEMBERS]);
function liveBusy(){
  if(edit||dedit||profDraft||roomEdit||inflight||layTimer||document.body.classList.contains('dragging-w'))return true;
  const a=document.activeElement;
  return !!(a&&a!==document.body&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.closest&&a.closest('#root'));
}
function liveLater(){clearTimeout(LIVE.timer);LIVE.timer=setTimeout(()=>{if(LIVE.dirty){LIVE.dirty=false;livePull()}},1500)}
async function livePull(pre){   /* pre = the state that came with the poll answer (no extra request needed) */
  if(!REMOTE||!session)return;
  if(liveBusy()){LIVE.dirty=true;return liveLater()}
  const before=liveSig(),siteBefore=JSON.stringify([SITE,PREFS]);
  let j=pre;if(!j){try{j=await api('GET','api/boot')}catch(e){if(e.status===401)netErr(e);return}
    if(liveBusy()){LIVE.dirty=true;return liveLater()}}  /* the user started typing while we were loading */
  applyBoot(j);
  if(JSON.stringify([SITE,PREFS])!==siteBefore){applySite(curTheme());const bd=document.querySelector('.side .brand');if(bd)bd.innerHTML=brandHtml()}
  if(liveSig()===before)return;
  if(!session||['players','npcs','adventure','data','conditions','feats','spells','profile'].includes(view))render();
}
async function liveLoop(){
  if(LIVE.run)return;LIVE.run=true;
  try{
    while(REMOTE&&session&&!document.hidden){
      const ac=LIVE.ac=new AbortController(),tm=setTimeout(()=>ac.abort(),40000);
      let j;
      try{
        const r=await fetch('api/poll'+(LIVE.v==null?'':'?v='+LIVE.v),{credentials:'same-origin',headers:{'X-Requested-With':'dd'},signal:ac.signal});
        if(!r.ok){const e=new Error('poll');e.status=r.status;throw e}
        j=await r.json();LIVE.fails=0;
      }catch(e){
        clearTimeout(tm);
        if(document.hidden)break;
        if(e&&e.status===401){netErr(e);break}
        LIVE.fails=Math.min(LIVE.fails+1,5);await liveSleep(1000*2**LIVE.fails);continue;
      }
      clearTimeout(tm);
      if(j.v!==LIVE.v){LIVE.v=j.v;await livePull(j.boot)}  /* the first answer also counts: something may have changed since boot */
    }
  }finally{LIVE.run=false;LIVE.ac=null}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(LIVE.ac)LIVE.ac.abort()}else{LIVE.v=null;livePull();liveLoop()}});
document.addEventListener('focusout',()=>{if(LIVE.dirty)liveLater()});
setInterval(()=>{if(REMOTE&&session&&!document.hidden&&!LIVE.run)liveLoop()},1000);  /* starts after login or boot, restarts after errors */
