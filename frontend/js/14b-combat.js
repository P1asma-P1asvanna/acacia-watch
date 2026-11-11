/* ---------- combat: conditions on combatants, damage / heal, and the rules engine (GM side) ----------
   entry.fx = [{id, cid, left, u, lv, tc, rc}]   cid = condition id, left = turns/rounds left (null = until removed),
                                                 lv = level, tc / rc = turns / rounds that passed since it was gained
   I.q   = pending rule prompts [{id, eid, cid, rid, why}]  (the GM decides / rolls; nothing happens behind their back)
   I.log = recent events (GM only)
   Players only get {cid,left,u,lv} per combatant (see backend/acacia/store.py player_rooms). */
const CB={
  rsS:['Short rest','Short rest'],rsL:['Long rest','Long rest'],restS:['พักสั้น (Short rest)','Short rest taken'],restL:['พักยาว (Long rest) — ฟื้น HP ทุกคน','Long rest taken — HP restored'],restSH:['ลบสถานะที่จบเมื่อพักสั้น และเรียกกฎ "เมื่อพัก"','Ends conditions that end on a short rest and queues "when it rests" rules'],restLH:['ฟื้น HP เต็ม ลบ Temp HP คืน Hit Dice ครึ่งหนึ่ง ลบสถานะที่จบเมื่อพัก และเรียกกฎ "เมื่อพัก"','Full HP, clears temp HP, regains half the hit dice, ends rest-ending conditions and queues "when it rests" rules'],
  pending:['รอตัดสิน','Pending'],pendingHint:['กฎของสถานะที่ถึงเวลาทำงาน กดทอยหรือเลือกผลได้เลย','Condition rules that came due. Roll or choose the result.'],
  log:['บันทึกเหตุการณ์','Event log'],noLog:['ยังไม่มีเหตุการณ์','Nothing yet'],
  dmg:['ดาเมจ','Damage'],heal:['ฮีล','Heal'],temp:['Temp HP','Temp HP'],amt:['จำนวน','Amount'],anyType:['ไม่ระบุประเภท','No type'],
  addFx:['+ ติดสถานะ','+ Add condition'],pick:['เลือกสถานะ','Choose a condition'],dN:['ระยะ','Length'],dDef:['ตามค่าเริ่มต้น','Default'],
  rollFor:['🎲 ทอยให้','🎲 Roll'],pass:['ผ่าน','Pass'],fail:['ไม่ผ่าน','Fail'],use:['ใช้ผล','Apply'],skip:['ข้าม','Skip'],clearQ:['ล้างทั้งหมด','Clear all'],
  rmFx:['ลบสถานะ','Remove condition'],lvUp:['เพิ่มระดับ','Raise level'],lvDn:['ลดระดับ','Lower level'],
  w_start_turn:['เริ่ม Turn','Start of turn'],w_end_turn:['จบ Turn','End of turn'],w_start_round:['เริ่ม Round','Start of round'],w_end_round:['จบ Round','End of round'],w_lastturn:['Turn สุดท้าย','Last turn'],w_apply:['ได้รับสถานะ','Gained'],w_remove:['สถานะจบ','Ended'],w_damaged:['โดนดาเมจ','Damaged'],w_attack:['ทอยโจมตี','Attack'],w_hit:['ถูกโจมตีโดน','Hit'],w_move:['เคลื่อนที่','Move'],w_action:['ใช้ Action','Action'],w_healed:['ได้รับการรักษา','Healed'],
  trig:['ใช้กฎ…','Trigger…'],unitTurn:['Turn (นับเมื่อจบตาตัวเอง)','Turn (counts at the end of its own turn)'],unitRound:['Round (นับเมื่อจบรอบ)','Round (counts at the end of the round)'],hp0:['HP 0','HP 0'],none:['ไม่มีสถานะ','No conditions'],
  sheetOnly:['(ตั้งเอง)','(by hand)'],inEffect:['มีผลตอนนี้','in effect'],left:['เหลือ','left'],
  e_turn_start:['▶ ถึงตาของ {n} — สถานะที่ติดอยู่มีผลตอนนี้','▶ {n}\'s turn — these conditions are in effect now'],
  e_round_start:['🔔 เริ่ม Round {r} — {n} ยังติดสถานะ','🔔 Round {r} begins — {n} still has'],
  e_expire:['⌛ {n}: {c} หมดเวลาแล้ว','⌛ {n}: {c} has run out'],evtTitle:['เกิดอะไรขึ้นตอนนี้','What just happened'],
  howT:['อ่านสถานะยังไง?','How to read conditions?'],
  how1:['ป้ายสีใต้ชื่อ = สถานะที่ติดอยู่ ตัวเลข "เหลือ" = เวลาที่เหลือ','A coloured tag under a name is a condition on that creature. "left" is the time remaining.'],
  how2:['ป้ายที่มี ● มีผลตอนนี้ = เพิ่งถึงตาของตัวนั้น หรือเพิ่งเปลี่ยนรอบ สถานะนี้กำลังทำงานอยู่','A tag marked ● in effect means it just became that creature\'s turn, or the round just changed: the condition is working right now.'],
  how3:['"Turn" นับลดเมื่อจบตาของตัวที่ติดสถานะ · "Round" นับลดเมื่อจบรอบ (ทุกคนเล่นครบแล้ว)','"Turn" counts down when the affected creature\'s own turn ends · "Round" counts down when the round ends (everyone has played).'],
  how4:['กดที่ป้ายเพื่อดูว่าสถานะนั้นทำอะไร','Tap a tag to see what the condition does.'],
roundLbl:['Round','Round']};
const cb=k=>(CB[k]||[k,k])[lang==='th'?0:1];
const cbCond=id=>(CAT.conditions||[]).find(c=>c.id===id)||null;
const cbEntry=(I,id)=>I.list.find(e=>e.id===id)||null;
const cbIsPc=e=>!!(e.ref&&e.ref.startsWith('pc:'));
/* ---- hit points of a combatant (a sheet character, or a custom foe with its own numbers) ---- */
function cbHp(e){
  const c=iniChar(e);
  if(c)return{ok:true,cur:curHp(c),max:c.hp,tmp:Math.max(0,Math.round(num(c.hpTemp)))};
  if(e.hp==null)return{ok:false,cur:0,max:0,tmp:0};
  return{ok:true,cur:e.hp,max:e.hpMax!=null?e.hpMax:e.hp,tmp:Math.max(0,Math.round(num(e.tmp)))};
}
function cbSetHp(e,cur,tmp){
  const c=iniChar(e);
  if(c){c.hpCur=cur;c.hpTemp=tmp;if(cur>0&&c.death)c.death={s:0,f:0};commit(cbIsPc(e)?'pc':'npc')}
  else{if(e.hpMax==null)e.hpMax=Math.max(e.hp||0,cur);e.hp=cur;e.tmp=tmp}
}
function cbRollExpr(x){
  const s=String(x||'0').replace(/\s/g,''),m=s.match(/^([+-]?)(\d{1,2})d(\d{1,3})([+-]\d{1,3})?$/);
  if(!m){const n=Math.round(num(s));return{total:n,txt:String(n)}}
  const n=Number(m[2]),f=Number(m[3]),rolls=[];for(let i=0;i<n;i++)rolls.push(1+Math.floor(Math.random()*f));
  const sum=rolls.reduce((a,b)=>a+b,0)+Number(m[4]||0),sg=m[1]==='-'?-1:1;
  return{total:sg*sum,txt:`${s} [${rolls.join('+')}${m[4]?m[4]:''}]`}}
/* ---- log ---- */
function cbLog(I,txt){I.log=I.log||[];I.log.unshift(`${cb('roundLbl')} ${I.round}: ${txt}`);if(I.log.length>40)I.log.length=40}
/* ---- all rule acts of one kind that currently apply to a combatant (for resistances) ---- */
function cbPassive(e,t){
  const out=[];(e.fx||[]).forEach(f=>{const c=cbCond(f.cid);if(!c)return;(c.rules||[]).forEach(r=>{if(r.when==='always')(r.ok||[]).forEach(a=>{if(a.t===t)out.push(a)})})});return out}
function cbScale(e,amt,dtype){
  if(!dtype)return{n:amt,note:''};
  const rs=cbPassive(e,'res').filter(a=>a.dtype==='all'||a.dtype===dtype);
  if(rs.some(a=>a.m==='immune'))return{n:0,note:lang==='th'?' (ภูมิคุ้มกัน)':' (immune)'};
  const re=rs.some(a=>a.m==='resist'),vu=rs.some(a=>a.m==='vuln');
  if(re&&!vu)return{n:Math.floor(amt/2),note:lang==='th'?' (ต้านทาน)':' (resisted)'};
  if(vu&&!re)return{n:amt*2,note:lang==='th'?' (อ่อนแอ)':' (vulnerable)'};
  return{n:amt,note:''}}
/* ---- damage / heal / temp ---- */
function cbDamage(I,e,amount,dtype){
  const h=cbHp(e);if(!h.ok||amount<=0)return;
  const s=cbScale(e,amount,dtype);let r=s.n,tmp=h.tmp;const ab=Math.min(tmp,r);tmp-=ab;r-=ab;const cur=Math.max(0,h.cur-r);
  cbSetHp(e,cur,tmp);
  cbLog(I,`${iniName(e)}: ${s.n} ${dtype||''} ${lang==='th'?'ดาเมจ':'damage'}${s.note} → HP ${h.cur}→${cur}${tmp!==h.tmp?` (temp ${h.tmp}→${tmp})`:''}${cur===0?' ⚠ 0':''}`);
  if(s.n>0){cbEndBy(I,e,'damage');cbFire(I,e,'damaged','')}
}
function cbHeal(I,e,amount){
  const h=cbHp(e);if(!h.ok||amount<=0)return;const cur=Math.min(h.max,h.cur+amount);
  cbSetHp(e,cur,h.tmp);cbLog(I,`${iniName(e)}: ${lang==='th'?'ฟื้น':'healed'} ${cur-h.cur} → HP ${h.cur}→${cur}`);
  cbEndBy(I,e,'heal');cbFire(I,e,'healed','')}
function cbTemp(I,e,amount){
  const h=cbHp(e);if(!h.ok||amount<=0)return;const tmp=Math.max(h.tmp,amount);
  cbSetHp(e,h.cur,tmp);cbLog(I,`${iniName(e)}: Temp HP ${h.tmp}→${tmp}`)}
/* ---- conditions on a combatant ---- */
function cbAddFx(I,e,cid,dur){
  const c=cbCond(cid);if(!c)return;e.fx=e.fx||[];
  const d=dur&&dur.u?dur:(c.dur&&c.dur.u?c.dur:{u:'',n:0}),left=d.u?d.n:null,have=e.fx.filter(f=>f.cid===cid);
  if(have.length&&c.stack!=='stack'){
    const f=have[0];
    if(c.stack==='level'){f.lv=Math.min(c.maxLv||6,(f.lv||1)+1);if(left!=null){f.left=left;f.u=d.u}cbLog(I,`${iniName(e)}: ${c.name} → Lv ${f.lv}`)}
    else if(c.stack==='refresh'){f.left=left;f.u=d.u||'';cbLog(I,`${iniName(e)}: ${c.name} ${lang==='th'?'ต่ออายุ':'refreshed'}`)}
    else cbLog(I,`${iniName(e)}: ${c.name} ${lang==='th'?'มีอยู่แล้ว':'already applied'}`);
    return f}
  const f={id:uid(),cid,left,u:d.u||'',lv:1,tc:0,rc:0};e.fx.push(f);
  cbLog(I,`${iniName(e)}: ${lang==='th'?'ติด':'gained'} ${c.name}${left!=null?` (${left} ${cr(d.u)})`:''}`);
  cbFire(I,e,'apply','',f);return f}
function cbDelFx(I,e,f,why){
  const i=(e.fx||[]).findIndex(x=>x.id===f.id);if(i<0)return;e.fx.splice(i,1);
  const c=cbCond(f.cid);cbLog(I,`${iniName(e)}: ${c?c.name:'?'} ${why||(lang==='th'?'จบลง':'ended')}`);
  cbFire(I,e,'remove','',f)}
function cbEndBy(I,e,what){(e.fx||[]).slice().forEach(f=>{const c=cbCond(f.cid);if(c&&(c.ends||[]).includes(what))cbDelFx(I,e,f,lang==='th'?`จบเพราะ ${what}`:`ended by ${what}`)})}
/* ---- queue the rules that came due ---- */
function cbFire(I,e,when,unit,only){
  I.q=I.q||[];
  const list=only?[only]:(e.fx||[]).slice();
  list.forEach(f=>{const c=cbCond(f.cid);if(!c)return;
    (c.rules||[]).forEach(r=>{
      if(r.when!==when)return;
      if(when==='rest'&&r.rest&&r.rest!=='any'&&r.rest!==unit)return;
      if((when==='start'||when==='end')){
        if(r.unit!==unit)return;const k=(unit==='turn'?f.tc:f.rc)+1,ev=Math.max(1,r.every||1);if(k%ev!==0)return}
      if(!(r.ok||[]).length&&!(r.no||[]).length)return;
      I.q.push({id:uid(),eid:e.id,cid:f.cid,rid:r.id,why:when==='start'||when==='end'?`${when}_${unit}`:when,lv:f.lv||1})})})}
/* ---- turn / round flow ----
   "Turn" durations tick down when the owner's own turn ends. "Round" durations tick down when the round ends (everybody has played).
   Every step records what is in effect (I.evt, and fx.hl on each condition) so both the GM and the players can see it. */
const cbEvt=(I,k,e,cid)=>{I.evt=I.evt||[];I.evt.push({k,eid:e.id,cid:cid||'',r:I.round})};
function cbClearHl(I){I.evt=[];I.list.forEach(e=>(e.fx||[]).forEach(f=>{f.hl=''}))}
function cbMark(I,k,e,hl){(e.fx||[]).forEach(f=>{cbEvt(I,k,e,f.cid);f.hl=hl})}
function cbExpire(I,e,f){cbEvt(I,'expire',e,f.cid);cbDelFx(I,e,f,lang==='th'?'หมดเวลา':'expired')}
function cbEndTurn(I,e){
  if(!e)return;
  cbFire(I,e,'end','turn');
  (e.fx||[]).slice().forEach(f=>{if(f.left===1&&f.u==='turn')cbFire(I,e,'lastturn','',f)});
  (e.fx||[]).slice().forEach(f=>{f.tc=(f.tc||0)+1;if(f.left!=null&&f.u==='turn'){f.left--;if(f.left<=0)cbExpire(I,e,f)}})}
function cbEndRound(I){
  I.list.forEach(e=>{
    cbFire(I,e,'end','round');
    (e.fx||[]).slice().forEach(f=>{if(f.left===1&&f.u==='round')cbFire(I,e,'lastturn','',f)});
    (e.fx||[]).slice().forEach(f=>{f.rc=(f.rc||0)+1;if(f.left!=null&&f.u==='round'){f.left--;if(f.left<=0)cbExpire(I,e,f)}})})}
function cbStartRound(I){I.list.forEach(e=>{cbMark(I,'round_start',e,'round');cbFire(I,e,'start','round')})}
function cbStartTurn(I,e){cbMark(I,'turn_start',e,'turn');cbFire(I,e,'start','turn')}
function cbNext(I){
  const act=iniActive(I);if(!act.length)return;const i=act.findIndex(x=>x.id===I.cur);
  cbClearHl(I);
  if(i<0){I.cur=act[0].id;I.round=Math.max(1,I.round);cbStartRound(I);cbStartTurn(I,act[0]);return}
  cbEndTurn(I,act[i]);
  if(i+1>=act.length){cbEndRound(I);I.cur=act[0].id;I.round++;cbStartRound(I)}else I.cur=act[i+1].id;
  const nx=cbEntry(I,I.cur);if(nx)cbStartTurn(I,nx)}
function cbPrev(I){   /* going back only moves the marker; it does not undo effects */
  const act=iniActive(I);if(!act.length)return;cbClearHl(I);const i=act.findIndex(x=>x.id===I.cur);
  if(i<0){I.cur=act[0].id;I.round=Math.max(1,I.round)}
  else if(i===0){if(I.round>1){I.round--;I.cur=act[act.length-1].id}}else I.cur=act[i-1].id}
/* ---- run the effects of a rule outcome (only what can safely be done is done; the rest is logged for the GM) ---- */
function cbApply(I,e,f,acts){
  (acts||[]).forEach(a=>{
    switch(a.t){
      case'dmg':{const r=cbRollExpr(a.dice);cbDamage(I,e,Math.max(0,r.total),a.dtype);break}
      case'heal':{const r=cbRollExpr(a.dice);cbHeal(I,e,Math.max(0,r.total));break}
      case'temp':{const r=cbRollExpr(a.dice);cbTemp(I,e,Math.max(0,r.total));break}
      case'add':if(a.cid)cbAddFx(I,e,a.cid,a.dur);break;
      case'rem':{
        if(a.cid==='self'){if(f)cbDelFx(I,e,f)}
        else if(a.cid==='all'){(e.fx||[]).slice().forEach(x=>{if(!f||x.id!==f.id)cbDelFx(I,e,x)})}
        else (e.fx||[]).filter(x=>x.cid===a.cid).forEach(x=>cbDelFx(I,e,x));break}
      case'dur':if(f){if(a.m==='end')cbDelFx(I,e,f);else if(f.left!=null){f.left=Math.max(1,f.left+(a.m==='add'?a.n:-a.n))}}break;
      case'lvl':if(f){const c=cbCond(f.cid);f.lv=Math.min((c&&c.maxLv)||6,(f.lv||1)+a.n);if(f.lv<=0)cbDelFx(I,e,f);else cbLog(I,`${iniName(e)}: ${c?c.name:''} Lv ${f.lv}`)}break;
      default:cbLog(I,`${iniName(e)}: ${crActText(a)} ${cb('sheetOnly')}`)}})}
function cbBonus(e,chk){
  const c=iniChar(e);if(!c||!c.abil)return 0;const ab=String(chk.ab||'CON').toLowerCase(),pb=prof(c.level);
  if(chk.k==='save')return mod(abT(c,ab))+pb*profLevel(c,'save',ab);
  if(chk.k==='check'){if(chk.skill){const s=(typeof SKILLS!=='undefined'?SKILLS:[]).find(x=>x[0]===chk.skill);const a=s?s[2]:ab;return mod(abT(c,a))+pb*profLevel(c,'skill',chk.skill)}return mod(abT(c,ab))}
  return 0}
function cbQAction(a,id){
  const rm=rooms.find(r=>r.id===roomOpen);if(!rm)return;const I=iniData(rm);I.q=I.q||[];
  if(a==='q-clear'){I.q=[];return true}
  const i=I.q.findIndex(x=>x.id===id);if(i<0)return true;const q=I.q[i];I.q.splice(i,1);
  if(a==='q-skip')return true;
  const e=cbEntry(I,q.eid),c=cbCond(q.cid),r=c&&(c.rules||[]).find(x=>x.id===q.rid);if(!e||!r)return true;
  const f=(e.fx||[]).find(x=>x.cid===q.cid)||null;
  if(a==='q-use'){cbApply(I,e,f,r.ok);return true}
  let passed=a==='q-pass';
  if(a==='q-roll'&&r.chk){
    const k=r.chk;let total,txt;
    if(k.k==='dice'){const x=cbRollExpr(k.dice);total=x.total;txt=x.txt}
    else{const d=1+Math.floor(Math.random()*20),b=k.k==='flat'?0:cbBonus(e,k);total=d+b;txt=`d20 ${d}${b?` ${sgn(b)}`:''}`}
    passed=total>=k.dc;cbLog(I,`${iniName(e)}: ${c.name} — ${crChkText(k)}: ${txt} = ${total} → ${passed?cb('pass'):cb('fail')}`)}
  cbApply(I,e,f,passed?r.ok:r.no);return true}
/* the whole group takes a rest: conditions that end on it are removed, "when it rests" rules are queued, long rest restores HP */
function cbRest(I,kind){
  cbLog(I,cb(kind==='long'?'restL':'restS'));
  I.list.forEach(e=>{
    cbEndBy(I,e,'short');if(kind==='short'){const c=iniChar(e);if(c){restShort(c);commit(cbIsPc(e)?'pc':'npc')}}
    if(kind==='long')cbEndBy(I,e,'long');
    if(kind==='long'){const c=iniChar(e);if(c){restLong(c);commit(cbIsPc(e)?'pc':'npc')}else if(e.hpMax!=null){e.hp=e.hpMax;e.tmp=0}}
    cbFire(I,e,'rest',kind)})}
function cbAction(a,b){
  const rm=rooms.find(r=>r.id===roomOpen);if(!rm)return;const I=iniData(rm),id=b.dataset.id;I.q=I.q||[];
  if(a==='cb-rest'){cbRest(I,b.dataset.k==='long'?'long':'short')}
  else if(a.startsWith('q-')){cbQAction(a,id)}
  else{
    const e=cbEntry(I,id);if(!e)return;
    const amtEl=document.querySelector(`[data-cbamt="${id}"]`),amt=Math.max(0,Math.round(num(amtEl&&amtEl.value)));
    if(a==='cb-dmg'){const dt=document.querySelector(`[data-cbdt="${id}"]`);cbDamage(I,e,amt,dt&&dt.value)}
    else if(a==='cb-heal')cbHeal(I,e,amt);
    else if(a==='cb-temp')cbTemp(I,e,amt);
    else if(a==='fx-add'){
      const cid=document.querySelector(`[data-cbfx="${id}"]`).value;if(!cid)return;
      const n=document.querySelector(`[data-cbn="${id}"]`).value,u=document.querySelector(`[data-cbu="${id}"]`).value;
      cbAddFx(I,e,cid,n||u?{u:u||'round',n:Math.max(1,Math.round(num(n))||1)}:null)}
    else if(a==='fx-del'){const f=(e.fx||[]).find(x=>x.id===b.dataset.fx);if(f)cbDelFx(I,e,f,lang==='th'?'ถูกลบโดย GM':'removed by the GM')}
    else if(a==='fx-lv'){const f=(e.fx||[]).find(x=>x.id===b.dataset.fx),c=f&&cbCond(f.cid);if(f){f.lv=Math.max(0,Math.min((c&&c.maxLv)||6,(f.lv||1)+Number(b.dataset.d)));if(f.lv<=0)cbDelFx(I,e,f)}}
    else if(a==='fx-trig'){const f=(e.fx||[]).find(x=>x.id===b.dataset.fx),c=f&&cbCond(f.cid),r=c&&(c.rules||[]).find(x=>x.id===b.dataset.rid);if(r)I.q.push({id:uid(),eid:e.id,cid:f.cid,rid:r.id,why:r.when,lv:f.lv||1})}}
  saveRooms();render()}
/* ---- markup ---- */
const cbUnitTxt=(f)=>f.left!=null&&f.u?` · ${cb('left')} ${f.left} ${cr(f.u)}`:'';
function cbChip(e,f,gm){
  const c=cbCond(f.cid);if(!c)return'';
  const lv=c.stack==='level'?` ${f.lv||1}`:'',hit=f.hl?` hit`:'';
  return`<span class="fxchip${hit}"${ccs(c)}><button class="fxb" data-act="cpop" data-id="${c.id}" title="${esc(c.sum||'')}">${condIcon(c,16)}<span>${esc(c.name)}${lv}${cbUnitTxt(f)}</span>${f.hl?`<em class="fxnow">● ${cb('inEffect')}</em>`:''}</button>${gm?`${c.stack==='level'?`<button class="fxs" data-act="fx-lv" data-id="${e.id}" data-fx="${f.id}" data-d="-1" aria-label="${cb('lvDn')}">−</button><button class="fxs" data-act="fx-lv" data-id="${e.id}" data-fx="${f.id}" data-d="1" aria-label="${cb('lvUp')}">+</button>`:''}<button class="fxs fxx" data-act="fx-del" data-id="${e.id}" data-fx="${f.id}" aria-label="${cb('rmFx')}: ${esc(c.name)}">✕</button>`:''}</span>`}
/* the manual triggers (attack, hit, move, action) the GM can fire on a combatant */
function cbManual(e){
  const out=[];(e.fx||[]).forEach(f=>{const c=cbCond(f.cid);if(!c)return;(c.rules||[]).forEach(r=>{if(['attack','hit','move','action'].includes(r.when)&&((r.ok||[]).length||(r.no||[]).length))out.push(`<button class="btn small" data-act="fx-trig" data-id="${e.id}" data-fx="${f.id}" data-rid="${r.id}" title="${esc(crRuleText(r))}">⚡ ${esc(c.name)}: ${esc(cr('w_'+r.when))}</button>`)})});
  return out.join('')}
function cbSub(e){
  const h=cbHp(e),conds=CAT.conditions||[],dts=CR_DT.map(x=>`<option value="${x}">${x}</option>`).join('');
  const hp=h.ok?`<div class="cb-hp"><span class="cb-hptxt">HP ${h.cur} / ${h.max}${h.tmp?` +${h.tmp}`:''}${h.cur===0?` · <b class="err">${cb('hp0')}</b>`:''}</span>
    <input type="number" min="0" class="cb-amt" data-cbamt="${e.id}" placeholder="${cb('amt')}" aria-label="${cb('amt')}: ${esc(iniName(e))}">
    <select data-cbdt="${e.id}" aria-label="${cb('anyType')}"><option value="">${cb('anyType')}</option>${dts}</select>
    <button class="btn small danger" data-act="cb-dmg" data-id="${e.id}">${cb('dmg')}</button><button class="btn small" data-act="cb-heal" data-id="${e.id}">${cb('heal')}</button><button class="btn small" data-act="cb-temp" data-id="${e.id}">${cb('temp')}</button></div>`:'';
  const fx=`<div class="cb-fx">${(e.fx||[]).map(f=>cbChip(e,f,true)).join('')||`<span class="note">${cb('none')}</span>`}</div>
    <div class="cb-add"><select data-cbfx="${e.id}" aria-label="${cb('pick')}"><option value="">${cb('pick')}</option>${conds.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
    <input type="number" min="1" max="999" class="cb-n" data-cbn="${e.id}" placeholder="${cb('dN')}" aria-label="${cb('dN')}">
    <select data-cbu="${e.id}" aria-label="${cb('dN')}"><option value="">${cb('dDef')}</option><option value="turn">${cb('unitTurn')}</option><option value="round">${cb('unitRound')}</option><option value="minute">${cr('minute')}</option><option value="hour">${cr('hour')}</option></select>
    <button class="btn small" data-act="fx-add" data-id="${e.id}">${cb('addFx')}</button>${cbManual(e)}</div>`;
  return`<div class="ini-sub">${hp}${fx}</div>`}
function cbQueue(I){
  const q=I.q||[];if(!q.length)return'';
  const items=q.map(x=>{
    const e=cbEntry(I,x.eid),c=cbCond(x.cid),r=c&&(c.rules||[]).find(y=>y.id===x.rid);if(!e||!r)return'';
    const btns=r.chk?`<button class="btn small primary" data-act="q-roll" data-id="${x.id}">${cb('rollFor')}</button><button class="btn small" data-act="q-pass" data-id="${x.id}">${cb('pass')}</button><button class="btn small" data-act="q-fail" data-id="${x.id}">${cb('fail')}</button>`
      :`<button class="btn small primary" data-act="q-use" data-id="${x.id}">${cb('use')}</button>`;
    return`<li class="cbq"><div class="cbq-t"><b>${esc(iniName(e))}</b> · <span class="fxchip"${ccs(c)}><span class="fxb">${condIcon(c,16)}<span>${esc(c.name)}</span></span></span> · <small>${esc(cb('w_'+x.why))}</small><div>${esc(crRuleText(r))}</div></div><div class="cbq-b">${btns}<button class="btn small" data-act="q-skip" data-id="${x.id}">${cb('skip')}</button></div></li>`}).join('');
  return`<div class="cbqwrap" role="status"><div class="cbq-h"><b>${cb('pending')} (${q.length})</b><span class="note">${cb('pendingHint')}</span><button class="btn small" data-act="q-clear">${cb('clearQ')}</button></div><ul class="cbq-list">${items}</ul></div>`}
function cbLogHtml(I){
  const L=I.log||[];
  return`<details class="cblog"><summary>${cb('log')} (${L.length})</summary>${L.length?`<ul>${L.slice(0,25).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p class="note">${cb('noLog')}</p>`}</details>`}

/* "What just happened" strip (GM and players): built from I.evt / room.evt, grouped per combatant */
function cbEvtHtml(evt,list,gm){
  if(!evt||!evt.length)return'';
  const by=new Map(list.map(e=>[e.id,e])),groups=new Map(),nameOf=e=>gm?iniName(e):e.name;
  evt.forEach(x=>{const e=by.get(x.eid);if(!e)return;const key=x.k+'|'+x.eid;if(!groups.has(key))groups.set(key,{k:x.k,e,r:x.r,cids:[]});groups.get(key).cids.push(x.cid)});
  if(!groups.size)return'';
  const fill=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]!==undefined?o[k]:m);
  const rows=[...groups.values()].map(g=>{
    if(g.k==='expire')return g.cids.map(cid=>{const c=cbCond(cid);return`<div class="evt-row k-expire">${esc(fill(cb('e_expire'),{n:nameOf(g.e),c:c?c.name:'?'}))}</div>`}).join('');
    const chips=g.cids.map(cid=>{const c=cbCond(cid),f=(g.e.fx||[]).find(x=>x.cid===cid)||{cid,hl:'x'};return c?cbChip(g.e,Object.assign({},f,{hl:f.hl||'x'}),false):''}).join('');
    return`<div class="evt-row k-${g.k}">${esc(fill(cb('e_'+g.k),{n:nameOf(g.e),r:g.r}))}<div class="cb-fx">${chips}</div></div>`}).join('');
  return rows?`<div class="evtbox" role="status"><div class="evt-h">${cb('evtTitle')}</div>${rows}</div>`:''}
function cbHowHtml(){return`<details class="howfx"><summary>${cb('howT')}</summary><ul><li>${cb('how1')}</li><li>${cb('how2')}</li><li>${cb('how3')}</li><li>${cb('how4')}</li></ul></details>`}
