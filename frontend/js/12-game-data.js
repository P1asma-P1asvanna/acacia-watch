/* ---------- game data (admin edits the catalogs that characters draw from) ---------- */
const FL={name:['ชื่อ','Name'],asi:['ค่าพลังที่เพิ่ม','Ability score increases'],nac:['AC ธรรมชาติ','Natural AC'],speed:['ความเร็ว (ฟุต)','Speed (ft)'],bhp:['HP โบนัสต่อเลเวล','Bonus HP per level'],
 res:['ความต้านทานและคุณลักษณะ','Resistances and traits'],lang:['ภาษา','Languages'],nat:['การโจมตีตามธรรมชาติ','Natural attack'],prof:['ความชำนาญอาวุธและเกราะ','Weapon and armor proficiencies'],other:['ฟีเจอร์อื่น','Other features'],
 hd:['ลูกเต๋า HP','Hit die'],alt:['AC ทางเลือก','Alt AC'],init:['โบนัส Initiative','Init bonus'],saves:['Saving throw และทักษะอาชีพ','Saving throws and class skills'],first:['ความชำนาญเลเวล 1','1st-level proficiencies'],
 multi:['ความชำนาญเพิ่ม / multiclass','Additional / multiclass proficiencies'],spellType:['ประเภทการร่ายเวท','Spellcasting type'],spellAb:['พลังร่ายเวท','Spellcasting ability'],speedInc:['ความเร็วที่เพิ่ม','Speed increase'],subs:['สายอาชีพ','Subclasses'],
 die:['ลูกเต๋าดาเมจ','Damage die'],dtype:['ประเภทดาเมจ','Damage type'],pcat:['หมวดความชำนาญ','Proficiency category'],range:['ระยะ','Range'],monk:['อาวุธ Monk','Monk weapon'],ench:['โบนัสมนตร์','Enchantment bonus'],
 bdie:['ลูกเต๋าดาเมจเพิ่ม','Bonus damage die'],btype:['ประเภทดาเมจเพิ่ม','Bonus damage type'],abil:['พลังที่ใช้โจมตีแทน','Attack ability override'],props:['คุณสมบัติ','Properties'],apply:['บวกค่าพลัง','Apply ability mod'],
 ac:['โบนัส AC','AC bonus'],maxdex:['Dex สูงสุด','Max Dex modifier'],acat:['หมวด','Category'],str:['STR ที่ต้องการ','Strength required'],stealth:['Stealth','Stealth'],pb:['โบนัส Proficiency','Proficiency bonus bonus'],skills:['โบนัสทักษะ','Skills bonus'],saves2:['โบนัส Saves','Saves bonus']};
const fl=k=>(FL[k]||[k,k])[lang==='th'?0:1];
Object.assign(FL,{nLang:['จำนวนภาษาที่เลือกได้','Languages to choose'],nTool:['จำนวน Tool Proficiencies ที่เลือกได้','Tool proficiencies to choose'],nVeh:['จำนวน Vehicle Proficiencies ที่เลือกได้','Vehicle proficiencies to choose']});
/* field types: t text, a long text, n number, b yes/no */
const SCHEMA={
 races:{cols:['name','asi','speed','lang'],f:[['name','t'],['asi','t'],['nac','t'],['speed','n'],['bhp','t'],['res','a'],['lang','t'],['nat','t'],['prof','t'],['other','a']]},
 classes:{cols:['name','hd','spellType','subs'],f:[['name','t'],['hd','t'],['alt','t'],['init','t'],['bhp','t'],['saves','a'],['first','t'],['multi','t'],['spellType','t'],['spellAb','t'],['speedInc','t'],['asiLv','t']]},
 weapons:{cols:['name','die','dtype','pcat','range'],f:[['name','t'],['die','t'],['dtype','t'],['pcat','t'],['range','t'],['monk','b'],['ench','t'],['bdie','t'],['btype','t'],['abil','t'],['props','t'],['apply','b']]},
 armor:{cols:['name','ac','acat','maxdex'],f:[['name','t'],['ac','n'],['maxdex','t'],['acat','t'],['str','t'],['stealth','t'],['ench','t'],['pb','t'],['skills','t'],['saves','t'],['props','t'],['slot','t'],['kind','t'],['pts','n'],['att','b']]},
 alignments:{cols:['name'],f:[['name','t']]},
 backgrounds:{cols:['name','nLang','nTool','nVeh','sk'],f:[['name','t'],['nLang','n'],['nTool','n'],['nVeh','n'],['originFeat','t'],['equip','a']]},
 languages:{cols:['name'],f:[['name','t']]},
 tools:{cols:['name'],f:[['name','t']]},
 vehicles:{cols:['name'],f:[['name','t']]},
 conditions:{cols:['name','sum'],f:[['name','t'],['sum','t'],['desc','a']]},
 spells:{cols:['name','lvl','school','src','conc'],f:[['name','t'],['lvl','n'],['school','t'],['src','t'],['time','t'],['range','t'],['comp','t'],['dur','t'],['conc','b'],['rit','b'],['classes','t'],['desc','a']]},
 feats:{cols:['name','cat','minLv','asi'],f:[['name','t'],['cat','t'],['minLv','n'],['prereq','t'],['asi','t'],['pts','n'],['cap','n'],['rep','b'],['desc','a']]}};
Object.assign(FL,{sum:['สรุปสั้น','Short summary'],desc:['รายละเอียดผลของสถานะ','Full effects']});
Object.assign(FL,{sk:['Skill Proficiencies ที่ได้','Skill proficiencies granted'],equip:['อุปกรณ์เริ่มต้น (หนึ่งรายการต่อบรรทัด เช่น 2x Torch)','Starting equipment (one item per line, e.g. 2x Torch)']});
FL.saves=['Saving throw และทักษะอาชีพ','Saving throws and class skills']; /* class saves; armor uses the same key with its own label below */
Object.assign(FL,{pts:['แต้มพลังที่ได้ (1 = +1 ตัวเดียว, 2 = เลือก +1 สองช่อง)','Ability points (1 = one +1, 2 = two separate +1 picks)'],cap:['เพดานค่าพลัง (20 ปกติ, 30 Epic Boon)','Ability score cap (20 normal, 30 Epic Boon)'],cat:['หมวด','Category'],minLv:['เลเวลขั้นต่ำ','Minimum level'],prereq:['เงื่อนไข (Prerequisite)','Prerequisite'],rep:['เลือกซ้ำได้','Can be taken more than once'],asiLv:['เลเวลที่ได้ ASI/Feat (คั่นด้วย , )','Levels with ASI/Feat (comma separated)'],originFeat:['Origin Feat ที่ได้ (ชื่อ Feat)','Origin feat granted (feat name)']});
SCHEMA.slots={cols:['name','max','sp'],f:[['name','t'],['max','n'],['sp','b']]};
const GEAR_FL={slot:['ส่วนของร่างกาย','Body part'],kind:['ชนิด','Kind'],pts:['แต้มของชิ้นนี้','Points this piece costs'],att:['ต้อง Attunement (ผูกกับผู้ใช้; ผูกได้พร้อมกันไม่เกิน 3 ชิ้น)','Requires attunement (max 3 attuned pieces at once)'],max:['จำนวนชิ้นสูงสุดในส่วนนี้','Most pieces in this part'],sp:['เอฟเฟกต์พิเศษ +1 แต้ม','Special effects cost +1 point']};
const SPELL_FL={src:['แหล่งที่มา (Source)','Source'],lvl:['เลเวลเวท (0 = Cantrip)','Spell level (0 = cantrip)'],school:['สำนัก (School)','School'],time:['เวลาร่าย','Casting time'],range:['ระยะ','Range'],comp:['องค์ประกอบ (V, S, M)','Components'],dur:['ระยะเวลา','Duration'],conc:['ต้อง Concentration','Concentration'],rit:['Ritual','Ritual'],classes:['อาชีพที่ใช้ได้','Classes'],desc:['รายละเอียด','Description']};
const FEAT_FL={asi:['พลังที่ +1 ได้ (เช่น str,dex)','Abilities it can raise by 1 (e.g. str,dex)'],desc:['รายละเอียด','Description']};
const flFor=(cat,k)=>(cat==='armor'||cat==='slots')&&GEAR_FL[k]?GEAR_FL[k][lang==='th'?0:1]:cat==='armor'&&k==='saves'?(lang==='th'?'โบนัส Saves':'Saves bonus'):cat==='feats'&&FEAT_FL[k]?FEAT_FL[k][lang==='th'?0:1]:cat==='spells'&&SPELL_FL[k]?SPELL_FL[k][lang==='th'?0:1]:fl(k);
const usageKey={races:'race',classes:'cls',alignments:'align',backgrounds:'bg'};
const pickKey={languages:'lang',tools:'tool',vehicles:'veh'};
const featUse=(r,n)=>Object.values(r.asi||{}).some(p=>p&&p.t==='feat'&&p.f===n)||(r.xf||[]).some(p=>p.f===n);
const usage=(c,it)=>c==='slots'?CAT.armor.filter(a=>a.slot===it.id).length:c==='spells'?[...pcs,...npcs].filter(r=>(r.spells||[]).some(s=>s.n===it.name)).length:c==='feats'?[...pcs,...npcs].filter(r=>featUse(r,it.name)).length+CAT.backgrounds.filter(b=>b.originFeat===it.name).length:usageKey[c]?[...pcs,...npcs].filter(r=>r[usageKey[c]]===it.name||(c==='classes'&&(r.mc||[]).some(m=>m.cls===it.name))).length:pickKey[c]?[...pcs,...npcs].filter(r=>(r.pick&&r.pick[pickKey[c]]||[]).includes(it.name)).length:0;
function blankItem(c){const o={id:uid()};SCHEMA[c].f.forEach(([k,ty])=>o[k]=ty==='b'?0:(ty==='n'&&/^n[A-Z]/.test(k)?0:''));if(c==='classes'){o.subs=[];o.feats=[]}if(c==='backgrounds'){o.sk=[];o.feats=[]}if(c==='classes')o.asiLv='4,8,12,16,19';if(c==='backgrounds')o.originFeat='';if(c==='spells'){o.lvl=1;o.conc=0;o.rit=0;o.school='Evocation';o.timeK='action';o.timeN='';o.timeX='';o.durK='instant';o.durN='';o.durX='';spCompose(o)}if(c==='armor'){o.slot='';o.kind='';o.pts=0;o.fx=[];o.att=0}if(c==='slots'){o.max=1;o.sp=0;o.types=[]}if(c==='feats'){o.cat='general';o.minLv=4;o.asi='';o.rep=0;o.pts=1;o.cap=20;o.fx=[]}if(c==='conditions'){o.icon='';o.color='';o.dur={u:'',n:0};o.rules=[];o.stack='no';o.maxLv=0;o.ends=[]}return o}
const cell=v=>{const s=String(v??'').replace(/\s+/g,' ').trim();return s?esc(s.length>60?s.slice(0,57)+'…':s):'<span class="muted">—</span>'};
let dataPage=0;
function renderData(){
  if(dedit)return renderDataEditor();
  const sc=SCHEMA[dataTab],L=CAT[dataTab],ps=pageSize(),pages=Math.max(1,Math.ceil(L.length/ps));
  dataPage=Math.min(Math.max(0,dataPage),pages-1);const shown=L.slice(dataPage*ps,dataPage*ps+ps);
  const tabs=Object.keys(SCHEMA).map(k=>`<button role="tab" data-act="dtab" data-v="${k}" aria-selected="${k===dataTab}">${t(k)} <span class="cnt">${CAT[k].length}</span></button>`).join('');
  const body=L.length?`<div class="scroll"><table><thead><tr>${sc.cols.map(c=>`<th>${flFor(dataTab,c)}</th>`).join('')}<th></th></tr></thead><tbody>
   ${shown.map(r=>{const n=usage(dataTab,r);return`<tr>${sc.cols.map(c=>c==='subs'?`<td>${r.subs.length?esc(r.subs.map(s=>s.name).join(', ')):'<span class="muted">'+t('noSub')+'</span>'}</td>`:c==='name'?`<td>${dataTab==='conditions'?condIcon(r,28):''}<b${dataTab==='conditions'&&r.color?` style="color:${esc(r.color)}"`:''}>${cell(r.name)}</b></td>`:c==='cat'?`<td>${esc(t('fc_'+r.cat))}</td>`:c==='sk'?`<td>${(r.sk||[]).length?esc(r.sk.map(skName).join(', ')):'<span class="muted">—</span>'}</td>`:`<td>${cell(r[c])}</td>`).join('')}
   <td><div class="acts"><button class="btn small" data-act="dedit" data-id="${r.id}">${t('edit')}</button><button class="btn small danger" data-act="ddel" data-id="${r.id}">${dataArm===r.id?(n?t('delInUse').replace('{n}',n):t('delSure')):t('del')}</button></div></td></tr>`}).join('')}
   </tbody></table></div>${pages>1?`<div class="pager"><button class="btn small" data-act="dpage" data-v="-1" ${dataPage?'':'disabled'}>‹ ${t('pgPrev')}</button><span class="note" role="status">${t('pgInfo').replace('{p}',dataPage+1).replace('{n}',pages).replace('{c}',L.length)}</span><button class="btn small" data-act="dpage" data-v="1" ${dataPage<pages-1?'':'disabled'}>${t('pgNext')} ›</button></div>`:''}`:`<div class="empty"><div>${t('noRows')}</div></div>`;
  return head(t('data'),t('dataSub'),`<button class="btn primary" data-act="dnew">+ ${t('addItem')}</button>`)
   +`<div class="tabs2" role="tablist">${tabs}</div>${dataTab==='slots'?`<section class="panel"><div class="grid"><div class="field"><label for="eqmax">${t('eqMaxL')}</label><input id="eqmax" data-eqmax="1" type="number" min="1" max="99" value="${CAT.eqMax}"><span class="note">${t('eqMaxH')}</span></div></div></section>`:''}<section class="panel">${body}<div class="bar"><span class="note">${t('dataNote')}</span><button class="btn small" data-act="dreset">${dataArm==='reset'?t('resetSure'):t('resetDefaults')}</button></div></section>`;
}
function renderDataEditor(){
  const d=dedit.draft,c=dedit.cat,sc=SCHEMA[c];
  const sl0=c==='armor'?CAT.slots.find(x=>x.id===d.slot):null,ty0=sl0?(sl0.types||[]).find(x=>x.name===d.kind):null;
  const fields=sc.f.filter(([k])=>k!=='color').map(([k,ty])=>{
    const lab=flFor(c,k),id='c_'+k;
    if(c==='armor'&&k==='slot')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="slot"><option value="">${t('gNoSlot')}</option>${CAT.slots.map(x=>`<option value="${esc(x.id)}" ${d.slot===x.id?'selected':''}>${esc(x.name)} (max ${x.max})</option>`).join('')}</select></div>`;
    if(c==='armor'&&k==='kind')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="kind"><option value="">${t('gNoKind')}</option>${[...(sl0&&d.kind&&!(sl0.types||[]).some(x=>x.name===d.kind)?[{name:d.kind}]:[]),...((sl0&&sl0.types)||[])].map(x=>`<option value="${esc(x.name)}" ${d.kind===x.name?'selected':''}>${esc(x.name)}${x.min!==undefined?' ('+x.min+(x.max!==x.min?'–'+x.max:'')+')':''}</option>`).join('')}</select></div>`;
    if(c==='armor'&&k==='pts')return`<div class="field"><label for="${id}">${lab}</label><input id="${id}" data-cf="pts" type="number" min="${ty0?ty0.min:0}" max="${ty0?ty0.max:20}" value="${esc(d.pts)}"><span class="note">${ty0?fill(t('gRange'),{lo:ty0.min,hi:ty0.max})+' · ':''}${sl0&&sl0.sp?t('gSpecial'):''}</span></div>`;
    if(c==='spells'&&k==='src')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="src"><option value="">—</option>${SP_SRC.map(x=>`<option value="${esc(x)}" ${d.src===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;
    if(c==='spells'&&k==='school')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="school">${[...(SP_SCHOOLS.includes(d.school)||!d.school?[]:[d.school]),...SP_SCHOOLS].map(x=>`<option value="${esc(x)}" ${d.school===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;
    if(c==='spells'&&(k==='time'||k==='dur')){const kk=k==='time'?'timeK':'durK',nk=k==='time'?'timeN':'durN',xk=k==='time'?'timeX':'durX',L=k==='time'?SP_TIME:SP_DUR,need=(k==='time'?SP_NEED_T:SP_NEED_D).includes(d[kk]);return`<div class="field full"><label for="${id}">${lab}</label><div class="spcrow"><select id="${id}" data-cf="${kk}">${L.map(([v,l])=>`<option value="${v}" ${d[kk]===v?'selected':''}>${l}</option>`).join('')}</select><input type="number" min="1" max="999" data-cf="${nk}" value="${esc(d[nk])}" placeholder="${t('spN')}" aria-label="${t('spN')}" ${need?'':'hidden'}><input type="text" maxlength="60" data-cf="${xk}" value="${esc(d[xk])}" placeholder="${t('spX')}" aria-label="${t('spX')}"></div><div class="note">${esc(d[k]||'')}</div></div>`}
    if(c==='feats'&&k==='cat')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="${k}">${FEAT_CATS.map(x=>`<option value="${x}" ${d[k]===x?'selected':''}>${t('fc_'+x)}</option>`).join('')}</select></div>`;
    if(ty==='a')return`<div class="field full"><label for="${id}">${lab}</label><textarea id="${id}" data-cf="${k}">${esc(d[k])}</textarea></div>`;
    if(ty==='b')return`<div class="field"><label for="${id}">${lab}</label><select id="${id}" data-cf="${k}"><option value="0" ${d[k]?'':'selected'}>${t('no')}</option><option value="1" ${d[k]?'selected':''}>${t('yes')}</option></select></div>`;
    return`<div class="field"><label for="${id}">${lab}</label><input id="${id}" data-cf="${k}" type="${ty==='n'?'number':'text'}" ${/^n[A-Z]/.test(k)?'min="0" max="10" ':''}value="${esc(d[k])}"></div>`}).join('');
  const subs=c==='classes'?`<section class="panel"><div class="ph"><div><h2>${t('subs')||fl('subs')}</h2><div class="note">${t('subHint')}</div></div><button class="btn small" data-act="subadd">${t('subAdd')}</button></div>
   <div class="subs">${d.subs.length?d.subs.map((s,i)=>`<div class="subrow"><div class="field"><label for="s_n${i}">${t('name')||fl('name')}</label><input id="s_n${i}" data-sf="name" data-si="${i}" value="${esc(s.name)}"></div>
     <div class="field"><label for="s_a${i}">${fl('alt')}</label><input id="s_a${i}" data-sf="alt" data-si="${i}" value="${esc(s.alt)}"></div>
     <div class="field"><label for="s_b${i}">${fl('bhp')}</label><input id="s_b${i}" data-sf="bhp" data-si="${i}" value="${esc(s.bhp)}"></div>
     <div class="field"><label for="s_p${i}">${fl('multi')}</label><input id="s_p${i}" data-sf="prof" data-si="${i}" value="${esc(s.prof)}"></div>
     <button class="btn small danger" data-act="subdel" data-i="${i}">${t('subRemove')}</button></div>`).join(''):`<div class="empty" style="padding:18px">${t('noSub')}</div>`}</div></section>`:'';
  const skSec=c==='backgrounds'?`<section class="panel"><div class="ph"><div><h2>${fl('sk')}</h2><div class="note">${t('skHint')}</div></div></div><div class="chkgrid">${SKILLS.map(([k,n,a])=>`<label class="chk"><input type="checkbox" data-bgs="${k}" ${(d.sk||[]).includes(k)?'checked':''}> ${n} <span class="pa">${a.toUpperCase()}</span></label>`).join('')}</div></section>`:'';
  const gslSec=c==='slots'?`<section class="panel"><div class="ph"><div><h2>${t('slotTypes')}</h2><div class="note">${t('slotTypesH')}</div></div><button type="button" class="btn small" data-act="ty-add">+ ${t('tyAdd')}</button></div><div class="subs">${(d.types||[]).map((y,i)=>`<div class="tyrow"><div class="field"><label for="ty_n${i}">${t('name')||fl('name')}</label><input id="ty_n${i}" data-tyf="name" data-tyi="${i}" value="${esc(y.name)}"></div><div class="field"><label for="ty_a${i}">${t('tyMin')}</label><input id="ty_a${i}" data-tyf="min" data-tyi="${i}" type="number" min="0" max="20" value="${esc(y.min)}"></div><div class="field"><label for="ty_b${i}">${t('tyMax')}</label><input id="ty_b${i}" data-tyf="max" data-tyi="${i}" type="number" min="0" max="20" value="${esc(y.max)}"></div><button type="button" class="btn small danger" data-act="ty-del" data-i="${i}">${t('subRemove')}</button></div>`).join('')}</div></section>`:'';
  const featSec=(c==='classes'||c==='backgrounds')?`<section class="panel"><div class="ph"><div><h2>${t('featTitle')}</h2><div class="note">${t(c==='classes'?'featHintC':'featHintB')}</div></div><button class="btn small" data-act="ftadd">${t('featAdd')}</button></div>
   <div class="subs">${(d.feats||[]).length?d.feats.map((f,i)=>`<div class="featrow ${c==='classes'?'withlvl':''}"><div class="field"><label for="f_n${i}">${t('featName')}</label><input id="f_n${i}" data-ftf="name" data-fti="${i}" value="${esc(f.name)}"></div>${c==='classes'?`<div class="field"><label for="f_l${i}">${t('featLvl')}</label><input id="f_l${i}" type="number" min="1" max="20" data-ftf="lvl" data-fti="${i}" value="${esc(f.lvl||1)}"></div>`:''}<button class="btn small danger" data-act="ftdel" data-i="${i}">${t('subRemove')}</button><div class="field full"><label for="f_d${i}">${t('featDesc')}</label><textarea id="f_d${i}" data-ftf="desc" data-fti="${i}">${esc(f.desc)}</textarea></div></div>`).join(''):`<div class="empty" style="padding:18px">${t('featNone')}</div>`}</div></section>`:'';
  const condSec=c==='conditions'?`<section class="panel"><div class="ph"><div><h2>${t('cLook')}</h2><div class="note">${t('cLookHint')}</div></div></div>
   <div class="condedit"><div class="media"><div class="lbl">${t('cIcon')}</div>
    <div class="thumb cond">${d.icon?`<img src="${esc(d.icon)}" alt="">`:`<span class="muted">${t('sNoImg')}</span>`}</div>
    <div class="acts" style="justify-content:flex-start"><label class="btn small">${t('sUpload')}<input class="sr" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-img="cond" aria-label="${t('cIcon')}"></label>${d.icon?`<button class="btn small" data-act="cicon-rm">${t('sRemove')}</button>`:''}</div>
    <p class="rules">${ruleText('cond')}</p>${imgMsg?`<p class="err" role="alert">${esc(imgMsg)}</p>`:''}</div>
    <div class="media"><div class="lbl">${t('cColor')}</div><div class="crow"><input type="color" id="c_color" data-cf="color" value="${hexOf(d.color||getComputedStyle(document.documentElement).getPropertyValue('--ink').trim())}" aria-label="${t('cColor')}"><code>${esc(d.color||t('sDefault'))}</code>${d.color?`<button class="btn small" data-act="ccol-reset">${t('sDefault')}</button>`:''}</div>
    <p class="rules">${t('cColorHint')}</p><div class="cprev">${t('cPrev')} <span class="cref"${ccs(d)}>${esc(d.name||'—')}</span></div></div></div></section>`:'';
  return`${head(esc(d.name)||t('addItem'),t(c),`<button class="btn" data-act="dback">← ${t('back')}</button>`)}
   <section class="panel"><div class="grid wide">${fields}</div></section>${condSec}${c==='conditions'?condRulesEditor(d):''}${c==='feats'||c==='armor'?featFxEditor(d):''}${gslSec}${skSec}${subs}${featSec}
   <div class="bar" style="padding:0"><div>${dedit.isNew?'':`<button class="btn danger" data-act="ddel-edit">${dataArm===d.id?(usage(c,d)?t('delInUse').replace('{n}',usage(c,d)):t('delSure')):t('del')}</button>`}</div>
   <div style="display:flex;gap:12px;align-items:center"><span class="err" role="alert">${esc(dataErr)}</span><button class="btn primary" data-act="dsave">${t('save')}</button></div></div>`;
}
function cascade(c,old,d){
  if(c==='spells'){if(old.name!==d.name){[...pcs,...npcs].forEach(r=>{(r.spells||[]).forEach(s=>{if(s.n===old.name)s.n=d.name});if(r.conc===old.name)r.conc=d.name});commit('pc');commit('npc')}return}
  if(c==='feats'){if(old.name!==d.name){[...pcs,...npcs].forEach(r=>{Object.values(r.asi||{}).forEach(p=>{if(p&&p.f===old.name)p.f=d.name});(r.xf||[]).forEach(p=>{if(p.f===old.name)p.f=d.name})});CAT.backgrounds.forEach(b=>{if(b.originFeat===old.name)b.originFeat=d.name});commit('pc');commit('npc')}return}
  if(pickKey[c]){if(old.name!==d.name){let c2=false;[...pcs,...npcs].forEach(r=>{const a=r.pick&&r.pick[pickKey[c]];if(a)a.forEach((x,i)=>{if(x===old.name){a[i]=d.name;c2=true}})});if(c2){commit('pc');commit('npc')}}return}
  const key=usageKey[c];if(!key)return;let ch=false;
  [...pcs,...npcs].forEach(r=>{if(old.name!==d.name&&r[key]===old.name){r[key]=d.name;ch=true}if(c==='classes'&&old.name!==d.name)(r.mc||[]).forEach(m=>{if(m.cls===old.name){m.cls=d.name;ch=true}})});
  if(c==='classes')(old.subs||[]).forEach(os=>{const ns=d.subs.find(s=>s.id===os.id);
    if(ns&&ns.name!==os.name)[...pcs,...npcs].forEach(r=>{if(r.cls===d.name&&r.sub===os.name){r.sub=ns.name;ch=true}(r.mc||[]).forEach(m=>{if(m.cls===d.name&&m.sub===os.name){m.sub=ns.name;ch=true}})})});
  if(ch){commit('pc');commit('npc')}
}
function saveData(){
  const d=dedit.draft,c=dedit.cat,L=CAT[c];
  d.name=String(d.name||'').trim();
  if(c==='spells'){d.lvl=Math.max(0,Math.min(9,Math.round(Number(d.lvl)||0)));d.conc=d.conc?1:0;d.rit=d.rit?1:0}
  if(c==='feats'){d.minLv=Math.max(0,Math.min(20,Math.round(Number(d.minLv)||0)));d.rep=d.rep?1:0;d.pts=Number(d.pts)===2?2:1;d.cap=Math.max(20,Math.min(30,Math.round(Number(d.cap)||20)));d.fx=(d.fx||[]).filter(e=>FX_KINDS.includes(e.k))}
  if(c==='armor'){d.att=d.att?1:0;if(!CAT.slots.some(x=>x.id===d.slot)){d.slot='';d.kind=''}d.pts=Math.max(0,Math.min(20,Math.round(Number(d.pts))||0));const sl=CAT.slots.find(x=>x.id===d.slot),ty=sl&&(sl.types||[]).find(x=>x.name===d.kind);if(ty)d.pts=Math.max(ty.min,Math.min(ty.max,d.pts));d.fx=(d.fx||[]).filter(e=>FX_KINDS.includes(e.k));delete d.slots}
  if(c==='slots'){d.max=Math.max(1,Math.min(10,Math.round(Number(d.max))||1));d.sp=d.sp?1:0;d.types=(d.types||[]).map(y=>{const lo=Math.max(0,Math.min(20,Math.round(Number(y.min))||0));return{name:String(y.name||'').trim(),min:lo,max:Math.max(lo,Math.min(20,Math.round(Number(y.max))||lo))}}).filter(y=>y.name)}
  if(c==='backgrounds')['nLang','nTool','nVeh'].forEach(k=>d[k]=Math.max(0,Math.min(10,Math.round(Number(d[k])||0))));
  if(!d.name){dataErr=t('errName');return render()}
  if(L.some(x=>x.id!==d.id&&x.name.toLowerCase()===d.name.toLowerCase())){dataErr=t('errDup');return render()}
  if(c==='classes'||c==='backgrounds')d.feats=(d.feats||[]).map(f=>({...f,name:String(f.name||'').trim(),lvl:Math.max(1,Math.min(20,Math.round(Number(f.lvl)||1)))})).filter(f=>f.name||String(f.desc||'').trim());
  if(c==='classes'){
    d.subs=d.subs.map(s=>({...s,name:s.name.trim()})).filter(s=>s.name);
    if(new Set(d.subs.map(s=>s.name.toLowerCase())).size!==d.subs.length){dataErr=t('errSubDup');return render()}
  }
  const i=L.findIndex(x=>x.id===d.id);
  if(i>=0){cascade(c,L[i],d);L[i]=d}else L.push(d);
  put('dd_cat',CAT);dedit=null;dataErr='';render();
}

