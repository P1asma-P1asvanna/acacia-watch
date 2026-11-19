/* ---------- casting a spell that has its own effect rules (see 12c-spell-rules.js) ----------
   Runs the rules on the combat card: the spell attack or the target's save, then every effect of the branch that happened.
   Dice are rolled once per cast and shared by every target ("use on another target"), the damage grows with the slot and the character's level,
   and each result gets an Apply button (damage, healing, temp HP, a condition...). */
function spDiceParse(str){
  const s=String(str==null?'':str).replace(/\s/g,''),m=/^(\d{1,2})d(\d{1,3})(?:([+-])(\d{1,3}))?$/.exec(s);
  if(m)return{n:+m[1],s:+m[2],b:m[3]?(m[3]==='-'?-1:1)*+m[4]:0};
  const f=Number(s);return Number.isFinite(f)&&s!==''?{n:0,s:0,b:Math.round(f),flat:1}:{n:1,s:4,b:0}}
async function spRollAct(rid,eid,S,a,crit,why){
  const base=spDiceParse(a.dice),sp=S.sp,lv=sp?sp.lvl||0:0,d=taDoc(rid,eid);let n=base.n,tot=0;const txt=[];
  if(a.cant&&lv===0&&d){const L=Math.round(num(d.level))||1;n*=1+(L>=5)+(L>=11)+(L>=17)}
  if(base.flat){tot=base.b;txt.push(String(base.b))}
  else{const D=await taDice(rid,eid,{n,s:base.s,b:base.b},why,crit);if(!D)return null;tot=D.total;txt.push(`${taDiceTxt({n,s:base.s,b:base.b})}${crit?' ×2':''} = ${D.total}`)}
  const up=a.up&&lv>0&&S.castLv>lv?spDiceParse(a.up):null;
  if(up&&!up.flat){const k=S.castLv-lv,D2=await taDice(rid,eid,{n:up.n*k,s:up.s,b:0},why,crit);if(D2){tot+=D2.total;txt.push(`+ ${up.n*k}d${up.s}${crit?' ×2':''} = ${D2.total}`)}}
  return{total:Math.max(0,tot),detail:txt.join(' ')}}
async function taSpellRules(rid,eid,card,tg){
  const S=card.spell,nm=S.name,parts=[];S.rolls=S.rolls||{};
  const selfInfo={id:eid,name:taTname(rid,eid)};
  const info=text=>card.rows.push({k:'info',text});
  for(const r of S.rules){
    const self=r.who==='self',T=self?selfInfo:tg,c=r.chk;let list=r.ok,crit=false,half=false;
    if(!self&&c&&c.k==='atk'){
      const e=await taRoll(rid,eid,{n:1,sides:20,mod:Math.round(num(S.atk)),mode:TA.mode,why:nm+' '+t('spAtk')});if(!e)continue;
      const J=taJudge(e,tg&&tg.ac);card.rows.push({k:'atk',tot:e.total,nat:J.nat,ac:tg&&tg.ac,hide:tg&&tg.hide,v:J.v,tgt:tg&&tg.name});
      parts.push(`${e.total}${tg&&tg.ac!=null&&!tg.hide?' vs AC '+tg.ac:''} ${J.hit===false?t('taMissed'):J.hit?t(J.v==='crit'?'taCritHit':'taHit'):''}`.trim());
      if(J.hit===null){info(tg?t('taNoAcHint'):t('taPickTgt'));continue}
      list=J.hit?r.ok:r.no;crit=J.v==='crit'}
    else if(!self&&c&&c.k==='save'){
      const dc=c.dc||S.dc,ab=String(c.ab||'DEX').toLowerCase();
      if(tg){const e=await taRoll(rid,eid,{n:1,sides:20,mod:tg.sv(ab),why:`${nm}: ${tg.name} ${ab.toUpperCase()} ${t('taSaveOf')}`});if(!e)continue;
        const pass=e.total>=dc;card.rows.push({k:'save',tot:e.total,nat:taNat(e),dc,ab,v:pass?'pass':'fail',tgt:tg.name});
        parts.push(`${tg.name} ${ab.toUpperCase()} ${e.total} vs DC ${dc} ${pass?t('taSavePass'):t('taSaveFail')}`);
        list=pass?r.ok:r.no;half=pass&&!!r.half}
      else{info(`${t('taSaveOf')} ${ab.toUpperCase()} · DC ${dc}${r.half?' · '+t('taHalfOk'):''} — ${t('taPickTgt')}`);list=r.no}}
    const passes=[{src:list,ln:list===r.ok?'ok':'no',half:false}];
    if(half)passes.push({src:(r.no||[]).filter(a=>a.t==='dmg'),ln:'no',half:true});
    for(const ps of passes)for(let i=0;i<ps.src.length;i++){
      const a=ps.src[i],idx=ps.ln==='no'&&ps.half?(r.no||[]).indexOf(a):i;
      if(a.t==='dmg'||a.t==='heal'||a.t==='temp'){
        const key=`${r.id}:${ps.ln}:${idx}:${crit?1:0}`;let R=S.rolls[key];
        if(!R){R=await spRollAct(rid,eid,S,a,crit&&a.t==='dmg',nm+' '+(a.t==='dmg'?t('taDmg'):a.t==='heal'?t('taHeals'):'Temp HP'));if(!R)continue;S.rolls[key]=R}
        const amt=ps.half?Math.floor(R.total/2):R.total,detail=R.detail+(ps.half?' ÷2':'');
        if(a.t==='dmg'){const row={k:'dmg',amt,detail,dtype:a.dtype,tgt:T&&T.name};card.rows.push(row);taPushApply(card,row,T);parts.push(`${amt} ${a.dtype}`)}
        else{const row={k:'heal',amt,detail,temp:a.t==='temp',tgt:T&&T.name};card.rows.push(row);taPushApply(card,row,T,true);
          if(a.t==='temp'&&card.apply.length&&card.apply[card.apply.length-1].row===row)card.apply[card.apply.length-1].temp=true;parts.push(`+${amt} ${a.t==='temp'?'temp HP':'HP'}`)}}
      else if(a.t==='text'){if(a.text)info(a.text)}
      else{const row={k:'cond',text:spActText(a),tgt:T&&T.name};card.rows.push(row);
        if(T)card.apply.push({row,tid:T.id,name:T.name,act:a,amt:0});parts.push(spActText(a))}}}
  return parts.join(' · ')}
