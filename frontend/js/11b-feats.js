/* ---------- feats (D&D 2024): Ability Score Improvement or a Feat at the class's ASI levels ----------
   character: asi = {"4":{t:'asi',a1,a2} | {t:'feat',f,ab}}  (keyed by class level),  xf = [{f,ab}] extra feats.
   Base scores in d.abil never change; abT(d,k) gives the total. The server (backend/acacia/feats.py) does the same maths. */
const FEAT_CATS=['origin','general','fighting','epic'];
const asiLvOf=c=>{const s=c&&typeof c.asiLv==='string'?c.asiLv:'';if(!s.trim())return[4,8,12,16,19];return[...new Set((s.match(/\d+/g)||[]).map(Number).filter(x=>x>=1&&x<=20))].sort((a,b)=>a-b).slice(0,12)};
const abList=s=>{const f=Array.isArray(s)?s.map(x=>String(x).toLowerCase()):(String(s||'').toLowerCase().match(/[a-z]{3}/g)||[]);return ABS.filter(a=>f.includes(a))};
const featOf=n=>(CAT.feats||[]).find(f=>f.name===n);
function abAll(d){
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),cls=CAT.classes.find(c=>c.name===d.cls),slots=new Set(asiLvOf(cls).filter(x=>x<=lv).map(String)),base={},bonus={},cap={},out={};
  ABS.forEach(k=>{base[k]=Math.max(1,Math.min(30,Math.round(num(d.abil&&d.abil[k]))));bonus[k]=0;cap[k]=20});
  const fb=(n,ab)=>{const f=featOf(n);if(f&&ABS.includes(ab)&&abList(f.asi).includes(ab)){bonus[ab]++;if(f.cat==='epic')cap[ab]=30}};
  Object.entries(d.asi||{}).forEach(([k,p])=>{if(!slots.has(k)||!p)return;if(p.t==='feat')fb(p.f,p.ab);else[p.a1,p.a2].forEach(a=>{if(ABS.includes(a))bonus[a]++})});
  (d.xf||[]).forEach(p=>fb(p.f,p.ab));
  ABS.forEach(k=>out[k]=base[k]>=cap[k]?base[k]:Math.min(cap[k],base[k]+bonus[k]));
  return out}
const abT=(d,k)=>abAll(d)[k];
function refreshAbil(d){const tot=abAll(d);ABS.forEach(k=>{const m=document.getElementById('m_'+k),tt=document.getElementById('t_'+k);if(m)m.textContent=sgn(mod(tot[k]));if(tt)tt.textContent=tot[k]!==Math.max(1,Math.min(30,Math.round(num(d.abil[k]))))?'= '+tot[k]:''});const dv=document.getElementById('derived');if(dv)dv.innerHTML=derived(d)}

const featDescHtml=f=>f?`<details class="feat asif"><summary><b>${esc(f.name)}</b> <span class="pill">${esc(t('fc_'+f.cat))}${f.prereq?' · '+esc(f.prereq):''}</span></summary><div class="featd">${f.desc?esc(f.desc).replace(/\n/g,'<br>'):`<span class="muted">${t('asiNoDesc')}</span>`}</div></details>`:'';
function featOpts(d,lvl,cur,all){
  const used=new Set([...Object.values(d.asi||{}).filter(p=>p&&p.t==='feat').map(p=>p.f),...(d.xf||[]).map(p=>p.f)]);const b=bgOf(d);if(b&&b.originFeat)used.add(b.originFeat);
  return FEAT_CATS.filter(c=>all||c!=='origin').map(c=>{const L=(CAT.feats||[]).filter(f=>f.cat===c&&(all||(f.minLv||0)<=lvl)&&(f.name===cur||f.rep||!used.has(f.name)));
    return L.length?`<optgroup label="${esc(t('fc_'+c))}">${L.map(f=>`<option value="${esc(f.name)}" ${f.name===cur?'selected':''}>${esc(f.name)}</option>`).join('')}</optgroup>`:''}).join('')}
const asiAbOpts=(d,cur,list)=>`<option value="">—</option>`+(list||ABS).map(k=>`<option value="${k}" ${k===cur?'selected':''}>${k.toUpperCase()}</option>`).join('');
function featAbSel(f,cur,attrs){const L=f?abList(f.asi):[];if(!L.length)return'';return`<select ${attrs} aria-label="${t('asiWhich')}">${asiAbOpts(null,cur,L)}</select>`}
function asiBody(d){
  d.asi=d.asi||{};d.xf=d.xf||[];
  const lv=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),cls=CAT.classes.find(c=>c.name===d.cls),all=asiLvOf(cls),slots=all.filter(x=>x<=lv),nxt=all.find(x=>x>lv),b=bgOf(d),of=b&&b.originFeat?featOf(b.originFeat):null;
  const origin=b&&b.originFeat?`<div class="asirow"><b class="lv">${t('asiOrigin')}</b><span>${esc(b.originFeat)}</span><span class="note">${esc(b.name)}</span></div>${of?featDescHtml(of):''}`:'';
  const rows=slots.map(L=>{const p=d.asi[L]||{t:'asi',a1:'',a2:''},isF=p.t==='feat',f=isF?featOf(p.f):null;
    return`<div class="asirow"><b class="lv">Lv ${L}</b>
     <select data-asi="t" data-sl="${L}" aria-label="${t('asiKind')}"><option value="asi" ${isF?'':'selected'}>${t('asiKindAsi')}</option><option value="feat" ${isF?'selected':''}>${t('asiKindFeat')}</option></select>
     ${isF?`<select data-asi="f" data-sl="${L}" aria-label="${t('asiFeat')}"><option value="">—</option>${featOpts(d,L,p.f,false)}</select>${featAbSel(f,p.ab,`data-asi="ab" data-sl="${L}"`)}`
      :`<select data-asi="a1" data-sl="${L}" aria-label="+1">${asiAbOpts(d,p.a1)}</select><span class="plus">+1</span><select data-asi="a2" data-sl="${L}" aria-label="+1">${asiAbOpts(d,p.a2)}</select><span class="plus">+1</span>`}</div>${isF?featDescHtml(f):`<p class="note asin">${p.a1&&p.a1===p.a2?fill(t('asiTwo'),{a:p.a1.toUpperCase()}):t('asiHint')}</p>`}`}).join('');
  const xr=d.xf.map((p,i)=>{const f=featOf(p.f);return`<div class="asirow"><select data-xf="f" data-xi="${i}" aria-label="${t('asiFeat')}"><option value="">—</option>${featOpts(d,20,p.f,true)}</select>${featAbSel(f,p.ab,`data-xf="ab" data-xi="${i}"`)}<button type="button" class="btn small danger" data-asia="xdel" data-xi="${i}">${t('subRemove')}</button></div>${featDescHtml(f)}`}).join('');
  return`${origin}${slots.length?rows:`<p class="note" style="margin:0">${t('asiNone')}${nxt?' '+fill(t('asiNext'),{n:nxt}):''}</p>`}${slots.length&&nxt?`<p class="note">${fill(t('asiNext'),{n:nxt})}</p>`:''}
   <div class="asix"><div class="ph" style="padding:10px 0 0"><div><b>${t('asiExtra')}</b><div class="note">${t('asiExtraHint')}</div></div><button type="button" class="btn small" data-asia="xadd">${t('featAdd')}</button></div>${xr}</div>`}
const asiPanel=d=>`<section class="panel"><div class="ph"><h2>${t('secAsi')}</h2></div><div class="asibody" id="asibody">${asiBody(d)}</div></section>`;
function refreshAsi(){const b=document.getElementById('asibody');if(!b||!edit)return;const sc=b.scrollTop;b.innerHTML=asiBody(edit.draft);b.scrollTop=sc;refreshAbil(edit.draft);schedRefresh({h:1,a:1,f:1})}
function asiChange(el){
  const d=edit.draft,k=el.dataset.asi||el.dataset.xf;d.asi=d.asi||{};d.xf=d.xf||[];
  if(el.dataset.xf){const p=d.xf[Number(el.dataset.xi)];if(!p)return;if(k==='f'){p.f=el.value;const L=abList((featOf(p.f)||{}).asi);p.ab=L.length===1?L[0]:''}else p.ab=el.value;refreshAsi();return}
  const L=el.dataset.sl,p=d.asi[L]=d.asi[L]||{t:'asi',a1:'',a2:''};
  if(k==='t'){d.asi[L]=el.value==='feat'?{t:'feat',f:'',ab:''}:{t:'asi',a1:'',a2:''}}
  else if(k==='f'){p.f=el.value;const A=abList((featOf(p.f)||{}).asi);p.ab=A.length===1?A[0]:''}
  else p[k]=el.value;
  refreshAsi()}
function asiClick(a,el){const d=edit.draft;d.xf=d.xf||[];if(a==='xadd')d.xf.push({f:'',ab:''});else if(a==='xdel')d.xf.splice(Number(el.dataset.xi),1);refreshAsi()}
Object.assign(TX.th,{secAsi:'ASI และ Feats',asiOrigin:'Origin Feat',asiKind:'เลือกอย่างใดอย่างหนึ่ง',asiKindAsi:'Ability Score Improvement',asiKindFeat:'Feat',asiFeat:'Feat',asiWhich:'พลังที่ +1',asiHint:'เลือกพลังเดียวกันทั้งสองช่อง = +2 ให้พลังนั้น เลือกต่างกัน = +1 ทั้งคู่ (สูงสุด 20)',asiTwo:'+2 ให้ {a} (สูงสุด 20)',asiNone:'ยังไม่ถึงเลเวลที่ได้ ASI หรือ Feat',asiNext:'ครั้งถัดไปที่เลเวล {n}',asiExtra:'Feat เพิ่มเติม',asiExtraHint:'Fighting Style, Feat ซ้ำ หรือ Feat ที่ GM มอบให้',asiNoDesc:'ยังไม่มีคำอธิบาย (GM เติมได้ในข้อมูลเกม)',feats:'Feats',fc_origin:'Origin',fc_general:'General',fc_fighting:'Fighting Style',fc_epic:'Epic Boon'});
Object.assign(TX.en,{secAsi:'ASI and Feats',asiOrigin:'Origin Feat',asiKind:'Choose one',asiKindAsi:'Ability Score Improvement',asiKindFeat:'Feat',asiFeat:'Feat',asiWhich:'Ability to raise by 1',asiHint:'Pick the same ability twice for +2, or two different ones for +1 each (maximum 20).',asiTwo:'+2 to {a} (maximum 20)',asiNone:'No Ability Score Improvement or Feat yet.',asiNext:'Next one at level {n}.',asiExtra:'Extra feats',asiExtraHint:'Fighting Style, a repeated feat, or a feat your GM granted.',asiNoDesc:'No description yet (the GM can add one in Game data).',feats:'Feats',fc_origin:'Origin',fc_general:'General',fc_fighting:'Fighting Style',fc_epic:'Epic Boon'});
