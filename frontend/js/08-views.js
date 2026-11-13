/* ---------- views ---------- */
function renderApp(){
  const u=me(), adm=isAdmin();
  const items=adm?[['players','players'],['npcs','npcs'],['data','data'],['adventure','adventure'],['conditions','conditions'],['feats','conditions'],['spells','conditions'],['profile','players'],['games','games'],['site','site']]:[['players','players'],['adventure','adventure'],['conditions','conditions'],['feats','conditions'],['spells','conditions'],['profile','players'],['site','site']];
  if(!adm&&!['players','adventure','conditions','feats','spells','profile','site'].includes(view))view='players';
  const stage=inStage();
  return`<div class="app${stage?' stagemode':''}"><aside class="side">
   <div class="brand">${brandHtml()}</div>
   <nav class="nav" aria-label="Main">${items.map(([k,ic])=>`<button data-act="nav" data-v="${k}" ${view===k?'aria-current="page"':''}>${ICON[ic]}<span>${t(k)}</span></button>`).join('')}</nav>
   <div class="side-foot"><div class="me"><b>${esc(u.disp)}</b><span>${adm?t('admin'):t('player')}</span></div>${langSwitch()}<button class="btn small" data-act="logout">${t('logout')}</button></div>
  </aside><main class="main${stage?' stage':''}" id="main">${view==='players'?renderPlayers():view==='npcs'?renderNpcs():view==='data'?renderData():view==='site'?renderSite():view==='conditions'?renderConditions():view==='feats'?renderFeatsPage():view==='spells'?renderSpellsPage():view==='profile'?renderProfilePage():view==='adventure'?(adm?renderAdventure():renderPlayerAdv()):renderGames()}</main>${condPopHtml()}</div>`;
}
function head(title,sub,btn){return`<div class="head"><div><h1>${title}</h1><p>${sub}</p></div>${btn||''}</div>`}
function table(kind){
  const adm=isAdmin();
  let rows=list(kind);
  if(kind==='pc'&&!adm)rows=rows.filter(r=>r.owner===session);
  if(!rows.length)return`<div class="empty"><div>${t('noRows')}</div><button class="btn" data-act="sample" data-k="${kind}">${t('addSample')}</button><div class="note">${t('sampleNote')}</div></div>`;
  const typeLbl={ally:t('tAlly'),neutral:t('tNeutral'),villain:t('tVillain')};
  return`<div class="scroll"><table><thead><tr><th>${t('colChar')}</th><th>${kind==='pc'?t('colPlayer'):t('colType')}</th><th>${t('colRace')}</th><th>${t('colClass')}</th><th class="num">${t('colHp')}</th><th class="num">${t('colAc')}</th><th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.name)||'—'}</b><span class="sub">${esc(r.bg)}</span></td>
   <td>${kind==='pc'?(esc(ownerName(r.owner))||'<span class="muted">'+t('unassigned')+'</span>'):`<span class="pill">${esc(typeLbl[r.type]||'')}</span>`}</td>
   <td>${esc(r.race)}</td><td>${clsLabel(r)}<span class="sub">${esc(r.sub)}</span></td>
   <td class="num">${curHp(r)} / ${r.hp}${num(r.hpTemp)?' <span class="tt">+'+num(r.hpTemp)+'</span>':''}</td><td class="num">${r.ac}</td>
   <td><div class="acts"><button class="btn small" data-act="edit" data-k="${kind}" data-id="${r.id}">${t('edit')}</button><button class="btn small danger" data-act="del" data-k="${kind}" data-id="${r.id}">${delArm===r.id?t('delSure'):t('del')}</button></div></td></tr>`).join('')}
  </tbody></table></div>`;
}
function renderPlayers(){
  if(edit&&edit.kind==='pc')return renderEditor();
  const adm=isAdmin();
  let h=head(t('players'),adm?t('playersSub'):t('playersSubMine'),`<div class="acts">${arrangeBtn('players')}<button class="btn primary" data-act="new" data-k="pc">+ ${t('add')}</button></div>`);
  const list=`<section class="panel">${table('pc')}</section>`;
  let acc='';
  if(adm)acc=`<section class="panel"><div class="ph"><div><h2>${t('accounts')}</h2><div class="note">${t('accSub')}</div></div></div><div class="scroll"><table><thead><tr><th>${t('user')}</th><th>${t('disp')}</th><th>${t('role')}</th>${REMOTE?`<th>${t('colAct')}</th>`:''}</tr></thead><tbody>
   ${users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.disp)}</td><td><label class="field" style="max-width:170px"><span class="lbl" style="display:none">${t('role')}</span><select data-act="role" data-id="${u.id}" aria-label="${t('role')} ${esc(u.name)}"><option value="player" ${u.role==='player'?'selected':''}>${t('player')}</option><option value="admin" ${u.role==='admin'?'selected':''}>${t('admin')}</option></select></label></td>${REMOTE?`<td><div class="pwrow"><input type="password" id="pw_${u.id}" autocomplete="new-password" placeholder="${t('pwNew')}" aria-label="${t('pwNew')} ${esc(u.name)}"><button type="button" class="btn small" data-act="pwset" data-id="${u.id}">${t('pwSet')}</button>${u.id!==session?`<button type="button" class="btn small danger" data-act="userdel" data-id="${u.id}">${dataArm==='udel_'+u.id?t('userDelSure'):t('userDel')}</button>`:''}</div></td>`:''}</tr>`).join('')}
   </tbody></table></div><div class="err" id="accErr" style="padding:0 16px 12px">${flashMsg}</div></section>`;
  return h+arrangeBar('players')+wgrid('players',[['list',list],['accounts',acc]]);
}
function renderNpcs(){
  if(edit&&edit.kind==='npc')return renderEditor();
  return head(t('npcs'),t('npcsSub'),`<button class="btn primary" data-act="new" data-k="npc">+ ${t('add')}</button>`)+`<section class="panel">${table('npc')}</section>`;
}
const opt=(arr,sel)=>arr.map(v=>`<option value="${esc(v)}" ${v===sel?'selected':''}>${esc(v)}</option>`).join('');
const optCur=(arr,cur)=>opt(arr,cur)+(cur&&!arr.includes(cur)?`<option value="${esc(cur)}" selected>${esc(cur)} ${t('removed')}</option>`:'');
function subOpts(cls,sel){return`<option value="">${t('none')}</option>`+optCur(subsOf(cls),sel)}
const skName=k=>(SKILLS.find(x=>x[0]===k)||[k,k])[1];
const bgOf=d=>CAT.backgrounds.find(x=>x.name===d.bg);
const bgSkills=d=>{const b=bgOf(d);return b&&Array.isArray(b.sk)?b.sk:[]};
const profLevel=(d,kind,k)=>{const st=(d.prof&&d.prof[kind]&&d.prof[kind][k])||0;return kind==='skill'&&bgSkills(d).includes(k)?Math.max(st,1):st};
function derived(d){
  const pb=prof(d.level),fx=fxAll(d),dx=mod(abT(d,'dex'))+fx.init,nx=nextXp(Number(d.level)),fb=k=>fx[k]?` class="fxv" title="${fxLine(fx,k)}"`:'';
  return`<div class="chip"><span>${t('pb')}</span><b>${sgn(pb)}</b></div><div class="chip"><span>${t('init')}</span><b${fb('init')}>${sgn(dx)}</b></div><div class="chip"><span>${t('fSpeed')}</span><b${fb('speed')}>${Math.round(num(d.speed))+fx.speed}</b></div><div class="chip"><span>${t('next')}</span><b>${nx===null?t('max'):nx}</b></div><div class="chip"><span>${t('passive')}</span><b${fb('pass')}>${10+mod(abT(d,'wis'))+pb*profLevel(d,'skill','perception')+fx.pass}</b></div>`;
}
const SAVE_NAMES={str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'};
const SKILLS=[['acrobatics','Acrobatics','dex'],['animal','Animal Handling','wis'],['arcana','Arcana','int'],['athletics','Athletics','str'],['deception','Deception','cha'],['history','History','int'],['insight','Insight','wis'],['intimidation','Intimidation','cha'],['investigation','Investigation','int'],['medicine','Medicine','wis'],['nature','Nature','int'],['perception','Perception','wis'],['performance','Performance','cha'],['persuasion','Persuasion','cha'],['religion','Religion','int'],['sleight','Sleight of Hand','dex'],['stealth','Stealth','dex'],['survival','Survival','wis']];
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const fill=(str,o)=>str.replace(/\{(\w+)\}/g,(_,k)=>o[k]);
const dieOf=cls=>{const c=CAT.classes.find(x=>x.name===cls),m=c&&String(c.hd).match(/(\d+)/);return m?Number(m[1]):0};
/* multiclass: d.cls/d.sub = primary class, d.level = TOTAL level, d.mc = [{id,cls,sub,level}] extra classes.
   The primary class's level is what is left of the total (never below 1). Same maths as backend/acacia/multiclass.py. */
function clsRows(d){
  let rest=Math.max(1,Math.min(20,Math.round(num(d.level))||1));const ex=[];
  (Array.isArray(d.mc)?d.mc:[]).forEach(r=>{if(!r||!r.cls)return;const use=Math.min(Math.max(1,Math.min(19,Math.round(num(r.level))||1)),rest-1);if(use>=1){ex.push({id:r.id||'',cls:r.cls,sub:r.sub||'',level:use,primary:false});rest-=use}});
  return[{id:'',cls:d.cls,sub:d.sub||'',level:rest,primary:true},...ex]}
const clsLabel=d=>{const R=clsRows(d);return R.length>1?R.map(r=>esc(r.cls)+' '+r.level).join(' / '):esc(d.cls)+' '+d.level};
/* HP: level 1 takes the full hit die, later levels take the fixed average, each plus CON and never less than 1.
   With several classes the very first level (primary class) takes the full die; every other level takes its class's average. */
function hpCalc(d){
  const lvl=Math.max(1,Math.min(20,Math.round(num(d.level))||1)),con=mod(abT(d,'con')),lines=[];
  const entries=clsRows(d);
  let total=0,first=true,missing=false;
  entries.forEach(e=>{
    const die=dieOf(e.cls),avg=Math.floor(die/2)+1;if(!die)missing=true;let from=1;
    if(first){const g=Math.max(1,die+con);total+=g;lines.push(fill(t('hpL1'),{d:die,con:sgn(con),v:g}));from=2;first=false}
    const n=e.level-from+1;
    if(n>0){const g=Math.max(1,avg+con);total+=g*n;lines.push((entries.length>1?esc(e.cls)+': ':'')+fill(t('hpLn'),{range:from===e.level?from:from+'–'+e.level,avg,con:sgn(con),n,v:g*n}))}
    const co=CAT.classes.find(x=>x.name===e.cls),so=co&&co.subs.find(x=>x.name===e.sub);
    [['hsClass',e.cls,num(co&&co.bhp)],['hsSub',e.sub,num(so&&so.bhp)]].forEach(([src,name,b])=>{
      if(!b)return;total+=b*e.level;lines.push(fill(t('hpBonus'),{src:t(src),name:esc(name),b:sgn(b),lvl:e.level,v:sgn(b*e.level)}))});
  });
  const race=CAT.races.find(x=>x.name===d.race),rb=num(race&&race.bhp);
  if(rb){total+=rb*lvl;lines.push(fill(t('hpBonus'),{src:t('hsRace'),name:esc(d.race),b:sgn(rb),lvl,v:sgn(rb*lvl)}))}
  const fh=fxAll(d);if(fh.hp){total+=fh.hp;lines.push(fill(t('hpFeat'),{src:fxLine(fh,'hp'),v:sgn(fh.hp)}))}
  total=Math.max(1,total);
  return{max:total,lines,lvl,die:dieOf(d.cls),dice:entries.map(e=>({cls:e.cls,die:dieOf(e.cls),n:e.level})),missing};
}
function effMax(d){return d.hpMode==='manual'&&num(d.hpManual)>=1?Math.round(num(d.hpManual)):hpCalc(d).max}
const curOf=(d,max)=>d.hpCur==null?max:Math.max(0,Math.min(num(d.hpCur),max));
const curHp=r=>curOf(r,r.hp);
function normHp(d){
  if(d.hpMode===undefined){const man=d.kind==='npc';d.hpMode=man?'manual':'auto';d.hpManual=man?d.hp:''}
  if(d.hpTemp===undefined)d.hpTemp=0;if(d.hpCur===undefined)d.hpCur=null;if(d.hdUsed===undefined)d.hdUsed=0;if(!d.death)d.death={s:0,f:0};
}
function hpBody(d){
  const c=hpCalc(d),max=effMax(d),cur=curOf(d,max),tmp=Math.max(0,Math.round(num(d.hpTemp))),adm=isAdmin(),manual=d.hpMode==='manual'&&num(d.hpManual)>=1;
  const total=Math.max(1,max+tmp),used=Math.min(c.lvl,Math.max(0,Math.round(num(d.hdUsed)))),left=c.lvl-used;
  const dots=(k,cls)=>[0,1,2].map(i=>`<button type="button" class="dot ${cls} ${d.death[k]>i?'on':''}" id="ds_${k}${i}" data-hpa="ds:${k}:${i}" aria-pressed="${d.death[k]>i}" aria-label="${t(k==='s'?'dsSucc':'dsFail')} ${i+1}"></button>`).join('');
  return`<div class="hpmax"><div><span class="lbl">${t('hpMax')}</span><div><b id="hp_max">${max}</b></div></div><span class="pill ${manual?'admin':''}">${manual?t('hpManualBadge'):t('hpAuto')}</span></div>
  <div><div class="hpbar" role="img" aria-label="${t('hpCur')} ${cur} / ${max}, ${t('hpTemp')} ${tmp}"><i class="cur ${cur<=max/4?'low':''}" id="hp_bc" style="width:${cur/total*100}%"></i><i class="tmp" id="hp_bt" style="width:${tmp/total*100}%"></i></div>
   <div class="hpnums"><span id="hp_txt">${cur} / ${max}</span><span class="tt" id="hp_ttxt">${tmp?'+'+tmp+' temp':''}</span></div></div>
  <div class="hpgrid"><div class="field"><label for="hp_cur">${t('hpCur')}</label><input id="hp_cur" data-hp="cur" type="number" min="0" value="${cur}"></div>
   <div class="field"><label for="hp_temp">${t('hpTemp')}</label><input id="hp_temp" data-hp="temp" type="number" min="0" value="${tmp}"></div>
   <div class="field"><label for="hp_amt">${t('hpAmt')}</label><input id="hp_amt" type="number" min="0" placeholder="0"></div>
   <div class="hpbtns"><button type="button" class="btn" id="hpb_dmg" data-hpa="dmg">${t('hpDamage')}</button><button type="button" class="btn" id="hpb_heal" data-hpa="heal">${t('hpHeal')}</button><button type="button" class="btn" id="hpb_grant" data-hpa="grant">${t('hpGrant')}</button></div></div>
  <p class="note" style="margin:0">${t('hpRule')}</p>
  <div class="hpsub"><div><span class="lbl">${t('hdTitle')}</span><div class="stepper"><button type="button" class="btn small" id="hd_m" data-hpa="hd-" aria-label="${t('hdUsed')} −">−</button><span class="mono">${c.dice.length>1?c.dice.map(x=>x.n+'d'+(x.die||'?')).join(' + '):'d'+(c.die||'?')} · ${t('hdUsed')} ${used} · ${t('hdLeft')} ${left} / ${c.lvl}</span><button type="button" class="btn small" id="hd_p" data-hpa="hd+" aria-label="${t('hdUsed')} +">+</button></div></div>
   <div><span class="lbl">${t('deathTitle')}</span><div class="stepper"><span class="note">${t('dsSucc')}</span><div class="dots">${dots('s','ok')}</div><span class="note">${t('dsFail')}</span><div class="dots">${dots('f','bad')}</div></div></div>
   <div class="restbtns">${c.dice.length>1?`<select id="hd_die" aria-label="${t('hdDie')}">${[...new Set(c.dice.map(x=>x.die).filter(Boolean))].map(x=>`<option value="${x}">d${x}</option>`).join('')}</select>`:''}<button type="button" class="btn small" id="hp_short" data-hpa="hdroll" title="${t('shortRestHint')}">${t('shortRest')}</button><button type="button" class="btn small" id="hp_long" data-hpa="long" title="${t('longRestHint')}">${t('longRest')}</button></div></div>
  ${hdMsg?`<p class="note" id="hd_msg" style="margin:0">${esc(hdMsg)}</p>`:''}
  ${adm?`<div class="hpgrid"><div class="field"><label for="hp_mode">${t('hpMode')}</label><select id="hp_mode" data-hp="mode"><option value="auto" ${d.hpMode==='manual'?'':'selected'}>${t('hpModeAuto')}</option><option value="manual" ${d.hpMode==='manual'?'selected':''}>${t('hpModeManual')}</option></select></div>
   ${d.hpMode==='manual'?`<div class="field"><label for="hp_manual">${t('hpManualVal')}</label><input id="hp_manual" data-hp="manual" type="number" min="1" value="${esc(d.hpManual)}"></div>`:''}</div>`:`<p class="note" style="margin:0">${manual?t('hpLockedManual'):t('hpLocked')}</p>`}
  <details class="how"><summary>${t('hpHow')}</summary><ul>${c.lines.map(l=>`<li>${l}</li>`).join('')}<li><b>${fill(t('hpTotal'),{v:c.max})}</b></li>${manual?`<li>${fill(t('hpOver'),{v:c.max})}</li>`:''}${c.missing?`<li class="err">${t('hpNoDie')}</li>`:''}</ul></details>`;
}
const hpPanel=d=>`<section class="panel"><div class="ph"><h2>${t('hpTitle')}</h2></div><div class="hpwrap" id="hpbody">${hpBody(d)}</div></section>`;
function refreshHp(focusId){const b=document.getElementById('hpbody');if(!b||!edit)return;const open=b.querySelector('details.how')?.open;b.innerHTML=hpBody(edit.draft);if(open)b.querySelector('details.how').open=true;if(focusId){const el=document.getElementById(focusId);if(el)el.focus()}}
function updateHpBar(){
  const d=edit.draft,max=effMax(d),cur=curOf(d,max),tmp=Math.max(0,Math.round(num(d.hpTemp))),tot=Math.max(1,max+tmp),g=id=>document.getElementById(id);
  if(g('hp_max'))g('hp_max').textContent=max;if(g('hp_bc')){g('hp_bc').style.width=cur/tot*100+'%';g('hp_bc').classList.toggle('low',cur<=max/4)}
  if(g('hp_bt'))g('hp_bt').style.width=tmp/tot*100+'%';if(g('hp_txt'))g('hp_txt').textContent=cur+' / '+max;if(g('hp_ttxt'))g('hp_ttxt').textContent=tmp?'+'+tmp+' temp':'';
}
/* long rest: full HP, no temp HP, regain half the hit dice (at least 1), death saves cleared */
function restShort(d){d.sl=d.sl||{u:[],p:0};d.sl.p=0}
function restLong(d){const lvl=hpCalc(d).lvl;d.sl={u:[],p:0};d.conc='';d.hpCur=null;d.hpTemp=0;d.hdUsed=Math.max(0,Math.round(num(d.hdUsed))-Math.max(1,Math.floor(lvl/2)));d.death={s:0,f:0}}
let hdMsg='';
function hpAction(a,id){
  const d=edit.draft,max=effMax(d),cur=curOf(d,max),lvl=hpCalc(d).lvl,amtEl=document.getElementById('hp_amt'),amt=Math.max(0,Math.round(num(amtEl&&amtEl.value)));
  if(a==='dmg'){let r=amt,tmp=Math.max(0,Math.round(num(d.hpTemp)));const ab=Math.min(tmp,r);tmp-=ab;r-=ab;d.hpTemp=tmp;d.hpCur=Math.max(0,cur-r);hdMsg=spConcNote(d,r);refreshSp()}
  else if(a==='heal'){d.hpCur=Math.min(max,cur+amt);if(d.hpCur>0&&amt>0)d.death={s:0,f:0}}
  else if(a==='grant'){d.hpTemp=Math.max(Math.round(num(d.hpTemp)),amt)}
  else if(a==='long'){restLong(d);hdMsg='';spMsg='';refreshSp()}
  else if(a==='hdroll'){const sel=document.getElementById('hd_die'),die=sel&&sel.value?Number(sel.value):dieOf(d.cls),used=Math.max(0,Math.round(num(d.hdUsed)));
    if(!die)hdMsg=t('hpNoDie');else if(used>=lvl)hdMsg=t('hdNone');
    else{const r=1+Math.floor(Math.random()*die),cn=mod(abT(d,'con')),v=Math.max(0,r+cn);d.hdUsed=used+1;d.hpCur=Math.min(max,cur+v);if(d.hpCur>0&&v>0)d.death={s:0,f:0};hdMsg=fill(t('hdRolled'),{d:die,r,con:sgn(cn),v})}}
  else if(a==='hd-'){d.hdUsed=Math.max(0,Math.round(num(d.hdUsed))-1)}
  else if(a==='hd+'){d.hdUsed=Math.min(lvl,Math.round(num(d.hdUsed))+1)}
  else if(a.startsWith('ds:')){const[,k,i]=a.split(':'),n=Number(i)+1;d.death[k]=d.death[k]===n?n-1:n}
  refreshHp(id);
}
function profRow(d,kind,k,name,ab){
  const st=profLevel(d,kind,k),bgG=kind==='skill'&&bgSkills(d).includes(k),m=mod(abT(d,ab))+prof(d.level)*st,lab=[t('pNone'),t('pOne'),t('pTwo')][st]+(bgG?' ('+t('fromBg')+')':'');
  return`<div class="prow s${st}"><button type="button" class="pt s${st}" id="pt_${kind}_${k}" data-pt="${kind}:${k}" aria-label="${esc(name)}: ${lab}" title="${lab}"></button><span class="pv" data-pv="${kind}:${k}:${ab}">${sgn(m)}</span><span class="pn">${esc(name)}</span>${kind==='skill'?`<span class="pa">${ab.toUpperCase()}${bgG?' · BG':''}</span>`:'<span></span>'}</div>`;
}
const profBody=d=>`<div class="pcol"><h3>${t('pSaves')}</h3>${ABS.map(k=>profRow(d,'save',k,SAVE_NAMES[k],k)).join('')}</div><div class="pcol"><h3>${t('pSkills')}</h3>${SKILLS.map(([k,n,a])=>profRow(d,'skill',k,n,a)).join('')}</div>`;
const profPanel=d=>`<section class="panel"><div class="ph"><h2>${t('secProf')}</h2><span class="note">${t('profHint')}</span></div><div class="profgrid" id="profbody">${profBody(d)}</div></section>`;
function refreshProf(focusId){const b=document.getElementById('profbody');if(!b||!edit)return;b.innerHTML=profBody(edit.draft);if(focusId){const el=document.getElementById(focusId);if(el)el.focus()}}
function bgPanel(d){
  const b=CAT.backgrounds.find(x=>x.name===d.bg);if(!b)return'';
  const groups=[['lang','languages','nLang','fLangPick'],['tool','tools','nTool','fToolPick'],['veh','vehicles','nVeh','fVehPick']];
  const html=groups.map(([k,cat,nk,lab])=>{const n=Number(b[nk])||0;
    return Array.from({length:n},(_,i)=>{const cur=(d.pick[k]||[])[i]||'';
      return`<div class="field"><label for="p_${k}${i}">${t(lab)}${n>1?' '+(i+1):''}</label><select id="p_${k}${i}" data-pk="${k}" data-pi="${i}"><option value="">—</option>${optCur(names(cat),cur)}</select></div>`}).join('')}).join('');
  return html?`<section class="panel"><div class="ph"><h2>${t('secBgPick')}</h2><span class="note">${esc(b.name)}</span></div><div class="grid">${html}</div></section>`:'';
}
const toks=x=>String(x||'').split(',').map(v=>v.trim()).filter(Boolean);
function classProfs(d){
  const c=CAT.classes.find(x=>x.name===d.cls),r=CAT.races.find(x=>x.name===d.race),armor=[],weap=[],tool=[];
  toks(c&&c.first).concat(toks(r&&r.prof)).forEach(x=>{/armor|shield/i.test(x)?armor.push(x):/tool|instrument/i.test(x)?tool.push(x):weap.push(x)});
  return{armor,weap,tool};
}
const parseEquip=txt=>String(txt||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(\d+)\s*[x×]\s*(.+)$/i);return m?{name:m[2].trim(),qty:Math.max(1,+m[1])}:{name:l,qty:1}});
function syncBgItems(d){const b=bgOf(d);d.items=(d.items||[]).filter(i=>i.src!=='bg');if(b)parseEquip(b.equip).forEach(e=>d.items.push({id:uid(),name:e.name,qty:e.qty,src:'bg'}))}

/* ---------- conditions: read-only reference for everyone; the admin edits the list (with icon and colour) in Game data ---------- */
let condOpen=new Set(),condPop=null;
const animOn=()=>{const a=typeof PREFS!=='undefined'&&PREFS&&PREFS.anim;return a?a==='on':!REDUCED};
const ccs=c=>c&&c.color?` style="--cc:${esc(c.color)}"`:'';
const reEsc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function condIcon(c,px){
  if(!c.icon)return'';
  return`<img class="cicon" src="${esc(c.icon)}" width="${px}" height="${px}" alt="" loading="lazy" decoding="async" ${isGif(c.icon)?'data-gif="1"':''}>`}
/* text with **bold italic** lead-ins, and every condition name turned into a coloured, tappable highlight (not the condition's own name) */
function condText(src,selfId){
  const L=(CAT.conditions||[]).filter(c=>c.id!==selfId),names=[];
  L.forEach(c=>{const n=String(c.name||'').trim();if(n.length>=3)names.push([n,c.id])});
  names.sort((a,b)=>b[0].length-a[0].length);
  const map=new Map(names.map(([n,id])=>[esc(n).toLowerCase(),id]));
  const rx=names.length?new RegExp('(?<![A-Za-z])('+names.map(([n])=>reEsc(esc(n))).join('|')+')(?![A-Za-z])','gi'):null;
  return esc(src).replace(/\*\*(.+?)\*\*/g,'<b><i>$1</i></b>').replace(/\n/g,'<br>').split(/(<[^>]+>)/).map(part=>{
    if(!rx||part[0]==='<')return part;
    return part.replace(rx,m=>{const id=map.get(m.toLowerCase()),c=L.find(x=>x.id===id);
      return`<button class="cref" data-act="cpop" data-id="${id}" ${ccs(c)}>${m}</button>`})}).join('')}
function condPopHtml(){
  const c=condPop&&(CAT.conditions||[]).find(x=>x.id===condPop);if(!c)return'';
  return`<div class="cpop" role="dialog" aria-label="${esc(c.name)}"${ccs(c)}><div class="cpop-h">${condIcon(c,40)}<h3>${esc(c.name)}</h3><button class="btn small" data-act="cpop-x" aria-label="${t('close')}">✕</button></div><div class="cpop-b">${condText(c.desc||c.sum,c.id)}${condRulesHtml(c)}</div></div>`}
function condStills(){if(animOn())return;document.querySelectorAll('img.cicon[data-gif]').forEach(im=>{const u=im.getAttribute('src');stillOf(u).then(d=>{if(im.getAttribute('src')===u)im.src=d})})}
function renderConditions(){
  const L=CAT.conditions||[],adm=isAdmin();
  const acts=`<div class="acts">${L.length?`<button class="btn small" data-act="cond-all" data-v="1">${t('condOpenAll')}</button><button class="btn small" data-act="cond-all" data-v="0">${t('condCloseAll')}</button>`:''}${adm?`<button class="btn" data-act="cond-edit">${t('condEdit')}</button>`:''}</div>`;
  const body=L.length?`<div class="condlist">${L.map(c=>{const o=condOpen.has(c.id);
   return`<div class="cond${o?' open':''}"${ccs(c)}><button class="condhead" data-act="cond" data-id="${c.id}" aria-expanded="${o}">${condIcon(c,40)}<b>${esc(c.name)}</b><span class="condsum">${esc(c.sum)}</span><span class="condcar" aria-hidden="true">${o?'−':'+'}</span></button>${o?`<div class="condbody">${condText(c.desc||c.sum,c.id)}${condRulesHtml(c)}</div>`:''}</div>`}).join('')}</div>`
   :`<div class="empty"><div>${t('condNone')}</div></div>`;
  setTimeout(condStills,0);
  return head(t('conditions'),t('condSub'),acts)+`<section class="panel">${body}</section>`;
}
