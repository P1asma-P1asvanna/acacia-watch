/* ---------- armor class ---------- */
const armorBase=n=>String(n||'').trim().replace(/\s*\+\d+\s*$/,'').toLowerCase();
const armorOf=it=>{const b=armorBase(it.name);return b?CAT.armor.find(a=>String(a.name).toLowerCase()===b)||null:null};
const itemEnch=it=>{const m=String(it.name||'').match(/\+(\d+)\s*$/);return m?+m[1]:0};
const isShield=a=>/shield/i.test(a.acat||'');
const isBase=a=>/light|medium|heavy/i.test(a.acat||'');   /* only light, medium and heavy armor set the base AC; shield, helm, boots... add to it */
const ATT_MAX=3;
const slotName=id=>(CAT.slots.find(s=>s.id===id)||{}).name||id;
const slotIds=a=>(a.slots||[]).filter(id=>CAT.slots.some(s=>s.id===id));
let itMsg='';
/* what the character really wears: in list order, no body slot used twice, at most ATT_MAX attuned pieces (the server does the same) */
function wornGear(d){const list=[],skip=[],used=new Set();let att=0;
  (d.items||[]).filter(i=>i.eq).forEach(it=>{const a=armorOf(it);if(!a)return;const sl=a.slots||[];
    if(sl.some(x=>used.has(x))){skip.push({it,a,why:'slot'});return}
    if(a.att){if(att>=ATT_MAX){skip.push({it,a,why:'att'});return}att++}
    sl.forEach(x=>used.add(x));list.push({it,a})});
  return{list,skip,att}}
function acCalc(d){
  const dx=mod(abT(d,'dex')),lines=[],warns=[],W=wornGear(d),body=W.list.find(x=>isBase(x.a));let total;
  W.skip.forEach(x=>warns.push(fill(t(x.why==='att'?'acAttFull':'acIgnored'),{name:esc(x.it.name)})));
  if(body){
    const a=body.a,armor=10+Math.round(num(a.ac))+itemEnch(body.it)+Math.round(num(a.ench));
    const heavy=/heavy/i.test(a.acat||''),md=String(a.maxdex).trim()===''?null:Math.round(num(a.maxdex));
    const dp=heavy?0:(md===null?dx:Math.min(dx,md));
    const note=heavy?' ('+t('acHeavyNoDex')+')':(md!==null&&dx>md?' ('+fill(t('acCap'),{n:md})+')':'');
    total=armor+dp;lines.push(fill(t('acBody'),{name:esc(body.it.name),armor,dex:sgn(dp),note,v:total}));
  }else{total=10+dx;lines.push(fill(t('acNone'),{dx:sgn(dx),v:total}))}
  W.list.forEach(x=>{const a=x.a;
    if(num(a.str)>0&&num(abT(d,'str'))<num(a.str))warns.push(fill(t('acStr'),{name:esc(x.it.name),n:num(a.str),s:num(abT(d,'str'))}));
    if(/disadv/i.test(a.stealth||''))warns.push(fill(t('acStealth'),{name:esc(x.it.name)}))});
  const fa=fxAll(d,!!body);if(fa.ac){total+=fa.ac;lines.push(fill(t('acFeat'),{src:fxLine(fa,'ac'),v:sgn(fa.ac)}))}
  W.list.forEach(x=>{if(isBase(x.a))return;const v=Math.round(num(x.a.ac))+itemEnch(x.it)+Math.round(num(x.a.ench));total+=v;lines.push(fill(t('acShield'),{name:esc(x.it.name),v:sgn(v)}))});
  return{total,lines,warns};
}
const acManualOn=d=>d.acMode==='manual'&&String(d.acManual).trim()!==''&&num(d.acManual)>=0;
const effAc=d=>acManualOn(d)?Math.round(num(d.acManual)):acCalc(d).total;
function normAc(d){if(d.acMode===undefined){d.acMode='manual';d.acManual=d.ac}if(d.acManual===undefined)d.acManual=''}
function acBody(d){
  const c=acCalc(d),adm=isAdmin(),man=acManualOn(d),v=effAc(d);
  return`<div class="hpmax"><div><span class="lbl">${t('acLabel')}</span><div><b id="ac_val">${v}</b></div></div><span class="pill ${man?'admin':''}">${man?t('acManualBadge'):t('acAuto')}</span></div>
  ${adm?`<div class="hpgrid"><div class="field"><label for="ac_mode">${t('acMode')}</label><select id="ac_mode" data-ac="mode"><option value="auto" ${d.acMode==='manual'?'':'selected'}>${t('acModeAuto')}</option><option value="manual" ${d.acMode==='manual'?'selected':''}>${t('acModeManual')}</option></select></div>
   ${d.acMode==='manual'?`<div class="field"><label for="ac_manual">${t('acManualVal')}</label><input id="ac_manual" data-ac="manual" type="number" min="0" value="${esc(d.acManual)}"></div>`:''}</div>`:`<p class="note" style="margin:0">${man?t('acLockedManual'):t('acLocked')}</p>`}
  <details class="how"><summary>${t('acHow')}</summary><ul>${c.lines.map(l=>`<li>${l}</li>`).join('')}<li><b>${fill(t('acTotal'),{v:c.total})}</b></li>${man?`<li>${fill(t('acOver'),{v:v})}</li>`:''}${c.warns.map(w=>`<li class="err">${w}</li>`).join('')}</ul></details>`;
}
const acPanel=d=>`<section class="panel"><div class="ph"><h2>${t('acTitle')}</h2></div><div class="hpwrap" id="acbody">${acBody(d)}</div></section>`;
function refreshAc(focusId){const b=document.getElementById('acbody');if(!b||!edit)return;const open=b.querySelector('details.how')?.open;b.innerHTML=acBody(edit.draft);if(open)b.querySelector('details.how').open=true;if(focusId){const el=document.getElementById(focusId);if(el)el.focus()}}
function itChange(el){
  const d=edit.draft,it=d.items.find(x=>x.id===el.dataset.id);if(!it)return;
  if(el.dataset.it==='eq'){it.eq=el.checked;itMsg='';
    if(it.eq){const a=armorOf(it);if(a){const sl=new Set(a.slots||[]),off=[];
      d.items.forEach(o=>{if(o!==it&&o.eq){const b=armorOf(o);if(b&&(b.slots||[]).some(x=>sl.has(x))){o.eq=false;off.push(o.name)}}});
      if(a.att&&d.items.filter(o=>o!==it&&o.eq&&(armorOf(o)||{}).att).length>=ATT_MAX){it.eq=false;itMsg=fill(t('itAttFull'),{n:ATT_MAX})}
      else if(off.length)itMsg=fill(t('itSwap'),{names:off.join(', ')})}}
    refreshItems();return}
  if(el.dataset.it==='name'){const a=armorOf(it);if(!a)it.eq=false;const row=el.closest('.irow'),has=!!(row&&row.querySelector('[data-it=eq]'));if(has!==!!a)refreshItems();else refreshAc()}
}
const itemSlotsHtml=it=>{const a=armorOf(it);if(!a)return'';const sl=slotIds(a);if(!sl.length&&!a.att&&!(a.fx||[]).length)return'';
  return`<div class="islots">${sl.map(x=>`<span class="pill">${esc(slotName(x))}</span>`).join('')}${a.att?`<span class="pill admin">${t('itAtt')}</span>`:''}${(a.fx||[]).map(e=>`<span class="pill">${esc(featFxText(e))}</span>`).join('')}</div>`};
function gearSummary(d){const W=wornGear(d);if(!(d.items||[]).some(i=>armorOf(i)))return'';
  const by={};W.list.forEach(x=>(x.a.slots||[]).forEach(x2=>by[x2]=x.it.name));
  return`<details class="gear"><summary>${t('gearTitle')} · ${t('itAtt')} ${W.att}/${ATT_MAX}</summary><ul class="gslots">${CAT.slots.map(sl=>`<li class="${by[sl.id]?'on':''}"><span>${esc(sl.name)}</span><b>${by[sl.id]?esc(by[sl.id]):'—'}</b></li>`).join('')}</ul></details>`}
const itemsBody=d=>`<datalist id="armorlist">${CAT.armor.map(a=>`<option value="${esc(a.name)}">`).join('')}</datalist>${(d.items||[]).length?`<ul class="items">${d.items.map(it=>`<li class="irow"><input id="it_n_${it.id}" list="armorlist" aria-label="${t('itName')}" data-it="name" data-id="${it.id}" value="${esc(it.name)}"><input class="iqty" type="number" min="1" aria-label="${t('itQty')}" data-it="qty" data-id="${it.id}" value="${esc(it.qty)}"><span class="icell">${armorOf(it)?`<label class="eqw"><input type="checkbox" data-it="eq" data-id="${it.id}" ${it.eq?'checked':''}> ${t('itEquip')}</label>`:''}${it.src==='bg'?`<span class="pill">${t('fromBg')}</span>`:''}</span><button type="button" class="btn small danger" data-ita="del" data-id="${it.id}" aria-label="${t('itDel')} ${esc(it.name)}">✕</button>${itemSlotsHtml(it)}</li>`).join('')}</ul>`:`<p class="note" style="padding:0 16px">${t('itEmpty')}</p>`}${itMsg?`<p class="note" role="status" style="padding:0 16px">${esc(itMsg)}</p>`:''}${gearSummary(d)}<div class="bar"><span class="note">${t('itHint')}</span><button type="button" class="btn small" data-ita="add">+ ${t('itAdd')}</button></div>`;
const itemsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('itTitle')}</h2></div><div id="itbody">${itemsBody(d)}</div></section>`;
function refreshItems(f){const b=document.getElementById('itbody');if(!b||!edit)return;const go=b.querySelector('details.gear')?.open;b.innerHTML=itemsBody(edit.draft);if(go){const g=b.querySelector('details.gear');if(g)g.open=true}if(f){const el=document.getElementById(f);if(el)el.focus()}refreshAc()}

Object.assign(TX.th,{slots:'ช่องสวมใส่',gearTitle:'ช่องสวมใส่ของตัวละคร',itAtt:'Attunement',itAttFull:'ผูก Attunement ได้พร้อมกันไม่เกิน {n} ชิ้น ต้องถอดชิ้นอื่นก่อน',itSwap:'ถอด {names} ออกให้ เพราะใช้ช่องเดียวกัน',acAttFull:'{name} ไม่ถูกนับ เพราะผูก Attunement ครบแล้ว',
 gslTitle:'ช่องสวมใส่ของชิ้นนี้',gslHint:'เลือกได้หลายช่อง (เช่น ดาบสองมือใช้แขนซ้ายและขวา) สองชิ้นที่ใช้ช่องเดียวกันจะสวมพร้อมกันไม่ได้ ถ้าไม่เลือกเลย จะสวมซ้อนกับอะไรก็ได้',gslNone:'ยังไม่มีช่อง เพิ่มได้ที่แท็บ "ช่องสวมใส่"',
 fxTitleG:'เอฟเฟกต์ของชิ้นนี้',fxHintG:'ผลที่ได้ตอนสวมใส่ (เหมือน Feat) เช่น Initiative, HP, AC, Passive Perception, Speed เพิ่มได้หลายอัน'});
Object.assign(TX.en,{slots:'Body slots',gearTitle:'Worn gear by body slot',itAtt:'Attunement',itAttFull:'At most {n} attuned pieces at once. Take another one off first.',itSwap:'Took off {names}: same body slot',acAttFull:'{name} is not counted: attunement is full',
 gslTitle:'Body slots this piece fills',gslHint:'Pick several if needed (a two-handed weapon fills both arms). Two pieces sharing a slot cannot be worn together. Pick none and it never conflicts.',gslNone:'No slots yet. Add them in the "Body slots" tab.',
 fxTitleG:'Effects while worn',fxHintG:'What this piece does while worn, like a feat: Initiative, HP, AC, passive Perception, Speed. Add as many as you like.'});
