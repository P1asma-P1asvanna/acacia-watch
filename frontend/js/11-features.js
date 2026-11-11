/* features */
function featList(d){
  const out=[],b=bgOf(d),c=CAT.classes.find(x=>x.name===d.cls),lv=Math.round(num(d.level))||1;
  if(b)(b.feats||[]).forEach(f=>out.push({...f,kind:'bg',from:b.name}));
  if(c)(c.feats||[]).filter(f=>(f.lvl||1)<=lv).forEach(f=>out.push({...f,kind:'cls',from:c.name}));
  return out;
}
const featBody=d=>{const L=featList(d);return L.length?L.map(f=>`<details class="feat"><summary><b>${esc(f.name||'—')}</b> <span class="pill">${t(f.kind==='bg'?'fBg':'fClass')} · ${esc(f.from)}${f.kind==='cls'?' · Lv '+(f.lvl||1):''}</span></summary><div class="featd">${esc(f.desc||'').replace(/\n/g,'<br>')}</div></details>`).join(''):`<p class="note" style="margin:0">${t('featNoneP')}</p>`};
const featPanel=d=>`<section class="panel"><div class="ph"><h2>${t('featTitleP')}</h2></div><div class="featwrap" id="featbody">${featBody(d)}</div></section>`;
function refreshFeat(){const b=document.getElementById('featbody');if(!b||!edit)return;const open=[...b.querySelectorAll('details')].map(x=>x.open);b.innerHTML=featBody(edit.draft);b.querySelectorAll('details').forEach((x,i)=>{if(open[i])x.open=true})}
function refreshExtra(){refreshWeapons();refreshFeat();refreshProfs()}
let _rf=0,_need={};
function schedRefresh(n){Object.assign(_need,n);if(_rf)return;_rf=requestAnimationFrame(()=>{_rf=0;const q=_need;_need={};if(!edit)return;const d=edit.draft;updateProfVals(d);refreshWeapons();if(q.h)refreshHp();if(q.f)refreshFeat();if(q.a)refreshAc()})}
function renderEditor(){
  const d=edit.draft,pc=edit.kind==='pc',adm=isAdmin();
  d.pick=d.pick||{lang:[],tool:[],veh:[]};d.asi=d.asi||{};d.xf=d.xf||[];d.sl=d.sl||{u:[],p:0};d.spells=d.spells||[];d.conc=d.conc||'';
  d.prof=d.prof||{save:{},skill:{}};
  d.items=d.items||[];d.weapons=d.weapons||[];d.profOther=d.profOther||'';d.speeds=d.speeds||'';
  normHp(d);normAc(d);
  const owners=users.map(u=>`<option value="${u.id}" ${u.id===d.owner?'selected':''}>${esc(u.disp)} (${esc(u.name)})</option>`).join('');
  const basic=`<section class="panel"><div class="ph"><h2>${t('secBasic')}</h2></div><div class="grid wide">
   <div class="field"><label for="e_name">${t('fName')}</label><input id="e_name" data-f="name" value="${esc(d.name)}"></div>
   ${pc?`<div class="field"><label for="e_owner">${t('fPlayer')}</label><select id="e_owner" data-f="owner" ${adm?'':'disabled'}><option value="">${t('unassigned')}</option>${owners}</select></div>`
       :`<div class="field"><label for="e_type">${t('fType')}</label><select id="e_type" data-f="type"><option value="ally" ${d.type==='ally'?'selected':''}>${t('tAlly')}</option><option value="neutral" ${d.type==='neutral'?'selected':''}>${t('tNeutral')}</option><option value="villain" ${d.type==='villain'?'selected':''}>${t('tVillain')}</option></select></div>`}
   <div class="field"><label for="e_race">${t('fRace')}</label><select id="e_race" data-f="race">${optCur(names('races'),d.race)}</select></div>
   <div class="field"><label for="e_cls">${t('fClass')}</label><select id="e_cls" data-f="cls">${optCur(names('classes'),d.cls)}</select></div>
   <div class="field"><label for="e_sub">${t('fSub')}</label><select id="e_sub" data-f="sub">${subOpts(d.cls,d.sub)}</select></div>
   <div class="field"><label for="e_level">${t('fLevel')}</label><input id="e_level" data-f="level" type="number" min="1" max="20" value="${d.level}"></div>
   <div class="field"><label for="e_xp">${t('fXp')}</label><input id="e_xp" data-f="xp" type="number" min="0" value="${d.xp}"></div>
   <div class="field"><label for="e_bg">${t('fBg')}</label><select id="e_bg" data-f="bg"><option value="">${t('none')}</option>${optCur(names('backgrounds'),d.bg)}</select></div>
   <div class="field"><label for="e_align">${t('fAlign')}</label><select id="e_align" data-f="align">${optCur(names('alignments'),d.align)}</select></div>
  </div></section>`,
   abil=`<section class="panel"><div class="ph"><h2>${t('secAbil')}</h2></div><div class="abilities">
   ${ABS.map(k=>`<div class="ab"><span class="k">${k.toUpperCase()}</span><div class="mod ${abT(d,k)!==Math.max(1,Math.min(30,Math.round(num(d.abil[k]))))?'fxv':''}" id="m_${k}">${sgn(mod(abT(d,k)))}</div><span class="abt" id="t_${k}">${abT(d,k)!==Math.max(1,Math.min(30,Math.round(num(d.abil[k]))))?'= '+abT(d,k):''}</span><input id="e_${k}" aria-label="${k.toUpperCase()}" data-a="${k}" type="number" min="1" max="30" value="${d.abil[k]}"></div>`).join('')}
  </div><div class="derived" id="derived">${derived(d)}</div></section>`,
   combat=`<section class="panel"><div class="ph"><h2>${t('secCombat')}</h2></div><div class="grid">
   <div class="field"><label for="e_speed">${t('fSpeed')}</label><input id="e_speed" data-f="speed" type="number" min="0" value="${d.speed}"></div>
   <div class="field"><label for="e_insp">${t('fInsp')}</label><select id="e_insp" data-f="insp"><option value="0" ${d.insp?'':'selected'}>—</option><option value="1" ${d.insp?'selected':''}>✓</option></select></div>
  </div><div class="grid wide" style="padding-top:0"><div class="field"><label for="e_notes">${t('fNotes')}</label><textarea id="e_notes" data-f="notes">${esc(d.notes)}</textarea></div></div></section>`;
  return`${head(esc(d.name)||t('add'),pc?t('players'):t('npcs'),`<div class="acts">${arrangeBtn('sheet')}<button class="btn" data-act="back">← ${t('back')}</button></div>`)}
  ${arrangeBar('sheet')}${wgrid('sheet',[['basic',basic],['bgpick',bgPanel(d)],['abil',abil],['asi',asiPanel(d)],['prof',profPanel(d)],['hp',hpPanel(d)],['spells',spellPanel(d)],['weapons',weaponsPanel(d)],['profs',profsPanel(d)],['items',itemsPanel(d)],['ac',acPanel(d)],['feat',featPanel(d)],['combat',combat]])}
  <section class="panel"><div class="bar"><button class="btn danger" data-act="del-edit">${delArm===d.id?t('delSure'):t('del')}</button><button class="btn primary" data-act="save">${t('save')}</button></div></section>`;
}

