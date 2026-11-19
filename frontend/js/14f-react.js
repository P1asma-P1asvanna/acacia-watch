/* ---------- Reactions to an attack: the target (and allies who can help) pick a defensive spell / feature ----------
   1. The GM's attack or spell lands on a player character -> the GM's page opens a "threat" (api/turn op "threat") that lists who could
      answer. If nobody has a usable reaction nothing is opened and the damage is applied directly, as before.
   2. Those players get a box (#rxdock) with their usable reaction spells / features. A pick spends the Reaction (and the spell slot) and
      sends its effect (api/turn op "react"); "let it pass" sends op "pass".
   3. The GM's result card recomputes the outcome from the answers (rxOutcome): AC +N can turn a hit into a miss, a counterspell cancels
      it, damage can be reduced / halved, or another character takes it. "Apply" is available once everybody answered (or the GM closes it).
   Effect kinds: ac (+N AC), sub (-N from the attack roll), neg (the attack / spell has no effect), half, res (resistance to elemental
   damage), red (-N damage), take (the answering character takes the damage instead), dis / reroll / note (the GM rules it by hand). */
const RX={seen:{},busy:false,err:''};
const RX_ELEM=['acid','cold','fire','lightning','thunder'];
/* known reactions: name -> what it does. self / ally = who may use it; when = hit (an attack that hit) | spell | elem (elemental damage) */
const RX_DB={
  'shield':{sp:1,self:1,when:'hit',fx:{k:'ac',v:5}},
  'absorb elements':{sp:1,self:1,when:'elem',fx:{k:'res'}},
  'counterspell':{sp:1,self:1,ally:1,when:'spell',fx:{k:'neg'}},
  'silvery barbs':{sp:1,self:1,ally:1,fx:{k:'reroll'}},
  'uncanny dodge':{self:1,when:'hit',fx:{k:'half'}},
  'deflect missiles':{self:1,when:'hit',fx:{k:'red'},dice:[1,10,'dex+lvl']},
  'interception':{ally:1,when:'hit',fx:{k:'red'},dice:[1,10,'pb']},
  'protection':{ally:1,when:'hit',fx:{k:'dis'}},
  'defensive duelist':{self:1,when:'hit',fx:{k:'ac',v:'pb'}},
  'parry':{self:1,when:'hit',fx:{k:'red'},dice:[1,8,'dex']},
  'cutting words':{self:1,ally:1,when:'hit',fx:{k:'sub'},dice:[1,6,'']},
  'warding flare':{self:1,when:'hit',fx:{k:'dis'}}};
const RX_INC=['uncanny dodge','deflect missiles','interception','protection','defensive duelist','parry','cutting words','warding flare'];
/* what a reaction does: from the table by name, otherwise guessed from its text */
function rxClass(name,desc,isSp){
  const n=String(name||'').toLowerCase().trim();let k=RX_DB[n]&&!!RX_DB[n].sp===isSp?n:'';
  if(!k&&!isSp)k=RX_INC.find(x=>n.includes(x))||'';
  if(k)return Object.assign({known:1},RX_DB[k]);
  const x=String(desc||''),ally=/creature|ally|another|within \d+\s*(feet|ft)/i.test(x),m=x.match(/\+\s*(\d+)\s*bonus to (?:your )?AC/i)||x.match(/bonus to (?:your )?AC (?:of )?\+?(\d+)/i);
  if(/bodyguard|guardian|protector|sacrifice|take the (blow|hit)|in (its|their|his|her|your) place|take(s)? (the )?damage instead|instead of (them|it|the target)/i.test(n+' '+x))return{known:0,self:0,ally:1,when:'hit',fx:{k:'take'}};
  if(m)return{known:0,self:1,ally:ally,when:'hit',fx:{k:'ac',v:Number(m[1])}};
  if(/resistance to the (triggering )?damage|half (as much|the) damage|damage is halved|damage you take is halved/i.test(x))return{known:0,self:1,ally:ally,when:'hit',fx:{k:'half'}};
  return{known:0,self:1,ally:ally,fx:{k:'note'}}}
const rxMod=(d,s)=>String(s||'').split('+').filter(Boolean).reduce((a,k)=>a+(k==='pb'?prof(d.level):k==='lvl'?Math.round(num(d.level))||1:ABS.includes(k)?mod(abT(d,k)):0),0);
/* a free spell slot for a spell of level lvl: {v:''} (cantrip), {v:'3'} (a normal slot), {v:'p'} (pact) or null */
function rxSlot(d,lvl){
  if(!lvl)return{v:''};const I=typeof spellInfo==='function'?spellInfo(d):null;if(!I)return null;const sl=d.sl||{u:[],p:0};
  for(let k=lvl-1;k<(I.slots||[]).length;k++)if((sl.u&&sl.u[k]||0)<(I.slots[k]||0))return{v:String(k+1)};
  if(I.pact&&(sl.p||0)<I.pact[0]&&I.pact[1]>=lvl)return{v:'p'};
  return null}
/* the usable reactions of a character against a threat */
function rxOpts(d,th,self){
  if(!d)return[];const out=[],dt=String(th.dt||'').toLowerCase();
  const add=(name,desc,isSp,lvl)=>{
    const c=rxClass(name,desc,isSp);if(self&&!c.self)return;if(!self&&!c.ally)return;
    if(c.when==='hit'&&th.kind!=='atk'&&!(c.fx.k==='half'||c.fx.k==='red'||c.fx.k==='take'))return;
    if(c.when==='spell'&&!th.sp)return;if(c.when==='elem'&&dt&&!RX_ELEM.includes(dt))return;
    if(isSp&&lvl>0&&!rxSlot(d,lvl))return;
    out.push({key:(isSp?'s:':'f:')+name,sp:isSp,name,lvl,c,fx:Object.assign({},c.fx)})};
  (d.spells||[]).forEach(x=>{const sp=spellOf(x.n);if(sp&&sp.timeK==='reaction')add(sp.name||x.n,sp.desc,true,sp.lvl||0)});
  featList(d).forEach(f=>{if(taFeatKind(f)==='reaction')add(f.name||'—',f.desc,false,0)});
  return out}
const rxFxTxt=(fx,dice)=>({ac:`+${fx.v} AC`,sub:dice?t('rxSub'):`−${fx.v} ${t('taToHit')}`,neg:t('rxNeg'),half:t('rxHalf'),res:t('rxRes'),red:dice?t('rxRed'):`−${fx.v} ${t('taDmgN')}`,take:t('rxTake'),dis:t('rxDis'),reroll:t('rxReroll'),note:t('rxNote')})[fx.k]||'';
/* ---- the outcome after the answers ---- */
function rxOutcome(th){
  let ac=th.ac,tot=th.tot,amt=th.amt,take=null;const atk=th.kind==='atk',notes=[];
  const judge=()=>th.nat===20?true:th.nat===1?false:ac==null?true:tot>=ac;
  let hit=atk?judge():true;
  (th.ans||[]).forEach(a=>{const f=a.fx;if(!f)return;
    if(f.k==='ac'){if(atk){ac=(ac==null?0:ac)+f.v;hit=hit&&judge()}else notes.push(a)}
    else if(f.k==='sub'){if(atk){tot-=f.v;hit=hit&&judge()}else notes.push(a)}
    else if(f.k==='neg')hit=false;
    else if(f.k==='half')amt=Math.floor(amt/2);
    else if(f.k==='res'){if(RX_ELEM.includes(String(th.dt||'').toLowerCase()))amt=Math.floor(amt/2);else notes.push(a)}
    else if(f.k==='red')amt=Math.max(0,amt-f.v);
    else if(f.k==='take')take=a.eid;
    else notes.push(a)});
  return{hit,amt:hit?amt:0,take,ac,tot,notes}}
const rxFind=(rid,id)=>{const st=isAdmin()?TURNS[rid]:(taRm(rid)||{}).turn;return st&&(st.th||[]).find(x=>x.id===id)||null};
/* ---- GM: open a threat after an attack / spell on a player character ---- */
async function rxOpen(rid,eid,card,tg,from,label,spell){
  if(!isAdmin()||!tg)return;const en=taEnts(rid).find(x=>x.id===tg.id);if(!en||!String(en.ref).startsWith('pc:'))return;
  const rows=card.rows.slice(from),atk=rows.find(r=>r.k==='atk'),sv=rows.find(r=>r.k==='save'),dm=rows.find(r=>r.k==='dmg'&&r.amt>0);
  if(!dm||(atk&&atk.v!=='hit'&&atk.v!=='crit'))return;
  const th={id:uid()+uid(),to:tg.id,tn:tg.name,fn:taTname(rid,eid),lb:label,kind:atk?'atk':sv?'save':'dmg',tot:atk?atk.tot:0,nat:atk?atk.nat||0:0,ac:atk&&!atk.hide?atk.ac:null,
    amt:dm.amt,dt:dm.dtype||'',sp:spell?1:0,sv:sv?`${(sv.ab||'').toUpperCase()} ${sv.tot} vs DC ${sv.dc}`:'',need:[]};
  const st=taSt(rid);
  taEnts(rid).forEach(x=>{if(!String(x.ref).startsWith('pc:')||x.id===eid)return;if(taSl(st,x.id).s.rea)return;
    const d=taDoc(rid,x.id);if(d&&rxOpts(d,th,x.id===tg.id).length)th.need.push(x.id)});
  if(!th.need.length)return;
  try{await api('POST','api/turn',{room:rid,eid,op:'threat',th});
    dm.th=th.id;st.th=[Object.assign({ts:Math.floor(Date.now()/1000),st:'open',ans:[]},th),...(st.th||[])].slice(0,12)}
  catch(e){console.error('rxOpen',e)}}
/* ---- the GM's card: what the answers did ---- */
function rxCardBlock(c){
  const rid=typeof roomOpen!=='undefined'?roomOpen:'';if(!rid)return'';
  return c.rows.filter(r=>r.th).map(r=>{const th=rxFind(rid,r.th);if(!th)return'';
    const o=rxOutcome(th),open=th.st==='open',names=id=>taTname(rid,id)||'?';
    const wait=th.need.filter(x=>!(th.ans||[]).some(a=>a.eid===x)).map(names).join(', ');
    const ans=(th.ans||[]).map(a=>`<li>${a.fx?`🛡 <b>${esc(a.name)}</b> · ${esc(a.n)} — ${esc(a.txt||rxFxTxt(a.fx))}`:`<span class="rx-pass">${esc(a.name)} · ${t('rxPassed')}</span>`}</li>`).join('');
    const head=open?`${t('rxWaiting')}: ${esc(wait)}`:!o.hit?'✔ '+t('rxNoEffect'):o.take?`${t('rxFinal')} ${o.amt} → ${esc(names(o.take))}`:`${t('rxFinal')} ${o.amt}`;
    return`<div class="tr rx ${open?'mid':o.hit?'bad':'ok'}"><div class="tr-big">${open?'⏳':o.hit?o.amt:'✔'}</div><div class="tr-txt"><b>${head}</b>${ans?`<ul class="rx-ans">${ans}</ul>`:`<small>${t('rxNone')}</small>`}
      ${o.notes.length?`<small>⚠ ${t('rxManual')}: ${o.notes.map(a=>esc(a.n+' ('+rxFxTxt(a.fx)+')')).join(', ')}</small>`:''}</div>
      ${open?`<button type="button" class="btn small" data-act="rx-close" data-rid="${rid}" data-v="${th.id}">${t('rxClose')}</button>`:''}</div>`}).join('')}
/* ---- the players' box ---- */
function rxMine(){
  const out=[];(typeof prooms!=='undefined'?prooms:[]).forEach(rm=>{const st=rm.turn;if(!st)return;
    (st.th||[]).forEach(th=>{if(th.st!=='open')return;
      (rm.list||[]).forEach(en=>{if(!en.mine||!en.pc||!(th.need||[]).includes(en.id)||(th.ans||[]).some(a=>a.eid===en.id))return;
        const e=st.e&&st.e[en.id];if(e&&e.s&&e.s.rea)return;
        const d=pcs.find(c=>c.id===en.pc),o=rxOpts(d,th,en.id===th.to);if(o.length)out.push({rid:rm.id,th,en,d,o})})})});
  return out}
function rxCost(d,o){const s=o.sp&&o.lvl?rxSlot(d,o.lvl):null;return o.sp?(o.lvl?(s&&s.v==='p'?t('spPact'):s?t('spLv')+' '+s.v:''):t('spCantrip')):t('rxFeature')}
function rxDock(){
  let el=document.getElementById('rxdock');const L=(session&&!isAdmin())?rxMine():[];
  if(!L.length){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='rxdock';el.setAttribute('role','alertdialog');document.body.appendChild(el)}
  let fresh=false;L.forEach(x=>{const k=x.th.id+x.en.id;if(!RX.seen[k]){RX.seen[k]=1;fresh=true}});
  const by={};L.forEach(x=>{(by[x.th.id]=by[x.th.id]||{th:x.th,rid:x.rid,list:[]}).list.push(x)});
  el.innerHTML=Object.values(by).map(g=>{const th=g.th,self=g.list.some(x=>x.en.id===th.to);
    const hit=th.kind==='atk'?`${t('taToHit')} <b>${th.tot}</b>${th.ac!=null?' '+t('taVsAc')+' '+th.ac:''}`:th.sv?esc(th.sv):'';
    return`<div class="rxc"><div class="rxh">${self?'⚠ '+fill(t('rxYou'),{n:esc(th.fn)}):'🛡 '+fill(t('rxAlly'),{n:esc(th.tn),f:esc(th.fn)})}</div>
      <div class="rxs">${esc(th.lb)} · ${hit}${th.amt?` · ${t('taDmgN')} <b>${th.amt}</b>${th.dt?' '+esc(th.dt):''}`:''}</div>
      ${g.list.map(x=>`<div class="rxp"><b>${esc(x.en.name)}</b>${x.o.map(o=>{const fxt=o.c.fx.k==='ac'&&o.c.fx.v==='pb'?`+${prof(x.d.level)} AC`:o.c.fx.k==='ac'?`+${o.c.fx.v} AC`:rxFxTxt(o.c.fx,o.c.dice),cost=rxCost(x.d,o);
        return`<button type="button" class="btn small rxb" data-act="rx-pick" data-rid="${g.rid}" data-id="${x.en.id}" data-tid="${th.id}" data-k="${esc(o.key)}" ${RX.busy?'disabled':''}><b>${esc(o.name)}</b><small>${esc(fxt)} · ${esc(cost)}${o.c.known?'':' · '+t('rxGuess')}</small></button>`}).join('')}
        <button type="button" class="btn small" data-act="rx-pass" data-rid="${g.rid}" data-id="${x.en.id}" data-tid="${th.id}" ${RX.busy?'disabled':''}>${t('rxLet')}</button></div>`).join('')}
      ${RX.err?`<p class="note err">${esc(RX.err)}</p>`:''}</div>`}).join('');
  if(fresh){try{navigator.vibrate&&navigator.vibrate([200,80,200])}catch(e){}try{turnBeep()}catch(e){}}}
async function rxPick(rid,eid,tid,key){
  if(RX.busy)return;const th=rxFind(rid,tid),d=taDoc(rid,eid);if(!th||!d)return;
  const o=rxOpts(d,th,eid===th.to).find(x=>x.key===key);if(!o)return;
  RX.busy=true;RX.err='';rxDock();
  try{
    let fx=Object.assign({},o.c.fx),txt='';
    if(o.sp&&o.lvl){const s=rxSlot(d,o.lvl);if(!s){RX.err=t('spNoSlot');return}
      d.sl=d.sl||{u:[],p:0};d.sl.u=d.sl.u||[];if(s.v==='p')d.sl.p=(d.sl.p||0)+1;else{const k=Number(s.v)-1;d.sl.u[k]=(d.sl.u[k]||0)+1}
      commit('pc');txt=s.v==='p'?t('spPact'):t('spLv')+' '+s.v}
    if(fx.k==='ac'&&fx.v==='pb')fx.v=prof(d.level);
    if(o.c.dice){const[n,sd,m]=o.c.dice,e=await taRoll(rid,eid,{n,sides:sd,mod:rxMod(d,m),why:o.name});if(!e){RX.err=t('tdFail');return}fx.v=Math.max(0,e.total)}
    if(fx.k==='take')fx.to=eid;
    const lab=rxFxTxt(fx,0);
    await api('POST','api/turn',{room:rid,eid,op:'react',tid,name:o.name,fx,text:[o.c.dice||fx.k==='ac'||fx.k==='sub'?lab:'',txt].filter(Boolean).join(' · ')||lab});
  }catch(err){RX.err=err&&err.code==='reaction_used'?t('rxUsed'):err&&err.code==='closed'?t('rxClosed'):t('taFail')}
  finally{RX.busy=false;try{await livePull()}catch(e){}rxDock()}}
async function rxPass(rid,eid,tid){
  if(RX.busy)return;RX.busy=true;
  try{await api('POST','api/turn',{room:rid,eid,op:'pass',tid,name:''})}catch(e){}
  finally{RX.busy=false;try{await livePull()}catch(e){}rxDock()}}
async function rxClose(rid,tid){
  const st=TURNS[rid],th=st&&(st.th||[]).find(x=>x.id===tid),eid=th?th.from:'';if(!th)return;th.st='done';render();
  try{await api('POST','api/turn',{room:rid,eid,op:'close',tid})}catch(e){}}
function rxClick(a,b){
  const rid=b.dataset.rid,eid=b.dataset.id,tid=b.dataset.tid||b.dataset.v;
  if(a==='rx-pick')rxPick(rid,eid,tid,b.dataset.k);else if(a==='rx-pass')rxPass(rid,eid,tid);else if(a==='rx-close')rxClose(rid,b.dataset.v)}
Object.assign(TX.th,{rxYou:'{n} โจมตีคุณ! เลือกตอบโต้ได้',rxAlly:'{f} โจมตี {n} — ช่วยได้ไหม?',rxLet:'ปล่อยผ่าน',rxFeature:'ความสามารถ',rxGuess:'ผลให้ GM ตัดสิน',rxWaiting:'รอผู้เล่นตอบโต้',rxClose:'ไม่รอแล้ว',rxFinal:'ดาเมจสุดท้าย',rxNoEffect:'ไม่มีผล (ถูกป้องกันแล้ว)',rxNone:'ยังไม่มีใครตอบโต้',rxPassed:'ปล่อยผ่าน',rxManual:'GM ตัดสินเอง',rxWait:'รอผู้เล่นตอบโต้ก่อน หรือกด "ไม่รอแล้ว"',rxUsed:'ใช้ Reaction ไปแล้ว',rxClosed:'ปิดการตอบโต้แล้ว',rxSub:'ลบเลขจาก To-hit',rxNeg:'ยกเลิกผลโจมตี/เวท',rxHalf:'ดาเมจครึ่งหนึ่ง',rxRes:'ต้านทาน (ครึ่ง)',rxRed:'ลดดาเมจ',rxTake:'รับดาเมจแทน',rxDis:'โจมตีแบบเสียเปรียบ',rxReroll:'บังคับทอยใหม่',rxNote:'ผลให้ GM ตัดสิน'});
Object.assign(TX.en,{rxYou:'{n} attacks you! Choose a reaction',rxAlly:'{f} attacks {n} — can you help?',rxLet:'Let it pass',rxFeature:'Feature',rxGuess:'GM rules the result',rxWaiting:'Waiting for reactions',rxClose:'Stop waiting',rxFinal:'Final damage',rxNoEffect:'No effect (prevented)',rxNone:'Nobody has reacted yet',rxPassed:'let it pass',rxManual:'GM decides',rxWait:'Wait for the reactions, or press "Stop waiting"',rxUsed:'Reaction already used',rxClosed:'Reactions are closed',rxSub:'subtracts from the attack roll',rxNeg:'cancels the attack / spell',rxHalf:'half damage',rxRes:'resistance (half)',rxRed:'reduces damage',rxTake:'takes the damage instead',rxDis:'attack at disadvantage',rxReroll:'forces a reroll',rxNote:'GM rules the result'});
