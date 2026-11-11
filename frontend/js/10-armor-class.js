/* ---------- armor class ---------- */
const armorBase=n=>String(n||'').trim().replace(/\s*\+\d+\s*$/,'').toLowerCase();
const armorOf=it=>{const b=armorBase(it.name);return b?CAT.armor.find(a=>String(a.name).toLowerCase()===b)||null:null};
const itemEnch=it=>{const m=String(it.name||'').match(/\+(\d+)\s*$/);return m?+m[1]:0};
const isShield=a=>/shield/i.test(a.acat||'');
/* catalog armor AC is the bonus over 10 (Leather 1 = AC 11). one body armor and one shield count. */
function acCalc(d){
  const dx=mod(abT(d,'dex')),lines=[],warns=[];let body=null,sh=null;
  (d.items||[]).filter(i=>i.eq).forEach(it=>{const a=armorOf(it);if(!a)return;
    if(isShield(a)){if(!sh)sh={it,a};else warns.push(fill(t('acIgnored'),{name:esc(it.name)}))}
    else{if(!body)body={it,a};else warns.push(fill(t('acIgnored'),{name:esc(it.name)}))}});
  let total;
  if(body){
    const a=body.a,armor=10+Math.round(num(a.ac))+itemEnch(body.it)+Math.round(num(a.ench));
    const heavy=/heavy/i.test(a.acat||''),md=String(a.maxdex).trim()===''?null:Math.round(num(a.maxdex));
    const dp=heavy?0:(md===null?dx:Math.min(dx,md));
    const note=heavy?' ('+t('acHeavyNoDex')+')':(md!==null&&dx>md?' ('+fill(t('acCap'),{n:md})+')':'');
    total=armor+dp;lines.push(fill(t('acBody'),{name:esc(body.it.name),armor,dex:sgn(dp),note,v:total}));
    if(num(a.str)>0&&num(abT(d,'str'))<num(a.str))warns.push(fill(t('acStr'),{name:esc(body.it.name),n:num(a.str),s:num(abT(d,'str'))}));
    if(/disadv/i.test(a.stealth||''))warns.push(fill(t('acStealth'),{name:esc(body.it.name)}));
  }else{total=10+dx;lines.push(fill(t('acNone'),{dx:sgn(dx),v:total}))}
  const fa=fxAll(d,!!body);if(fa.ac){total+=fa.ac;lines.push(fill(t('acFeat'),{src:fxLine(fa,'ac'),v:sgn(fa.ac)}))}
  if(sh){const v=Math.round(num(sh.a.ac))+itemEnch(sh.it)+Math.round(num(sh.a.ench));total+=v;lines.push(fill(t('acShield'),{name:esc(sh.it.name),v:sgn(v)}))}
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
  if(el.dataset.it==='eq'){it.eq=el.checked;if(it.eq){const a=armorOf(it);if(a)d.items.forEach(o=>{if(o!==it&&o.eq){const b=armorOf(o);if(b&&isShield(b)===isShield(a))o.eq=false}})}refreshItems();return}
  if(el.dataset.it==='name'){const a=armorOf(it);if(!a)it.eq=false;const row=el.closest('.irow'),has=!!(row&&row.querySelector('[data-it=eq]'));if(has!==!!a)refreshItems();else refreshAc()}
}
const itemsBody=d=>`<datalist id="armorlist">${CAT.armor.map(a=>`<option value="${esc(a.name)}">`).join('')}</datalist>${(d.items||[]).length?`<ul class="items">${d.items.map(it=>`<li class="irow"><input id="it_n_${it.id}" list="armorlist" aria-label="${t('itName')}" data-it="name" data-id="${it.id}" value="${esc(it.name)}"><input class="iqty" type="number" min="1" aria-label="${t('itQty')}" data-it="qty" data-id="${it.id}" value="${esc(it.qty)}"><span class="icell">${armorOf(it)?`<label class="eqw"><input type="checkbox" data-it="eq" data-id="${it.id}" ${it.eq?'checked':''}> ${t('itEquip')}</label>`:''}${it.src==='bg'?`<span class="pill">${t('fromBg')}</span>`:''}</span><button type="button" class="btn small danger" data-ita="del" data-id="${it.id}" aria-label="${t('itDel')} ${esc(it.name)}">✕</button></li>`).join('')}</ul>`:`<p class="note" style="padding:0 16px">${t('itEmpty')}</p>`}<div class="bar"><span class="note">${t('itHint')}</span><button type="button" class="btn small" data-ita="add">+ ${t('itAdd')}</button></div>`;
const itemsPanel=d=>`<section class="panel"><div class="ph"><h2>${t('itTitle')}</h2></div><div id="itbody">${itemsBody(d)}</div></section>`;
function refreshItems(f){const b=document.getElementById('itbody');if(!b||!edit)return;b.innerHTML=itemsBody(edit.draft);if(f){const el=document.getElementById(f);if(el)el.focus()}refreshAc()}
