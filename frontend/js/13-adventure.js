/* ---------- adventure: rooms with a player rail that fits one screen ---------- */
const MAXSEATS=12;
const saveRooms=()=>put('dd_rooms',rooms);
const inStage=()=>view==='adventure'&&!roomEdit&&rooms.some(r=>r.id===roomOpen);
function renderAdventure(){
  if(roomEdit)return renderRoomForm();
  const rm=rooms.find(r=>r.id===roomOpen);
  if(rm)return renderStage(rm);
  const body=rooms.length?`<div class="scroll"><table><thead><tr><th>${t('colRoom')}</th><th class="num">${t('colSeats')}</th><th></th></tr></thead><tbody>${rooms.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td class="num">${r.assign.filter(Boolean).length} / ${r.seats}</td>
   <td><div class="acts"><button class="btn small primary" data-act="ropen" data-id="${r.id}">${t('open')}</button><button class="btn small" data-act="redit" data-id="${r.id}">${t('edit')}</button><button class="btn small danger" data-act="rdel" data-id="${r.id}">${dataArm==='room:'+r.id?t('delSure'):t('del')}</button></div></td></tr>`).join('')}</tbody></table></div>`
   :`<div class="empty"><div>${t('noRooms')}</div><button class="btn primary" data-act="radd">+ ${t('createRoom')}</button></div>`;
  return head(t('adventure'),t('advSub'),`<button class="btn primary" data-act="radd">+ ${t('createRoom')}</button>`)+`<section class="panel">${body}</section>`;
}
function renderRoomForm(){
  const d=roomEdit.draft;
  return head(roomEdit.isNew?t('createRoom'):esc(d.name),t('adventure'),`<button class="btn" data-act="rback">← ${t('back')}</button>`)+
  `<section class="panel"><div class="grid wide"><div class="field"><label for="r_name">${t('roomName')}</label><input id="r_name" data-r="name" value="${esc(d.name)}"></div>
   <div class="field"><label for="r_seats">${t('seats')}</label><input id="r_seats" data-r="seats" type="number" min="1" max="${MAXSEATS}" value="${esc(d.seats)}"><span class="note">${t('seatsHint')}</span></div></div>
   <div class="bar"><span class="err" role="alert">${esc(roomErr)}</span><button class="btn primary" data-act="rsave">${t('save')}</button></div></section>`;
}
function renderStage(rm){
  const n=rm.seats,used=new Set(rm.assign.filter(Boolean)),dens=n<=3?'d1':n<=6?'d2':'d3';
  const tabs=`<button role="tab" class="gtab" aria-selected="${advGame==='dice'}" data-act="rgame" data-v="dice">${t('diceTitle')}</button><button role="tab" class="gtab" aria-selected="${advGame==='init'}" data-act="rgame" data-v="init">${t('iniTab')}</button>`+
    t('ideas').map(i=>`<button class="gtab" disabled>${esc(i)}<span class="soon">${t('soon')}</span></button>`).join('');
  const seats=Array.from({length:n},(_,i)=>{
    const cid=rm.assign[i]||'',ch=pcs.find(c=>c.id===cid);
    const opts=pcs.filter(c=>c.id===cid||!used.has(c.id)).map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${esc(c.name||'—')}</option>`).join('');
    const who=ch&&ownerName(ch.owner);
    return`<div class="seat ${ch?'filled':''}"><div class="av" aria-hidden="true">${ch?esc((ch.name||'?').trim().slice(0,1).toUpperCase()):i+1}</div>
     <div class="seat-body"><select class="seat-pick" aria-label="${t('seat')} ${i+1}" data-seat="${i}"><option value="">${t('emptySeat')}</option>${opts}</select>
     ${ch?`<div class="seat-line2">${esc(ch.race)} · ${esc(ch.cls)} ${ch.level}${who?' · '+esc(who):''}</div><div class="seat-stats"><span>HP ${curHp(ch)}/${ch.hp}${num(ch.hpTemp)?'+'+num(ch.hpTemp):''}</span><span>AC ${ch.ac}</span></div>`:''}</div></div>`}).join('');
  return`<div class="stagebar"><button class="btn small" data-act="rclose">← ${t('leave')}</button><h1>${esc(rm.name)}</h1><div class="gtabs" role="tablist" aria-label="${t('minigamesBar')}">${tabs}</div></div>
  <div class="stagebody"><section class="stagemain">${advGame==='dice'?dicePanel():advGame==='init'?iniPanel(rm):''}</section>
  <aside class="rail" aria-label="${t('playersRail')}"><div class="rail-head"><span>${t('playersRail')}</span><span class="pill">${used.size} / ${n}</span></div><div class="rail-list ${dens}" style="--n:${n}">${seats}</div></aside></div>`;
}

