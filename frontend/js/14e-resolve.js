/* ---------- the dice, with the numbers on show ----------
   An attack is rolled against the target's AC: lower = miss (and it says so), equal or higher = hit and the damage is rolled straight away
   (a natural 20 always hits and doubles the dice, a natural 1 always misses). A spell shows what its text says and does what the text asks:
   a spell attack is rolled like a weapon attack, a saving throw is rolled FOR the target (their own bonus against the caster's DC) and a pass or
   fail changes the damage (half or none on a pass, when the text says so). Damage is only proposed: the GM presses "Apply" to take it off the HP. */
TA.card={};
const TA_AB=['str','dex','con','int','wis','cha'],AB_LONG={strength:'str',dexterity:'dex',constitution:'con',intelligence:'int',wisdom:'wis',charisma:'cha'};
const taSv=(c,ab)=>mod(abT(c,ab))+prof(c.level)*profLevel(c,'save',ab);
/* who is the target, and what do we know about them: AC and saving-throw bonuses */
function taTgtInfo(rid,eid){
  const tid=TA.tgt[eid];if(!tid)return null;const rm=taRm(rid);if(!rm)return null;
  const en=taEnts(rid).find(x=>x.id===tid);if(!en)return null;
  if(isAdmin()){
    const e=((rm.init&&rm.init.list)||[]).find(x=>x.id===tid);if(!e)return null;
    const st=iniStatsOf(e);return{id:tid,name:en.name,ac:st.ac,sv:ab=>st.sv[ab]||0,hide:false}}
  const e=(rm.list||[]).find(x=>x.id===tid);if(!e)return null;
  const doc=e.pc?pcs.find(c=>c.id===e.pc):null;
  if(doc){const x=Object.assign({},doc);normAc(x);return{id:tid,name:en.name,ac:effAc(x),sv:ab=>taSv(doc,ab),hide:false}}
  return{id:tid,name:en.name,ac:e.ac==null?null:e.ac,sv:ab=>(e.sv&&e.sv[ab])||0,hide:!!rm.hideAc&&e.kind!=='pc'}}
function taJudge(e,ac){
  const nat=taNat(e);
  if(nat===20)return{v:'crit',hit:true,nat};
  if(nat===1)return{v:'fumble',hit:false,nat};
  if(ac==null)return{v:'unk',hit:null,nat};
  return e.total>=ac?{v:'hit',hit:true,nat}:{v:'miss',hit:false,nat}}
/* ---- reading a spell's text ---- */
function taParseSpell(sp,d,I,castLv){
  const x=String(sp&&sp.desc||''),o={atk:false,save:'',dmg:null,half:false,heal:null};
  if(!x)return o;
  o.atk=/(spell attack|attack roll|โจมตีด้วยเวท)/i.test(x)&&!/saving throw/i.test(x.split(/(?:spell attack|attack roll)/i)[0]||'');
  let m=/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+(?:saving throw|save)/i.exec(x);
  if(m)o.save=AB_LONG[m[1].toLowerCase()];
  else if((m=/(?:เซฟ|saving throw|save)\s*(?:ด้วย|:)?\s*(str|dex|con|int|wis|cha)/i.exec(x)))o.save=m[1].toLowerCase();
  else if((m=/\b(str|dex|con|int|wis|cha)\w*\s+(?:saving throw|save)/i.exec(x)))o.save=m[1].toLowerCase();
  if(o.save)o.atk=o.atk&&/spell attack/i.test(x)&&!/saving throw/i.test(x);
  o.half=/half as much|half damage|ครึ่งหนึ่ง/i.test(x);
  const dm=/(\d{1,2})d(\d{1,3})(?:\s*([+-])\s*(\d{1,3}))?\s*([a-z]+)?\s*(?:damage|ดาเมจ)/i.exec(x);
  if(dm&&!/hit points? equal|regain/i.test(x.slice(Math.max(0,dm.index-60),dm.index)))o.dmg={n:+dm[1],s:+dm[2],b:dm[3]?(dm[3]==='-'?-1:1)*+dm[4]:0,type:/^(damage|ดาเมจ)$/i.test(dm[5]||'')?'':String(dm[5]||'').toLowerCase()};
  const hm=/(?:regains?|restores?|heals?|ฟื้นฟู)[^.]{0,90}?(\d{1,2})d(\d{1,3})(\s*\+\s*(?:your spellcasting (?:ability )?modifier|\d{1,3}))?[^.]{0,60}?hit points?/i.exec(x);
  if(!o.dmg&&hm)o.heal={n:+hm[1],s:+hm[2],b:/modifier/i.test(hm[3]||'')?(I&&I.ab?mod(abT(d,I.ab)):0):(hm[3]?+hm[3].replace(/[^\d]/g,''):0)};
  const main=o.dmg||o.heal;
  if(main){
    const L=sp.lvl||0,up=/(?:increases?|extra)[^.]{0,40}?(\d{1,2})d(\d{1,3})[^.]{0,50}?(?:slot )?level above/i.exec(x);
    if(L>0&&up&&castLv>L)main.n+=(+up[1])*(castLv-L);
    if(L===0&&d){const lv=Math.round(num(d.level))||1;main.n*=1+(lv>=5)+(lv>=11)+(lv>=17)}}
  return o}
const taDiceTxt=m=>`${m.n}d${m.s}${m.b?(m.b>0?'+':'−')+Math.abs(m.b):''}`;
async function taDice(rid,eid,m,why,crit){
  const e=await taRoll(rid,eid,{n:m.n*(crit?2:1),sides:m.s,mod:m.b,why});return e?{total:Math.max(0,e.total),label:e.label}:null}
/* ---- the card ---- */
const taV={hit:['✔','taHit','ok'],crit:['★','taCritHit','ok crit'],miss:['✘','taMissed','bad'],fumble:['✘','taFumble','bad'],unk:['?','taNoAc','mid'],pass:['✔','taSavePass','ok'],fail:['✘','taSaveFail','bad']};
function taCardHtml(eid){
  const c=TA.card[eid];if(!c)return'';
  const isNew=!c.seen;c.seen=1;
  const rows=c.rows.map(r=>{
    if(r.k==='info')return`<div class="tr mid"><div class="tr-txt"><small>${esc(r.text)}</small></div></div>`;
    if(r.k==='dmg'||r.k==='heal'){
      const ap=c.apply.findIndex(a=>a.row===r),a=ap>=0?c.apply[ap]:null;
      return`<div class="tr ${r.k==='heal'?'heal':'dmg'}"><div class="tr-big">${r.k==='heal'?'+':''}${r.amt}</div><div class="tr-txt"><b>${r.k==='heal'?t('taHeals'):t('taDmgN')}${r.dtype?' · '+esc(r.dtype):''}</b><small>${esc(r.detail||'')}${r.tgt?' → '+esc(r.tgt):''}</small></div>
       ${a&&isAdmin()?(a.done?`<span class="pill">✔ ${t('taApplied')}</span>`:`<button type="button" class="btn small primary" data-act="ta-apply" data-id="${eid}" data-v="${ap}">${r.k==='heal'?t('taApplyHeal'):t('taApplyDmg')}</button>`):''}</div>`}
    const v=taV[r.v]||taV.unk,big=r.k==='save'?r.tot:r.tot;
    const vs=r.k==='save'?`${t('taVsDc')} ${r.dc}`:(r.ac==null||r.hide?'':`${t('taVsAc')} ${r.ac}`);
    return`<div class="tr ${v[2]}"><div class="tr-big">${big}</div><div class="tr-txt"><b>${v[0]} ${t(v[1])}</b><small>${r.k==='save'?`${t('taSaveOf')} ${(r.ab||'').toUpperCase()}`:t('taToHit')}${r.nat?` · d20=${r.nat}`:''}${vs?' · '+vs:''}${r.tgt?' → '+esc(r.tgt):''}</small></div></div>`}).join('');
  const more=c.spell&&c.spell.more&&TA.tgt[eid]?`<button type="button" class="btn small" data-act="ta-more" data-id="${eid}" ${TA.busy?'disabled':''}>${t('taMoreTgt')}</button>`:'';
  return`<div class="tacard${isNew?' tc-new':''}" role="status"><div class="tc-h"><b>${esc(c.title)}</b>${c.sub?`<small>${esc(c.sub)}</small>`:''}<button type="button" class="tc-x" data-act="ta-cardx" data-id="${eid}" aria-label="${t('close')}">✕</button></div>
   ${rows}${more}${c.desc?`<details class="tc-desc" open><summary>${t('taSpellText')}</summary><div>${esc(c.desc).replace(/\n/g,'<br>')}</div></details>`:''}</div>`}
function taApply(rid,eid,i){
  const c=TA.card[eid],a=c&&c.apply[i];if(!a||a.done||!isAdmin())return;
  const rm=rooms.find(r=>r.id===rid);if(!rm)return;const I=iniData(rm),e=I.list.find(x=>x.id===a.tid);if(!e)return;
  if(a.heal)cbHeal(I,e,a.amt);else cbDamage(I,e,a.amt,a.dtype);
  a.done=true;saveRooms();render()}
/* ---- weapon attack: to-hit against AC, then the damage ---- */
async function taWeaponDmg(rid,eid,r,s,crit){
  const m=crit?2:1;
  const e=await taRoll(rid,eid,{n:s.dn*m,sides:s.ds,mod:s.db,why:r.ref+' '+t(crit?'wRollCrit':'wRollDmg')});if(!e)return null;
  let tot=e.total,more='';
  if(s.bs){const y=await taRoll(rid,eid,{n:s.bn*m,sides:s.bs,why:r.ref+' + '+s.w.bdie+(s.w.btype?' '+s.w.btype:'')});if(y){tot+=y.total;more=` + ${y.label} = ${y.total}`}}
  return{amt:Math.max(0,tot),detail:`${e.label} = ${e.total}${more}`,dtype:s.w.dtype||''}}
function taPushApply(card,row,tg,heal){if(tg&&row.amt>0)card.apply.push({row,tid:tg.id,name:tg.name,amt:row.amt,dtype:row.dtype||'',heal:!!heal})}
async function taWeapon(rid,eid,wid,kind){
  if(TA.busy)return;const d=taDoc(rid,eid),r=d&&(d.weapons||[]).find(x=>x.id===wid),s=r&&weaponStats(d,r);if(!s)return;
  TA.busy=true;render();const slot=TA.open.startsWith('rea')?'rea':TA.open==='bon'?'bon':'act';let txt='';
  const tg=taTgtInfo(rid,eid),card=TA.card[eid]={title:r.ref,sub:'',desc:'',rows:[],apply:[]};
  if(kind==='atk'){
    const e=await taRoll(rid,eid,{n:1,sides:20,mod:s.atk,mode:TA.mode,why:r.ref+' '+t('wRollAtk')});
    if(e){const J=taJudge(e,tg&&tg.ac);card.rows.push({k:'atk',tot:e.total,nat:J.nat,ac:tg&&tg.ac,hide:tg&&tg.hide,v:J.v,tgt:tg&&tg.name});
      txt=`${r.ref} ${e.total}${tg&&tg.ac!=null&&!tg.hide?' vs AC '+tg.ac:''} ${J.hit===false?t('taMissed'):J.hit?t(J.v==='crit'?'taCritHit':'taHit'):''}`.trim();
      if(J.hit&&s.ds){const D=await taWeaponDmg(rid,eid,r,s,J.v==='crit');
        if(D){const row={k:'dmg',amt:D.amt,detail:D.detail,dtype:D.dtype,tgt:tg&&tg.name};card.rows.push(row);taPushApply(card,row,tg);txt+=` ⇒ ${D.amt}${D.dtype?' '+D.dtype:''}`}}
      else if(J.hit===null)card.rows.push({k:'info',text:tg?t('taNoAcHint'):t('taPickTgt')});
      if(tg)txt+=` → ${tg.name}`}}
  else if(s.ds){
    const D=await taWeaponDmg(rid,eid,r,s,kind==='crit');
    if(D){const row={k:'dmg',amt:D.amt,detail:D.detail,dtype:D.dtype,tgt:tg&&tg.name};card.rows.push(row);taPushApply(card,row,tg);
      txt=`${r.ref} ${t(kind==='crit'?'wRollCrit':'taDmg')} ${D.amt}${D.dtype?' '+D.dtype:''}${tg?' → '+tg.name:''}`}}
  TA.busy=false;if(txt)await taUse(rid,eid,slot,txt);else render()}
/* ---- spells ---- */
async function taSpellTarget(rid,eid,card){
  const S=card.spell,info=S.info,tg=taTgtInfo(rid,eid),nm=S.name;let txt='';
  if(info.atk){
    const e=await taRoll(rid,eid,{n:1,sides:20,mod:Math.round(num(S.atk)),mode:TA.mode,why:nm+' '+t('spAtk')});
    if(e){const J=taJudge(e,tg&&tg.ac);card.rows.push({k:'atk',tot:e.total,nat:J.nat,ac:tg&&tg.ac,hide:tg&&tg.hide,v:J.v,tgt:tg&&tg.name});
      txt=`${e.total}${tg&&tg.ac!=null&&!tg.hide?' vs AC '+tg.ac:''} ${J.hit===false?t('taMissed'):J.hit?t(J.v==='crit'?'taCritHit':'taHit'):''}`.trim();
      if(J.hit&&info.dmg){const D=await taDice(rid,eid,info.dmg,nm+' '+t('taDmg'),J.v==='crit');
        if(D){const row={k:'dmg',amt:D.total,detail:`${taDiceTxt(info.dmg)}${J.v==='crit'?' ×2':''} = ${D.total}`,dtype:info.dmg.type,tgt:tg&&tg.name};card.rows.push(row);taPushApply(card,row,tg);txt+=` ⇒ ${D.total} ${info.dmg.type}`}}
      else if(J.hit===null)card.rows.push({k:'info',text:tg?t('taNoAcHint'):t('taPickTgt')})}}
  else if(info.save){
    if(info.dmg&&S.dmg==null){const D=await taDice(rid,eid,info.dmg,nm+' '+t('taDmg'),false);S.dmg=D?D.total:0;S.dmgTxt=D?`${taDiceTxt(info.dmg)} = ${D.total}`:''}
    if(tg){
      const e=await taRoll(rid,eid,{n:1,sides:20,mod:tg.sv(info.save),why:`${nm}: ${tg.name} ${info.save.toUpperCase()} ${t('taSaveOf')}`});
      if(e){const pass=e.total>=S.dc;card.rows.push({k:'save',tot:e.total,nat:taNat(e),dc:S.dc,ab:info.save,v:pass?'pass':'fail',tgt:tg.name});
        txt=`${tg.name} ${info.save.toUpperCase()} ${e.total} vs DC ${S.dc} ${pass?t('taSavePass'):t('taSaveFail')}`;
        if(info.dmg){const amt=pass?(info.half?Math.floor(S.dmg/2):0):S.dmg;
          const row={k:'dmg',amt,detail:`${S.dmgTxt}${pass?(info.half?' ÷2':' → 0'):''}`,dtype:info.dmg.type,tgt:tg.name};card.rows.push(row);taPushApply(card,row,tg);txt+=` ⇒ ${amt}`}}}
    else{card.rows.push({k:'info',text:`${t('taSaveOf')} ${info.save.toUpperCase()} · DC ${S.dc}${info.half?' · '+t('taHalfOk'):''} — ${t('taPickTgt')}`});
      if(info.dmg){const row={k:'dmg',amt:S.dmg,detail:S.dmgTxt,dtype:info.dmg.type};card.rows.push(row);txt=`DC ${S.dc} ${info.save.toUpperCase()} · ${S.dmg} ${info.dmg.type}`}}}
  else if(info.heal){
    const D=await taDice(rid,eid,info.heal,nm+' '+t('taHeals'),false);
    if(D){const row={k:'heal',amt:D.total,detail:`${taDiceTxt(info.heal)} = ${D.total}`,tgt:tg&&tg.name};card.rows.push(row);taPushApply(card,row,tg,true);txt=`+${D.total} HP${tg?' → '+tg.name:''}`}}
  else if(info.dmg){
    const D=await taDice(rid,eid,info.dmg,nm+' '+t('taDmg'),false);
    if(D){const row={k:'dmg',amt:D.total,detail:`${taDiceTxt(info.dmg)} = ${D.total}`,dtype:info.dmg.type,tgt:tg&&tg.name};card.rows.push(row);taPushApply(card,row,tg);txt=`${D.total} ${info.dmg.type}${tg?' → '+tg.name:''}`}}
  return txt}
async function taSpellFlow(rid,eid,slot,name,lead,castLv,force){
  const d=taDoc(rid,eid),sp=spellOf(name),I=d&&typeof spellInfo==='function'?spellInfo(d):null;
  TA.busy=true;render();
  const info=taParseSpell(sp,d,I,castLv||(sp?sp.lvl:0));if(force==='atk')info.atk=true;
  const meta=sp?[sp.lvl?t('spLv')+' '+sp.lvl:t('spCantrip'),sp.school,sp.time,sp.range,sp.dur].filter(Boolean).join(' · '):'';
  const card=TA.card[eid]={title:name,sub:meta,desc:sp&&sp.desc||'',rows:[],apply:[],
    spell:{name,info,atk:I?I.atk:0,dc:I?I.dc:8,dmg:null,more:!!(info.atk||info.save),slot}};
  let txt='';try{txt=await taSpellTarget(rid,eid,card)}catch(e){console.error('taSpellTarget',e)}
  TA.busy=false;
  await taUse(rid,eid,slot,`${t('spCast')} ${name}${lead||''}${txt?': '+txt:''}`.slice(0,160))}
async function taSpellMore(rid,eid){
  const card=TA.card[eid];if(!card||!card.spell||TA.busy)return;TA.busy=true;render();
  let txt='';try{txt=await taSpellTarget(rid,eid,card)}catch(e){console.error('taSpellTarget',e)}
  TA.busy=false;if(txt)await taUse(rid,eid,'note',`${card.title}: ${txt}`.slice(0,160));else render()}
async function taSpellAtk(rid,eid,name){
  if(TA.busy)return;const d=taDoc(rid,eid),sp=spellOf(name);
  await taSpellFlow(rid,eid,'note',name,'',sp?sp.lvl:0,'atk')}
Object.assign(TX.th,{taHit:'โดน!',taCritHit:'คริติคอล โดนแน่นอน!',taMissed:'ไม่โดน (พลาด)',taFumble:'พลาดสนิท (ทอยได้ 1)',taNoAc:'ไม่ทราบ AC',taToHit:'To-hit',taVsAc:'เทียบ AC',taVsDc:'เทียบ DC',taSaveOf:'เซฟ',taSavePass:'เซฟผ่าน',taSaveFail:'เซฟไม่ผ่าน',taDmgN:'ดาเมจ',taHeals:'ฟื้นฟู HP',taApplyDmg:'หักเลือดเป้าหมาย',taApplyHeal:'เพิ่ม HP เป้าหมาย',taApplied:'ทำแล้ว',taMoreTgt:'ใช้กับเป้าหมายอื่น (ไม่เสีย Slot)',taSpellText:'ข้อความของเวท',taPickTgt:'เลือกเป้าหมายด้านบนก่อน จะได้เทียบ AC / ให้เป้าหมายทอยเซฟให้เห็นเลย',taNoAcHint:'เป้าหมายนี้ยังไม่มี AC (GM ใส่ในรายการ Initiative ได้) จึงยังไม่ตัดสินว่าโดนหรือไม่',taHalfOk:'เซฟผ่านได้ดาเมจครึ่งหนึ่ง'});
Object.assign(TX.en,{taHit:'Hit!',taCritHit:'Critical hit!',taMissed:'Missed',taFumble:'Natural 1 — miss',taNoAc:'AC unknown',taToHit:'To-hit',taVsAc:'vs AC',taVsDc:'vs DC',taSaveOf:'save',taSavePass:'Save passed',taSaveFail:'Save failed',taDmgN:'Damage',taHeals:'Healing',taApplyDmg:'Apply damage to target',taApplyHeal:'Heal target',taApplied:'done',taMoreTgt:'Use on another target (no slot)',taSpellText:'Spell text',taPickTgt:'Pick a target above to compare against AC / roll their save here.',taNoAcHint:'This target has no AC yet (the GM can enter it in the Initiative list), so hit or miss is not decided.',taHalfOk:'half damage on a pass'});
