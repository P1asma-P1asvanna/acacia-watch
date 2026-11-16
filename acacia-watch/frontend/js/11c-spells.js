/* ---------- spells: slots by class and level, spell list, casting, concentration ----------
   character: sl = {u:[used slots of levels 1..9], p:used pact slots}, spells = [{n, p}], conc = spell name.
   The catalog (CAT.spells) is filled in by the GM in Game data. */
const SLOT_FULL=[[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]];
const SLOT_HALF=[[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]];
const SLOT_THIRD=[[],[],[2],[3],[3],[3],[4,2],[4,2],[4,2],[4,3],[4,3],[4,3],[4,3,2],[4,3,2],[4,3,2],[4,3,3],[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1]];
const SLOT_PACT=[[1,1],[2,1],[2,2],[2,2],[2,3],[2,3],[2,4],[2,4],[2,5],[2,5],[3,5],[3,5],[3,5],[3,5],[3,5],[3,5],[4,5],[4,5],[4,5],[4,5]];
const spellOf=n=>(CAT.spells||[]).find(s=>s.name===n);
/* what the class can do: ability, save DC / attack bonus, slots (full / half / third caster) or pact slots (Warlock) */
function spellInfo(d){
  const R=clsRows(d).map(r=>{const cls=CAT.classes.find(c=>c.name===r.cls),st=String(cls&&cls.spellType||'').toLowerCase();return st?{...r,cls,st}:null}).filter(Boolean);
  if(!R.length)return null;
  const pb=prof(Math.max(1,Math.min(20,Math.round(num(d.level))||1)));
  const rows=R.map(r=>{const ab=ABS.find(k=>String(r.cls.spellAb||'').toLowerCase().startsWith(k))||'',m=ab?mod(abT(d,ab)):0;return{cls:r.cls.name,ab,dc:8+pb+m,atk:pb+m}});
  const norm=R.filter(r=>!r.st.includes('pact')),pr=R.find(r=>r.st.includes('pact')),kind=r=>r.st.includes('third')?SLOT_THIRD:r.st.includes('half')?SLOT_HALF:SLOT_FULL;
  let slots=[];
  if(norm.length===1)slots=kind(norm[0])[norm[0].level-1];   /* one spellcasting class: its own table */
  else if(norm.length>1){   /* several: add full levels, half levels (rounded up) and third levels (rounded down), then use the full-caster table */
    const cl=norm.reduce((a,r)=>a+(r.st.includes('third')?Math.floor(r.level/3):r.st.includes('half')?Math.ceil(r.level/2):r.level),0);
    slots=cl>0?SLOT_FULL[Math.min(20,cl)-1]:[]}
  return{ab:rows[0].ab,dc:rows[0].dc,atk:rows[0].atk,rows,slots,pact:pr?SLOT_PACT[pr.level-1]:null}}
let spMsg='';
const spDots=(n,used,at)=>Array.from({length:n},(_,j)=>`<button type="button" class="dot ${j<used?'on':''}" ${at} data-j="${j}" aria-label="${j+1}"></button>`).join('');
function spBody(d){
  d.sl=d.sl||{u:[],p:0};d.spells=d.spells||[];
  const I=spellInfo(d),catN=(CAT.spells||[]).length;
  const head=I?I.rows.map(r=>`<div class="spinfo">${I.rows.length>1?`<span class="chip"><span>${t('fClass')}</span><b>${esc(r.cls)}</b></span>`:''}<span class="chip"><span>${t('spAb')}</span><b>${r.ab?r.ab.toUpperCase():'—'}</b></span><span class="chip"><span>${t('spDc')}</span><b>${r.dc}</b></span><span class="chip"><span>${t('spAtk')}</span><b>${sgn(r.atk)}</b></span></div>`).join(''):`<p class="note" style="margin:0">${t('spNone')}</p>`;
  const sl=I?`<div class="slots">${I.slots.map((n,i)=>`<div class="slot"><span class="lbl">${t('spLv')} ${i+1}</span><div class="dots">${spDots(n,Math.min(n,d.sl.u[i]||0),`data-spa="slot" data-l="${i}"`)}</div></div>`).join('')}${I.pact?`<div class="slot"><span class="lbl">${t('spPact')} (${t('spLv')} ${I.pact[1]})</span><div class="dots">${spDots(I.pact[0],Math.min(I.pact[0],d.sl.p||0),'data-spa="pact"')}</div><button type="button" class="btn small" data-spa="pactrest">${t('spPactRest')}</button></div>`:''}</div>`:'';
  const conc=d.conc?`<div class="concbar"><b>${t('spConc')}:</b> ${esc(d.conc)} <button type="button" class="btn small" data-spa="endc">${t('spEndConc')}</button></div>`:'';
  const lvls=[...new Set((d.spells).map(s=>(spellOf(s.n)||{lvl:0}).lvl))].sort((a,b)=>a-b);
  const castOpts=(sp)=>{const L=sp.lvl||0;if(!I||!L)return'';const o=[];I.slots.forEach((n,i)=>{if(i+1>=L&&n>0)o.push(`<option value="${i+1}" ${i+1===L?'selected':''}>${t('spLv')} ${i+1} (${Math.max(0,n-(d.sl.u[i]||0))}/${n})</option>`)});if(I.pact&&I.pact[1]>=L)o.push(`<option value="p">${t('spPact')} (${Math.max(0,I.pact[0]-(d.sl.p||0))}/${I.pact[0]})</option>`);return o.join('')};
  const rows=lvls.map(L=>`<h3 class="splv">${L?t('spLv')+' '+L:t('spCantrip')}</h3>`+d.spells.map((s,i)=>[s,i]).filter(([s])=>(spellOf(s.n)||{lvl:0}).lvl===L).map(([s,i])=>{
    const sp=spellOf(s.n),co=sp?castOpts(sp):'';
    const meta=sp?[sp.school,sp.time,sp.range,sp.comp,sp.dur,sp.conc?t('spConc'):'',sp.rit?t('spRit'):''].filter(Boolean).map(esc).join(' · '):'';
    return`<div class="sprow"><details class="spd"><summary><b>${esc(s.n)}</b>${sp&&sp.conc?` <span class="pill">C</span>`:''}${sp&&sp.rit?` <span class="pill">R</span>`:''}</summary><div class="note">${meta}</div><div class="featd">${sp&&sp.desc?esc(sp.desc).replace(/\n/g,'<br>'):`<span class="muted">${sp?t('asiNoDesc'):t('spNotInCat')}</span>`}</div></details>
     <div class="spacts">${L?`<label class="chk"><input type="checkbox" data-spa="prep" data-i="${i}" ${s.p?'checked':''}> ${t('spPrep')}</label>`:''}${co?`<select id="spc_${i}" aria-label="${t('spCastAt')}">${co}</select>`:''}<button type="button" class="btn small primary" data-spa="cast" data-i="${i}">${t('spCast')}</button><button type="button" class="btn small danger" data-spa="del" data-i="${i}" aria-label="${t('subRemove')}">✕</button></div></div>`}).join('')).join('');
  const have=new Set(d.spells.map(s=>s.n));
  const opts=[0,1,2,3,4,5,6,7,8,9].map(L=>{const l=(CAT.spells||[]).filter(s=>s.lvl===L&&!have.has(s.name));return l.length?`<optgroup label="${L?t('spLv')+' '+L:t('spCantrip')}">${l.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')}</optgroup>`:''}).join('');
  return`${head}${sl}${conc}${spMsg?`<p class="note" id="sp_msg" style="margin:0">${esc(spMsg)}</p>`:''}
   <div class="sprows">${rows||`<p class="note" style="margin:0">${t('spEmpty')}</p>`}</div>
   <div class="spadd">${catN?`<select id="sp_add" aria-label="${t('spAddPick')}"><option value="">${t('spAddPick')}</option>${opts}</select><button type="button" class="btn small" data-spa="add">${t('spAdd')}</button>`:`<span class="note">${t('spCatEmpty')}</span>`}
    <input id="sp_custom" type="text" maxlength="80" placeholder="${t('spCustom')}"><button type="button" class="btn small" data-spa="addc">${t('spAdd')}</button></div>`}
const spellPanel=d=>`<section class="panel"><div class="ph"><h2>${t('spTitle')}</h2></div><div class="spbody" id="spbody">${spBody(d)}</div></section>`;
function refreshSp(){const b=document.getElementById('spbody');if(b&&edit)b.innerHTML=spBody(edit.draft)}
function spAction(a,el){
  const d=edit.draft,I=spellInfo(d);d.sl=d.sl||{u:[],p:0};d.sl.u=d.sl.u||[];d.spells=d.spells||[];const i=Number(el.dataset.i),j=Number(el.dataset.j),L=Number(el.dataset.l);
  if(a==='slot'){const u=d.sl.u[L]||0;d.sl.u[L]=u>j?j:j+1;spMsg=''}
  else if(a==='pact'){const u=d.sl.p||0;d.sl.p=u>j?j:j+1;spMsg=''}
  else if(a==='pactrest'){d.sl.p=0;spMsg=t('spPactDone')}
  else if(a==='endc'){d.conc='';spMsg=''}
  else if(a==='del'){const s=d.spells[i];d.spells.splice(i,1);if(s&&d.conc===s.n)d.conc='';spMsg=''}
  else if(a==='prep'){if(d.spells[i])d.spells[i].p=el.checked?1:0;return}
  else if(a==='add'||a==='addc'){const v=(a==='add'?document.getElementById('sp_add').value:document.getElementById('sp_custom').value).trim();if(!v)return;if(!d.spells.some(s=>s.n===v))d.spells.push({n:v,p:0});spMsg=''}
  else if(a==='cast'){
    const s=d.spells[i],sp=s&&spellOf(s.n),Lv=sp?sp.lvl:0;spMsg='';
    if(s){
      let ok=true;
      if(Lv>0&&I){const sel=document.getElementById('spc_'+i),v=sel?sel.value:'';
        if(v==='p'){if((d.sl.p||0)>=I.pact[0]){ok=false;spMsg=t('spNoSlot')}else d.sl.p=(d.sl.p||0)+1}
        else if(v){const k=Number(v)-1;if((d.sl.u[k]||0)>=(I.slots[k]||0)){ok=false;spMsg=t('spNoSlot')}else d.sl.u[k]=(d.sl.u[k]||0)+1}
        else{ok=false;spMsg=t('spNoSlot')}}
      if(ok){spMsg=fill(t('spCast1'),{n:s.n});if(sp&&sp.conc){spMsg+=(d.conc&&d.conc!==s.n?' '+fill(t('spSwap'),{o:d.conc}):'');d.conc=s.n}}}}
  refreshSp()}
/* damage while concentrating: remind the player of the save; reaching 0 HP ends concentration */
function spConcNote(d,amt){if(!d.conc)return'';if(d.hpCur===0){const n=d.conc;d.conc='';return fill(t('spConcDown'),{n})}return amt>0?fill(t('spConcChk'),{n:d.conc,dc:Math.max(10,Math.floor(amt/2))}):''}
Object.assign(TX.th,{spTitle:'เวทมนตร์',spAb:'พลังร่ายเวท',spDc:'Spell Save DC',spAtk:'โจมตีด้วยเวท',spLv:'เลเวล',spPact:'Pact slots',spPactRest:'พักสั้นเสร็จ: คืน Pact slots',spPactDone:'คืน Pact slots แล้ว',spNone:'อาชีพนี้ไม่ได้ร่ายเวท (ยังเพิ่มรายการเวทเองได้ เช่น จาก Feat)',spConc:'Concentration',spEndConc:'เลิกสมาธิ',spCantrip:'Cantrip',spRit:'Ritual',spPrep:'เตรียมไว้',spCastAt:'ร่ายด้วย Slot',spCast:'ร่าย',spNoSlot:'ไม่เหลือ Slot ระดับนั้น',spCast1:'ร่าย {n}',spSwap:'(เลิกสมาธิ {o})',spEmpty:'ยังไม่มีเวทในรายการ',spAddPick:'เลือกเวทจากข้อมูลเกม',spAdd:'เพิ่ม',spN:'จำนวน',spX:'หมายเหตุเพิ่มเติม (ถ้ามี)',spCustom:'หรือพิมพ์ชื่อเวทเอง',spCatEmpty:'ยังไม่มีเวทในข้อมูลเกม (GM เพิ่มได้ที่ ข้อมูลเกม → Spells)',spNotInCat:'ไม่พบในข้อมูลเกม',spConcChk:'โดนดาเมจขณะสมาธิ {n}: ทอย CON save DC {dc}',spConcDown:'HP เป็น 0: เสียสมาธิ {n}',spells:'Spells',fc_spell:'Spell'});
Object.assign(TX.en,{spTitle:'Spells',spAb:'Spellcasting ability',spDc:'Spell save DC',spAtk:'Spell attack',spLv:'Level',spPact:'Pact slots',spPactRest:'Short rest done: restore pact slots',spPactDone:'Pact slots restored',spNone:'This class does not cast spells (you can still list spells, e.g. from a feat).',spConc:'Concentration',spEndConc:'End concentration',spCantrip:'Cantrips',spRit:'Ritual',spPrep:'Prepared',spCastAt:'Cast with slot',spCast:'Cast',spNoSlot:'No slot left at that level',spCast1:'Cast {n}',spSwap:'(stopped concentrating on {o})',spEmpty:'No spells listed yet.',spAddPick:'Pick a spell from Game data',spAdd:'Add',spN:'Amount',spX:'Extra note (optional)',spCustom:'or type a spell name',spCatEmpty:'No spells in Game data yet (the GM can add them in Game data → Spells).',spNotInCat:'Not in Game data',spConcChk:'Damage while concentrating on {n}: make a CON save, DC {dc}',spConcDown:'Reduced to 0 HP: concentration on {n} ends',spells:'Spells',fc_spell:'Spell'});
