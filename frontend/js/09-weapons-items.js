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
  else if(/finesse/.test(props))ab=mod(d.abil.dex)>mod(d.abil.str)?'dex':'str';
  else ab='str';
  const m=mod(d.abil[ab]),p=isProf(d,w,row),magic=Math.round(num(w.ench))+Math.round(num(row.bonus)),atk=m+(p?prof(d.level):0)+magic,db=(w.apply?m:0)+magic;
  let dmg=String(w.die||'').trim();
  if(dmg)dmg+=db?(db>0?'+':'−')+Math.abs(db):'';else dmg=db?sgn(db):'';
  if(w.dtype)dmg+=' '+w.dtype;if(w.bdie)dmg+=' + '+w.bdie+(w.btype?' '+w.btype:'');
  return{w,ab,p,atk,dmg};
}
function weaponsBody(d){
  const rows=(d.weapons||[]).map(r=>{const s=weaponStats(d,r),sub=s?[s.w.pcat,s.w.range,s.w.props].filter(Boolean).join(' · '):t('wMissing');
    return`<li class="wrow"><div class="wn"><b>${esc(r.ref)}</b><small>${esc(sub)}</small></div><div class="wa" aria-label="${t('wAtk')}">${s?sgn(s.atk):'—'}<small>${s?s.ab.toUpperCase():''}</small></div><div class="wd">${s?esc(s.dmg):'—'}</div>
     <label class="wp"><input type="checkbox" data-wk="p" data-id="${r.id}" ${s&&s.p?'checked':''}> ${t('wProf')}</label><input class="wb" type="number" aria-label="${t('wBonus')}" data-wk="bonus" data-id="${r.id}" value="${esc(r.bonus||0)}"><button type="button" class="btn small danger" data-wa="del" data-id="${r.id}" aria-label="${t('itDel')} ${esc(r.ref)}">✕</button></li>`}).join('');
  return`${rows?`<ul class="wlist">${rows}</ul>`:`<p class="note" style="padding:0 16px">${t('wEmpty')}</p>`}`;
}
function weaponsFrame(d){
  const opts=CAT.weapons.map(w=>`<option value="${esc(w.name)}">${esc(w.name)}</option>`).join('');
  return`<div class="whead" aria-hidden="true"><span>${t('wName')}</span><span>${t('wAtk')}</span><span>${t('wDmg')}</span><span>${t('wProf')}</span><span>${t('wBonus')}</span><span></span></div><div id="wlist">${weaponsBody(d)}</div>
   <div class="bar"><div class="field" style="min-width:200px;flex:1"><label for="w_add">${t('wPick')}</label><select id="w_add"><option value="">—</option>${opts}</select></div><button type="button" class="btn small" data-wa="add">${t('wAdd')}</button></div><p class="note" style="margin:0;padding:0 16px 14px">${t('wHint')}</p>`;
}
const weaponsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('wTitle')}</h2></div><div id="wbody">${weaponsFrame(d)}</div></section>`;
function refreshWeapons(){const b=document.getElementById('wlist');if(b&&edit)b.innerHTML=weaponsBody(edit.draft)}
function updateProfVals(d){const pb=prof(d.level);document.querySelectorAll('#profbody .pv').forEach(el=>{const[kind,k,ab]=el.dataset.pv.split(':');el.textContent=sgn(mod(d.abil[ab])+pb*profLevel(d,kind,k))})}
/* proficiencies */
function profsRows(d){
  const p=classProfs(d),r=CAT.races.find(x=>x.name===d.race),ver=(d.pick.veh||[]).filter(Boolean),tl=(d.pick.tool||[]).filter(Boolean).concat(p.tool),lg=toks(r&&r.lang).concat((d.pick.lang||[]).filter(Boolean));
  const row=(k,v)=>`<div class="kvr"><span class="k">${t(k)}</span><span>${v.length?esc(v.join(', ')):'-'}</span></div>`;
  return row('prArmor',p.armor)+row('prWeapon',p.weap)+row('prVehicle',ver)+row('prTool',tl)+row('prLang',lg);
}
const profsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('prTitle')}</h2></div><div id="profsrows">${profsRows(d)}</div><div class="grid wide"><div class="field"><label for="e_pother">${t('prOther')}</label><input id="e_pother" data-f="profOther" value="${esc(d.profOther||'')}"></div><div class="field"><label for="e_speeds">${t('prSpeeds')}</label><input id="e_speeds" data-f="speeds" value="${esc(d.speeds||'')}"></div></div></section>`;
function refreshProfs(){const b=document.getElementById('profsrows');if(b&&edit)b.innerHTML=profsRows(edit.draft)}
/* items */
