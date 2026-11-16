/* weapons */
const wFind=name=>CAT.weapons.find(w=>w.name===name);
function isProf(d,w,row){
  if(row.p!==undefined&&row.p!==null)return !!row.p;
  if(/^(unarmed|natural)$/i.test(w.pcat))return true;
  const L=classProfs(d).weap.map(x=>x.toLowerCase()),base=w.name.replace(/\s*\+\d+$/,'').replace(/^offhand\s+/i,'').toLowerCase();
  return L.includes((w.pcat+' weapons').toLowerCase())||L.includes(base)||L.includes(w.name.toLowerCase());
}
function weaponStats(d,row){
  const w=wFind(row.ref);if(!w)return null;const props=String(w.props||'').toLowerCase();let ab;
  if(w.abil&&ABS.includes(String(w.abil).toLowerCase()))ab=String(w.abil).toLowerCase();
  else if(/^ranged$/i.test(w.range))ab='dex';
  else if(/finesse/.test(props))ab=mod(abT(d,'dex'))>mod(abT(d,'str'))?'dex':'str';
  else ab='str';
  const m=mod(abT(d,ab)),p=isProf(d,w,row),magic=Math.round(num(w.ench))+Math.round(num(row.bonus)),atk=m+(p?prof(d.level):0)+magic,db=(w.apply?m:0)+magic;
  let dmg=String(w.die||'').trim();
  if(dmg)dmg+=db?(db>0?'+':'−')+Math.abs(db):'';else dmg=db?sgn(db):'';
  if(w.dtype)dmg+=' '+w.dtype;if(w.bdie)dmg+=' + '+w.bdie+(w.btype?' '+w.btype:'');
  const dm=/^(\d+)\s*d\s*(\d+)/i.exec(String(w.die||'')),bm=/^(\d+)\s*d\s*(\d+)/i.exec(String(w.bdie||''));
  return{w,ab,p,atk,dmg,db,dn:dm?+dm[1]:0,ds:dm?+dm[2]:0,bn:bm?+bm[1]:0,bs:bm?+bm[2]:0};
}
function weaponsBody(d){
  const rows=(d.weapons||[]).map(r=>{const s=weaponStats(d,r),sub=s?[s.w.pcat,s.w.range,s.w.props].filter(Boolean).join(' · '):t('wMissing');
    return`<li class="wrow"><div class="wn"><b>${esc(r.ref)}</b><small>${esc(sub)}</small></div><div class="wa" aria-label="${t('wAtk')}">${s?`<button type="button" class="btn small wroll" data-wroll="atk" data-id="${r.id}" title="${esc(t('wRollAtk'))}" aria-label="${esc(t('wRollAtk'))} ${esc(r.ref)}">${sgn(s.atk)}</button><small>${s.ab.toUpperCase()}</small>`:'—'}</div><div class="wd">${s?`<span>${esc(s.dmg)}</span>${s.ds?`<span class="wdb"><button type="button" class="btn small wroll" data-wroll="dmg" data-id="${r.id}" aria-label="${esc(t('wRollDmg'))} ${esc(r.ref)}">${t('wRollDmg')}</button><button type="button" class="btn small wroll" data-wroll="crit" data-id="${r.id}" aria-label="${esc(t('wRollCrit'))} ${esc(r.ref)}">${t('wRollCrit')}</button></span>`:''}`:'—'}</div>
     <label class="wp"><input type="checkbox" data-wk="p" data-id="${r.id}" ${s&&s.p?'checked':''}> ${t('wProf')}</label><input class="wb" type="number" aria-label="${t('wBonus')}" data-wk="bonus" data-id="${r.id}" value="${esc(r.bonus||0)}"><button type="button" class="btn small danger" data-wa="del" data-id="${r.id}" aria-label="${t('itDel')} ${esc(r.ref)}">✕</button></li>`}).join('');
  return`${rows?`<ul class="wlist">${rows}</ul>`:`<p class="note" style="padding:0 16px">${t('wEmpty')}</p>`}`;
}
function weaponsFrame(d){
  const opts=CAT.weapons.map(w=>`<option value="${esc(w.name)}">${esc(w.name)}</option>`).join('');
  return`<div class="whead" aria-hidden="true"><span>${t('wName')}</span><span>${t('wAtk')}</span><span>${t('wDmg')}</span><span>${t('wProf')}</span><span>${t('wBonus')}</span><span></span></div><div id="wlist">${weaponsBody(d)}</div>
   <div class="bar"><div class="field" style="min-width:200px;flex:1"><label for="w_add">${t('wPick')}</label><select id="w_add"><option value="">—</option>${opts}</select></div><button type="button" class="btn small" data-wa="add">${t('wAdd')}</button></div><p class="note" style="margin:0;padding:0 16px 14px">${t('wHint')}</p>`;
}
/* rolling a weapon straight into a room's shared dice */
let wRoom='',wMode='normal',wMsg='';
function wRooms(){return isAdmin()?rooms.map(r=>({id:r.id,name:r.name})):prooms.map(r=>({id:r.id,name:r.name}))}
function wRoomId(){const L=wRooms();return L.some(x=>x.id===wRoom)?wRoom:(L[0]?L[0].id:'')}
function wBar(){const L=wRooms();
  if(!L.length)return`<p class="note" style="padding:0 16px">${t('wNoRoom')}</p>`;
  return`<div class="wbar"><div class="field"><label for="w_room">${t('wRoomL')}</label><select id="w_room" data-wset="room">${L.map(x=>`<option value="${esc(x.id)}" ${wRoomId()===x.id?'selected':''}>${esc(x.name||'—')}</option>`).join('')}</select></div>
   <div class="field"><label for="w_mode">${t('mode')}</label><select id="w_mode" data-wset="mode"><option value="normal" ${wMode==='normal'?'selected':''}>${t('normal')}</option><option value="adv" ${wMode==='adv'?'selected':''}>${t('adv')}</option><option value="dis" ${wMode==='dis'?'selected':''}>${t('dis')}</option></select></div></div><p class="note wmsg" role="status" style="padding:0 16px;margin:4px 0">${esc(wMsg)}</p>`}
async function weaponRoll(kind,id){
  if(!edit)return;const d=edit.draft,r=(d.weapons||[]).find(x=>x.id===id),s=r&&weaponStats(d,r),rid=wRoomId();
  const say=m=>{wMsg=m;const el=document.querySelector('.wmsg');if(el)el.textContent=m};
  if(!s||!rid){say(t('wNoRoom'));return}
  const body={room:rid,mod:0,mode:'normal',as:(edit.kind==='npc'?'npc:':'pc:')+d.id};
  if(kind==='atk'){Object.assign(body,{n:1,sides:20,mod:s.atk,mode:wMode,why:r.ref+' '+t('wRollAtk')})}
  else{if(!s.ds)return;Object.assign(body,{n:s.dn*(kind==='crit'?2:1),sides:s.ds,mod:s.db,why:r.ref+' '+(kind==='crit'?t('wRollCrit'):t('wRollDmg'))})}
  say(t('rWorking'));
  try{const x=await api('POST','api/roll',body);if(x&&x.entry){tdPut(rid,x.entry);const e=x.entry;say(`${esc0(body.why)}: ${e.total}`);
      if(kind!=='atk'&&s.bs){const y=await api('POST','api/roll',{room:rid,n:s.bn*(kind==='crit'?2:1),sides:s.bs,mod:0,mode:'normal',as:body.as,why:r.ref+' + '+s.w.bdie+(s.w.btype?' '+s.w.btype:'')});if(y&&y.entry){tdPut(rid,y.entry);say(`${esc0(body.why)}: ${e.total} + ${y.entry.total}`)}}}}
  catch(err){say(err&&err.code==='not_seated'?t('tdNotSeated'):t('tdFail'))}
}
const esc0=x=>String(x);
const weaponsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('wTitle')}</h2></div>${wBar()}<div id="wbody">${weaponsFrame(d)}</div></section>`;
function refreshWeapons(){const b=document.getElementById('wlist');if(b&&edit)b.innerHTML=weaponsBody(edit.draft)}
function updateProfVals(d){const pb=prof(d.level);document.querySelectorAll('#profbody .pv').forEach(el=>{const[kind,k,ab]=el.dataset.pv.split(':');el.textContent=sgn(mod(abT(d,ab))+pb*profLevel(d,kind,k))})}
/* proficiencies */
function profsRows(d){
  const p=classProfs(d),r=CAT.races.find(x=>x.name===d.race),ver=(d.pick.veh||[]).filter(Boolean),tl=(d.pick.tool||[]).filter(Boolean).concat(p.tool),lg=toks(r&&r.lang).concat((d.pick.lang||[]).filter(Boolean));
  const row=(k,v)=>`<div class="kvr"><span class="k">${t(k)}</span><span>${v.length?esc(v.join(', ')):'-'}</span></div>`;
  return row('prArmor',p.armor)+row('prWeapon',p.weap)+row('prVehicle',ver)+row('prTool',tl)+row('prLang',lg);
}
const profsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('prTitle')}</h2></div><div id="profsrows">${profsRows(d)}</div><div class="grid wide"><div class="field"><label for="e_pother">${t('prOther')}</label><input id="e_pother" data-f="profOther" value="${esc(d.profOther||'')}"></div><div class="field"><label for="e_speeds">${t('prSpeeds')}</label><input id="e_speeds" data-f="speeds" value="${esc(d.speeds||'')}"></div></div></section>`;
function refreshProfs(){const b=document.getElementById('profsrows');if(b&&edit)b.innerHTML=profsRows(edit.draft)}
/* items */
