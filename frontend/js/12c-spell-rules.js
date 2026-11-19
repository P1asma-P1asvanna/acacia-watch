/* ---------- spell effects: free-form rules, built like the condition rules (12b-condition-rules.js) ----------
   spell.rules = [{id, who:'target'|'self', chk:null|{k:'atk'}|{k:'save',ab,dc}, half:0|1, ok:[act], no:[act]}]
     who  = who gets the effects (the chosen target, or the caster)
     chk  = a spell attack (ok = hit, no = miss) or a saving throw (dc 0 = the caster's spell DC; ok = passed, no = failed)
     half = on a passed save the damage of the `no` list is halved
     act  = dmg | heal | temp | hpmax | add | rem | text   (same words as a condition; dmg / heal / temp can add dice per slot level
            above the spell's level (`up`) and grow like a cantrip (`cant`)). Conditions are given with "add" (so buffs, debuffs and
            anything else a condition can do are made in Game data -> Conditions, and the spell hands them out).
   spell.rx = {k, v, ally, dice}: what the spell does when cast as a Reaction against an attack (see 14f-react.js). Empty = guessed from the text.
   A spell without rules works as before (the dice and the save are read from the description). */
const SP_GROUPS=[['gHp',['dmg','heal','temp','hpmax']],['gCond',['add','rem']],['gOther',['text']]];
const spEditing=()=>!!(dedit&&dedit.cat==='spells');
const SPR={
  title:['ผลของเวท (ตั้งเองได้)','Spell effects (free-form)'],
  hint:['กำหนดว่าเวทนี้ทำอะไร: ทอยโจมตีเวทหรือให้เป้าหมายเซฟ แล้วเกิดผลอะไรบ้าง (ดาเมจ, ฮีล, Temp HP, ให้สถานะ…) เมื่อร่ายในการต่อสู้ ระบบจะทอยและแสดงผลตามที่ตั้งไว้ ถ้าไม่ตั้งอะไรเลย ระบบจะอ่านจากข้อความคำอธิบายเหมือนเดิม',
        'Say what the spell does: a spell attack or a saving throw, then any effects (damage, healing, temp HP, giving a condition…). When it is cast in combat the card rolls and shows exactly this. With no rules the description text is read as before.'],
  gen:['สร้างจากข้อความคำอธิบาย','Build from the description'],
  who:['ผลนี้เกิดกับ','Effects go to'],w_target:['เป้าหมาย','The target'],w_self:['ผู้ร่าย','The caster'],
  chk:['ต้องทอย','Roll'],k_none:['ไม่ต้องทอย (ได้ผลเลย)','No roll (always applies)'],k_atk:['ทอยโจมตีเวท (เทียบ AC)','Spell attack (vs AC)'],k_save:['เป้าหมายทอย Saving Throw','Target makes a saving throw'],
  dc:['DC (0 = DC ของผู้ร่าย)','DC (0 = caster\'s spell DC)'],half:['เซฟผ่านแล้วยังรับดาเมจครึ่งหนึ่ง','Half damage on a passed save'],
  up:['เพิ่มต่อสล็อตที่สูงกว่า','Extra per slot level above'],cant:['เพิ่มตามเลเวลตัวละคร (แบบ Cantrip)','Grows with level (cantrip)'],
  l_none:['ผล','Effects'],l_hit:['ถ้าโดน','If it hits'],l_miss:['ถ้าพลาด','If it misses'],l_pass:['ถ้าเซฟผ่าน','If the save passes'],l_fail:['ถ้าเซฟไม่ผ่าน','If the save fails'],
  addRule:['+ เพิ่มผล','+ Add effect'],none:['ยังไม่มีผลที่ตั้งไว้ (ระบบอ่านจากข้อความ)','No effects yet (read from the text)'],genDone:['สร้างจากข้อความแล้ว ตรวจและแก้ได้','Built from the text, check and edit it'],genNone:['อ่านข้อความแล้วไม่พบดาเมจ/ฮีล/เซฟ','Nothing found in the text (no damage, healing or save)'],
  rxTitle:['เมื่อใช้เป็น Reaction','When used as a Reaction'],rxHint:['ผลของเวทตอนร่ายเป็น Reaction ตอบโต้การโจมตี (เช่น Shield = +5 AC) ปล่อยว่างให้ระบบเดาจากข้อความ','What the spell does when cast as a Reaction against an attack (e.g. Shield = +5 AC). Leave empty to guess from the text.'],
  rxK:['ผล','Effect'],rxV:['ค่า','Value'],rxDice:['หรือทอย (เช่น 1d10+2)','Or roll (e.g. 1d10+2)'],rxAlly:['ใช้ช่วยเพื่อนได้','Can help allies'],
  rk_:['— ไม่ตั้ง (ให้ระบบเดา) —','— not set (guess) —'],rk_ac:['+AC','+AC'],rk_sub:['ลบจากค่า To-hit ของผู้โจมตี','Subtract from the attack roll'],rk_neg:['ยกเลิกการโจมตี/เวท','Cancel the attack / spell'],rk_half:['ดาเมจครึ่งหนึ่ง','Half damage'],rk_res:['ต้านทานดาเมจธาตุ (ครึ่ง)','Resistance to elemental damage (half)'],rk_red:['ลดดาเมจ','Reduce damage'],rk_take:['รับดาเมจแทน','Take the damage instead'],rk_dis:['โจมตีแบบเสียเปรียบ (GM ตัดสิน)','Attack at disadvantage (GM rules)'],rk_reroll:['บังคับทอยใหม่ (GM ตัดสิน)','Force a reroll (GM rules)'],rk_note:['GM ตัดสินผล','GM rules the result'],
  tgtNone:['ไม่มี','none'],perLv:['ต่อเลเวลสล็อต','per slot level']};
const spr=k=>(SPR[k]||[k,k])[lang==='th'?0:1];
const spNewRule=()=>({id:uid(),who:'target',chk:{k:'save',ab:'DEX',dc:0},half:1,ok:[],no:[{t:'dmg',dice:'8d6',dtype:'fire',up:'1d6',cant:0}]});
function spActText(a){return crActText(a)+(a.up?` (+${a.up} ${spr('perLv')})`:'')+(a.cant?` (${spr('cant')})`:'')}
const spList=L=>(L||[]).map(spActText).join(crTh()?' · ':', ')||'…';
function spRuleText(r){
  const th=crTh(),who=r.who==='self'?(th?'ผู้ร่าย: ':'Caster: '):'';
  if(!r.chk)return who+spList(r.ok);
  const c=r.chk,ck=c.k==='atk'?(th?'ทอยโจมตีเวท':'spell attack'):(th?`เซฟ ${c.ab} (${c.dc?'DC '+c.dc:'DC เวท'})`:`${c.ab} save (${c.dc?'DC '+c.dc:'spell DC'})`);
  const a=c.k==='atk'?[th?'โดน: ':'hit: ',th?'พลาด: ':'miss: ']:[th?'ผ่าน: ':'pass: ',th?'ไม่ผ่าน: ':'fail: '];
  const ok=(r.ok||[]).length,no=(r.no||[]).length,hf=r.half&&no?(th?'ครึ่งดาเมจ':'half damage'):'';
  return `${ck} → ${ok||hf?a[0]+[spList(r.ok).replace(/^…$/,''),hf].filter(Boolean).join(' + '):''}${(ok||hf)&&no?' | ':''}${no?a[1]+spList(r.no):''}${!ok&&!no&&!hf?'…':''}`}
function spRulesHtml(s){
  const L=(s&&s.rules)||[];if(!L.length)return'';
  return`<div class="crules"><h4>${spr('title')}</h4><ul>${L.map(r=>`<li>${esc(spRuleText(r))}</li>`).join('')}</ul></div>`}
function spRuleEditor(r,ri){
  const at=`data-ri="${ri}"`,self=r.who==='self',c=r.chk;
  const lab=c?(c.k==='atk'?['l_hit','l_miss']:['l_pass','l_fail']):['l_none',''];
  const chk=self?'':`<label class="field"><span>${spr('chk')}</span>${sel(`${at} data-sk="k" data-rr="1"`,[['',spr('k_none')],['atk',spr('k_atk')],['save',spr('k_save')]],c?c.k:'')}</label>`
    +(c&&c.k==='save'?`<label class="field"><span>${cr('ab')}</span>${sel(`${at} data-sk="ab"`,abOpts(false),c.ab)}</label><label class="field"><span>${spr('dc')}</span><input ${at} data-sk="dc" type="number" min="0" max="99" value="${esc(c.dc||0)}"></label>
      <label class="chk"><input type="checkbox" ${at} data-sr="half" data-rr="1" ${r.half?'checked':''}> ${spr('half')}</label>`:'');
  return`<div class="crrule"><div class="crhead"><label class="field"><span>${spr('who')}</span>${sel(`${at} data-sr="who" data-rr="1"`,[['target',spr('w_target')],['self',spr('w_self')]],r.who)}</label>${chk}
   <span class="crbtns"><button class="btn small" data-act="cr-dup" ${at}>${cr('dupRule')}</button><button class="btn small danger" data-act="cr-del" ${at}>${cr('delRule')}</button></span></div>
   ${crActsBlock(r,ri,'ok',spr(lab[0]))}${c?crActsBlock(r,ri,'no',spr(lab[1])):''}<div class="crprev">${esc(spRuleText(r))}</div></div>`}
function spRulesEditor(d){
  const rx=d.rx||null;
  return`<section class="panel"><div class="ph"><div><h2>${spr('title')}</h2><div class="note">${spr('hint')}</div></div><span class="crbtns"><button class="btn small" data-act="cr-gen">${spr('gen')}</button><button class="btn small" data-act="cr-add">${spr('addRule')}</button></span></div>
   <div class="crbody">${spMsg2?`<p class="note" role="status">${esc(spMsg2)}</p>`:''}${(d.rules||[]).length?d.rules.map(spRuleEditor).join(''):`<div class="empty" style="padding:18px">${spr('none')}</div>`}</div></section>
   <section class="panel"><div class="ph"><div><h2>${spr('rxTitle')}</h2><div class="note">${spr('rxHint')}</div></div></div>
   <div class="crbody"><div class="crhead"><label class="field"><span>${spr('rxK')}</span>${sel('data-rxk="k" data-rr="1"',[['',spr('rk_')],...['ac','sub','neg','half','res','red','take','dis','reroll','note'].map(k=>[k,spr('rk_'+k)])],rx?rx.k:'')}</label>
    ${rx&&['ac','sub','red'].includes(rx.k)?`<label class="field"><span>${spr('rxV')}</span><input data-rxk="v" type="number" min="-60" max="60" value="${esc(rx.v||0)}"></label>`:''}
    ${rx&&['sub','red'].includes(rx.k)?`<label class="field"><span>${spr('rxDice')}</span><input data-rxk="dice" value="${esc(rx.dice||'')}" maxlength="12" autocapitalize="off" spellcheck="false"></label>`:''}
    ${rx?`<label class="chk"><input type="checkbox" data-rxk="ally" ${rx.ally?'checked':''}> ${spr('rxAlly')}</label>`:''}</div></div></section>`}
let spMsg2='';
/* typing / choosing in the spell-effect editor (the act rows are shared with the condition editor, see condRuleEdit) */
function spRuleEdit(el,d,D,val){
  if(D.rxk){
    if(D.rxk==='k'){d.rx=val?Object.assign({k:val,v:val==='ac'?5:0,ally:0,dice:''},d.rx&&d.rx.k===val?d.rx:{},{k:val}):null}
    else if(d.rx){if(D.rxk==='v')d.rx.v=Math.max(-60,Math.min(60,Math.round(Number(val)||0)));else if(D.rxk==='ally')d.rx.ally=val?1:0;else d.rx.dice=String(val).trim().slice(0,12)}
    if(D.rr)render();return true}
  const r=d.rules&&d.rules[Number(D.ri)];if(!r)return true;
  if(D.sr){if(D.sr==='half')r.half=val?1:0;else r[D.sr]=val;
    if(D.sr==='who'&&val==='self'){r.chk=null;r.no=[];r.half=0}
    if(D.rr)render();else crPrev(el,r);return true}
  if(D.sk){
    if(D.sk==='k'){if(!val){r.chk=null;r.ok=(r.ok||[]).concat(r.no||[]);r.no=[];r.half=0}else r.chk=val==='atk'?{k:'atk'}:{k:'save',ab:(r.chk&&r.chk.ab)||'DEX',dc:(r.chk&&r.chk.dc)||0}}
    else if(r.chk){if(D.sk==='dc')r.chk.dc=Math.max(0,Math.min(99,Math.round(Number(val)||0)));else r.chk[D.sk]=val}
    if(D.rr)render();else crPrev(el,r);return true}
  return false}
/* build rules from the description text (the way the combat card used to read it) */
function spRulesFromDesc(d){
  const info=taParseSpell(d,null,null,d.lvl||0),x=String(d.desc||'');
  const dm=m=>({dice:`${m.n}d${m.s}${m.b?(m.b>0?'+':'-')+Math.abs(m.b):''}`,dtype:CR_DT.includes(m.type)?m.type:'force'});
  const up=/(?:increases?|extra)[^.]{0,40}?(\d{1,2})d(\d{1,3})[^.]{0,50}?(?:slot )?level above/i.exec(x),upS=up&&(d.lvl||0)>0?`${up[1]}d${up[2]}`:'';
  const dmg=m=>Object.assign({t:'dmg'},dm(m),{up:upS,cant:(d.lvl||0)===0?1:0});
  const heal=m=>({t:'heal',dice:`${m.n}d${m.s}${m.b?(m.b>0?'+':'-')+Math.abs(m.b):''}`,up:upS,cant:0});
  const R=[];
  if(info.save)R.push({id:uid(),who:'target',chk:{k:'save',ab:info.save.toUpperCase(),dc:0},half:info.dmg&&info.half?1:0,ok:[],no:info.dmg?[dmg(info.dmg)]:[]});
  else if(info.atk&&info.dmg)R.push({id:uid(),who:'target',chk:{k:'atk'},half:0,ok:[dmg(info.dmg)],no:[]});
  else if(info.heal)R.push({id:uid(),who:'target',chk:null,half:0,ok:[heal(info.heal)],no:[]});
  else if(info.dmg)R.push({id:uid(),who:'target',chk:null,half:0,ok:[dmg(info.dmg)],no:[]});
  return R}
function spRuleClick(a,b,d){
  const ri=Number(b.dataset.ri),l=b.dataset.l;d.rules=d.rules||[];spMsg2='';
  if(a==='cr-add')d.rules.push(spNewRule());
  else if(a==='cr-gen'){const R=spRulesFromDesc(d);if(R.length){d.rules=R;spMsg2=spr('genDone')}else spMsg2=spr('genNone')}
  else if(a==='cr-del')d.rules.splice(ri,1);
  else if(a==='cr-dup'){const c=clone(d.rules[ri]);c.id=uid();d.rules.splice(ri+1,0,c)}
  else if(a==='cr-act-add')d.rules[ri][l].push(crNewAct('dmg'));
  else if(a==='cr-act-del')d.rules[ri][l].splice(Number(b.dataset.ai),1);
  render()}
