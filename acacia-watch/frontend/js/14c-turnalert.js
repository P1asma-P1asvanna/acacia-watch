/* ---------- "it is your turn" alert for players: a short vibration, two soft beeps and a banner.
   It fires when the live state changes the current turn to one of the player's own characters. Setting: PREFS.turn (on by default). ---------- */
let TURNSEEN=null,TURNTITLE='';
const turnOn=()=>(PREFS&&PREFS.turn)!=='off';
function turnBeep(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=new A(),g=c.createGain();g.gain.value=.06;g.connect(c.destination);[0,.22].forEach(t0=>{const o=c.createOscillator();o.type='sine';o.frequency.value=t0?988:784;o.connect(g);o.start(c.currentTime+t0);o.stop(c.currentTime+t0+.16)});setTimeout(()=>{try{c.close()}catch(e){}},900)}catch(e){}}
function turnBanner(msg){let b=document.getElementById('turnbar');if(!b){b=document.createElement('div');b.id='turnbar';b.setAttribute('role','alert');b.addEventListener('click',()=>b.remove());document.body.appendChild(b)}
  b.textContent=msg;clearTimeout(b._t);b._t=setTimeout(()=>b.remove(),7000)}
let TENDSEEN=null;
/* GM: a player pressed End Turn */
function turnEndWatch(){
  if(!isAdmin())return;const now={};
  rooms.forEach(rm=>{const st=TURNS[rm.id],cur=rm.init&&rm.init.cur,e=st&&cur&&st.cur===cur?st.e[cur]:null;now[rm.id]=e&&e.end?cur:''});
  const prev=TENDSEEN;TENDSEEN=now;if(!prev||!turnOn())return;
  for(const rid in now){if(now[rid]&&prev[rid]!==now[rid]){
    const rm=rooms.find(r=>r.id===rid),en=rm&&rm.init.list.find(x=>x.id===now[rid]);if(!en||!String(en.ref||'').startsWith('pc:'))continue;
    try{navigator.vibrate&&navigator.vibrate([120])}catch(e){}
    turnBeep();turnBanner(fill(t('taEndAlert'),{n:iniName(en)}));break}}}
function turnWatch(){
  try{turnEndWatch()}catch(e){}
  try{
    const now={};(prooms||[]).forEach(rm=>{const c=rm.cur?(rm.list||[]).find(e=>e.id===rm.cur):null;now[rm.id]=!!(c&&c.mine)?c.id:''});
    const prev=TURNSEEN;TURNSEEN=now;if(!prev||!turnOn())return;
    for(const rid in now){if(now[rid]&&prev[rid]!==now[rid]){
      const rm=prooms.find(r=>r.id===rid),c=rm.list.find(e=>e.id===now[rid]);
      try{navigator.vibrate&&navigator.vibrate([180,90,180])}catch(e){}
      turnBeep();turnBanner(fill(t('turnYours'),{n:c?c.name:''}));
      if(document.hidden){if(!TURNTITLE)TURNTITLE=document.title;document.title='▶ '+t('turnTitle')}
      break}}
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&TURNTITLE){document.title=TURNTITLE;TURNTITLE=''}});
Object.assign(TX.th,{turnYours:'ถึงตา {n} แล้ว!',turnTitle:'ถึงตาคุณ',turnSet:'แจ้งเตือนเมื่อถึงตาตัวเอง (สั่น + เสียงสั้น)',turnOnL:'เปิด',turnOffL:'ปิด'});
Object.assign(TX.en,{turnYours:"It's {n}'s turn!",turnTitle:'Your turn',turnSet:'Alert when it is my turn (vibration + short beep)',turnOnL:'On',turnOffL:'Off'});
