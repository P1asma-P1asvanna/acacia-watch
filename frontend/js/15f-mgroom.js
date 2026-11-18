/* ---------- rhythm games inside an adventure room: GM opens, players play, damage is proposed / applied ---------- */
const mgApplied=new Set();
function mgDmgOf(rid,pc){const s=MGS[rid];const r=s&&s.res.find(x=>x.pc===pc);return r}
function mgGmPanel(rid){
  if(!isAdmin())return'';
  const s=MGS[rid],open=s&&s.status==='open',list=GAMES;
  const rows=s?s.res.map(r=>`<li><span><b>${esc(r.name)}</b> ${r.skipped?`<small>${t('mgSkipped')}</small>`:`✦${r.perfect} ✔${r.hit} ✘${r.miss}`}</span><span>${r.dmg?`<b class="mgdmgn">−${r.dmg}</b> `:''}${r.applied?`<small>${r.skipped?'':t('mgApplied')}</small>`:r.dmg?`<button class="btn small danger" data-mgr="apply" data-room="${esc(rid)}" data-pc="${esc(r.pc)}">${t('mgApply')}</button>`:''}</span></li>`).join(''):'';
  const pend=s?s.res.some(r=>!r.applied&&r.dmg>0):false;
  return`<section class="panel mgroom"><div class="ph"><h2>${t('mgTitle')}</h2></div>
   ${open?`<div class="mgbox"><b>${esc(s.game.name)}</b> · ${t('mgType_'+s.game.type)} · ${s.game.play==='one'?t('mgOne'):t('mgAll')} · ${s.game.dmgMode==='auto'?t('mgAuto'):t('mgConfirm')}
     ${s.turn?`<div class="muted">${t('mgWaiting')}: ${esc(mgName(rid,s.turn))}</div>`:''}
     <div class="mgbtns" style="margin-top:8px">${pend?`<button class="btn small danger" data-mgr="applyall" data-room="${esc(rid)}">${t('mgApplyAll')}</button>`:''}${s.game.play==='one'?`<button class="btn small" data-mgr="skip" data-room="${esc(rid)}">${t('mgSkip')}</button>`:''}<button class="btn small" data-mgr="close" data-room="${esc(rid)}">${t('mgCloseRoom')}</button></div></div>`
   :list.length?`<div class="mgbtns mgbox"><select id="mg_pick_${esc(rid)}">${list.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} (${t('mgType_'+g.type)})</option>`).join('')}</select><button class="btn primary" data-mgr="open" data-room="${esc(rid)}">${t('mgOpenRoom')}</button></div>`:`<p class="muted" style="padding:0 16px 12px">${t('mgNoGames')}</p>`}
   ${rows?`<ul class="mgres-list">${rows}</ul>`:''}</section>`;
}
function mgName(rid,pc){const rm=(rooms.find(r=>r.id===rid))||{};const c=pcs.find(x=>x.id===pc);return c?c.name:'—'}
function mgPlayerPanel(rm){
  const s=rm.mg;if(!s||s.status!=='open')return'';
  const mine=(rm.party||[]).filter(p=>p.mine&&p.pc);
  const btns=mine.map(p=>{
    const done=s.res.find(r=>r.pc===p.pc);
    if(done)return`<span class="pill">${esc(p.name)} ✔</span>`;
    if(s.game.play==='one'&&s.turn!==p.pc)return`<span class="pill">${esc(p.name)} · ${t('mgNotYet')}</span>`;
    return`<button class="btn primary" data-mgr="play" data-room="${esc(rm.id)}" data-pc="${esc(p.pc)}">▶ ${t('mgPlayAs')} ${esc(p.name)}</button>`}).join(' ');
  const rows=s.res.map(r=>`<li><span><b>${esc(r.name)}</b> ${r.skipped?`<small>${t('mgSkipped')}</small>`:`✦${r.perfect} ✔${r.hit} ✘${r.miss}`}</span>${r.dmg?`<b class="mgdmgn">−${r.dmg}</b>`:''}</li>`).join('');
  return`<section class="panel mgroom mgnow"><div class="ph"><h2>🎵 ${esc(s.game.name)}</h2></div><div class="mgbox">${btns||`<span class="muted">${t('mgNotYet')}</span>`}</div>${rows?`<ul class="mgres-list">${rows}</ul>`:''}</section>`;
}
function mgSet(rid,m){MGS[rid]=m;const pr=prooms.find(r=>r.id===rid);if(pr)pr.mg=m}
function mgApplyDmg(rid,pc){
  const key=s=>s+':'+pc;const s=MGS[rid];if(!s)return false;const r=s.res.find(x=>x.pc===pc);
  if(!r||r.applied||mgApplied.has(key(s.run)))return false;
  const rm=rooms.find(x=>x.id===rid);if(!rm)return false;const I=iniData(rm),e=I.list.find(x=>x.ref==='pc:'+pc);
  mgApplied.add(key(s.run));r.applied=true;
  if(e&&r.dmg>0){cbDamage(I,e,r.dmg,'');saveRooms()}
  api('POST','api/mg',{room:rid,op:'applied',pc}).catch(()=>{});return true}
/* auto mode: the GM's browser applies the damage as soon as a result arrives */
function mgAutoApply(){
  if(!isAdmin())return;let any=false;
  for(const rid in MGS){const s=MGS[rid];if(s&&s.status==='open'&&s.auto)for(const r of s.res)if(!r.applied&&r.dmg>0&&mgApplyDmg(rid,r.pc))any=true}
  return any}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-mgr]');if(!b)return;const a=b.dataset.mgr,rid=b.dataset.room,pc=b.dataset.pc;
  try{
    if(a==='open'){const sel=document.getElementById('mg_pick_'+rid);const r=await api('POST','api/mg',{room:rid,op:'open',game:sel&&sel.value});mgSet(rid,r.mg)}
    else if(a==='close'||a==='skip'){const r=await api('POST','api/mg',{room:rid,op:a});mgSet(rid,r.mg)}
    else if(a==='apply'){mgApplyDmg(rid,pc)}
    else if(a==='applyall'){(MGS[rid]?MGS[rid].res:[]).forEach(r=>mgApplyDmg(rid,r.pc))}
    else if(a==='play'){
      const s=(prooms.find(r=>r.id===rid)||{}).mg;if(!s||s.status!=='open')return;
      let busy=false;const live=snap=>{if(busy&&snap.ph==='run')return;busy=true;fetch('api/mgfeed',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Requested-With':'dd'},body:JSON.stringify(Object.assign({room:rid,run:s.run,pc},snap))}).catch(()=>{}).finally(()=>{busy=false})};
      mgPlay(s.game,out=>{api('POST','api/mg',{room:rid,op:'submit',run:s.run,pc,perfect:out.perfect,hit:out.hit,miss:out.miss}).then(r=>{mgSet(rid,r.mg);render()}).catch(()=>{})},{live});return}
  }catch(err){mgMsg=t('mgFail')}
  render()});
Object.assign(TX.th,{mgOpenRoom:'เปิดเกมในห้อง',mgCloseRoom:'ปิดเกม',mgSkip:'ข้ามคนถัดไป',mgApply:'หักเลือด',mgApplyAll:'หักเลือดทั้งหมด',mgApplied:'หักแล้ว',mgWaiting:'รอผู้เล่น',mgNoGames:'ยังไม่มีเกม สร้างได้ที่เมนู Minigame',mgSkipped:'ข้าม',mgNotYet:'ยังไม่ถึงตา / รอ GM',mgPlayAs:'เล่นเป็น'});
Object.assign(TX.en,{mgOpenRoom:'Open game in room',mgCloseRoom:'Close game',mgSkip:'Skip next player',mgApply:'Apply damage',mgApplyAll:'Apply all damage',mgApplied:'applied',mgWaiting:'Waiting for',mgNoGames:'No games yet. Make one in the Minigame menu.',mgSkipped:'skipped',mgNotYet:'Not your turn yet / waiting for the GM',mgPlayAs:'Play as'});
