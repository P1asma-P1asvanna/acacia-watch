/* ---------- condition rules: duration + rules "when ... [saving throw] -> do ..." (data the admin builds; shown to everyone) ----------
   rule = {id, when:'always'|'apply'|'start'|'end'|'damaged', unit:'turn'|'round', save:null|{ab,dc,on:'pass'|'fail'}, acts:[act]}
   act  = dmg{dice,dtype} | heal{dice} | add{cid} | rem{cid|'self'} | adv{mode,on,ab} | speed{m,n} | ac{n} | noact | text{text}
   The server keeps only these words (backend/acacia/conditions.py), so they can later be run by the Initiative tracker. */
const CR_AB=['STR','DEX','CON','INT','WIS','CHA'];
const CR_DT=['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'];
const CR={
  title:['ผลของสถานะ (Rules)','Condition effects (rules)'],
  hint:['สร้างกฎได้หลายข้อ เช่น "เมื่อจบ Turn ทอย CON Save DC 13 หากไม่ผ่าน รับดาเมจ 1d6" ตอนนี้เป็นข้อมูลที่แสดงให้ทุกคนอ่าน ระบบ Initiative จะนำไปใช้อัตโนมัติในอนาคต','Build any number of rules, e.g. "at the end of the turn, make a CON save (DC 13); on a failure take 1d6". For now they are shown to everyone; the Initiative tracker can run them later.'],
  dur:['ระยะเวลา','Duration'],durNone:['จนกว่าจะถูกลบออก','Until removed'],turn:['Turn','turn'],round:['Round','round'],minute:['นาที','minute'],hour:['ชั่วโมง','hour'],
  when:['เมื่อ','When'],always:['ตลอดเวลาที่ติดสถานะ','While affected'],apply:['ได้รับสถานะนี้','The condition is gained'],start:['เริ่ม','Start of the'],end:['จบ','End of the'],damaged:['โดนดาเมจ','Damaged'],
  needSave:['ต้องทอย Saving Throw','Requires a saving throw'],dc:['DC','DC'],onPass:['หากผ่าน','On a success'],onFail:['หากไม่ผ่าน','On a failure'],
  then:['จะทำการ','Then'],addAct:['+ เพิ่มผล','+ Add effect'],addRule:['+ เพิ่มกฎ','+ Add rule'],delRule:['ลบกฎ','Delete rule'],delAct:['ลบ','Remove'],noRules:['ยังไม่มีกฎ','No rules yet'],noActs:['ยังไม่มีผล','No effects yet'],
  t_dmg:['รับดาเมจ','Take damage'],t_heal:['ฟื้น HP','Regain HP'],t_add:['ได้รับสถานะ','Gain a condition'],t_rem:['ลบสถานะ','Remove a condition'],t_adv:['Advantage / Disadvantage','Advantage / Disadvantage'],t_speed:['เปลี่ยนความเร็ว','Change speed'],t_ac:['เปลี่ยน AC','Change AC'],t_noact:['ใช้ Action/Reaction ไม่ได้','Cannot act or react'],t_text:['ข้อความอธิบายเอง','Own note'],
  dice:['ลูกเต๋า (เช่น 1d6, 2d4+1)','Dice (e.g. 1d6, 2d4+1)'],dtype:['ประเภทดาเมจ','Damage type'],cond:['สถานะ','Condition'],self:['สถานะนี้เอง (จบลง)','This condition (it ends)'],
  advm:['แบบ','Kind'],adv:['Advantage','Advantage'],dis:['Disadvantage','Disadvantage'],on:['กับ','On'],o_attack:['ทอยโจมตีของตัวเอง','its own attack rolls'],o_attacked:['การโจมตีใส่ตัวเอง','attacks against it'],o_check:['Ability check','ability checks'],o_save:['Saving throw','saving throws'],ab:['ค่าพลัง','Ability'],any:['ทุกค่า','any'],
  sp:['แบบ','Kind'],sp_zero:['เหลือ 0','Becomes 0'],sp_half:['ลดครึ่งหนึ่ง','Halved'],sp_add:['เพิ่ม/ลด (ฟุต)','Add / subtract (ft)'],n:['จำนวน','Amount'],text:['ข้อความ','Text'],
  p_none:['(ไม่มี)','(none)'],deleted:['(สถานะที่ถูกลบ)','(deleted condition)']};
const cr=k=>(CR[k]||[k,k])[lang==='th'?0:1];
const crDt=k=>k;
const condName=id=>{const c=(CAT.conditions||[]).find(x=>x.id===id);return c?c.name:cr('deleted')};
/* one rule -> one readable sentence (Thai or English, whichever the page uses) */
function crActText(a){
  const th=lang==='th';
  switch(a.t){
    case'dmg':return th?`รับดาเมจ ${a.dice} (${a.dtype})`:`take ${a.dice} ${a.dtype} damage`;
    case'heal':return th?`ฟื้น HP ${a.dice}`:`regain ${a.dice} HP`;
    case'add':return th?`ได้รับสถานะ ${condName(a.cid)}`:`gain ${condName(a.cid)}`;
    case'rem':return a.cid==='self'?(th?'สถานะนี้จบลง':'this condition ends'):(th?`ลบสถานะ ${condName(a.cid)}`:`${condName(a.cid)} is removed`);
    case'adv':{const k=a.mode==='dis'?'Disadvantage':'Advantage',ab=a.ab?` (${a.ab})`:'';
      return th?({attack:`ทอยโจมตีเป็น ${k}`,attacked:`ผู้ที่โจมตีใส่ได้ ${k}`,check:`Ability check${ab} เป็น ${k}`,save:`Saving throw${ab} เป็น ${k}`})[a.on]
              :({attack:`its attack rolls have ${k}`,attacked:`attacks against it have ${k}`,check:`ability checks${ab} have ${k}`,save:`saving throws${ab} have ${k}`})[a.on]}
    case'speed':return a.m==='zero'?(th?'ความเร็วเหลือ 0':'speed becomes 0'):a.m==='half'?(th?'ความเร็วลดครึ่งหนึ่ง':'speed is halved'):(th?`ความเร็ว ${a.n>=0?'+':''}${a.n} ฟุต`:`speed ${a.n>=0?'+':''}${a.n} ft`);
    case'ac':return `AC ${a.n>=0?'+':''}${a.n}`;
    case'noact':return th?'ใช้ Action และ Reaction ไม่ได้':'cannot take actions or reactions';
    case'text':return a.text||'…';
  }return''}
function crRuleText(r){
  const th=lang==='th',u=cr(r.unit);
  const when=({always:cr('always'),apply:th?'เมื่อได้รับสถานะ':'When gained',damaged:th?'เมื่อโดนดาเมจ':'When damaged',
    start:th?`เมื่อเริ่ม ${u}`:`At the start of the ${u}`,end:th?`เมื่อจบ ${u}`:`At the end of the ${u}`})[r.when]||'';
  const sv=r.save?(th?`ทอย ${r.save.ab} Saving Throw DC ${r.save.dc} ${r.save.on==='pass'?'หากผ่าน':'หากไม่ผ่าน'}`:`make a ${r.save.ab} saving throw (DC ${r.save.dc}); on a ${r.save.on==='pass'?'success':'failure'}`):'';
  const acts=(r.acts||[]).map(crActText).join(th?' · ':', ')||'…';
  return `${when}: ${sv?sv+(th?' → ':' → '):''}${acts}`}
function crDurText(c){const d=c.dur||{};return d.u?`${cr('dur')}: ${d.n} ${cr(d.u)}`:`${cr('dur')}: ${cr('durNone')}`}
/* shown under the description (conditions page and popup) */
function condRulesHtml(c){
  const rules=c.rules||[];if(!rules.length&&!(c.dur&&c.dur.u))return'';
  return`<div class="crules"><h4>${cr('title')}</h4>${rules.length?`<ul>${rules.map(r=>`<li>${esc(crRuleText(r))}</li>`).join('')}</ul>`:''}<p class="note">${esc(crDurText(c))}</p></div>`}
/* ---- editor ---- */
const sel=(attrs,opts,cur)=>`<select ${attrs}>${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
const abOpts=any=>[...(any?[['',cr('any')]]:[]),...CR_AB.map(a=>[a,a])];
function crActEditor(a,ri,ai){
  const at=`data-ri="${ri}" data-ai="${ai}"`,f=k=>`${at} data-af="${k}"`,fr=k=>`${at} data-af="${k}" data-rr="1"`;
  const types=['dmg','heal','add','rem','adv','speed','ac','noact','text'].map(k=>[k,cr('t_'+k)]);
  const others=(CAT.conditions||[]).map(c=>[c.id,c.name]);
  let p='';
  if(a.t==='dmg')p=`<label class="field"><span>${cr('dice')}</span><input ${f('dice')} value="${esc(a.dice)}" inputmode="text" maxlength="12"></label><label class="field"><span>${cr('dtype')}</span>${sel(f('dtype'),CR_DT.map(x=>[x,x]),a.dtype)}</label>`;
  else if(a.t==='heal')p=`<label class="field"><span>${cr('dice')}</span><input ${f('dice')} value="${esc(a.dice)}" maxlength="12"></label>`;
  else if(a.t==='add')p=`<label class="field"><span>${cr('cond')}</span>${sel(f('cid'),[['',cr('p_none')],...others],a.cid)}</label>`;
  else if(a.t==='rem')p=`<label class="field"><span>${cr('cond')}</span>${sel(f('cid'),[['self',cr('self')],...others],a.cid)}</label>`;
  else if(a.t==='adv')p=`<label class="field"><span>${cr('advm')}</span>${sel(f('mode'),[['adv',cr('adv')],['dis',cr('dis')]],a.mode)}</label><label class="field"><span>${cr('on')}</span>${sel(fr('on'),['attack','attacked','check','save'].map(k=>[k,cr('o_'+k)]),a.on)}</label>${a.on==='check'||a.on==='save'?`<label class="field"><span>${cr('ab')}</span>${sel(f('ab'),abOpts(true),a.ab)}</label>`:''}`;
  else if(a.t==='speed')p=`<label class="field"><span>${cr('sp')}</span>${sel(fr('m'),['zero','half','add'].map(k=>[k,cr('sp_'+k)]),a.m)}</label>${a.m==='add'?`<label class="field"><span>${cr('n')}</span><input ${f('n')} type="number" min="-200" max="200" value="${esc(a.n)}"></label>`:''}`;
  else if(a.t==='ac')p=`<label class="field"><span>${cr('n')}</span><input ${f('n')} type="number" min="-20" max="20" value="${esc(a.n)}"></label>`;
  else if(a.t==='text')p=`<label class="field grow"><span>${cr('text')}</span><input ${f('text')} value="${esc(a.text)}" maxlength="200"></label>`;
  return`<div class="cract"><label class="field"><span>${cr('then')}</span>${sel(fr('t'),types,a.t)}</label>${p}<button class="btn small danger" data-act="cr-act-del" data-ri="${ri}" data-ai="${ai}">${cr('delAct')}</button></div>`}
function crRuleEditor(r,ri){
  const at=`data-ri="${ri}"`,f=k=>`${at} data-rf="${k}"`,fr=k=>`${at} data-rf="${k}" data-rr="1"`;
  const whens=['always','apply','start','end','damaged'].map(k=>[k,cr(k)]);
  const timed=r.when==='start'||r.when==='end';
  return`<div class="crrule"><div class="crhead"><label class="field"><span>${cr('when')}</span>${sel(fr('when'),whens,r.when)}</label>
   ${timed?`<label class="field"><span>&nbsp;</span>${sel(f('unit'),[['turn',cr('turn')],['round',cr('round')]],r.unit)}</label>`:''}
   ${r.when!=='always'?`<label class="chk"><input type="checkbox" ${fr('savec')} ${r.save?'checked':''}> ${cr('needSave')}</label>`:''}
   <button class="btn small danger" data-act="cr-del" ${at}>${cr('delRule')}</button></div>
   ${r.save&&r.when!=='always'?`<div class="crsave"><label class="field"><span>Saving Throw</span>${sel(f('ab'),abOpts(false),r.save.ab)}</label><label class="field"><span>${cr('dc')}</span><input ${f('dc')} type="number" min="1" max="40" value="${esc(r.save.dc)}"></label><label class="field"><span>&nbsp;</span>${sel(f('on'),[['fail',cr('onFail')],['pass',cr('onPass')]],r.save.on)}</label></div>`:''}
   <div class="cracts">${(r.acts||[]).length?r.acts.map((a,ai)=>crActEditor(a,ri,ai)).join(''):`<div class="note">${cr('noActs')}</div>`}</div>
   <button class="btn small" data-act="cr-act-add" ${at}>${cr('addAct')}</button>
   <div class="crprev">${esc(crRuleText(r))}</div></div>`}
function condRulesEditor(d){
  const du=d.dur||{u:'',n:0};
  return`<section class="panel"><div class="ph"><div><h2>${cr('title')}</h2><div class="note">${cr('hint')}</div></div><button class="btn small" data-act="cr-add">${cr('addRule')}</button></div>
   <div class="crbody"><div class="crdur"><label class="field"><span>${cr('dur')}</span>${sel('data-cd="u" data-rr="1"',[['',cr('durNone')],['turn',cr('turn')],['round',cr('round')],['minute',cr('minute')],['hour',cr('hour')]],du.u)}</label>
    ${du.u?`<label class="field"><span>${cr('n')}</span><input data-cd="n" type="number" min="1" max="999" value="${esc(du.n||1)}"></label>`:''}</div>
   ${(d.rules||[]).length?d.rules.map(crRuleEditor).join(''):`<div class="empty" style="padding:18px">${cr('noRules')}</div>`}</div></section>`}
const crNewAct=t=>({dmg:{t,dice:'1d4',dtype:'fire'},heal:{t,dice:'1d4'},add:{t,cid:''},rem:{t,cid:'self'},adv:{t,mode:'dis',on:'attack',ab:''},speed:{t,m:'zero',n:0},ac:{t,n:-2},noact:{t},text:{t,text:''}})[t];
function condRuleEdit(el){   /* typing / choosing inside the rules editor; returns true if it was one of ours */
  const d=dedit&&dedit.draft;if(!d||dedit.cat!=='conditions')return false;
  const D=el.dataset,val=el.type==='checkbox'?el.checked:el.value;
  if(D.cd){d.dur=d.dur||{u:'',n:0};if(D.cd==='u'){d.dur.u=val;d.dur.n=val?Math.max(1,d.dur.n||1):0}else d.dur.n=Math.max(1,Math.min(999,Number(val)||1));if(D.rr)render();return true}
  if(D.rf){const r=d.rules[Number(D.ri)];if(!r)return true;
    if(D.rf==='savec')r.save=val?(r.save||{ab:'CON',dc:10,on:'fail'}):null;
    else if(D.rf==='ab'||D.rf==='on')r.save[D.rf]=val;
    else if(D.rf==='dc')r.save.dc=Math.max(1,Math.min(40,Number(val)||10));
    else r[D.rf]=val;
    if(D.rf==='when'&&val==='always')r.save=null;
    if(D.rr)render();else{const p=el.closest('.crrule')?.querySelector('.crprev');if(p)p.textContent=crRuleText(r)}return true}
  if(D.af){const r=d.rules[Number(D.ri)],a=r&&r.acts[Number(D.ai)];if(!a)return true;
    if(D.af==='t'){r.acts[Number(D.ai)]=crNewAct(val)}
    else if(D.af==='n')a.n=Number(val)||0;else a[D.af]=val;
    if(D.rr)render();else{const p=el.closest('.crrule')?.querySelector('.crprev');if(p)p.textContent=crRuleText(r)}return true}
  return false}
function condRuleClick(a,b){
  const d=dedit.draft,ri=Number(b.dataset.ri),ai=Number(b.dataset.ai);d.rules=d.rules||[];
  if(a==='cr-add')d.rules.push({id:uid(),when:'start',unit:'turn',save:null,acts:[crNewAct('dmg')]});
  else if(a==='cr-del')d.rules.splice(ri,1);
  else if(a==='cr-act-add')d.rules[ri].acts.push(crNewAct('text'));
  else if(a==='cr-act-del')d.rules[ri].acts.splice(ai,1);
  render()}
