/* ---------- enemy abilities are hidden until the GM opens them (one by one) ----------
   Every Feature / Feat / Spell of a GM character in a fight is secret by default. The GM's initiative row has a list with a lock for each;
   opening one saves a text snapshot on the fight entry (`e.rv`), which the server passes to the players. Players see a chip per opened ability
   and a card like a game tooltip: keywords on the left, the effect text on the right. */
const RVX={th:{rvTitle:'ความสามารถ (ซ่อนไว้จากผู้เล่น)',rvOpen:'เปิดเผย',rvHide:'ซ่อนกลับ',rvAll:'เปิดทั้งหมด',rvNone:'ซ่อนทั้งหมด',rvCnt:'เปิดแล้ว {n}/{m}',rvEmpty:'ตัวนี้ยังไม่มีความสามารถ',
   rvFeature:'Feature',rvFeat:'Feat',rvSpell:'Spell',rvKw:'คีย์เวิร์ด',rvFx:'ผลของความสามารถ',rvClose:'ปิด',rvSeen:'ความสามารถที่เปิดเผยแล้ว',rvNew:'{who} เผยความสามารถ: {n}',rvLost:'ถูกซ่อนอีกครั้ง',rvLv:'เลเวล',rvCan:'Cantrip',rvConc:'ต้องจดจ่อ',rvPreview:'ดูตัวอย่างการ์ด',rvNoKw:'ไม่มีคีย์เวิร์ด'},
 en:{rvTitle:'Abilities (hidden from players)',rvOpen:'Reveal',rvHide:'Hide again',rvAll:'Reveal all',rvNone:'Hide all',rvCnt:'{n}/{m} revealed',rvEmpty:'This one has no abilities yet',
   rvFeature:'Feature',rvFeat:'Feat',rvSpell:'Spell',rvKw:'Keywords',rvFx:'Skill effects',rvClose:'Close',rvSeen:'Revealed abilities',rvNew:'{who} revealed: {n}',rvLost:'Hidden again',rvLv:'Level',rvCan:'Cantrip',rvConc:'Concentration',rvPreview:'Preview the card',rvNoKw:'No keywords'}};
Object.assign(TX.th,RVX.th);Object.assign(TX.en,RVX.en);
let RV_LAST={},RV_CARD=null,RV_OPEN={},RV_NEW={},RV_GONE=[],RV_PREV=null,RV_POP={};
const rvIsNpc=e=>!!e&&String(e.ref||'').startsWith('npc:');
/* every ability of a GM character, as a plain snapshot (what the players would get) */
function rvAbilities(d){
  if(!d)return[];const out=[],seen=new Set();
  const tkN={action:'Action',bonus:'Bonus Action',reaction:'Reaction'};
  const add=(a)=>{if(seen.has(a.id))return;seen.add(a.id);out.push(a)};
  try{featList(d).forEach(f=>{if(!f||!f.name)return;const m=[];if(f.tk&&tkN[f.tk])m.push(tkN[f.tk]);if(fuMax(f))m.push(`${fuMax(f)}× / ${t('res_'+(f.urest||'long'))}`);
    add({id:'f:'+f.name,k:'feature',n:f.name,sub:f.from||'',desc:f.desc||'',meta:m})})}catch(e){}
  try{const picked=[...Object.values(d.asi||{}).filter(p=>p&&p.t==='feat'&&p.f).map(p=>p.f),...(Array.isArray(d.xf)?d.xf:[]).map(p=>p&&p.f).filter(Boolean)];
    [...new Set(picked)].forEach(n=>{const f=(CAT.feats||[]).find(x=>x.name===n);const m=[];if(f&&f.tk&&tkN[f.tk])m.push(tkN[f.tk]);if(f&&fuMax(f))m.push(`${fuMax(f)}× / ${t('res_'+(f.urest||'long'))}`);
      add({id:'t:'+n,k:'feat',n,sub:t('rvFeat'),desc:f?f.desc||'':'',meta:m})})}catch(e){}
  (d.spells||[]).forEach(s=>{if(!s||!s.n)return;const sp=spellOf(s.n),m=[];
    if(sp){m.push(sp.lvl?`${t('rvLv')} ${sp.lvl}`:t('rvCan'));if(sp.school)m.push(sp.school);if(sp.time)m.push(sp.time);if(sp.range)m.push(sp.range);if(sp.dur)m.push(sp.dur);if(sp.conc)m.push(t('rvConc'))}
    add({id:'s:'+s.n,k:'spell',n:s.n,sub:sp&&sp.school?sp.school:'',desc:sp?sp.desc||'':'',meta:m.slice(0,6)})});
  return out}
const rvEntry=(rid,eid)=>{if(isAdmin()){const rm=rooms.find(r=>r.id===rid);return rm&&rm.init&&rm.init.list.find(e=>e.id===eid)}
  const rm=prooms.find(r=>r.id===rid);return rm&&rm.list.find(e=>e.id===eid)};
const rvOf=e=>(e&&Array.isArray(e.rv))?e.rv:[];
const rvKindIcon=k=>k==='spell'?'✦':k==='feat'?'★':'◆';
/* the card: keyword box on the left, effect text on the right */
function rvText(desc){
  let h=esc(String(desc||''));
  h=h.replace(/\[([^\]\n]{1,28})\]/g,'<span class="rv-tag">[$1]</span>');
  h=h.replace(/\n/g,'<br>');return h}
function rvKeywords(desc){
  const s=String(desc||'').toLowerCase();
  return(CAT.conditions||[]).filter(c=>c&&c.name&&s.includes(String(c.name).toLowerCase()))
    .map(c=>({n:c.name,d:String(c.sum||c.desc||'').slice(0,260)}))}
function rvMark(html,kws){kws.forEach(k=>{const re=new RegExp('('+esc(k.n).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');html=html.replace(/(<span class="rv-tag">[^<]*<\/span>)|([^<>]+)/g,(m,tg,tx)=>tg?tg:tx.replace(re,'<mark class="rv-kw">$1</mark>'))});return html}
function rvCardHtml(){
  if(!RV_CARD)return'';const{rid,eid,id,out}=RV_CARD,e=rvEntry(rid,eid);if(!e)return'';
  let a=null;if(isAdmin()){const c=iniChar(e);a=rvAbilities(c).find(x=>x.id===id)}else a=rvOf(e).find(x=>x.id===id);
  if(!a)return'';const kws=rvKeywords(a.desc),body=rvMark(rvText(a.desc),kws),nm=isAdmin()?iniName(e):e.name;
  return`<div class="rv-ov ${out?'out':''}" data-act="rv-close" role="dialog" aria-modal="true" aria-label="${esc(a.n)}"><div class="rv-card k-${a.k}" data-act="rv-noop">
   <button class="rv-x" data-act="rv-close" aria-label="${t('rvClose')}">✕</button>
   <header class="rv-hd"><span class="rv-ic" aria-hidden="true">${rvKindIcon(a.k)}</span><div><h3>${esc(a.n)}</h3><small>${esc(nm)} · ${t('rv'+a.k[0].toUpperCase()+a.k.slice(1))}${a.sub?' · '+esc(a.sub):''}</small></div></header>
   ${a.meta&&a.meta.length?`<div class="rv-meta">${a.meta.map(m=>`<span>${esc(m)}</span>`).join('')}</div>`:''}
   <div class="rv-body ${kws.length?'two':''}">${kws.length?`<aside class="rv-side"><h4>${t('rvKw')}</h4>${kws.map(k=>`<div class="rv-k"><b>${esc(k.n)}</b><p>${esc(k.d)}</p></div>`).join('')}</aside>`:''}
    <section class="rv-fx"><h4>${t('rvFx')}</h4><div class="rv-txt">${body||'—'}</div></section></div></div></div>`}
/* GM: the list under a GM character's initiative row */
function rvGmBox(rm,e){
  if(!rvIsNpc(e))return'';const c=iniChar(e);if(!c)return'';const L=rvAbilities(c),on=new Set(rvOf(e).map(x=>x.id)),n=L.filter(a=>on.has(a.id)).length,key=rm.id+':'+e.id;
  return`<details class="rvbox" data-rvk="${esc(key)}" ${RV_OPEN[key]?'open':''}><summary>🔒 ${t('rvTitle')} <span class="pill">${fill(t('rvCnt'),{n,m:L.length})}</span></summary>
   ${L.length?`<div class="rv-bar"><button class="btn small" data-act="rv-all" data-eid="${e.id}">${t('rvAll')}</button><button class="btn small" data-act="rv-none" data-eid="${e.id}">${t('rvNone')}</button></div>
   <ul class="rvlist">${L.map(a=>{const o=on.has(a.id),pop=RV_POP[e.id+'|'+a.id];return`<li class="rvrow ${o?'on':''} ${pop?'pop-'+pop:''}"><button class="rvlock" data-act="rv-tg" data-eid="${e.id}" data-id="${esc(a.id)}" aria-pressed="${o}" aria-label="${o?t('rvHide'):t('rvOpen')}: ${esc(a.n)}"><span class="rvlk">${o?'🔓':'🔒'}</span></button>
    <button class="rvname" data-act="rv-open" data-eid="${e.id}" data-id="${esc(a.id)}" title="${t('rvPreview')}"><span class="rv-ic">${rvKindIcon(a.k)}</span><b>${esc(a.n)}</b><small>${t('rv'+a.k[0].toUpperCase()+a.k.slice(1))}${a.sub?' · '+esc(a.sub):''}</small></button></li>`}).join('')}</ul>`:`<p class="note">${t('rvEmpty')}</p>`}</details>`}
/* players: chips of what the GM has opened on a combatant */
function rvChips(rid,e){const L=rvOf(e);const gone=RV_GONE.filter(g=>g.eid===e.id);if(!L.length&&!gone.length)return'';
  return`<div class="rvchips" aria-label="${t('rvSeen')}">${L.map(a=>`<button class="rvchip k-${a.k} ${RV_NEW[e.id+'|'+a.id]?'new':''}" data-act="rv-open" data-rid="${esc(rid)}" data-eid="${e.id}" data-id="${esc(a.id)}"><span class="rv-ic" aria-hidden="true">${rvKindIcon(a.k)}</span>${esc(a.n)}</button>`).join('')}${gone.map(g=>`<span class="rvchip gone" aria-hidden="true">${esc(g.n)}</span>`).join('')}</div>`}
function rvAction(a,b){
  if(a==='rv-noop')return;
  const rid=b.dataset.rid||(typeof roomOpen!=='undefined'?roomOpen:null),eid=b.dataset.eid,id=b.dataset.id;
  if(a==='rv-close'){if(!RV_CARD)return;RV_CARD.out=1;render();setTimeout(()=>{RV_CARD=null;render()},240);return}
  if(a==='rv-open'){RV_CARD={rid,eid,id};render();return}
  const rm=rooms.find(r=>r.id===roomOpen);if(!rm||!rm.init)return;const e=rm.init.list.find(x=>x.id===eid);if(!e)return;const c=iniChar(e);if(!c)return;
  const L=rvAbilities(c);e.rv=rvOf(e).filter(x=>L.some(y=>y.id===x.id));
  const open=a=>{if(!e.rv.some(x=>x.id===a.id))e.rv.push(a);RV_POP[e.id+'|'+a.id]='on'},shut=a=>{e.rv=e.rv.filter(x=>x.id!==a.id);RV_POP[e.id+'|'+a.id]='off'};
  if(a==='rv-tg'){const ab=L.find(x=>x.id===id);if(!ab)return;e.rv.some(x=>x.id===id)?shut(ab):open(ab)}
  else if(a==='rv-all')L.forEach(open);else if(a==='rv-none')L.forEach(shut);
  RV_OPEN[rm.id+':'+e.id]=1;saveRooms();render();setTimeout(()=>{RV_POP={};render()},700)}
document.addEventListener('toggle',ev=>{const d=ev.target;if(d&&d.classList&&d.classList.contains('rvbox')){RV_OPEN[d.dataset.rvk]=d.open?1:0}},true);
/* players: tell when something is opened or taken back */
function rvWatch(){
  if(isAdmin()||typeof prooms==='undefined')return;const now={};
  prooms.forEach(rm=>rm.list.forEach(e=>{now[rm.id+'|'+e.id]=rvOf(e).map(a=>a.id)}));
  const prev=RV_PREV;RV_PREV=now;if(!prev){RV_LAST={};prooms.forEach(rm=>rm.list.forEach(e=>{RV_LAST[rm.id+'|'+e.id]=rvOf(e)}));return}let ch=false;
  for(const k in now){const was=new Set(prev[k]||[]),[rid,eid]=k.split('|'),rm=prooms.find(r=>r.id===rid),e=rm&&rm.list.find(x=>x.id===eid);if(!e)continue;
    rvOf(e).forEach(a=>{if(!was.has(a.id)){RV_NEW[eid+'|'+a.id]=1;ch=true;try{turnBanner(fill(t('rvNew'),{who:e.name,n:a.n}));0}catch(x){}setTimeout(()=>{delete RV_NEW[eid+'|'+a.id];render()},2200)}});
    (prev[k]||[]).forEach(id=>{if(!now[k].includes(id)){
      const old=(RV_LAST[k]||[]).find(a=>a.id===id);if(old){RV_GONE.push({eid,id,n:old.n});ch=true;setTimeout(()=>{RV_GONE=RV_GONE.filter(g=>!(g.eid===eid&&g.id===id));render()},900)}
      if(RV_CARD&&RV_CARD.eid===eid&&RV_CARD.id===id){RV_CARD.out=1;setTimeout(()=>{RV_CARD=null;render()},260)}}})}
  RV_LAST={};prooms.forEach(rm=>rm.list.forEach(e=>{RV_LAST[rm.id+'|'+e.id]=rvOf(e)}));
  if(ch)setTimeout(render,0)}
