/* ---------- armor class ---------- */
const armorBase=n=>String(n||'').trim().replace(/\s*\+\d+\s*$/,'').toLowerCase();
const armorOf=it=>{const b=armorBase(it.name);return b?CAT.armor.find(a=>String(a.name).toLowerCase()===b)||null:null};
const itemEnch=it=>{const m=String(it.name||'').match(/\+(\d+)\s*$/);return m?+m[1]:0};
const isShield=a=>/shield/i.test(a.acat||'');
const isBase=a=>/light|medium|heavy/i.test(a.acat||'');   /* only light, medium and heavy armor set the base AC; shield, helm, boots... add to it */
const ATT_MAX=3;
const slotOf=a=>CAT.slots.find(x=>x.id===a.slot)||null;
const slotName=id=>(CAT.slots.find(s=>s.id===id)||{}).name||id;
const gearCost=a=>{const sl=slotOf(a);return Math.max(0,Math.min(20,Math.round(num(a.pts))))+(sl&&sl.sp&&(a.fx||[]).length?1:0)};
let itMsg='';
/* what the character really wears, in list order: a category holds at most `max` pieces, all pieces together cost at most CAT.eqMax
   points, only one base armor, at most ATT_MAX attuned pieces (the server applies the very same rules) */
function wornGear(d){const list=[],skip=[],count={};let att=0,pts=0,base=false;
  (d.items||[]).filter(i=>i.eq).forEach(it=>{const a=armorOf(it);if(!a)return;const sl=slotOf(a),c=gearCost(a);let why='';
    if(sl&&(count[sl.id]||0)>=Math.max(1,sl.max))why='slot';
    else if(pts+c>CAT.eqMax)why='pts';
    else if(isBase(a)&&base)why='base';
    else if(a.att&&att>=ATT_MAX)why='att';
    if(why){skip.push({it,a,why});return}
    if(sl)count[sl.id]=(count[sl.id]||0)+1;pts+=c;if(isBase(a))base=true;if(a.att)att++;list.push({it,a})});
  return{list,skip,att,pts,count}}
function acCalc(d){
  const dx=mod(abT(d,'dex')),lines=[],warns=[],W=wornGear(d),body=W.list.find(x=>isBase(x.a));let total;
  W.skip.forEach(x=>warns.push(fill(t('acSk_'+x.why),{name:esc(x.it.name)})));
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
    if(it.eq){const W=wornGear(d),bad=W.skip.find(x=>x.it===it);
      if(bad){it.eq=false;const sl=slotOf(bad.a);itMsg=fill(t('itNo_'+bad.why),{name:it.name,slot:sl?sl.name:'',max:sl?sl.max:'',n:CAT.eqMax,c:gearCost(bad.a),used:W.pts,att:ATT_MAX})}}
    refreshItems();return}
  if(el.dataset.it==='name'){const a=armorOf(it);if(!a)it.eq=false;const row=el.closest('.irow'),has=!!(row&&row.querySelector('[data-it=eq]'));if(has!==!!a)refreshItems();else refreshAc()}
}
const itemSlotsHtml=it=>{const a=armorOf(it);if(!a)return'';const sl=slotOf(a);
  return`<div class="islots">${sl?`<span class="pill">${esc(sl.name)}${a.kind?' · '+esc(a.kind):''}</span>`:''}<span class="pill">${gearCost(a)} ${t('itPts')}</span>${a.att?`<span class="pill admin">${t('itAtt')}</span>`:''}${(a.fx||[]).map(e=>`<span class="pill">${esc(featFxText(e))}</span>`).join('')}</div>`};
function gearSummary(d){const W=wornGear(d);if(!(d.items||[]).some(i=>armorOf(i)))return'';
  return`<details class="gear"><summary>${t('gearTitle')} · <b class="${W.pts>=CAT.eqMax?'full':''}">${W.pts}/${CAT.eqMax}</b> ${t('itPts')}${W.att?` · ${t('itAtt')} ${W.att}/${ATT_MAX}`:''}</summary><ul class="gslots">${CAT.slots.map(sl=>{const on=W.list.filter(x=>x.a.slot===sl.id);return`<li class="${on.length?'on':''}"><span>${esc(sl.name)} ${on.length}/${sl.max}</span><b>${on.length?on.map(x=>esc(x.it.name)).join(', '):'—'}</b></li>`}).join('')}</ul></details>`}
const itemsBody=d=>`<datalist id="armorlist">${CAT.armor.map(a=>`<option value="${esc(a.name)}">`).join('')}</datalist>${(d.items||[]).length?`<ul class="items">${d.items.map(it=>`<li class="irow"><input id="it_n_${it.id}" list="armorlist" aria-label="${t('itName')}" data-it="name" data-id="${it.id}" value="${esc(it.name)}"><input class="iqty" type="number" min="1" aria-label="${t('itQty')}" data-it="qty" data-id="${it.id}" value="${esc(it.qty)}"><span class="icell">${armorOf(it)?`<label class="eqw"><input type="checkbox" data-it="eq" data-id="${it.id}" ${it.eq?'checked':''}> ${t('itEquip')}</label>`:''}${it.src==='bg'?`<span class="pill">${t('fromBg')}</span>`:''}</span><button type="button" class="btn small danger" data-ita="del" data-id="${it.id}" aria-label="${t('itDel')} ${esc(it.name)}">✕</button>${itemSlotsHtml(it)}</li>`).join('')}</ul>`:`<p class="note" style="padding:0 16px">${t('itEmpty')}</p>`}${itMsg?`<p class="note" role="status" style="padding:0 16px">${esc(itMsg)}</p>`:''}${gearSummary(d)}<div class="bar"><span class="note">${t('itHint')}</span><button type="button" class="btn small" data-ita="add">+ ${t('itAdd')}</button></div>`;
const itemsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('itTitle')}</h2></div><div id="itbody">${itemsBody(d)}</div></section>`;
function refreshItems(f){const b=document.getElementById('itbody');if(!b||!edit)return;const go=b.querySelector('details.gear')?.open;b.innerHTML=itemsBody(edit.draft);if(go){const g=b.querySelector('details.gear');if(g)g.open=true}if(f){const el=document.getElementById(f);if(el)el.focus()}refreshAc()}

Object.assign(TX.th,{slots:'ช่องสวมใส่',gearTitle:'แต้มของสวมใส่',itPts:'แต้ม',itAtt:'Attunement',
 itNo_slot:'{name}: ส่วน {slot} ใส่ได้สูงสุด {max} ชิ้น ต้องถอดชิ้นเดิมก่อน',itNo_pts:'{name} ใช้ {c} แต้ม แต่ตอนนี้ใช้ไป {used}/{n} แต้ม ใส่เพิ่มไม่ได้',itNo_base:'{name}: ใส่เกราะหลักได้ครั้งละชิ้นเดียว',itNo_att:'ผูก Attunement ได้พร้อมกันไม่เกิน {att} ชิ้น ต้องถอดชิ้นอื่นก่อน',
 acSk_slot:'{name} ไม่ถูกนับ เพราะส่วนนั้นเต็มแล้ว',acSk_pts:'{name} ไม่ถูกนับ เพราะแต้มสวมใส่เต็มแล้ว',acSk_base:'{name} ไม่ถูกนับ เพราะมีเกราะหลักแล้ว',acSk_att:'{name} ไม่ถูกนับ เพราะผูก Attunement ครบแล้ว',
 gearSecT:'หมวดและแต้มของชิ้นนี้',gearSecH:'เลือกส่วนของร่างกาย ชนิด และแต้ม (ในช่วงที่ชนิดนั้นกำหนด) ตัวละครสวมรวมกันได้ไม่เกินจำนวนแต้มสูงสุด และแต่ละส่วนมีจำนวนชิ้นสูงสุด',gNoSlot:'— ไม่ระบุส่วน —',gNoKind:'— ไม่ระบุชนิด —',gRange:'ช่วงแต้มของชนิดนี้: {lo}–{hi}',gSpecial:'มีเอฟเฟกต์ = +1 แต้มให้ (ส่วนที่นับความสามารถพิเศษ)',
 slotMax:'จำนวนชิ้นสูงสุดในส่วนนี้',slotSp:'เอฟเฟกต์พิเศษ +1 แต้ม',slotTypes:'ชนิดของที่สวมใส่ในส่วนนี้',slotTypesH:'กำหนดแต้มต่ำสุดและสูงสุดของแต่ละชนิด แล้วเลือกแต้มจริงของแต่ละชิ้นในแท็บ Armor',tyAdd:'เพิ่มชนิด',tyMin:'แต้มต่ำสุด',tyMax:'แต้มสูงสุด',eqMaxL:'แต้มสวมใส่สูงสุดต่อตัวละคร',eqMaxH:'ตัวละครสวมของรวมกันได้ไม่เกินจำนวนนี้',
 fxTitleG:'เอฟเฟกต์ของชิ้นนี้',fxHintG:'ผลที่ได้ตอนสวมใส่ (เหมือน Feat) เช่น Initiative, HP, AC, Passive Perception, Speed เพิ่มได้หลายอัน'});
Object.assign(TX.en,{slots:'Body slots',gearTitle:'Gear points',itPts:'pts',itAtt:'Attunement',
 itNo_slot:'{name}: {slot} holds at most {max}. Take one off first.',itNo_pts:'{name} costs {c} pts but {used}/{n} are already used.',itNo_base:'{name}: only one base armor can be worn',itNo_att:'At most {att} attuned pieces at once. Take another off first.',
 acSk_slot:'{name} is not counted: that body part is full',acSk_pts:'{name} is not counted: out of gear points',acSk_base:'{name} is not counted: a base armor is already worn',acSk_att:'{name} is not counted: attunement is full',
 gearSecT:'Category and points of this piece',gearSecH:'Pick the body part, the kind and its points (within the kind\'s range). A character may wear gear up to the point limit in total, and each body part holds a maximum number of pieces.',gNoSlot:'— no body part —',gNoKind:'— no kind —',gRange:'Points range of this kind: {lo}–{hi}',gSpecial:'Having effects adds +1 (for body parts that count special abilities)',
 slotMax:'Most pieces in this part',slotSp:'Special effects cost +1',slotTypes:'Kinds of gear in this part',slotTypesH:'Set each kind\'s lowest and highest points, then choose each piece\'s real points in the Armor tab.',tyAdd:'Add kind',tyMin:'Min points',tyMax:'Max points',eqMaxL:'Gear points per character',eqMaxH:'A character may wear gear costing this many points in total',
 fxTitleG:'Effects while worn',fxHintG:'What this piece does while worn, like a feat: Initiative, HP, AC, passive Perception, Speed. Add as many as you like.'});
