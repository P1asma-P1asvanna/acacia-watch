/* ---------- shared table dice: everyone in a room sees every roll. The server rolls (backend/acacia/dice.py), so a result cannot be faked. ---------- */
let FEEDS={},tdCount=1,tdMod=0,tdMode='normal',tdWhy='',tdBusy=false,tdErr='';
const tdFeed=rid=>isAdmin()?(FEEDS[rid]||[]):((prooms.find(r=>r.id===rid)||{}).feed||[]);
const tdPut=(rid,en)=>{if(isAdmin()){FEEDS[rid]=[en,...(FEEDS[rid]||[]).filter(x=>x.id!==en.id)].slice(0,40)}else{const r=prooms.find(x=>x.id===rid);if(r)r.feed=[en,...(r.feed||[]).filter(x=>x.id!==en.id)].slice(0,40)}};
function tdEntry(e){
  const sets=e.sets||[],multi=sets.length>1,kept=e.keep||0,mod=e.mod?` ${sgn(e.mod)}`:'';
  const det=multi?sets.map((s,i)=>{const sum=s.reduce((a,b)=>a+b,0),txt=e.n>1?`${sum} [${s.join(', ')}]`:String(sum);return i===kept?`<b>${txt}</b>`:`<s class="old">${txt}</s>`}).join(' · '):(e.n>1?`[${(sets[0]||[]).join(', ')}]`:'');
  const crit=e.sides===20&&e.n===1&&!multi?((sets[0]||[])[0]===20?' crit':(sets[0]||[])[0]===1?' fumble':''):(e.sides===20&&e.n===1&&multi?(((sets[kept]||[])[0]===20)?' crit':((sets[kept]||[])[0]===1)?' fumble':''):'');
  const d=new Date((e.t||0)*1000),hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  return`<li class="tdrow${crit}"><div class="tdwho"><b>${esc(e.who||'—')}</b><small>${esc(e.label)}${e.why?' · '+esc(e.why):''}</small></div><div class="tdres"><span class="tdtot">${e.total}</span><small>${det}${mod&&det?'':''}${det?mod:''}</small></div><span class="tdt">${hm}</span></li>`}
function tableDice(rid){
  const sides=[4,6,8,10,12,20,100],F=tdFeed(rid);
  return`<section class="panel dicepanel tdice"><div class="ph"><div><h2>${t('tdTitle')}</h2><div class="note">${t('tdHint')}</div></div></div>
   <div class="dice" role="group" aria-label="${t('diceTitle')}">${sides.map(s=>`<button data-act="side" data-v="${s}" aria-pressed="${diceSides===s}">d${s}</button>`).join('')}</div>
   <div class="roll-ctl">
    <div class="field"><label for="td_count">${t('count')}</label><input id="td_count" data-td="count" type="number" min="1" max="20" value="${tdCount}"></div>
    <div class="field"><label for="td_mod">${t('mod')}</label><input id="td_mod" data-td="mod" type="number" min="-30" max="30" value="${tdMod}"></div>
    <div class="field" style="width:150px"><label for="td_mode">${t('mode')}</label><select id="td_mode" data-td="mode"><option value="normal" ${tdMode==='normal'?'selected':''}>${t('normal')}</option><option value="adv" ${tdMode==='adv'?'selected':''}>${t('adv')}</option><option value="dis" ${tdMode==='dis'?'selected':''}>${t('dis')}</option></select></div>
    <div class="field tdwhyf"><label for="td_why">${t('tdWhy')}</label><input id="td_why" data-td="why" type="text" maxlength="40" value="${esc(tdWhy)}" placeholder="${t('tdWhyPh')}"></div>
    <button class="btn primary" data-act="tdroll" data-rid="${rid}" style="min-height:44px" ${tdBusy?'disabled':''}>${t('roll')}</button>
   </div>
   ${tdErr?`<p class="note" role="alert" style="padding:0 16px;color:var(--danger,#e66)">${esc(tdErr)}</p>`:''}
   ${F.length?`<ul class="tdfeed" aria-live="polite">${F.map(tdEntry).join('')}</ul>`:`<p class="note" style="padding:0 16px 16px">${t('tdEmpty')}</p>`}</section>`}
function tdSet(el){const k=el.dataset.td;if(k==='count')tdCount=Math.min(20,Math.max(1,Math.round(Number(el.value))||1));else if(k==='mod')tdMod=Math.min(30,Math.max(-30,Math.round(Number(el.value))||0));else if(k==='mode')tdMode=el.value;else if(k==='why')tdWhy=el.value}
async function tdRoll(rid){
  if(tdBusy)return;tdBusy=true;tdErr='';render();
  try{const r=await api('POST','api/roll',{room:rid,n:tdCount,sides:diceSides,mod:tdMod,mode:tdMode,why:tdWhy});if(r&&r.entry)tdPut(rid,r.entry)}
  catch(e){tdErr=e&&e.code==='not_seated'?t('tdNotSeated'):t('tdFail')}
  tdBusy=false;render()}
Object.assign(TX.th,{tdTitle:'ทอยเต๋าร่วมกัน',tdHint:'ทุกคนในห้องเห็นผลทอย เซิร์ฟเวอร์เป็นคนทอยให้ จึงแก้ผลไม่ได้',tdWhy:'ทอยเพื่ออะไร',tdWhyPh:'เช่น โจมตี, Perception',tdEmpty:'ยังไม่มีใครทอย',tdNotSeated:'ตัวละครของคุณยังไม่ได้นั่งในห้องนี้',tdFail:'ทอยไม่สำเร็จ ลองอีกครั้ง'});
Object.assign(TX.en,{tdTitle:'Table dice',tdHint:'Everyone in the room sees every roll. The server rolls, so results cannot be changed.',tdWhy:'What for',tdWhyPh:'e.g. attack, Perception',tdEmpty:'Nobody has rolled yet.',tdNotSeated:'Your character is not seated in this room.',tdFail:'The roll failed. Try again.'});

/* ---------- Spells page: everyone can read, the GM edits in Game data ---------- */
function spellCard(s){
  const meta=[s.school,s.time,s.range,s.comp,s.dur].filter(Boolean).map(esc).join(' · ');
  return`<details class="feat featpg spellpg" data-sn="${esc(s.name.toLowerCase())}" data-sl="${s.lvl}" data-ss="${esc(s.school||'')}"><summary><b>${esc(s.name)}</b> <span class="pill">${s.lvl?t('spLv')+' '+s.lvl:t('spCantrip')}</span>${s.conc?' <span class="pill">C</span>':''}${s.rit?' <span class="pill">R</span>':''}</summary>
   <div class="featd">${meta?`<p class="note fxmeta">${meta}</p>`:''}${s.classes?`<p class="note">${esc(s.classes)}</p>`:''}${s.desc?esc(s.desc).replace(/\n/g,'<br>'):`<span class="muted">${t('asiNoDesc')}</span>`}</div></details>`}
function renderSpellsPage(){
  const L=[...(CAT.spells||[])].sort((a,b)=>a.lvl-b.lvl||a.name.localeCompare(b.name)),adm=isAdmin();
  const acts=adm?`<div class="acts"><button class="btn" data-act="spell-edit">${t('condEdit')}</button></div>`:'';
  const tools=`<div class="featbar"><input type="search" data-spq id="spq" placeholder="${t('spSearch')}" aria-label="${t('spSearch')}"><select data-spq id="spl" aria-label="${t('spLv')}"><option value="">${t('spAllLv')}</option>${[0,1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}">${n?t('spLv')+' '+n:t('spCantrip')}</option>`).join('')}</select><select data-spq id="sps" aria-label="School"><option value="">${t('spAllSchools')}</option>${SP_SCHOOLS.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>`;
  const body=L.length?`<div class="featlist" id="splist">${L.map(spellCard).join('')}</div>`:`<div class="empty"><div>${t('condNone')}</div></div>`;
  return head(t('spells'),t('spellsSub'),acts)+`<section class="panel"><div class="featwrap">${tools}${body}<p class="note" id="spnone" hidden>${t('spNoMatch')}</p></div></section>`}
function spellFilter(){
  const q=(document.getElementById('spq')||{value:''}).value.trim().toLowerCase(),l=(document.getElementById('spl')||{value:''}).value,s=(document.getElementById('sps')||{value:''}).value;let any=false;
  document.querySelectorAll('.spellpg').forEach(d=>{const show=(!q||d.dataset.sn.includes(q))&&(l===''||d.dataset.sl===l)&&(!s||d.dataset.ss===s);d.hidden=!show;if(show)any=true});
  const n=document.getElementById('spnone');if(n)n.hidden=any}
Object.assign(TX.th,{spellsSub:'รายการเวททั้งหมด (อ่านอย่างเดียว) GM แก้ไขได้ในข้อมูลเกม',spSearch:'ค้นหาเวท…',spAllLv:'ทุกเลเวล',spAllSchools:'ทุกสำนัก',spNoMatch:'ไม่พบเวทที่ตรงกับคำค้น'});
Object.assign(TX.en,{spellsSub:'Every spell (read-only). The GM edits them in Game data.',spSearch:'Search spells…',spAllLv:'All levels',spAllSchools:'All schools',spNoMatch:'No spell matches.'});
