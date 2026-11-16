/* ---------- condition rules: duration, stacking, what ends it, and any number of rules ----------
   rule = {id, when, unit, every, rest, chk:null|{k:'save'|'check'|'flat'|'dice', ab, skill, dice, dc}, ok:[act], no:[act]}
     WHEN something happens -> (optionally CHECK: a save, an ability check, a flat d20, or a dice roll >= DC)
     -> do the `ok` effects (passed / no check) and the `no` effects (failed).
   act  = dmg | heal | temp | hpmax | add | rem | dur | lvl | adv | roll | stat | speed | ac | res | flag | text
   The server keeps only these words (backend/acacia/conditions.py), so the Initiative tracker can run them later. */
const CR_AB=['STR','DEX','CON','INT','WIS','CHA'];
const CR_DT=['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'];
const CR_FLAGS=['noact','nomove','nospeak','nosee','nohear','nocast','failsave','crit5','prone','hidden'];
const CR_WHEN=['always','apply','remove','start','end','lastturn','damaged','healed','attack','hit','move','action','rest'];
const CR_GROUPS=[['gHp',['dmg','heal','temp','hpmax']],['gCond',['add','rem','dur','lvl']],['gRoll',['adv','roll','stat']],['gDef',['speed','ac','res']],['gFlag',['flag']],['gOther',['text']]];
const CR={
  title:['ผลของสถานะ (Rules)','Condition effects (rules)'],
  hint:['ตั้งได้อิสระ: เมื่อเกิดเหตุการณ์ → (ทอยตรวจหรือไม่ก็ได้) → ทำผลหลายอย่าง แยกกรณีผ่าน/ไม่ผ่านได้ในกฎเดียว ตอนนี้เป็นข้อมูลที่แสดงให้ทุกคนอ่าน ระบบ Initiative จะนำไปใช้อัตโนมัติในอนาคต','Free-form: when something happens → (optionally roll a check) → do any number of effects, with separate pass / fail results in one rule. For now they are shown to everyone; the Initiative tracker can run them later.'],
  dur:['ระยะเวลา','Duration'],durNone:['จนกว่าจะถูกลบออก','Until removed'],turn:['Turn','turn'],round:['Round','round'],minute:['นาที','minute'],hour:['ชั่วโมง','hour'],n:['จำนวน','Amount'],
  stack:['เมื่อได้รับซ้ำ','If gained again'],st_no:['ไม่ซ้อน (ของเดิมอยู่ต่อ)','No stacking (keep the old one)'],st_refresh:['ต่ออายุใหม่','Refresh the duration'],st_stack:['ซ้อนกันได้หลายอัน','Stack as separate copies'],st_level:['เป็นระดับ (เหมือน Exhaustion)','Levels (like Exhaustion)'],maxLv:['ระดับสูงสุด','Max level'],
  ends:['จบสถานะเมื่อ','Ends when'],e_short:['Short rest','Short rest'],e_long:['Long rest','Long rest'],e_damage:['โดนดาเมจ','Taking damage'],e_heal:['ได้รับการรักษา','Being healed'],
  when:['เมื่อ','When'],every:['ทุกๆ','Every'],
  w_always:['ตลอดเวลาที่ติดสถานะ','While affected'],w_apply:['ได้รับสถานะนี้','The condition is gained'],w_remove:['สถานะนี้จบลง','The condition ends'],w_start:['เริ่ม Turn/Round','Start of a turn/round'],w_end:['จบ Turn/Round','End of a turn/round'],w_lastturn:['เป็น Turn/Round สุดท้ายของระยะเวลา','Last turn/round of the duration'],w_damaged:['โดนดาเมจ','It takes damage'],w_healed:['ได้รับการรักษา','It is healed'],w_attack:['ทอยโจมตี','It makes an attack'],w_hit:['ถูกโจมตีโดน','It is hit by an attack'],w_move:['เคลื่อนที่','It moves'],w_action:['ใช้ Action','It takes an action'],w_rest:['พักผ่อน','It rests'],
  rest:['ชนิดการพัก','Kind of rest'],r_any:['พักแบบใดก็ได้','Any rest'],r_short:['Short rest','Short rest'],r_long:['Long rest','Long rest'],
  chk:['ทอยตรวจ','Roll a check'],k_none:['ไม่ต้องทอย','No roll'],k_save:['Saving Throw','Saving throw'],k_check:['Ability check','Ability check'],k_flat:['d20 เทียบ DC (ไม่บวกค่า)','Flat d20 vs DC'],k_dice:['ทอยลูกเต๋าเทียบเป้าหมาย','Dice roll vs target'],dc:['DC','DC'],target:['ต้องได้ ≥','Need ≥'],skill:['ทักษะ','Skill'],anySkill:['ไม่ระบุ','none'],
  okLbl:['ถ้าผ่าน (หรือไม่ต้องทอย) → จะทำการ','If it passes (or there is no roll) → then'],noLbl:['ถ้าไม่ผ่าน → จะทำการ','If it fails → then'],onlyLbl:['จะทำการ','Then'],
  addAct:['+ เพิ่มผล','+ Add effect'],addRule:['+ เพิ่มกฎ','+ Add rule'],delRule:['ลบกฎ','Delete rule'],delAct:['ลบ','Remove'],noRules:['ยังไม่มีกฎ','No rules yet'],noActs:['ยังไม่มีผล','No effects'],dupRule:['ทำซ้ำกฎ','Duplicate rule'],
  gHp:['HP','HP'],gCond:['สถานะ','Conditions'],gRoll:['การทอย','Rolls'],gDef:['ความเร็ว / AC / ต้านทาน','Speed / AC / resistance'],gFlag:['ข้อจำกัด','Restrictions'],gOther:['อื่นๆ','Other'],
  t_dmg:['รับดาเมจ','Take damage'],t_heal:['ฟื้น HP','Regain HP'],t_temp:['ได้ Temp HP','Gain temp HP'],t_hpmax:['เปลี่ยน HP สูงสุด','Change max HP'],t_add:['ได้รับสถานะอื่น','Gain another condition'],t_rem:['ลบสถานะ','Remove a condition'],t_dur:['เปลี่ยนระยะเวลาที่เหลือ','Change remaining duration'],t_lvl:['เปลี่ยนระดับสถานะ','Change condition level'],t_adv:['Advantage / Disadvantage','Advantage / Disadvantage'],t_roll:['บวก/ลบค่าที่ทอย (เช่น -1d4)','Add to rolls (e.g. -1d4)'],t_stat:['เปลี่ยนค่าพลัง','Change an ability score'],t_speed:['เปลี่ยนความเร็ว','Change speed'],t_ac:['เปลี่ยน AC','Change AC'],t_res:['ต้านทาน / ภูมิคุ้มกัน / อ่อนแอต่อดาเมจ','Resistance / immunity / vulnerability'],t_flag:['ข้อจำกัดพิเศษ','Special restriction'],t_text:['ข้อความอธิบายเอง','Own note'],
  dice:['ลูกเต๋า/ตัวเลข (เช่น 1d6, 2d4+1, 5)','Dice / number (e.g. 1d6, 2d4+1, 5)'],dtype:['ประเภทดาเมจ','Damage type'],allTypes:['ทุกประเภท','all types'],cond:['สถานะ','Condition'],self:['สถานะนี้เอง (จบลง)','This condition (it ends)'],allC:['สถานะอื่นทั้งหมด','All other conditions'],p_none:['(เลือก)','(choose)'],deleted:['(สถานะที่ถูกลบ)','(deleted condition)'],
  advm:['แบบ','Kind'],adv:['Advantage','Advantage'],dis:['Disadvantage','Disadvantage'],on:['กับ','On'],o_attack:['ทอยโจมตีของตัวเอง','its own attack rolls'],o_attacked:['การโจมตีใส่ตัวเอง','attacks against it'],o_check:['Ability check','ability checks'],o_save:['Saving throw','saving throws'],o_damage:['ดาเมจที่ทำ','damage it deals'],o_init:['Initiative','initiative'],ab:['ค่าพลัง','Ability'],any:['ทุกค่า','any'],
  sp:['แบบ','Kind'],sp_zero:['เหลือ 0','Becomes 0'],sp_half:['ลดครึ่งหนึ่ง','Halved'],sp_add:['เพิ่ม/ลด (ฟุต)','Add / subtract (ft)'],kind:['ความเร็วชนิด','Speed type'],sk_all:['ทุกชนิด','all'],sk_walk:['เดิน','walking'],sk_fly:['บิน','flying'],sk_swim:['ว่ายน้ำ','swimming'],sk_climb:['ปีน','climbing'],
  acm:['แบบ','Kind'],ac_add:['บวก/ลบ','Add / subtract'],ac_set:['กำหนดเป็น','Set to'],
  resm:['แบบ','Kind'],m_resist:['ต้านทาน','Resistance'],m_immune:['ภูมิคุ้มกัน','Immunity'],m_vuln:['อ่อนแอ','Vulnerability'],
  hm_half:['ลดครึ่งหนึ่ง','Halved'],hm_add:['เพิ่ม/ลด','Add / subtract'],
  dm_add:['เพิ่มระยะเวลา','Extend'],dm_sub:['ลดระยะเวลา','Shorten'],dm_end:['จบทันที','End now'],
  f_noact:['ใช้ Action และ Reaction ไม่ได้','Cannot take actions or reactions'],f_nomove:['ขยับไม่ได้','Cannot move'],f_nospeak:['พูดไม่ได้','Cannot speak'],f_nosee:['มองไม่เห็น','Cannot see'],f_nohear:['ไม่ได้ยิน','Cannot hear'],f_nocast:['ร่ายเวทไม่ได้','Cannot cast spells'],f_failsave:['พลาด Saving Throw อัตโนมัติ','Automatically fails saving throws'],f_crit5:['ถูกโจมตีในระยะ 5 ฟุตแล้วโดนเป็น Critical','Hits from within 5 ft are critical hits'],f_prone:['ล้มนอน','Falls prone'],f_hidden:['ล่องหน / ซ่อนตัว','Invisible / hidden'],
  text:['ข้อความ','Text'],durOn:['ระยะเวลาของสถานะที่ได้รับ','Duration of the gained condition'],
  summary:['สรุปผลโดยรวม','Summary']};
const cr=k=>(CR[k]||[k,k])[lang==='th'?0:1];
const crTh=()=>lang==='th';
const condName=id=>{const c=(CAT.conditions||[]).find(x=>x.id===id);return c?c.name:cr('deleted')};
const crSkillName=k=>{const s=(typeof SKILLS!=='undefined'?SKILLS:[]).find(x=>x[0]===k);return s?s[1]:k};
const crDur=d=>d&&d.u?`${d.n} ${cr(d.u)}`:'';
const crSgn=n=>(n>=0?'+':'')+n;
/* ---- one act / rule -> readable sentence ---- */
function crActText(a){
  const th=crTh(),ab=a.ab?` (${a.ab})`:'';
  switch(a.t){
    case'dmg':return th?`รับดาเมจ ${a.dice} (${a.dtype})`:`take ${a.dice} ${a.dtype} damage`;
    case'heal':return th?`ฟื้น HP ${a.dice}`:`regain ${a.dice} HP`;
    case'temp':return th?`ได้ Temp HP ${a.dice}`:`gain ${a.dice} temp HP`;
    case'hpmax':return a.m==='half'?(th?'HP สูงสุดลดลงครึ่งหนึ่ง':'max HP is halved'):(th?`HP สูงสุด ${crSgn(a.n)}`:`max HP ${crSgn(a.n)}`);
    case'add':{const d=crDur(a.dur);return th?`ได้รับสถานะ ${condName(a.cid)}${d?` เป็นเวลา ${d}`:''}`:`gain ${condName(a.cid)}${d?` for ${d}`:''}`}
    case'rem':return a.cid==='self'?(th?'สถานะนี้จบลง':'this condition ends'):a.cid==='all'?(th?'ลบสถานะอื่นทั้งหมด':'all other conditions are removed'):(th?`ลบสถานะ ${condName(a.cid)}`:`${condName(a.cid)} is removed`);
    case'dur':return a.m==='end'?(th?'สถานะจบทันที':'the condition ends now'):a.m==='add'?(th?`ระยะเวลาเพิ่ม ${a.n}`:`duration extended by ${a.n}`):(th?`ระยะเวลาลด ${a.n}`:`duration shortened by ${a.n}`);
    case'lvl':return th?`ระดับสถานะ ${crSgn(a.n)}`:`condition level ${crSgn(a.n)}`;
    case'adv':{const k=a.mode==='dis'?'Disadvantage':'Advantage';
      return th?({attack:`ทอยโจมตีเป็น ${k}`,attacked:`ผู้ที่โจมตีใส่ได้ ${k}`,check:`Ability check${ab} เป็น ${k}`,save:`Saving throw${ab} เป็น ${k}`})[a.on]
              :({attack:`its attack rolls have ${k}`,attacked:`attacks against it have ${k}`,check:`ability checks${ab} have ${k}`,save:`saving throws${ab} have ${k}`})[a.on]}
    case'roll':{const w=({attack:th?'ทอยโจมตี':'attack rolls',attacked:th?'การโจมตีใส่ตัวเอง':'attacks against it',check:th?'Ability check':'ability checks',save:th?'Saving throw':'saving throws',damage:th?'ดาเมจที่ทำ':'damage dealt',init:'Initiative'})[a.on];
      return th?`${w}${ab} ${a.dice[0]==='-'||a.dice[0]==='+'?a.dice:'+'+a.dice}`:`${w}${ab} ${a.dice[0]==='-'||a.dice[0]==='+'?a.dice:'+'+a.dice}`}
    case'stat':return th?`ค่า ${a.ab} ${crSgn(a.n)}`:`${a.ab} score ${crSgn(a.n)}`;
    case'speed':{const k=a.kind&&a.kind!=='all'?` (${cr('sk_'+a.kind)})`:'';
      return a.m==='zero'?(th?`ความเร็ว${k} เหลือ 0`:`speed${k} becomes 0`):a.m==='half'?(th?`ความเร็ว${k} ลดครึ่งหนึ่ง`:`speed${k} is halved`):(th?`ความเร็ว${k} ${crSgn(a.n)} ฟุต`:`speed${k} ${crSgn(a.n)} ft`)}
    case'ac':return a.m==='set'?`AC = ${a.n}`:`AC ${crSgn(a.n)}`;
    case'res':{const d=a.dtype==='all'?cr('allTypes'):a.dtype;return `${cr('m_'+a.m)}: ${d}`}
    case'flag':return cr('f_'+a.f)+(a.f==='failsave'&&a.ab?` (${a.ab})`:'');
    case'text':return a.text||'…';
  }return''}
function crChkText(c){
  if(!c)return'';const th=crTh();
  if(c.k==='save')return th?`ทอย ${c.ab} Saving Throw DC ${c.dc}`:`make a ${c.ab} saving throw (DC ${c.dc})`;
  if(c.k==='check')return th?`ทอย ${c.skill?crSkillName(c.skill):c.ab} check DC ${c.dc}`:`make a ${c.skill?crSkillName(c.skill):c.ab} check (DC ${c.dc})`;
  if(c.k==='flat')return th?`ทอย d20 เทียบ DC ${c.dc}`:`roll a d20 against DC ${c.dc}`;
  return th?`ทอย ${c.dice} ต้องได้ ≥ ${c.dc}`:`roll ${c.dice}, need ${c.dc} or more`}
const crList=L=>(L||[]).map(crActText).join(crTh()?' · ':', ')||'…';
function crRuleText(r){
  const th=crTh(),u=cr(r.unit),ev=r.every>1;
  const when=({always:cr('w_always'),apply:th?'เมื่อได้รับสถานะ':'When gained',remove:th?'เมื่อสถานะจบ':'When it ends',
    damaged:th?'เมื่อโดนดาเมจ':'When damaged',healed:th?'เมื่อได้รับการรักษา':'When healed',attack:th?'เมื่อทอยโจมตี':'When it attacks',
    hit:th?'เมื่อถูกโจมตีโดน':'When hit',move:th?'เมื่อเคลื่อนที่':'When it moves',action:th?'เมื่อใช้ Action':'When it takes an action',
    lastturn:th?'เมื่อถึง Turn/Round สุดท้ายของระยะเวลา':'On the last turn/round of the duration',
    rest:th?`เมื่อพัก (${cr('r_'+r.rest)})`:`When it rests (${cr('r_'+r.rest)})`,
    start:th?`เมื่อเริ่ม ${u}${ev?` ทุก ${r.every}`:''}`:`At the start of ${ev?`every ${r.every} ${u}s`:`the ${u}`}`,
    end:th?`เมื่อจบ ${u}${ev?` ทุก ${r.every}`:''}`:`At the end of ${ev?`every ${r.every} ${u}s`:`the ${u}`}`})[r.when]||'';
  if(!r.chk)return `${when}: ${crList(r.ok)}`;
  const ok=(r.ok||[]).length,no=(r.no||[]).length;
  return `${when}: ${crChkText(r.chk)} → ${ok?(th?'ผ่าน: ':'pass: ')+crList(r.ok):''}${ok&&no?' | ':''}${no?(th?'ไม่ผ่าน: ':'fail: ')+crList(r.no):''}${!ok&&!no?'…':''}`}
function crInfoLines(c){
  const L=[],th=crTh(),d=c.dur;
  L.push(`${cr('dur')}: ${d&&d.u?crDur(d):cr('durNone')}`);
  if(c.stack&&c.stack!=='no')L.push(`${cr('stack')}: ${cr('st_'+c.stack)}${c.stack==='level'?` (${cr('maxLv')} ${c.maxLv||6})`:''}`);
  if((c.ends||[]).length)L.push(`${cr('ends')}: ${c.ends.map(e=>cr('e_'+e)).join(', ')}`);
  return L}
function condRulesHtml(c){
  const rules=c.rules||[],info=crInfoLines(c);
  if(!rules.length&&info.length===1&&!(c.dur&&c.dur.u))return'';
  return`<div class="crules"><h4>${cr('title')}</h4>${rules.length?`<ul>${rules.map(r=>`<li>${esc(crRuleText(r))}</li>`).join('')}</ul>`:''}${info.map(x=>`<p class="note">${esc(x)}</p>`).join('')}</div>`}
/* ---- editor ---- */
const sel=(attrs,opts,cur)=>`<select ${attrs}>${opts.map(([v,l])=>`<option value="${esc(v)}" ${String(cur)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
const abOpts=any=>[...(any?[['',cr('any')]]:[]),...CR_AB.map(a=>[a,a])];
const durUnitOpts=(none)=>[['',none||cr('durNone')],['turn',cr('turn')],['round',cr('round')],['minute',cr('minute')],['hour',cr('hour')]];
function crActEditor(a,ri,l,ai){
  const at=`data-ri="${ri}" data-l="${l}" data-ai="${ai}"`,f=k=>`${at} data-af="${k}"`,fr=k=>`${at} data-af="${k}" data-rr="1"`;
  const groups=CR_GROUPS.map(([g,ts])=>`<optgroup label="${esc(cr(g))}">${ts.map(k=>`<option value="${k}" ${a.t===k?'selected':''}>${esc(cr('t_'+k))}</option>`).join('')}</optgroup>`).join('');
  const others=(CAT.conditions||[]).map(c=>[c.id,c.name]);
  const num=(k,lo,hi,v,lab)=>`<label class="field"><span>${lab||cr('n')}</span><input ${f(k)} type="number" min="${lo}" max="${hi}" value="${esc(v)}"></label>`;
  const dice=(lab)=>`<label class="field"><span>${lab||cr('dice')}</span><input ${f('dice')} value="${esc(a.dice)}" maxlength="12" autocapitalize="off" spellcheck="false"></label>`;
  let p='';
  switch(a.t){
    case'dmg':p=dice()+`<label class="field"><span>${cr('dtype')}</span>${sel(f('dtype'),CR_DT.map(x=>[x,x]),a.dtype)}</label>`;break;
    case'heal':case'temp':p=dice();break;
    case'hpmax':p=`<label class="field"><span>${cr('resm')}</span>${sel(fr('m'),[['half',cr('hm_half')],['add',cr('hm_add')]],a.m)}</label>${a.m==='add'?num('n',-999,999,a.n):''}`;break;
    case'add':p=`<label class="field"><span>${cr('cond')}</span>${sel(f('cid'),[['',cr('p_none')],...others],a.cid)}</label><label class="field"><span>${cr('durOn')}</span>${sel(fr('du'),durUnitOpts(),(a.dur||{}).u||'')}</label>${(a.dur||{}).u?num('dn',1,999,(a.dur||{}).n||1):''}`;break;
    case'rem':p=`<label class="field"><span>${cr('cond')}</span>${sel(f('cid'),[['self',cr('self')],['all',cr('allC')],...others],a.cid)}</label>`;break;
    case'dur':p=`<label class="field"><span>${cr('acm')}</span>${sel(fr('m'),[['add',cr('dm_add')],['sub',cr('dm_sub')],['end',cr('dm_end')]],a.m)}</label>${a.m==='end'?'':num('n',1,99,a.n)}`;break;
    case'lvl':p=num('n',-20,20,a.n);break;
    case'adv':p=`<label class="field"><span>${cr('advm')}</span>${sel(f('mode'),[['adv',cr('adv')],['dis',cr('dis')]],a.mode)}</label><label class="field"><span>${cr('on')}</span>${sel(fr('on'),['attack','attacked','check','save'].map(k=>[k,cr('o_'+k)]),a.on)}</label>${a.on==='check'||a.on==='save'?`<label class="field"><span>${cr('ab')}</span>${sel(f('ab'),abOpts(true),a.ab)}</label>`:''}`;break;
    case'roll':p=`<label class="field"><span>${cr('on')}</span>${sel(fr('on'),['attack','attacked','check','save','damage','init'].map(k=>[k,cr('o_'+k)]),a.on)}</label>${a.on==='check'||a.on==='save'?`<label class="field"><span>${cr('ab')}</span>${sel(f('ab'),abOpts(true),a.ab)}</label>`:''}`+dice(cr('dice')+' ± ');break;
    case'stat':p=`<label class="field"><span>${cr('ab')}</span>${sel(f('ab'),abOpts(false),a.ab)}</label>`+num('n',-30,30,a.n);break;
    case'speed':p=`<label class="field"><span>${cr('kind')}</span>${sel(f('kind'),['all','walk','fly','swim','climb'].map(k=>[k,cr('sk_'+k)]),a.kind)}</label><label class="field"><span>${cr('sp')}</span>${sel(fr('m'),['zero','half','add'].map(k=>[k,cr('sp_'+k)]),a.m)}</label>${a.m==='add'?num('n',-200,200,a.n):''}`;break;
    case'ac':p=`<label class="field"><span>${cr('acm')}</span>${sel(f('m'),[['add',cr('ac_add')],['set',cr('ac_set')]],a.m)}</label>`+num('n',-20,40,a.n);break;
    case'res':p=`<label class="field"><span>${cr('resm')}</span>${sel(f('m'),['resist','immune','vuln'].map(k=>[k,cr('m_'+k)]),a.m)}</label><label class="field"><span>${cr('dtype')}</span>${sel(f('dtype'),[['all',cr('allTypes')],...CR_DT.map(x=>[x,x])],a.dtype)}</label>`;break;
    case'flag':p=`<label class="field"><span>${cr('t_flag')}</span>${sel(fr('f'),CR_FLAGS.map(k=>[k,cr('f_'+k)]),a.f)}</label>${a.f==='failsave'?`<label class="field"><span>${cr('ab')}</span>${sel(f('ab'),abOpts(true),a.ab)}</label>`:''}`;break;
    case'text':p=`<label class="field grow"><span>${cr('text')}</span><input ${f('text')} value="${esc(a.text)}" maxlength="200"></label>`;break;
  }
  return`<div class="cract"><label class="field"><span>${cr('then')||''}</span><select ${fr('t')}>${groups}</select></label>${p}<button class="btn small danger" data-act="cr-act-del" ${at}>${cr('delAct')}</button></div>`}
CR.then=['ผล','Effect'];
function crActsBlock(r,ri,l,label){
  const L=r[l]||[];
  return`<div class="cracts"><div class="crlbl">${label}</div>${L.length?L.map((a,ai)=>crActEditor(a,ri,l,ai)).join(''):`<div class="note">${cr('noActs')}</div>`}<button class="btn small" data-act="cr-act-add" data-ri="${ri}" data-l="${l}">${cr('addAct')}</button></div>`}
function crRuleEditor(r,ri){
  const at=`data-ri="${ri}"`,f=k=>`${at} data-rf="${k}"`,fr=k=>`${at} data-rf="${k}" data-rr="1"`,fc=k=>`${at} data-ck="${k}"`,fcr=k=>`${at} data-ck="${k}" data-rr="1"`;
  const timed=r.when==='start'||r.when==='end',c=r.chk;
  const skills=[['',cr('anySkill')],...(typeof SKILLS!=='undefined'?SKILLS:[]).map(s=>[s[0],s[1]])];
  let chk='';
  if(r.when!=='always'){
    chk=`<div class="crsave"><label class="field"><span>${cr('chk')}</span>${sel(fcr('k'),[['',cr('k_none')],['save',cr('k_save')],['check',cr('k_check')],['flat',cr('k_flat')],['dice',cr('k_dice')]],c?c.k:'')}</label>`
     +(c&&(c.k==='save')?`<label class="field"><span>${cr('ab')}</span>${sel(fc('ab'),abOpts(false),c.ab)}</label>`:'')
     +(c&&c.k==='check'?`<label class="field"><span>${cr('ab')}</span>${sel(fc('ab'),abOpts(false),c.ab)}</label><label class="field"><span>${cr('skill')}</span>${sel(fc('skill'),skills,c.skill)}</label>`:'')
     +(c&&c.k==='dice'?`<label class="field"><span>${cr('dice')}</span><input ${fc('dice')} value="${esc(c.dice)}" maxlength="12"></label>`:'')
     +(c?`<label class="field"><span>${c.k==='dice'?cr('target'):cr('dc')}</span><input ${fc('dc')} type="number" min="1" max="99" value="${esc(c.dc)}"></label>`:'')+`</div>`}
  return`<div class="crrule"><div class="crhead"><label class="field"><span>${cr('when')}</span><select ${fr('when')}>${CR_WHEN.map(k=>`<option value="${k}" ${r.when===k?'selected':''}>${esc(cr('w_'+k))}</option>`).join('')}</select></label>
   ${timed?`<label class="field"><span>&nbsp;</span>${sel(f('unit'),[['turn',cr('turn')],['round',cr('round')]],r.unit)}</label><label class="field"><span>${cr('every')}</span><input ${f('every')} type="number" min="1" max="20" value="${esc(r.every||1)}"></label>`:''}
   ${r.when==='rest'?`<label class="field"><span>${cr('rest')}</span>${sel(f('rest'),[['any',cr('r_any')],['short',cr('r_short')],['long',cr('r_long')]],r.rest)}</label>`:''}
   <span class="crbtns"><button class="btn small" data-act="cr-dup" ${at}>${cr('dupRule')}</button><button class="btn small danger" data-act="cr-del" ${at}>${cr('delRule')}</button></span></div>
   ${chk}${c?crActsBlock(r,ri,'ok',cr('okLbl'))+crActsBlock(r,ri,'no',cr('noLbl')):crActsBlock(r,ri,'ok',cr('onlyLbl'))}
   <div class="crprev">${esc(crRuleText(r))}</div></div>`}
function condRulesEditor(d){
  const du=d.dur||{u:'',n:0},ends=d.ends||[],st=d.stack||'no';
  return`<section class="panel"><div class="ph"><div><h2>${cr('title')}</h2><div class="note">${cr('hint')}</div></div><button class="btn small" data-act="cr-add">${cr('addRule')}</button></div>
   <div class="crbody"><div class="crdur"><label class="field"><span>${cr('dur')}</span>${sel('data-cd="u" data-rr="1"',durUnitOpts(),du.u)}</label>
    ${du.u?`<label class="field"><span>${cr('n')}</span><input data-cd="n" type="number" min="1" max="999" value="${esc(du.n||1)}"></label>`:''}
    <label class="field"><span>${cr('stack')}</span>${sel('data-cl="stack" data-rr="1"',['no','refresh','stack','level'].map(k=>[k,cr('st_'+k)]),st)}</label>
    ${st==='level'?`<label class="field"><span>${cr('maxLv')}</span><input data-cl="maxLv" type="number" min="1" max="20" value="${esc(d.maxLv||6)}"></label>`:''}</div>
    <div class="crends"><span class="lbl">${cr('ends')}</span>${['short','long','damage','heal'].map(e=>`<label class="chk"><input type="checkbox" data-cl="end" data-e="${e}" ${ends.includes(e)?'checked':''}> ${cr('e_'+e)}</label>`).join('')}</div>
   ${(d.rules||[]).length?d.rules.map(crRuleEditor).join(''):`<div class="empty" style="padding:18px">${cr('noRules')}</div>`}</div></section>`}
const crNewAct=t=>({dmg:{t,dice:'1d4',dtype:'fire'},heal:{t,dice:'1d4'},temp:{t,dice:'5'},hpmax:{t,m:'add',n:-5},add:{t,cid:'',dur:{u:'',n:0}},rem:{t,cid:'self'},dur:{t,m:'add',n:1},lvl:{t,n:1},adv:{t,mode:'dis',on:'attack',ab:''},roll:{t,on:'attack',dice:'-1d4',ab:''},stat:{t,ab:'STR',n:-2},speed:{t,m:'zero',n:0,kind:'all'},ac:{t,m:'add',n:-2},res:{t,m:'resist',dtype:'all'},flag:{t,f:'noact',ab:''},text:{t,text:''}})[t];
const crNewRule=()=>({id:uid(),when:'start',unit:'turn',every:1,rest:'any',chk:null,ok:[crNewAct('dmg')],no:[]});
function crPrev(el,r){const p=el.closest('.crrule')?.querySelector('.crprev');if(p)p.textContent=crRuleText(r)}
function condRuleEdit(el){   /* typing / choosing inside the rules editor; returns true if it was one of ours */
  const d=dedit&&dedit.draft;if(!d||dedit.cat!=='conditions')return false;
  const D=el.dataset,val=el.type==='checkbox'?el.checked:el.value;
  if(D.cd){d.dur=d.dur||{u:'',n:0};if(D.cd==='u'){d.dur.u=val;d.dur.n=val?Math.max(1,d.dur.n||1):0}else d.dur.n=Math.max(1,Math.min(999,Number(val)||1));if(D.rr)render();return true}
  if(D.cl){if(D.cl==='stack')d.stack=val;else if(D.cl==='maxLv')d.maxLv=Math.max(1,Math.min(20,Number(val)||6));
    else if(D.cl==='end'){const a=d.ends=d.ends||[],i=a.indexOf(D.e);if(val&&i<0)a.push(D.e);if(!val&&i>=0)a.splice(i,1)}
    if(D.rr)render();return true}
  const r=d.rules&&d.rules[Number(D.ri)];
  if(D.rf){if(!r)return true;
    if(D.rf==='every')r.every=Math.max(1,Math.min(20,Number(val)||1));else r[D.rf]=val;
    if(D.rf==='when'&&val==='always'){r.chk=null;r.no=[]}
    if(D.rr)render();else crPrev(el,r);return true}
  if(D.ck){if(!r)return true;
    if(D.ck==='k'){if(!val){r.chk=null;r.ok=(r.ok||[]).concat(r.no||[]);r.no=[]}else r.chk={...(r.chk||{ab:'CON',dc:10,skill:'',dice:'1d6'}),k:val,dc:val==='dice'?(r.chk&&r.chk.k==='dice'?r.chk.dc:5):(r.chk&&r.chk.k!=='dice'?r.chk.dc:10),dice:(r.chk&&r.chk.dice)||'1d6'}}
    else if(D.ck==='dc')r.chk.dc=Math.max(1,Math.min(99,Number(val)||10));else r.chk[D.ck]=val;
    if(D.rr)render();else crPrev(el,r);return true}
  if(D.af){const L=r&&r[D.l],a=L&&L[Number(D.ai)];if(!a)return true;
    if(D.af==='t')L[Number(D.ai)]=crNewAct(val);
    else if(D.af==='n')a.n=Number(val)||0;
    else if(D.af==='du'){a.dur={u:val,n:val?Math.max(1,(a.dur&&a.dur.n)||1):0}}
    else if(D.af==='dn'){a.dur=a.dur||{u:'round',n:1};a.dur.n=Math.max(1,Number(val)||1)}
    else a[D.af]=val;
    if(D.rr)render();else crPrev(el,r);return true}
  return false}
function condRuleClick(a,b){
  const d=dedit.draft,ri=Number(b.dataset.ri),ai=Number(b.dataset.ai),l=b.dataset.l;d.rules=d.rules||[];
  if(a==='cr-add')d.rules.push(crNewRule());
  else if(a==='cr-del')d.rules.splice(ri,1);
  else if(a==='cr-dup'){const c=clone(d.rules[ri]);c.id=uid();d.rules.splice(ri+1,0,c)}
  else if(a==='cr-act-add')d.rules[ri][l].push(crNewAct('text'));
  else if(a==='cr-act-del')d.rules[ri][l].splice(ai,1);
  render()}
