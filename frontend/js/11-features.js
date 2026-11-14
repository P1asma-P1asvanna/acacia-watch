/* features */
function featList(d){
  const out=[],b=bgOf(d);
  if(b)(b.feats||[]).forEach(f=>out.push({...f,kind:'bg',from:b.name}));
  clsRows(d).forEach(r=>{const c=CAT.classes.find(x=>x.name===r.cls);if(c)(c.feats||[]).filter(f=>(f.lvl||1)<=r.level).forEach(f=>out.push({...f,kind:'cls',from:c.name}))});
  return out;
}
const featBody=d=>{const L=featList(d);return L.length?L.map(f=>`<details class="feat"><summary><b>${esc(f.name||'—')}</b> <span class="pill">${t(f.kind==='bg'?'fBg':'fClass')} · ${esc(f.from)}${f.kind==='cls'?' · Lv '+(f.lvl||1):''}</span></summary><div class="featd">${esc(f.desc||'').replace(/\n/g,'<br>')}</div></details>`).join(''):`<p class="note" style="margin:0">${t('featNoneP')}</p>`};
const featPanel=d=>`<section class="panel"><div class="ph"><h2>${t('featTitleP')}</h2></div><div class="featwrap" id="featbody">${featBody(d)}</div></section>`;
function refreshFeat(){const b=document.getElementById('featbody');if(!b||!edit)return;const open=[...b.querySelectorAll('details')].map(x=>x.open);b.innerHTML=featBody(edit.draft);b.querySelectorAll('details').forEach((x,i)=>{if(open[i])x.open=true})}
function refreshExtra(){refreshWeapons();refreshFeat();refreshProfs()}
let _rf=0,_need={};
function schedRefresh(n){Object.assign(_need,n);if(_rf)return;_rf=requestAnimationFrame(()=>{_rf=0;const q=_need;_need={};if(!edit)return;const d=edit.draft;updateProfVals(d);refreshWeapons();if(q.h)refreshHp();if(q.f)refreshFeat();if(q.a)refreshAc()})}
const MC_MAX=5;
const mcBody=d=>{const R=clsRows(d),pr=R[0],list=Array.isArray(d.mc)?d.mc:[];
  return`<div class="mcbox"><p class="note mcnote">${fill(t('mcPrimary'),{cls:esc(d.cls||'—'),n:pr.level,total:Math.round(num(d.level))||1})}</p>
  ${list.map(r=>`<div class="mcrow"><select data-mc="cls" data-id="${esc(r.id)}" aria-label="${t('fClass')}">${optCur(names('classes'),r.cls)}</select><select data-mc="sub" data-id="${esc(r.id)}" aria-label="${t('fSub')}">${subOpts(r.cls,r.sub)}</select><input type="number" data-mc="level" data-id="${esc(r.id)}" min="1" max="19" value="${esc(r.level)}" aria-label="${t('fLevel')}"><button type="button" class="btn small danger" data-mca="del" data-id="${esc(r.id)}" aria-label="${t('mcDel')}">✕</button></div>`).join('')}
  <button type="button" class="btn small" data-mca="add" ${list.length>=MC_MAX||(Math.round(num(d.level))||1)<2?'disabled':''}>+ ${t('mcAdd')}</button></div>`};
function refreshMc(){const b=document.getElementById('mcwrap');if(!b||!edit)return;b.innerHTML=mcBody(edit.draft)}
/* anything that depends on the class list: HP, ASI slots, spell slots, features, proficiencies */
function mcChanged(later){const d=edit.draft;if(later)requestAnimationFrame(()=>{if(edit)refreshMc()});else refreshMc();$('#derived').innerHTML=derived(d);refreshHp();refreshAsi();refreshSp();refreshExtra()}
Object.assign(TX.th,{mcTotal:'เลเวลรวม',mcPrimary:'อาชีพหลัก {cls} = เลเวล {n} (เลเวลรวม {total} หักจากอาชีพเสริม)',mcAdd:'เพิ่มอาชีพ (Multiclass)',mcDel:'ลบอาชีพนี้'});
Object.assign(TX.en,{mcTotal:'Total level',mcPrimary:'Primary class {cls} = level {n} (total level {total} minus the extra classes)',mcAdd:'Add a class (multiclass)',mcDel:'Remove this class'});
function renderEditor(){
  const d=edit.draft,pc=edit.kind==='pc',adm=isAdmin();
  d.pick=d.pick||{lang:[],tool:[],veh:[]};d.asi=d.asi||{};d.xf=d.xf||[];d.sl=d.sl||{u:[],p:0};d.spells=d.spells||[];d.conc=d.conc||'';
  d.prof=d.prof||{save:{},skill:{}};
  d.items=d.items||[];d.weapons=d.weapons||[];d.profOther=d.profOther||'';d.speeds=d.speeds||'';
  normHp(d);normAc(d);
  const owners=users.map(u=>`<option value="${u.id}" ${u.id===d.owner?'selected':''}>${esc(u.disp)} (${esc(u.name)})</option>`).join('');
  const basic=`<section class="panel"><div class="ph"><h2>${t('secBasic')}</h2></div>
   <div class="cpicrow">${cpicHtml(d,'xl')}<div class="cpicctl"><b>${t('cpicT')}</b><div class="pfup"><label class="btn small filebtn">${t('pfUpload')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-img="cpic" hidden></label>${d.pic?`<button type="button" class="btn small danger" data-act="cpic-rm">${t('pfRemove')}</button>`:''}</div>
    <p class="note rule">${t('cpicHint')} ${pfRule('cpic')}</p><p class="err" role="alert">${esc(imgMsg)}</p></div></div>
   <div class="grid wide">
   <div class="field"><label for="e_name">${t('fName')}</label><input id="e_name" data-f="name" value="${esc(d.name)}"></div>
   ${pc?`<div class="field"><label for="e_owner">${t('fPlayer')}</label><select id="e_owner" data-f="owner" ${adm?'':'disabled'}><option value="">${t('unassigned')}</option>${owners}</select></div>`
       :`<div class="field"><label for="e_type">${t('fType')}</label><select id="e_type" data-f="type"><option value="ally" ${d.type==='ally'?'selected':''}>${t('tAlly')}</option><option value="neutral" ${d.type==='neutral'?'selected':''}>${t('tNeutral')}</option><option value="villain" ${d.type==='villain'?'selected':''}>${t('tVillain')}</option></select></div>`}
   <div class="field"><label for="e_race">${t('fRace')}</label><select id="e_race" data-f="race">${optCur(names('races'),d.race)}</select></div>
   <div class="field"><label for="e_cls">${t('fClass')}</label><select id="e_cls" data-f="cls">${optCur(names('classes'),d.cls)}</select></div>
   <div class="field"><label for="e_sub">${t('fSub')}</label><select id="e_sub" data-f="sub">${subOpts(d.cls,d.sub)}</select></div>
   <div class="field"><label for="e_level">${t('mcTotal')}</label><input id="e_level" data-f="level" type="number" min="1" max="20" value="${d.level}"></div>
   <div class="field"><label for="e_xp">${t('fXp')}</label><input id="e_xp" data-f="xp" type="number" min="0" value="${d.xp}"></div>
   <div class="field"><label for="e_bg">${t('fBg')}</label><select id="e_bg" data-f="bg"><option value="">${t('none')}</option>${optCur(names('backgrounds'),d.bg)}</select></div>
   <div class="field"><label for="e_align">${t('fAlign')}</label><select id="e_align" data-f="align">${optCur(names('alignments'),d.align)}</select></div>
  </div><div id="mcwrap">${mcBody(d)}</div></section>`,
   abil=`<section class="panel"><div class="ph"><h2>${t('secAbil')}</h2><span class="note">${fill(t('abLimit'),{n:abMax()})}</span></div><div class="abilities">
   ${ABS.map(k=>`<div class="ab"><span class="k">${k.toUpperCase()}</span><div class="mod ${abT(d,k)!==Math.max(1,Math.min(abMax(),Math.round(num(d.abil[k]))))?'fxv':''}" id="m_${k}">${sgn(mod(abT(d,k)))}</div><span class="abt" id="t_${k}">${abT(d,k)!==Math.max(1,Math.min(abMax(),Math.round(num(d.abil[k]))))?'= '+abT(d,k):''}</span><input id="e_${k}" aria-label="${k.toUpperCase()}" data-a="${k}" type="number" min="1" max="${abMax()}" value="${Math.min(abMax(),d.abil[k])}" title="${esc(fill(t('abLimitTip'),{n:abMax()}))}"></div>`).join('')}
  </div><div class="derived" id="derived">${derived(d)}</div></section>`,
   combat=`<section class="panel"><div class="ph"><h2>${t('secCombat')}</h2></div><div class="grid">
   <div class="field"><label for="e_speed">${t('fSpeed')}</label><input id="e_speed" data-f="speed" type="number" min="0" value="${d.speed}"></div>
   <div class="field"><label for="e_insp">${t('fInsp')}</label><select id="e_insp" data-f="insp"><option value="0" ${d.insp?'':'selected'}>—</option><option value="1" ${d.insp?'selected':''}>✓</option></select></div>
  </div><div class="grid wide" style="padding-top:0"><div class="field"><label for="e_notes">${t('fNotes')}</label><textarea id="e_notes" data-f="notes">${esc(d.notes)}</textarea></div></div></section>`;
  return`${head(esc(d.name)||t('add'),pc?t('players'):t('npcs'),`<div class="acts">${arrangeBtn('sheet')}<button class="btn" data-act="back">← ${t('back')}</button></div>`)}
  ${arrangeBar('sheet')}${wgrid('sheet',[['basic',basic],['bgpick',bgPanel(d)],['abil',abil],['asi',asiPanel(d)],['prof',profPanel(d)],['hp',hpPanel(d)],['spells',spellPanel(d)],['res',resPanel(d)],['weapons',weaponsPanel(d)],['profs',profsPanel(d)],['items',itemsPanel(d)],['ac',acPanel(d)],['feat',featPanel(d)],['combat',combat]])}
  <section class="panel"><div class="bar"><button class="btn danger" data-act="del-edit">${delArm===d.id?t('delSure'):t('del')}</button><button class="btn primary" data-act="save">${t('save')}</button></div></section>`;
}

