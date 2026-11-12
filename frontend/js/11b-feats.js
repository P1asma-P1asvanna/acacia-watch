/* ---------- feats (D&D 2024): Ability Score Improvement or a Feat at the class's ASI levels ----------
   character: asi = {"4":{t:'asi',a1,a2} | {t:'feat',f,ab}}  (keyed by class level),  xf = [{f,ab}] extra feats.
   Base scores in d.abil never change; abT(d,k) gives the total. The server (backend/acacia/feats.py) does the same maths. */
const FEAT_CATS=['origin','general','fighting','epic'];
const asiLvOf=c=>{const s=c&&typeof c.asiLv==='string'?c.asiLv:'';if(!s.trim())return[4,8,12,16,19];return[...new Set((s.match(/\d+/g)||[]).map(Number).filter(x=>x>=1&&x<=20))].sort((a,b)=>a-b).slice(0,12)};
const abList=s=>{const f=Array.isArray(s)?s.map(x=>String(x).toLowerCase()):(String(s||'').toLowerCase().match(/[a-z]{3}/g)||[]);return ABS.filter(a=>f.includes(a))};
const featOf=n=>(CAT.feats||[]).find(f=>f.name===n);
const featPts=f=>f&&Number(f.pts)===2?2:1;
const featCap=f=>{const c=Math.round(num(f&&f.cap));return c>=20&&c<=30?c:(f&&f.cat==='epic'?30:20)};
/* every feat the character has: background origin feat, feats taken at ASI levels, extra feats */
function featsActive(d){
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),cls=CAT.classes.find(c=>c.name===d.cls),slots=new Set(asiLvOf(cls).filter(x=>x<=lv).map(String)),out=[],b=CAT.backgrounds.find(x=>x.name===d.bg),o=b&&featOf(b.originFeat);
  if(o)out.push([o,{}]);
  Object.entries(d.asi||{}).forEach(([k,p])=>{if(slots.has(k)&&p&&p.t==='feat'&&featOf(p.f))out.push([featOf(p.f),p])});
  (d.xf||[]).forEach(p=>{if(p&&featOf(p.f))out.push([featOf(p.f),p])});
  return out}
function abAll(d){
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),cls=CAT.classes.find(c=>c.name===d.cls),slots=new Set(asiLvOf(cls).filter(x=>x<=lv).map(String)),base={},bonus={},cap={},out={};
  ABS.forEach(k=>{base[k]=Math.max(1,Math.min(30,Math.round(num(d.abil&&d.abil[k]))));bonus[k]=0;cap[k]=20});
  Object.entries(d.asi||{}).forEach(([k,p])=>{if(!slots.has(k)||!p||p.t==='feat')return;if(p.m==='2'){if(ABS.includes(p.a1))bonus[p.a1]+=2}else[p.a1,p.a2].forEach(a=>{if(ABS.includes(a))bonus[a]++})});
  featsActive(d).forEach(([f,p])=>{const L=abList(f.asi);(featPts(f)===2?[p.ab,p.ab2]:[p.ab]).forEach(a=>{if(ABS.includes(a)&&L.includes(a)){bonus[a]++;cap[a]=Math.max(cap[a],featCap(f))}})});
  ABS.forEach(k=>out[k]=base[k]>=cap[k]?base[k]:Math.min(cap[k],base[k]+bonus[k]));
  return out}
const abT=(d,k)=>abAll(d)[k];
/* feat effects: bonus to initiative, max HP, AC, passive Perception (same maths as backend/acacia/feats.py fx_totals) */
function fxAll(d,armor){
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),pb=prof(lv),r={init:0,hp:0,ac:0,pass:0,speed:0,src:{init:[],hp:[],ac:[],pass:[],speed:[]}};
  const add=(name,fx)=>(fx||[]).forEach(e=>{const v=Math.max(-50,Math.min(200,Math.round(num(e.v)))),k=e.k;let n=0;
    if(k==='init')n=v+(e.pb?pb:0);else if(k==='hp')n=e.per==='flat'?v:v*lv;else if(k==='ac'){if(e.req!=='armor'||armor)n=v}else if(k==='pass'||k==='speed')n=v;else return;
    r[k]+=n;if(n)r.src[k].push([name,n])});
  featsActive(d).forEach(([f])=>add(f.name,f.fx));
  const W=wornGear(d);W.list.forEach(x=>add(x.it.name,x.a.fx));
  const weak=W.list.find(x=>num(x.a.str)>0&&num(abT(d,'str'))<num(x.a.str));if(weak){r.speed-=10;r.src.speed.push([weak.it.name+' (STR '+num(weak.a.str)+')',-10])}
  return r}
const wearsBody=d=>wornGear(d).list.some(x=>isBase(x.a));
const fxLine=(r,k)=>r.src[k].map(([n,v])=>`${esc(n)} ${sgn(v)}`).join(', ');
function refreshAbil(d){const tot=abAll(d);ABS.forEach(k=>{const m=document.getElementById('m_'+k),tt=document.getElementById('t_'+k);if(m){m.textContent=sgn(mod(tot[k]));m.classList.toggle('fxv',tot[k]!==Math.max(1,Math.min(30,Math.round(num(d.abil[k])))))}if(tt)tt.textContent=tot[k]!==Math.max(1,Math.min(30,Math.round(num(d.abil[k]))))?'= '+tot[k]:''});const dv=document.getElementById('derived');if(dv)dv.innerHTML=derived(d)}

const featDescHtml=f=>f?`<details class="feat asif"><summary><b>${esc(f.name)}</b> <span class="pill">${esc(t('fc_'+f.cat))}${f.prereq?' · '+esc(f.prereq):''}</span></summary><div class="featd">${f.desc?esc(f.desc).replace(/\n/g,'<br>'):`<span class="muted">${t('asiNoDesc')}</span>`}</div></details>`:'';
function featOpts(d,lvl,cur,all){
  const used=new Set([...Object.values(d.asi||{}).filter(p=>p&&p.t==='feat').map(p=>p.f),...(d.xf||[]).map(p=>p.f)]);const b=bgOf(d);if(b&&b.originFeat)used.add(b.originFeat);
  return FEAT_CATS.filter(c=>all||c!=='origin').map(c=>{const L=(CAT.feats||[]).filter(f=>f.cat===c&&(all||(f.minLv||0)<=lvl)&&(f.name===cur||f.rep||!used.has(f.name)));
    return L.length?`<optgroup label="${esc(t('fc_'+c))}">${L.map(f=>`<option value="${esc(f.name)}" ${f.name===cur?'selected':''}>${esc(f.name)}</option>`).join('')}</optgroup>`:''}).join('')}
const asiAbOpts=(d,cur,list)=>`<option value="">—</option>`+(list||ABS).map(k=>`<option value="${k}" ${k===cur?'selected':''}>${k.toUpperCase()}</option>`).join('');
function featAbSel(f,p,attrs){const L=f?abList(f.asi):[];if(!L.length)return'';const sel=(key,cur)=>`<select ${attrs.replace('@',key)} aria-label="${t('asiWhich')}">${asiAbOpts(null,cur,L)}</select>`;return sel('ab',p.ab)+(featPts(f)===2?`<span class="plus">+1</span>`+sel('ab2',p.ab2)+`<span class="plus">+1</span>`:`<span class="plus">+1</span>`)}
function asiBody(d){
  d.asi=d.asi||{};d.xf=d.xf||[];
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),cls=CAT.classes.find(c=>c.name===d.cls),all=asiLvOf(cls),slots=all.filter(x=>x<=lv),nxt=all.find(x=>x>lv),b=bgOf(d),of=b&&b.originFeat?featOf(b.originFeat):null;
  const origin=b&&b.originFeat?`<div class="asirow"><b class="lv">${t('asiOrigin')}</b><span>${esc(b.originFeat)}</span><span class="note">${esc(b.name)}</span></div>${of?featDescHtml(of):''}`:'';
  const rows=slots.map(L=>{const p=d.asi[L]||{t:'asi',m:'2',a1:'',a2:''},isF=p.t==='feat',f=isF?featOf(p.f):null,mm=p.m==='11'?'11':p.m==='2'?'2':'11';
    return`<div class="asirow"><b class="lv">Lv ${L}</b>
     <select data-asi="t" data-sl="${L}" aria-label="${t('asiKind')}"><option value="asi2" ${!isF&&mm==='2'?'selected':''}>${t('asiKind2')}</option><option value="asi11" ${!isF&&mm==='11'?'selected':''}>${t('asiKind11')}</option><option value="feat" ${isF?'selected':''}>${t('asiKindFeat')}</option></select>
     ${isF?`<select data-asi="f" data-sl="${L}" aria-label="${t('asiFeat')}"><option value="">—</option>${featOpts(d,L,p.f,false)}</select>${featAbSel(f,p,`data-asi="@" data-sl="${L}"`)}`
      :mm==='2'?`<select data-asi="a1" data-sl="${L}" aria-label="+2">${asiAbOpts(d,p.a1)}</select><span class="plus">+2</span>`
      :`<select data-asi="a1" data-sl="${L}" aria-label="+1">${asiAbOpts(d,p.a1)}</select><span class="plus">+1</span><select data-asi="a2" data-sl="${L}" aria-label="+1">${asiAbOpts(d,p.a2)}</select><span class="plus">+1</span>`}</div>${isF?featDescHtml(f):`<p class="note asin">${mm==='2'?t('asiHint2'):t('asiHint11')}</p>`}`}).join('');
  const xr=d.xf.map((p,i)=>{const f=featOf(p.f);return`<div class="asirow"><select data-xf="f" data-xi="${i}" aria-label="${t('asiFeat')}"><option value="">—</option>${featOpts(d,20,p.f,true)}</select>${featAbSel(f,p,`data-xf="@" data-xi="${i}"`)}<button type="button" class="btn small danger" data-asia="xdel" data-xi="${i}">${t('subRemove')}</button></div>${featDescHtml(f)}`}).join('');
  return`${origin}${slots.length?rows:`<p class="note" style="margin:0">${t('asiNone')}${nxt?' '+fill(t('asiNext'),{n:nxt}):''}</p>`}${slots.length&&nxt?`<p class="note">${fill(t('asiNext'),{n:nxt})}</p>`:''}
   <div class="asix"><div class="ph" style="padding:10px 0 0"><div><b>${t('asiExtra')}</b><div class="note">${t('asiExtraHint')}</div></div><button type="button" class="btn small" data-asia="xadd">${t('asiAdd')}</button></div>${xr}</div>`}
const asiPanel=d=>`<section class="panel"><div class="ph"><h2>${t('secAsi')}</h2></div><div class="asibody" id="asibody">${asiBody(d)}</div></section>`;
function refreshAsi(){const b=document.getElementById('asibody');if(!b||!edit)return;const sc=b.scrollTop;b.innerHTML=asiBody(edit.draft);b.scrollTop=sc;refreshAbil(edit.draft);schedRefresh({h:1,a:1,f:1})}
function asiChange(el){
  const d=edit.draft,k=el.dataset.asi||el.dataset.xf;d.asi=d.asi||{};d.xf=d.xf||[];
  if(el.dataset.xf){const p=d.xf[Number(el.dataset.xi)];if(!p)return;if(k==='f'){p.f=el.value;const L=abList((featOf(p.f)||{}).asi);p.ab=L.length===1?L[0]:'';p.ab2=p.ab}else p[k]=el.value;refreshAsi();return}
  const L=el.dataset.sl,p=d.asi[L]=d.asi[L]||{t:'asi',m:'2',a1:'',a2:''};
  if(k==='t'){d.asi[L]=el.value==='feat'?{t:'feat',f:'',ab:'',ab2:''}:{t:'asi',m:el.value==='asi11'?'11':'2',a1:p.a1||'',a2:p.a2||''}}
  else if(k==='f'){p.f=el.value;const A=abList((featOf(p.f)||{}).asi);p.ab=A.length===1?A[0]:'';p.ab2=p.ab}
  else p[k]=el.value;
  refreshAsi()}
function asiClick(a,el){const d=edit.draft;d.xf=d.xf||[];if(a==='xadd')d.xf.push({f:'',ab:'',ab2:''});else if(a==='xdel')d.xf.splice(Number(el.dataset.xi),1);refreshAsi()}
Object.assign(TX.th,{secAsi:'ASI และ Feats',asiOrigin:'Origin Feat',asiKind:'เลือกอย่างใดอย่างหนึ่ง',asiKind2:'ASI: +2 ให้พลังเดียว',asiKind11:'ASI: +1 ให้สองพลัง',asiKindFeat:'Feat',asiFeat:'Feat',asiWhich:'พลังที่ +1',asiHint2:'+2 ให้พลังที่เลือก (สูงสุด 20)',asiHint11:'+1 ให้แต่ละพลังที่เลือก (สูงสุด 20)',asiNone:'ยังไม่ถึงเลเวลที่ได้ ASI หรือ Feat',asiNext:'ครั้งถัดไปที่เลเวล {n}',asiExtra:'Feat เพิ่มเติม',asiExtraHint:'Fighting Style, Feat ซ้ำ หรือ Feat ที่ GM มอบให้',asiNoDesc:'ยังไม่มีคำอธิบาย (GM เติมได้ในข้อมูลเกม)',feats:'Feats',fc_origin:'Origin',fc_general:'General',fc_fighting:'Fighting Style',fc_epic:'Epic Boon'});
Object.assign(TX.en,{secAsi:'ASI and Feats',asiOrigin:'Origin Feat',asiKind:'Choose one',asiKind2:'ASI: +2 to one ability',asiKind11:'ASI: +1 to two abilities',asiKindFeat:'Feat',asiFeat:'Feat',asiWhich:'Ability to raise by 1',asiHint2:'+2 to the chosen ability (maximum 20).',asiHint11:'+1 to each chosen ability (maximum 20).',asiNone:'No Ability Score Improvement or Feat yet.',asiNext:'Next one at level {n}.',asiExtra:'Extra feats',asiExtraHint:'Fighting Style, a repeated feat, or a feat your GM granted.',asiNoDesc:'No description yet (the GM can add one in Game data).',feats:'Feats',fc_origin:'Origin',fc_general:'General',fc_fighting:'Fighting Style',fc_epic:'Epic Boon'});

/* ---------- feat effects editor (Game data → Feats) ---------- */
const FX_KINDS=['init','hp','ac','pass','speed'];
const featFxNew=k=>k==='init'?{k,v:0,pb:1}:k==='hp'?{k,v:2,per:'level'}:k==='ac'?{k,v:1,req:''}:k==='speed'?{k,v:10}:{k,v:5};
function featFxText(e){const v=Math.round(num(e.v));
  if(e.k==='init')return fill(t('fxS_init'),{v:(e.pb?'Proficiency Bonus':'')+(e.pb&&v?' ':'')+(v||!e.pb?sgn(v):'')});
  if(e.k==='hp')return fill(t(e.per==='flat'?'fxS_hpF':'fxS_hpL'),{v:sgn(v)});
  if(e.k==='ac')return fill(t(e.req==='armor'?'fxS_acA':'fxS_ac'),{v:sgn(v)});
  if(e.k==='speed')return fill(t('fxS_speed'),{v:sgn(v)});
  return fill(t('fxS_pass'),{v:sgn(v)})}
function featFxRow(e,i){
  const at=`data-fi="${i}"`,sel=(f,o,cur)=>`<select data-fe="${f}" ${at}>${o.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select>`;
  const val=`<label class="field"><span>${t('fxVal')}</span><input type="number" data-fe="v" ${at} value="${Math.round(num(e.v))}"></label>`;
  let p='';
  if(e.k==='init')p=val+`<label class="chk"><input type="checkbox" data-fe="pb" ${at} ${e.pb?'checked':''}> ${t('fxPb')}</label>`;
  else if(e.k==='hp')p=val+`<label class="field"><span>${t('fxPer')}</span>${sel('per',[['level',t('fxLevel')],['flat',t('fxFlat')]],e.per==='flat'?'flat':'level')}</label>`;
  else if(e.k==='ac')p=val+`<label class="field"><span>${t('fxWhen')}</span>${sel('req',[['',t('fxAlways')],['armor',t('fxArmor')]],e.req==='armor'?'armor':'')}</label>`;
  else p=val;
  return`<div class="fxrow"><label class="field"><span>${t('fxKind')}</span>${sel('k',FX_KINDS.map(k=>[k,t('fxK_'+k)]),e.k)}</label>${p}<button type="button" class="btn small danger" data-act="fe-del" data-b="${i}" ${at}>${t('subRemove')}</button><div class="note fxsum">${esc(featFxText(e))}</div></div>`}
const featFxEditor=d=>`<section class="panel"><div class="ph"><div><h2>${t(dedit&&dedit.cat==='armor'?'fxTitleG':'fxTitle')}</h2><div class="note">${t(dedit&&dedit.cat==='armor'?'fxHintG':'fxHint')}</div></div><button type="button" class="btn small" data-act="fe-add">${t('fxAdd')}</button></div><div class="fxlist">${(d.fx||[]).map(featFxRow).join('')||`<p class="note" style="padding:0 18px 14px;margin:0">${t('fxNone')}</p>`}</div></section>`;
function featFxEdit(el){
  const d=dedit&&dedit.draft;if(!d||dedit.cat!=='feats'||el.dataset.fe===undefined)return false;
  const e=(d.fx||[])[Number(el.dataset.fi)];if(!e)return true;const f=el.dataset.fe,val=el.type==='checkbox'?(el.checked?1:0):el.value;
  if(f==='k'){d.fx[Number(el.dataset.fi)]=featFxNew(val);render();return true}
  e[f]=f==='v'?Math.max(-50,Math.min(200,Math.round(Number(val))||0)):val;
  const row=el.closest('.fxrow'),sm=row&&row.querySelector('.fxsum');if(sm)sm.textContent=featFxText(e);return true}
function featFxClick(a,b){const d=dedit.draft;d.fx=d.fx||[];if(a==='fe-add')d.fx.push(featFxNew('init'));else if(a==='fe-del')d.fx.splice(Number(b.dataset.b),1);render()}
Object.assign(TX.th,{fxTitle:'เอฟเฟกต์ของ Feat',fxHint:'ตั้งผลที่ Feat นี้ให้กับชีตโดยอัตโนมัติ เพิ่มได้หลายอัน (โบนัสพลัง +1/+2 ตั้งที่ช่อง "พลังที่ +1 ได้" ด้านบน)',fxNone:'ยังไม่มีเอฟเฟกต์ (ใส่เป็นข้อความในรายละเอียดอย่างเดียวก็ได้)',fxKind:'ผล',fxVal:'ค่า',fxPb:'บวก Proficiency Bonus ด้วย',fxPer:'นับแบบ',fxLevel:'ต่อเลเวล',fxFlat:'ครั้งเดียว',fxWhen:'เมื่อไร',fxAlways:'ตลอดเวลา',fxArmor:'เฉพาะตอนสวมเกราะ',fxK_init:'โบนัส Initiative',fxK_hp:'HP สูงสุด',fxK_ac:'AC',fxK_pass:'Passive Perception',fxS_init:'Initiative {v}',fxS_hpL:'HP สูงสุด {v} ต่อเลเวล',fxS_hpF:'HP สูงสุด {v}',fxS_ac:'AC {v}',fxS_acA:'AC {v} เมื่อสวมเกราะ',fxS_pass:'Passive Perception {v}',fxS_speed:'ความเร็ว {v} ft',fxK_speed:'ความเร็ว',hpFeat:'{src}: {v}',acFeat:'{src} {v}',cFxb:'สีโบนัสจาก Feats/ASI',fxAdd:'+ เพิ่มเอฟเฟกต์',asiAdd:'+ เพิ่ม Feat'});
Object.assign(TX.en,{fxTitle:'Feat effects',fxHint:'What this feat does to the sheet automatically. Add as many as you like (ability +1/+2 is set in "Abilities it can raise" above).',fxNone:'No effects yet (a description alone is fine too).',fxKind:'Effect',fxVal:'Value',fxPb:'Also add Proficiency Bonus',fxPer:'Counted',fxLevel:'per level',fxFlat:'once',fxWhen:'When',fxAlways:'always',fxArmor:'only while wearing armor',fxK_init:'Initiative bonus',fxK_hp:'Max HP',fxK_ac:'AC',fxK_pass:'Passive Perception',fxS_init:'Initiative {v}',fxS_hpL:'Max HP {v} per level',fxS_hpF:'Max HP {v}',fxS_ac:'AC {v}',fxS_acA:'AC {v} while wearing armor',fxS_pass:'Passive Perception {v}',fxS_speed:'Speed {v} ft',fxK_speed:'Speed',hpFeat:'{src}: {v}',acFeat:'{src} {v}',cFxb:'Feats / ASI bonus color',fxAdd:'+ Add effect',asiAdd:'+ Add feat'});

Object.assign(TX.th,{shortRest:'พักสั้น: ทอย Hit Die',shortRestHint:'ใช้ Hit Die 1 ลูก ทอยแล้วฟื้น HP (บวก CON)',hdRolled:'ทอย d{d} ได้ {r} {con} CON → ฟื้น {v} HP',hdNone:'ไม่เหลือ Hit Dice ให้ใช้'});
Object.assign(TX.en,{shortRest:'Short rest: roll a hit die',shortRestHint:'Spend one hit die: roll it and regain HP (plus CON)',hdRolled:'Rolled d{d}: {r} {con} CON → regained {v} HP',hdNone:'No hit dice left to spend'});

/* ---------- Feats page: everyone can read, the GM edits in Game data ---------- */
function featCard(f){
  const fx=(f.fx||[]).map(featFxText),ab=abList(f.asi);
  const meta=[f.prereq?esc(f.prereq):'',ab.length?`${featPts(f)===2?'+1 +1':'+1'}: ${ab.map(a=>a.toUpperCase()).join(' / ')}`:'',...fx.map(esc)].filter(Boolean);
  return`<details class="feat featpg" data-fn="${esc(f.name.toLowerCase())}" data-fc="${f.cat}"><summary><b>${esc(f.name)}</b> <span class="pill">${esc(t('fc_'+f.cat))}</span>${f.minLv?` <span class="pill">Lv ${f.minLv}+</span>`:''}</summary>
   <div class="featd">${meta.length?`<p class="note fxmeta">${meta.join(' · ')}</p>`:''}${f.desc?esc(f.desc).replace(/\n/g,'<br>'):`<span class="muted">${t('asiNoDesc')}</span>`}</div></details>`}
function renderFeatsPage(){
  const L=CAT.feats||[],adm=isAdmin();
  const acts=adm?`<div class="acts"><button class="btn" data-act="feat-edit">${t('condEdit')}</button></div>`:'';
  const tools=`<div class="featbar"><input type="search" data-featq id="featq" placeholder="${t('featSearch')}" aria-label="${t('featSearch')}"><select data-featq id="featc" aria-label="${t('cat')}"><option value="">${t('featAllCats')}</option>${FEAT_CATS.map(c=>`<option value="${c}">${t('fc_'+c)}</option>`).join('')}</select></div>`;
  const body=L.length?FEAT_CATS.map(c=>{const g=L.filter(f=>f.cat===c);return g.length?`<h3 class="featgrp" data-fg="${c}">${t('fc_'+c)}</h3><div class="featlist" data-fl="${c}">${g.map(featCard).join('')}</div>`:''}).join(''):`<div class="empty"><div>${t('condNone')}</div></div>`;
  return head(t('feats'),t('featsSub'),acts)+`<section class="panel"><div class="featwrap">${tools}${body}<p class="note" id="featnone" hidden>${t('featNone')}</p></div></section>`}
function featFilter(){
  const q=(document.getElementById('featq')||{value:''}).value.trim().toLowerCase(),c=(document.getElementById('featc')||{value:''}).value;let any=false;
  document.querySelectorAll('.featpg').forEach(d=>{const show=(!q||d.dataset.fn.includes(q))&&(!c||d.dataset.fc===c);d.hidden=!show;if(show)any=true});
  document.querySelectorAll('.featlist').forEach(l=>{const has=[...l.children].some(d=>!d.hidden),h=document.querySelector(`.featgrp[data-fg="${l.dataset.fl}"]`);l.hidden=!has;if(h)h.hidden=!has});
  const n=document.getElementById('featnone');if(n)n.hidden=any}
Object.assign(TX.th,{featsSub:'รายการ Feat ทั้งหมด (อ่านอย่างเดียว) GM แก้ไขได้ในข้อมูลเกม',featSearch:'ค้นหา Feat…',featAllCats:'ทุกหมวด',featNone:'ไม่พบ Feat ที่ตรงกับคำค้น',cat:'หมวด'});
Object.assign(TX.en,{featsSub:'Every feat (read-only). The GM edits them in Game data.',featSearch:'Search feats…',featAllCats:'All categories',featNone:'No feat matches.',cat:'Category'});
