/* ---------- shared table dice: everyone in a room sees every roll. The server rolls (backend/acacia/dice.py), so a result cannot be faked. ---------- */
let FEEDS={},tdCount=1,tdMod=0,tdMode='normal',tdWhy='',tdWhySel='',tdAbil='',tdBusy=false,tdErr='',tdSides=20,tdAdvOpen=false,tdX={dmin:'',rr:'',kh:'',lo:'',hi:'',dc:''};
const TD_SIDES=[4,6,8,10,12,20,100];
/* quick reasons: [key, Thai, English]; "other" lets the player type */
const TD_WHY=[['atk','โจมตี','Attack'],['dmg','ดาเมจ','Damage'],['init','Initiative','Initiative'],['save','Saving Throw','Saving throw'],['chk','Ability Check','Ability check'],['death','Death Save','Death save'],['heal','ฮีล','Healing'],
 ['Acrobatics','Acrobatics','Acrobatics'],['Animal Handling','Animal Handling','Animal Handling'],['Arcana','Arcana','Arcana'],['Athletics','Athletics','Athletics'],['Deception','Deception','Deception'],['History','History','History'],['Insight','Insight','Insight'],['Intimidation','Intimidation','Intimidation'],['Investigation','Investigation','Investigation'],['Medicine','Medicine','Medicine'],['Nature','Nature','Nature'],['Perception','Perception','Perception'],['Performance','Performance','Performance'],['Persuasion','Persuasion','Persuasion'],['Religion','Religion','Religion'],['Sleight of Hand','Sleight of Hand','Sleight of Hand'],['Stealth','Stealth','Stealth'],['Survival','Survival','Survival']];
const TD_AB=['STR','DEX','CON','INT','WIS','CHA'],tdNeedAbil=k=>k==='save'||k==='chk';
const tdWhyText=()=>{if(tdWhySel==='other')return tdWhy.trim();const r=TD_WHY.find(x=>x[0]===tdWhySel);if(!r)return'';const n=r[lang==='th'?1:2];return tdNeedAbil(tdWhySel)&&tdAbil?tdAbil+' '+n:n};
const tdFeed=rid=>isAdmin()?(FEEDS[rid]||[]):((prooms.find(r=>r.id===rid)||{}).feed||[]);
const tdPut=(rid,en)=>{if(isAdmin()){FEEDS[rid]=[en,...(FEEDS[rid]||[]).filter(x=>x.id!==en.id)].slice(0,40)}else{const r=prooms.find(x=>x.id===rid);if(r)r.feed=[en,...(r.feed||[]).filter(x=>x.id!==en.id)].slice(0,40)}};
function tdDice(vals,fix,drop){return vals.map((v,i)=>{const f=(fix||[])[i],dr=(drop||[]).includes(i);return`<span class="dv${f?' fixd':''}${dr?' dropd':''}">${f?`<s>${f}</s>`:''}${v}</span>`}).join('')}
function tdEntry(e){
  const sets=e.sets||[],multi=sets.length>1,kept=e.keep||0,mod=e.mod?` ${sgn(e.mod)}`:'';
  const sum=(s,i)=>s.reduce((a,b,j)=>a+(((e.drop||[])[i]||[]).includes(j)?0:b),0);
  const det=sets.map((s,i)=>{const txt=(e.n>1||(e.fix||[])[i]&&(e.fix[i]||[]).some(Boolean)?`${sum(s,i)} `:'')+`<span class="dvs">${tdDice(s,(e.fix||[])[i],(e.drop||[])[i])}</span>`;return multi?(i===kept?`<b>${txt}</b>`:`<s class="old">${txt}</s>`):txt}).join(' · ');
  const kv=((sets[kept]||[])[0]);
  const crit=e.sides===20&&e.n===1?(kv===20?' crit':kv===1?' fumble':''):'';
  const adj=e.raw!=null&&e.raw!==e.total?`<small class="tdadj"><s>${e.raw}</s> → ${e.total} (${e.total>e.raw?t('tdRaised'):t('tdCapped')})</small>`:'';
  const dc=e.dc!=null?`<small class="tdadj ${e.ok?'ok':'no'}">DC ${e.dc}: ${e.ok?t('tdPass'):t('tdFailDc')}</small>`:'';
  const d=new Date((e.t||0)*1000),hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  return`<li class="tdrow${crit}"><div class="tdwho"><b>${esc(e.who||'—')}</b><small>${esc(e.label)}${e.why?' · '+esc(e.why):''}</small></div><div class="tdres"><span class="tdtot">${e.total}</span><small>${det}${mod}</small>${adj}${dc}</div><span class="tdt">${hm}</span></li>`}
function tableDice(rid){
  const F=tdFeed(rid),num=(k,ph,min,max)=>`<div class="field"><label for="td_${k}">${t('tdx_'+k)}</label><input id="td_${k}" data-td="x_${k}" type="number" inputmode="numeric" min="${min}" max="${max}" placeholder="${ph}" value="${esc(tdX[k])}"></div>`;
  return`<section class="panel dicepanel tdice"><div class="ph"><div><h2>${t('tdTitle')}</h2><div class="note">${t('tdHint')}</div></div></div>
   <div class="dice" role="group" aria-label="${t('diceTitle')}">${TD_SIDES.map(s=>`<button data-act="tdside" data-v="${s}" aria-pressed="${tdSides===s}">d${s}</button>`).join('')}</div>
   <div class="roll-ctl">
    <div class="field"><label for="td_sides">${t('tdSides')}</label><input id="td_sides" data-td="sides" type="number" inputmode="numeric" min="2" max="1000" value="${tdSides}"></div>
    <div class="field"><label for="td_count">${t('count')}</label><input id="td_count" data-td="count" type="number" min="1" max="20" value="${tdCount}"></div>
    <div class="field"><label for="td_mod">${t('mod')}</label><input id="td_mod" data-td="mod" type="number" min="-100" max="100" value="${tdMod}"></div>
    <div class="field" style="width:150px"><label for="td_mode">${t('mode')}</label><select id="td_mode" data-td="mode"><option value="normal" ${tdMode==='normal'?'selected':''}>${t('normal')}</option><option value="adv" ${tdMode==='adv'?'selected':''}>${t('adv')}</option><option value="dis" ${tdMode==='dis'?'selected':''}>${t('dis')}</option></select></div>
    <div class="field tdwhyf"><label for="td_whysel">${t('tdWhy')}</label><select id="td_whysel" data-td="whysel"><option value="">—</option><optgroup label="${t('tdGrpRoll')}">${TD_WHY.slice(0,7).map(r=>`<option value="${esc(r[0])}" ${tdWhySel===r[0]?'selected':''}>${esc(r[lang==='th'?1:2])}</option>`).join('')}</optgroup><optgroup label="${t('tdGrpSkill')}">${TD_WHY.slice(7).map(r=>`<option value="${esc(r[0])}" ${tdWhySel===r[0]?'selected':''}>${esc(r[lang==='th'?1:2])}</option>`).join('')}</optgroup><option value="other" ${tdWhySel==='other'?'selected':''}>${t('tdOther')}</option></select>
     <select id="td_abil" data-td="abil" aria-label="${t('tdAbil')}" ${tdNeedAbil(tdWhySel)?'':'hidden'}><option value="">${t('tdAbilAny')}</option>${TD_AB.map(a=>`<option value="${a}" ${tdAbil===a?'selected':''}>${a}</option>`).join('')}</select>
     <input id="td_why" data-td="why" type="text" maxlength="40" aria-label="${t('tdOther')}" placeholder="${t('tdWhyPh')}" value="${esc(tdWhy)}" ${tdWhySel==='other'?'':'hidden'}></div>
    <details class="tdadv" ${tdAdvOpen||Object.values(tdX).some(v=>v!=='')?'open':''}><summary>${t('tdAdv')}</summary><p class="note">${t('tdAdvHint')}</p><div class="tdadvg">${num('dmin','—',0,1000)}${num('rr','—',0,999)}${num('kh','—',0,20)}${num('lo','—',-200,2000)}${num('hi','—',-200,2000)}${num('dc','—',-50,2000)}</div></details>
    <button class="btn primary" data-act="tdroll" data-rid="${rid}" style="min-height:44px" ${tdBusy?'disabled':''}>${t('roll')}</button>
   </div>
   ${tdErr?`<p class="note" role="alert" style="padding:0 16px;color:var(--danger,#e66)">${esc(tdErr)}</p>`:''}
   ${F.length?`<ul class="tdfeed" aria-live="polite">${F.map(tdEntry).join('')}</ul>`:`<p class="note" style="padding:0 16px 16px">${t('tdEmpty')}</p>`}</section>`}
const tdInt=(v,lo,hi,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):d};
function tdSide(v){tdSides=tdInt(v,2,1000,20);const inp=document.getElementById('td_sides');if(inp&&inp!==document.activeElement)inp.value=tdSides;document.querySelectorAll('.tdice .dice button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.v)===tdSides)))}
function tdSet(el){const k=el.dataset.td;
  if(k==='count')tdCount=tdInt(el.value,1,20,1);else if(k==='mod')tdMod=tdInt(el.value,-100,100,0);else if(k==='mode')tdMode=el.value;else if(k==='why')tdWhy=el.value;
  else if(k==='sides'){if(el.value!=='')tdSide(el.value)}
  else if(k==='abil')tdAbil=el.value;
  else if(k==='whysel'){tdWhySel=el.value;const ab=document.getElementById('td_abil');if(ab)ab.hidden=!tdNeedAbil(tdWhySel);const w=document.getElementById('td_why');if(w){w.hidden=tdWhySel!=='other';if(!w.hidden)w.focus()}}
  else if(k.startsWith('x_'))tdX[k.slice(2)]=el.value}
async function tdRoll(rid){
  if(tdBusy)return;tdBusy=true;tdErr='';render();
  try{const r=await api('POST','api/roll',{room:rid,n:tdCount,sides:tdSides,mod:tdMod,mode:tdMode,why:tdWhyText(),...tdX});if(r&&r.entry)tdPut(rid,r.entry)}
  catch(e){tdErr=e&&e.code==='not_seated'?t('tdNotSeated'):t('tdFail')}
  tdBusy=false;render()}
Object.assign(TX.th,{tdTitle:'ทอยเต๋าร่วมกัน',tdHint:'ทุกคนในห้องเห็นผลทอย เซิร์ฟเวอร์เป็นคนทอยให้ จึงแก้ผลไม่ได้',tdWhy:'ทอยเพื่ออะไร',tdWhyPh:'พิมพ์เหตุผลเอง',tdOther:'อื่นๆ (พิมพ์เอง)',tdGrpRoll:'การทอยทั่วไป',tdGrpSkill:'ทักษะ',tdEmpty:'ยังไม่มีใครทอย',tdNotSeated:'ตัวละครของคุณยังไม่ได้นั่งในห้องนี้',tdFail:'ทอยไม่สำเร็จ ลองอีกครั้ง',
 tdAbil:'ค่าพลัง',tdAbilAny:'— ค่าพลัง (เลือกได้) —',tdSides:'จำนวนหน้าลูกเต๋า (2–1000)',tdAdv:'ตัวเลือกเพิ่มเติม (ขั้นต่ำ/สูงสุด และอื่นๆ)',tdAdvHint:'เว้นว่างไว้ถ้าไม่ใช้ · ขั้นต่ำต่อลูก/ผลรวมขั้นต่ำ: ต่ำกว่านี้ปรับขึ้นเป็นค่านี้ · ทอยใหม่: ทอยซ้ำ 1 ครั้งถ้าได้ไม่เกินค่านี้ · DC: บอกผ่าน/ไม่ผ่าน · เซิร์ฟเวอร์คิดให้ทั้งหมด',
 tdx_dmin:'ขั้นต่ำต่อลูก',tdx_rr:'ทอยใหม่ถ้าได้ ≤',tdx_kh:'เก็บลูกสูงสุด N ลูก',tdx_lo:'ผลรวมขั้นต่ำ',tdx_hi:'ผลรวมสูงสุด',tdx_dc:'DC เป้าหมาย',
 tdRaised:'ปรับขึ้นเป็นขั้นต่ำ',tdCapped:'ปรับลงเป็นเพดาน',tdPass:'ผ่าน',tdFailDc:'ไม่ผ่าน'});
Object.assign(TX.en,{tdTitle:'Table dice',tdHint:'Everyone in the room sees every roll. The server rolls, so results cannot be changed.',tdWhy:'What for',tdWhyPh:'Type a reason',tdOther:'Other (type it)',tdGrpRoll:'Common rolls',tdGrpSkill:'Skills',tdEmpty:'Nobody has rolled yet.',tdNotSeated:'Your character is not seated in this room.',tdFail:'The roll failed. Try again.',
 tdAbil:'Ability',tdAbilAny:'— Ability (optional) —',tdSides:'Die sides (2–1000)',tdAdv:'More options (minimum / maximum and more)',tdAdvHint:'Leave empty to skip · Min per die / Min total: lower results are raised to it · Reroll: roll once more if the die shows this or less · DC: shows pass / fail · the server does all the maths.',
 tdx_dmin:'Min per die',tdx_rr:'Reroll if ≤',tdx_kh:'Keep highest N',tdx_lo:'Min total',tdx_hi:'Max total',tdx_dc:'Target DC',
 tdRaised:'raised to minimum',tdCapped:'capped',tdPass:'pass',tdFailDc:'fail'});

/* ---------- Spells page: everyone can read, the GM edits in Game data ---------- */
function spellCard(s){
  const meta=[s.school,s.time,s.range,s.comp,s.dur].filter(Boolean).map(esc).join(' · ');
  return`<details class="feat featpg spellpg" data-sn="${esc(s.name.toLowerCase())}" data-sl="${s.lvl}" data-ss="${esc(s.school||'')}" data-src="${esc(s.src||'')}"><summary><b>${esc(s.name)}</b> <span class="pill">${s.lvl?t('spLv')+' '+s.lvl:t('spCantrip')}</span>${s.conc?' <span class="pill">C</span>':''}${s.rit?' <span class="pill">R</span>':''}${s.src?` <span class="pill">${esc(s.src)}</span>`:''}</summary>
   <div class="featd">${meta?`<p class="note fxmeta">${meta}</p>`:''}${s.classes?`<p class="note">${esc(s.classes)}</p>`:''}${s.desc?esc(s.desc).replace(/\n/g,'<br>'):`<span class="muted">${t('asiNoDesc')}</span>`}</div></details>`}
function renderSpellsPage(){
  const L=[...(CAT.spells||[])].sort((a,b)=>a.lvl-b.lvl||a.name.localeCompare(b.name)),adm=isAdmin();
  const acts=adm?`<div class="acts"><button class="btn" data-act="spell-edit">${t('condEdit')}</button></div>`:'';
  const tools=`<div class="featbar"><input type="search" data-spq id="spq" placeholder="${t('spSearch')}" aria-label="${t('spSearch')}"><select data-spq id="spl" aria-label="${t('spLv')}"><option value="">${t('spAllLv')}</option>${[0,1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}">${n?t('spLv')+' '+n:t('spCantrip')}</option>`).join('')}</select><select data-spq id="sps" aria-label="School"><option value="">${t('spAllSchools')}</option>${SP_SCHOOLS.map(s=>`<option value="${s}">${s}</option>`).join('')}</select><select data-spq id="spsrc" aria-label="${t('spSrc')}"><option value="">${t('spAllSrc')}</option>${SP_SRC.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></div>`;
  const body=L.length?`<div class="featlist" id="splist">${L.map(spellCard).join('')}</div>`:`<div class="empty"><div>${t('condNone')}</div></div>`;
  return head(t('spells'),t('spellsSub'),acts)+`<section class="panel"><div class="featwrap">${tools}${body}<p class="note" id="spnone" hidden>${t('spNoMatch')}</p></div></section>`}
function spellFilter(){
  const q=(document.getElementById('spq')||{value:''}).value.trim().toLowerCase(),l=(document.getElementById('spl')||{value:''}).value,s=(document.getElementById('sps')||{value:''}).value,sr=(document.getElementById('spsrc')||{value:''}).value;let any=false;
  document.querySelectorAll('.spellpg').forEach(d=>{const show=(!q||d.dataset.sn.includes(q))&&(l===''||d.dataset.sl===l)&&(!s||d.dataset.ss===s)&&(!sr||d.dataset.src===sr);d.hidden=!show;if(show)any=true});
  const n=document.getElementById('spnone');if(n)n.hidden=any}
Object.assign(TX.th,{spellsSub:'รายการเวททั้งหมด (อ่านอย่างเดียว) GM แก้ไขได้ในข้อมูลเกม',spSearch:'ค้นหาเวท…',spAllLv:'ทุกเลเวล',spAllSchools:'ทุกสำนัก',spSrc:'แหล่งที่มา',spAllSrc:'ทุกแหล่ง',spNoMatch:'ไม่พบเวทที่ตรงกับคำค้น'});
Object.assign(TX.en,{spellsSub:'Every spell (read-only). The GM edits them in Game data.',spSearch:'Search spells…',spAllLv:'All levels',spAllSchools:'All schools',spSrc:'Source',spAllSrc:'All sources',spNoMatch:'No spell matches.'});

document.addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('tdadv'))tdAdvOpen=e.target.open},true);
