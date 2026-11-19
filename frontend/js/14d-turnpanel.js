/* ---------- Turn actions: the panel that appears on a combatant's turn (players and GM characters alike) ----------
   Four things can be spent each turn: Action, Bonus Action, Reaction, Interaction. Each one lists what the character can really do
   (weapons, spells, class features, resources) plus a free-text box. End Turn tells the GM. Everything done is written to a short
   shared log with the dice used and the target. The state lives on the server (backend/acacia/turns.py, POST api/turn):
   TURNS[roomId] for the GM, prooms[i].turn for players. It is cleared by itself when the marker moves to the next combatant. */
let TURNS={};
const TA={open:'',tgt:{},txt:{},xr:'',xw:'',mode:'normal',err:'',busy:false,sp:{},ft:{}};
const TA_SL=['act','bon','rea','int'];
/* every combatant has `cap` of each slot (1 unless the GM changed it); l = what was used this turn; s[slot] is filled only when all of it is used up */
const taBlank=old=>({s:{act:'',bon:'',rea:'',int:''},end:0,cap:Object.assign({act:1,bon:1,rea:1,int:1},old&&old.cap),l:{act:[],bon:[],rea:[],int:[]}});
const taCap=(e,k)=>e&&e.cap&&e.cap[k]!=null?e.cap[k]:1;
const taN=(e,k)=>e&&e.l&&e.l[k]?e.l[k].length:(e&&e.s&&e.s[k]?1:0);
function taSync(e){e.l=e.l||{act:[],bon:[],rea:[],int:[]};e.cap=e.cap||{act:1,bon:1,rea:1,int:1};e.s=e.s||{};TA_SL.forEach(k=>{e.l[k]=e.l[k]||[];e.s[k]=e.l[k].length>=taCap(e,k)?(e.l[k][e.l[k].length-1]||'—'):''});return e}
const taRm=rid=>isAdmin()?rooms.find(r=>r.id===rid):prooms.find(r=>r.id===rid);
const taCur=rid=>{const rm=taRm(rid);return rm?(isAdmin()?((rm.init&&rm.init.cur)||''):(rm.cur||'')):''};
const taTn=rid=>{const rm=taRm(rid);return rm&&isAdmin()?Math.round(num(rm.init&&rm.init.tn)):0};
const taRound=rid=>{const rm=taRm(rid);return rm?(isAdmin()?Math.max(1,Math.round(num(rm.init&&rm.init.round))||1):(rm.round||1)):1};
function taEnts(rid){
  const rm=taRm(rid);if(!rm)return[];
  if(isAdmin())return((rm.init&&rm.init.list)||[]).filter(e=>e.init!=null).map(e=>({id:e.id,name:iniName(e),ref:e.ref||'',mine:true}));
  return(rm.list||[]).map(e=>({id:e.id,name:e.name,ref:e.pc?'pc:'+e.pc:'',mine:!!e.mine}))}
/* the state, lined up with the marker (the GM moves the marker in the page itself, so the server copy can be one step behind) */
function taSt(rid){
  const rm=taRm(rid);let st=isAdmin()?TURNS[rid]:(rm&&rm.turn);
  if(!st){st={cur:'',r:1,e:{},log:[]};if(isAdmin())TURNS[rid]=st}
  if(isAdmin()){const cur=taCur(rid),r=taRound(rid),tn=taTn(rid);if(st.cur!==cur||st.r!==r||(st.tn||0)!==tn){st.cur=cur;st.r=r;st.tn=tn;if(cur)st.e[cur]=taBlank(st.e[cur])}}
  return st}
const taSl=(st,eid)=>(st.e[eid]||taBlank());
function taDoc(rid,eid){
  const en=taEnts(rid).find(x=>x.id===eid);if(!en||!en.ref)return null;
  const[k,i]=en.ref.split(':');return(k==='pc'?pcs:isAdmin()?npcs:[]).find(c=>c.id===i)||null}
const taKind=ref=>String(ref||'').startsWith('npc:')?'npc':'pc';
const taSlotName=k=>({act:'Action',bon:'Bonus Action',rea:'Reaction',int:'Interaction'})[k]||k;
const taTname=(rid,eid)=>{const e=taEnts(rid).find(x=>x.id===eid);return e?e.name:''};
const taTarget=(rid,eid)=>{const n=taTname(rid,TA.tgt[eid]);return n?` → ${n}`:''};
/* ---- send one change: shown at once, then saved ---- */
async function taPost(rid,eid,body){
  const st=taSt(rid),e=st.e[eid]=st.e[eid]||taBlank(),en=taEnts(rid).find(x=>x.id===eid)||{name:'—'};
  taSync(e);
  if(body.op==='use'){if(body.slot!=='note'&&body.mark!==0){e.l[body.slot].push(body.text||'✓');taSync(e)}taLogLocal(st,eid,en.name,body.slot,body.text)}
  else if(body.op==='undo'){e.l[body.slot].pop();taSync(e)}
  else if(body.op==='cap'){e.cap[body.slot]=Math.max(0,Math.min(9,Math.round(Number(body.n))));taSync(e)}
  else if(body.op==='end'){e.end=1;taLogLocal(st,eid,en.name,'end',body.text||'')}
  TA.err='';render();
  try{await api('POST','api/turn',Object.assign({room:rid,eid},body))}
  catch(err){TA.err=err&&err.code==='not_your_turn'?t('taNotTurn'):err&&err.code==='slot_used'?t('taSlotUsed'):t('taFail')}
  render()}
function taLogLocal(st,eid,who,k,x){st.log=[{t:Math.floor(Date.now()/1000),r:st.r,eid,who,k,x:x||''},...(st.log||[])].slice(0,60)}
const taUse=(rid,eid,slot,text,mark)=>taPost(rid,eid,{op:'use',slot,text:String(text||'').slice(0,160),mark:mark===0?0:1});
/* ---- dice (the server rolls; the result goes to the table dice feed too) ---- */
async function taRoll(rid,eid,body){
  const en=taEnts(rid).find(x=>x.id===eid);if(!en)return null;
  try{const x=await api('POST','api/roll',Object.assign({room:rid,as:en.ref,mod:0,mode:'normal'},body));if(x&&x.entry){tdPut(rid,x.entry);return x.entry}}
  catch(err){TA.err=err&&err.code==='not_seated'?t('tdNotSeated'):t('tdFail')}
  return null}
const taNat=e=>{const s=e&&e.sets&&e.sets[e.keep||0];return e&&e.sides===20&&e.n===1&&s?s[0]:0};
async function taExtra(rid,eid){
  if(TA.busy)return;const m=/^\s*(\d{1,2})?\s*d\s*(\d{1,3})\s*([+-]\s*\d{1,3})?\s*$/i.exec(TA.xr);if(!m){TA.err=t('taBadDice');render();return}
  TA.busy=true;render();
  const e=await taRoll(rid,eid,{n:+(m[1]||1),sides:+m[2],mod:m[3]?+m[3].replace(/\s/g,''):0,mode:TA.mode,why:TA.xw.slice(0,40)});
  TA.busy=false;if(e)await taUse(rid,eid,'note',`${t('taRollWord')} ${e.label} = ${e.total}${TA.xw?' ('+TA.xw+')':''}${taTarget(rid,eid)}`);else render()}
/* ---- spells and class resources ---- */
function taSpellOpts(d,sp){
  const I=typeof spellInfo==='function'?spellInfo(d):null,L=sp.lvl||0;if(!I||!L)return{I,opts:''};d.sl=d.sl||{u:[],p:0};d.sl.u=d.sl.u||[];const o=[];
  I.slots.forEach((n,i)=>{if(i+1>=L&&n>0)o.push(`<option value="${i+1}" ${i+1===L?'selected':''}>${t('spLv')} ${i+1} (${Math.max(0,n-(d.sl.u[i]||0))}/${n})</option>`)});
  if(I.pact&&I.pact[1]>=L)o.push(`<option value="p">${t('spPact')} (${Math.max(0,I.pact[0]-(d.sl.p||0))}/${I.pact[0]})</option>`);
  return{I,opts:o.join('')}}
async function taCast(rid,eid,slot,name){
  if(TA.busy)return;const d=taDoc(rid,eid),sp=spellOf(name);if(!d)return;let lvTxt='',note='',castLv=sp?sp.lvl||0:0;
  const L=sp?sp.lvl||0:0,I=typeof spellInfo==='function'?spellInfo(d):null;
  if(L>0&&I){d.sl=d.sl||{u:[],p:0};d.sl.u=d.sl.u||[];const sel=document.getElementById('ta_sl_'+CSS.escape(name.replace(/\W/g,'_')));const v=sel?sel.value:'';
    if(v==='p'){if((d.sl.p||0)>=I.pact[0]){TA.err=t('spNoSlot');render();return}d.sl.p=(d.sl.p||0)+1;lvTxt=` (${t('spPact')})`;castLv=I.pact[1]}
    else if(v){const k=Number(v)-1;if((d.sl.u[k]||0)>=(I.slots[k]||0)){TA.err=t('spNoSlot');render();return}d.sl.u[k]=(d.sl.u[k]||0)+1;lvTxt=` (${t('spLv')} ${v})`;castLv=Number(v)}
    else{TA.err=t('spNoSlot');render();return}}
  if(sp&&sp.conc){note=d.conc&&d.conc!==name?` · ${fill(t('spSwap'),{o:d.conc})}`:'';d.conc=name;note+=' · '+t('spConc')}
  commit(taKind(taEnts(rid).find(x=>x.id===eid).ref));
  await taSpellFlow(rid,eid,slot,name,lvTxt+note,castLv)}
function taResUse(rid,eid,slot,rid2){
  const d=taDoc(rid,eid),r=d&&(d.res||[]).find(x=>x.id===rid2);if(!r)return;const mx=resMax(d,r),u=Math.min(mx,Math.max(0,Math.round(num(r.used))));
  if(u>=mx){TA.err=t('taResOut');render();return}r.used=u+1;commit(taKind(taEnts(rid).find(x=>x.id===eid).ref));
  taUse(rid,eid,slot,`${t('taUse')} ${r.name} (${mx-u-1}/${mx})${taTarget(rid,eid)}`)}
/* what a class / background feature costs: set by the GM in Game data (tk), otherwise guessed from its text */
function taFeatKind(f){const k=f.tk;if(k==='action'||k==='bonus'||k==='reaction')return k;if(k==='none')return'';
  const x=String(f.desc||'');if(/bonus action/i.test(x))return'bonus';if(/\breaction\b/i.test(x))return'reaction';return''}
const TA_STD={
  act:[['Dash','Dash (วิ่ง)'],['Disengage','Disengage (ถอย)'],['Dodge','Dodge (หลบ)'],['Help','Help (ช่วย)'],['Hide','Hide (ซ่อน)'],['Ready','Ready (เตรียมพร้อม)'],['Search','Search (ค้นหา)'],['Use an Object','Use an Object (ใช้ของ)'],['Influence','Influence (โน้มน้าว)'],['Study','Study (ศึกษา)']],
  bon:[['Off-hand attack','โจมตีมือรอง (Two-Weapon)']],
  rea:[['Opportunity attack','Opportunity Attack'],['Readied action','Readied action (ที่เตรียมไว้)']],
  int:[['Open / close a door','เปิด / ปิดประตู'],['Draw or stow a weapon','ชักหรือเก็บอาวุธ'],['Pick up an item','เก็บของ'],['Pull a lever','ดึงคันโยก'],['Don / doff a shield','ถือ / ถอดโล่'],['Speak a few words','พูดสั้นๆ'],['Drink a potion (given)','ดื่มยา']]};
const taStdL=p=>lang==='th'?p[1]:p[0];
/* ---- markup ---- */
const taTime=x=>{const d=new Date((x||0)*1000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function taDots(rid,eid){
  const st=taSt(rid),e=st.e[eid];if(!e)return'';
  const dot=(k,l)=>{const used=!!e.s[k],cap=taCap(e,k),n=taN(e,k),cls='ta-dot'+(used?' on':n?' part':''),tt=`${taSlotName(k)}${cap!==1?` ${n}/${cap}`:''}: ${used?e.s[k]:t('taFree')}`;
    return isAdmin()?`<button type="button" class="${cls}" data-act="ta-dot" data-id="${eid}" data-v="${k}" data-rid="${rid}" title="${esc(tt)}" aria-label="${esc(tt)}">${l}</button>`:`<i class="${cls}" title="${esc(tt)}" aria-label="${esc(tt)}">${l}</i>`};
  return`<span class="ta-dots">${dot('act','A')}${dot('bon','B')}${dot('rea','R')}${dot('int','I')}${e.end?`<i class="ta-dot end" title="${t('taEnd')}">⏹</i>`:''}</span>`}
function taLogHtml(rid){
  const st=taSt(rid),L=(st.log||[]).slice(0,30),ic={act:'A',bon:'B',rea:'R',int:'I',end:'⏹',note:'🎲'};
  const li=x=>`<li class="k-${esc(x.k)}"><span class="ta-ic">${ic[x.k]||'•'}</span><span class="ta-tm">${taTime(x.t)} · R${x.r}</span><div><b>${esc(x.who)}</b>${x.k==='end'?' '+t('taEndedShort'):x.x?': '+esc(x.x):''}</div></li>`;
  return`<details class="ta-log" open><summary>${t('taLog')}</summary>${L.length?`<ul>${L.slice(0,6).map(li).join('')}</ul>${L.length>6?`<details class="ta-old"><summary>${t('taOlder')} (${L.length-6})</summary><ul>${L.slice(6).map(li).join('')}</ul></details>`:''}`:`<p class="note">${t('taLogEmpty')}</p>`}</details>`}
function taTargetSel(rid,eid){
  const L=taEnts(rid).filter(x=>x.id!==eid);
  return`<div class="field"><label for="ta_tgt">${t('taTgt')}</label><select id="ta_tgt" data-ta="tgt" data-eid="${eid}"><option value="">${t('taNoTgt')}</option>${L.map(x=>`<option value="${x.id}" ${TA.tgt[eid]===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>`}
function taSection(rid,eid,slot,d){
  let other='';const st=taSt(rid),cur=taSl(st,eid),eidA=`data-rid="${rid}" data-id="${eid}"`,dis=TA.busy?'disabled':'',
    btn=(act,lbl,extra,cls)=>`<button type="button" class="btn small ${cls||''}" data-act="${act}" ${eidA} ${extra||''} ${dis}>${lbl}</button>`,rows=[];
  if(slot!=='int'&&d){
    const gl=(k,n)=>{if(n)rows.push(`<li class="ta-gl">${t(k)}</li>`)};
    const WL=(d.weapons||[]).map(r=>({r,s:weaponStats(d,r)})).filter(x=>x.s);gl('taAttack',WL.length);
    WL.forEach(({r,s})=>rows.push(`<li><span class="ta-ic">⚔</span><div class="ta-nm"><b>${esc(r.ref)}</b><small>${t('wAtk')} ${sgn(s.atk)} · ${esc(s.dmg||'—')}</small></div><div class="ta-bt">${btn('ta-w',t('wRollAtk'),`data-v="${esc(r.id)}" data-k="atk"`,'primary')}${s.ds?btn('ta-w',t('wRollDmg'),`data-v="${esc(r.id)}" data-k="dmg"`)+btn('ta-w','×2',`data-v="${esc(r.id)}" data-k="crit" title="${esc(t('wRollCrit'))}"`):''}</div></li>`));
    const allSp=(d.spells||[]).map(x=>({s:x,sp:spellOf(x.n)})),fits=x=>{const k=x.sp?x.sp.timeK:'action';return slot==='act'?(k!=='bonus'&&k!=='reaction'):k===(slot==='bon'?'bonus':'reaction')};
    const spRow=({s,sp})=>{const o=sp?taSpellOpts(d,sp):{opts:''},key=s.n.replace(/\W/g,'_');
      return`<li><span class="ta-ic">✦</span><div class="ta-nm"><b>${esc(s.n)}</b><small>${sp?(sp.lvl?t('spLv')+' '+sp.lvl:t('spCantrip'))+(sp.conc?' · '+t('spConc'):'')+(sp.time?' · '+esc(sp.time):''):t('spNotInCat')}</small></div><div class="ta-bt">${o.opts?`<select id="ta_sl_${key}" aria-label="${t('spCastAt')}">${o.opts}</select>`:''}${btn('ta-cast',t('spCast'),`data-v="${esc(s.n)}" data-k="${slot}"`,'primary')}${o.I&&o.I.atk!=null?btn('ta-satk','🎯',`data-v="${esc(s.n)}" title="${esc(t('spAtk'))}"`):''}</div></li>`};
    const SP=allSp.filter(fits);gl('taCast',allSp.length);
    SP.forEach(x=>rows.push(spRow(x)));
    if(allSp.length&&!SP.length)rows.push(`<li class="ta-gl ta-none">${t('taNoSpellHere')}</li>`);
    if(slot!=='act'&&allSp.length>SP.length)other=`<details class="ta-std"><summary>${t('taOtherSp')}</summary><ul class="ta-list">${allSp.filter(x=>!fits(x)).map(spRow).join('')}</ul></details>`;
    if(typeof featList==='function')featList(d).filter(f=>slot==='act'?f.tk==='action':taFeatKind(f)===(slot==='bon'?'bonus':'reaction')).forEach(f=>rows.push(`<li><span class="ta-ic">★</span><div class="ta-nm"><b>${esc(f.name)}</b>${(f.rules||[]).length?`<small>⚙ ${esc(f.from||'')}</small>`:''}</div><div class="ta-bt">${(f.rules||[]).length?btn('ta-feat',t('taUse'),`data-v="${esc(f.id||f.name)}" data-k="${slot}"`,'primary'):btn('ta-free',t('taUse'),`data-v="${esc(f.name)}" data-k="${slot}"`,'primary')}</div></li>`));
    (d.res||[]).forEach(r=>{const mx=resMax(d,r),u=Math.min(mx,Math.max(0,Math.round(num(r.used))));
      rows.push(`<li><span class="ta-ic">◆</span><div class="ta-nm"><b>${esc(r.name)}</b><small>${mx-u}/${mx}</small></div><div class="ta-bt"><button type="button" class="btn small primary" data-act="ta-res" ${eidA} data-v="${esc(r.id)}" data-k="${slot}" ${u>=mx||TA.busy?'disabled':''}>${t('taUse')}</button></div></li>`)})}
  let h='';
  if(taN(cur,slot)>0)h+=`<div class="ta-usedline"><span>${TA.card[eid]?'✔':'✔ '+esc((cur.l&&cur.l[slot]&&cur.l[slot][cur.l[slot].length-1])||cur.s[slot]||'✓')}${taCap(cur,slot)!==1?` · ${taN(cur,slot)}/${taCap(cur,slot)}`:''}</span>${btn('ta-undo',t('taUndo'),`data-k="${slot}"`)}</div>`;
  h+=taTargetSel(rid,eid);
  if(rows.length)h+=`<ul class="ta-list">${rows.join('')}</ul>`;
  h+=other;
  h+=`<details class="ta-std"><summary>${t('taStd')}</summary><div class="ta-chips">${TA_STD[slot].map(p=>btn('ta-free',esc(taStdL(p)),`data-v="${esc(p[0])}" data-k="${slot}"`)).join('')}</div></details>`;
  h+=`<div class="ta-custom"><input id="ta_txt" data-ta="txt" data-eid="${eid}" maxlength="120" aria-label="${esc(t('taCustom'))}" placeholder="${esc(t('taCustom')+' — '+t('taCustomPh'))}" value="${esc(TA.txt[eid]||'')}">${btn('ta-free',t('taUse'),`data-v="" data-k="${slot}"`,'primary')}</div>`;
  return h}
function taPanel(rid,eid){
  const st=taSt(rid),cur=taSl(st,eid),en=taEnts(rid).find(x=>x.id===eid);if(!en)return'';const d=taDoc(rid,eid),gm=isAdmin();
  const meters=TA_SL.map(k=>{const u=cur.s[k],cap=taCap(cur,k),n=taN(cur,k),sm=cap===0?'✗ 0':u?'✔ '+esc(u):n?`${n}/${cap} · ${t('taFree')} ${cap-n}`:cap>1?`${t('taFree')} ×${cap}`:t('taFree');
    return`<button type="button" class="ta-m ${u?'used':n?'part':''}" data-act="ta-open" data-v="${k}" aria-expanded="${TA.open===k}"><b>${taSlotName(k)}${cap!==1?` <i class="ta-cap">${cap-Math.min(n,cap)}/${cap}</i>`:''}</b><small>${sm}</small></button>`}).join('');
  const capEd=gm&&!String(en.ref||'').startsWith('pc:')?`<details class="ta-std ta-capd"><summary>⚙ ${t('taCaps')}</summary><div class="ta-caps">${TA_SL.map(k=>`<div class="ta-capr"><span>${taSlotName(k)}</span><button type="button" class="btn small" data-act="ta-cap" data-rid="${rid}" data-id="${eid}" data-v="${k}" data-n="${taCap(cur,k)-1}" ${taCap(cur,k)<=0?'disabled':''} aria-label="−">−</button><b>${taCap(cur,k)}</b><button type="button" class="btn small" data-act="ta-cap" data-rid="${rid}" data-id="${eid}" data-v="${k}" data-n="${taCap(cur,k)+1}" ${taCap(cur,k)>=9?'disabled':''} aria-label="+">+</button></div>`).join('')}</div></details>`:'';
  const modeSel=`<div class="field sm"><label for="ta_mode">${t('mode')}</label><select id="ta_mode" data-ta="mode"><option value="normal" ${TA.mode==='normal'?'selected':''}>${t('normal')}</option><option value="adv" ${TA.mode==='adv'?'selected':''}>${t('adv')}</option><option value="dis" ${TA.mode==='dis'?'selected':''}>${t('dis')}</option></select></div>`;
  const ended=cur.end?(gm?`<div class="ta-ended" role="status">⏹ ${fill(t('taEnded'),{n:esc(en.name)})}<button class="btn small" data-act="ini-next">${t('taNext')}</button></div>`:`<div class="ta-ended" role="status">⏹ ${t('taWait')}</div>`):'';
  return`<div class="ta" data-ta-room="${rid}"><div class="ta-head"><h3>▶ ${fill(t('taTitle'),{n:esc(en.name)})}</h3></div>${ended}
   <div class="ta-meters" role="group">${meters}</div>${capEd}
   ${taCardHtml(eid)}
   ${TA.err?`<p class="err" role="alert">${esc(TA.err)}</p>`:''}
   ${TA.open?`<div class="ta-body">${taSection(rid,eid,TA.open,d)}</div>`:`<p class="note ta-pick">${t('taHint')}</p>`}
   <details class="ta-more"><summary>🎲 ${t('taMore')}</summary><div class="ta-xr">${modeSel}<div class="field"><label for="ta_xr">${t('taXRoll')}</label><input id="ta_xr" data-ta="xr" maxlength="14" placeholder="${esc(t('taXPh'))}" value="${esc(TA.xr)}"></div><div class="field"><label for="ta_xw">${t('taXWhy')}</label><input id="ta_xw" data-ta="xw" maxlength="40" value="${esc(TA.xw)}"></div><button type="button" class="btn small" data-act="ta-xroll" data-rid="${rid}" data-id="${eid}" ${TA.busy?'disabled':''}>${t('roll')}</button></div></details>
   <button type="button" class="btn danger ta-endbtn" data-act="ta-end" data-rid="${rid}" data-id="${eid}" ${cur.end&&!gm?'disabled':''}>⏹ ${t('taEnd')}</button></div>`}
/* off its own turn only the Reaction can be spent: a slim strip */
function taReaStrip(rid,eid){
  const cur=taSl(taSt(rid),eid),en=taEnts(rid).find(x=>x.id===eid),d=taDoc(rid,eid);if(!en)return'';
  const op=TA.open==='rea:'+eid;
  return`<div class="ta ta-rea"><button type="button" class="ta-reab" data-act="ta-reaopen" data-id="${eid}" aria-expanded="${op}"><b>${fill(t('taReaOf'),{n:esc(en.name)})}</b> <span class="${cur.s.rea?'ta-dot on':'ta-dot'}">R</span> <span>${cur.s.rea?esc(cur.s.rea):t('taFree')}</span></button>
   ${taCardHtml(eid)}${op?`${TA.err?`<p class="err" role="alert">${esc(TA.err)}</p>`:''}<div class="ta-body">${taSection(rid,eid,'rea',d)}</div>`:''}</div>`}
function taGmPanel(rid){const cur=taCur(rid);return(cur?taPanel(rid,cur):'')+taLogHtml(rid)}
function taPlayerPanel(rid){
  const cur=taCur(rid),mine=taEnts(rid).filter(x=>x.mine);let h='';
  mine.forEach(x=>{h+=x.id===cur?taPanel(rid,x.id):taReaStrip(rid,x.id)});
  return h+taLogHtml(rid)}
/* ---- events ---- */
function taClick(a,b){
  const rid=b.dataset.rid||(typeof roomOpen!=='undefined'?roomOpen:''),eid=b.dataset.id,v=b.dataset.v,k=b.dataset.k;
  if(a==='ta-apply'){taApply(rid,eid,Number(v));return}
  if(a==='ta-cardx'){delete TA.card[eid];render();return}
  if(a==='ta-more'){taSpellMore(rid,eid);return}
  if(a==='ta-open'){TA.open=TA.open===v?'':v;render();return}
  if(a==='ta-reaopen'){TA.open=TA.open==='rea:'+eid?'':'rea:'+eid;render();return}
  if(a==='ta-dot'){const e=taSl(taSt(rid),eid);taPost(rid,eid,taN(e,v)>=taCap(e,v)?{op:'undo',slot:v}:{op:'use',slot:v,text:'✓',mark:1});return}
  if(a==='ta-cap'){taPost(rid,eid,{op:'cap',slot:v,n:Number(b.dataset.n)});return}
  if(a==='ta-undo'){taPost(rid,eid,{op:'undo',slot:k});return}
  const slot=TA.open.startsWith('rea:')?'rea':(TA.open||k);
  if(a==='ta-w'){taWeapon(rid,eid,v,k);return}
  if(a==='ta-cast'){taCast(rid,eid,k,v);return}
  if(a==='ta-feat'){if(TA.busy)return;const d=taDoc(rid,eid),f=d&&featList(d).find(x=>(x.id||x.name)===v);if(f)taSpellFlow(rid,eid,k||slot,f.name||'—','',0,'',Object.assign({},f,{lvl:0,conc:0,desc:f.desc||''}));return}
  if(a==='ta-satk'){taSpellAtk(rid,eid,v);return}
  if(a==='ta-res'){taResUse(rid,eid,k,v);return}
  if(a==='ta-xroll'){taExtra(rid,eid);return}
  if(a==='ta-free'){const txt=v||(TA.txt[eid]||'').trim();if(!txt&&!v)return;const row=v?(TA_STD[k]||[]).find(p=>p[0]===v):null;TA.txt[eid]='';taUse(rid,eid,k||slot,(row?taStdL(row):v||txt)+taTarget(rid,eid));return}
  if(a==='ta-end'){
    taPost(rid,eid,{op:'end',text:''});
    if(isAdmin()){const rm=rooms.find(r=>r.id===rid);if(rm){const I=iniData(rm);if(I.cur===eid){cbNext(I);iniSort(I);saveRooms();render()}}}}}
function taSet(el){
  const k=el.dataset.ta;
  if(k==='tgt')TA.tgt[el.dataset.eid]=el.value;else if(k==='txt')TA.txt[el.dataset.eid]=el.value;
  else if(k==='xr')TA.xr=el.value;else if(k==='xw')TA.xw=el.value;else if(k==='mode')TA.mode=el.value}
Object.assign(TX.th,{taTitle:'ถึงตา {n}',taHint:'แตะ Action / Bonus / Reaction / Interaction เพื่อเลือกสิ่งที่จะทำ',taMore:'ทอยเต๋าเพิ่ม / โหมดทอย',taNoSpellHere:'ไม่มีเวทแบบนี้ในรายการ',taOtherSp:'เวทอื่นๆ ทั้งหมด (ร่ายในช่องนี้)',taOlder:'ดูย้อนหลัง',taFree:'ว่าง',taUndo:'คืนค่า (ยังไม่ได้ใช้)',taEnd:'จบ Turn',taEnded:'{n} จบ Turn แล้ว',taWait:'จบ Turn แล้ว — รอ GM เลื่อนไปตาถัดไป',taNext:'ตาถัดไป →',taEndedShort:'จบ Turn',
 taTgt:'เป้าหมาย',taNoTgt:'— ไม่ระบุ —',taAttack:'โจมตีด้วยอาวุธ',taNoWeap:'ยังไม่มีอาวุธในชีต (เพิ่มได้ที่ชีตตัวละคร) หรือพิมพ์เองด้านล่าง',taCast:'ร่ายเวท',taNoSpell:'ไม่มีเวทที่ใช้ได้ในช่องนี้',taFeat:'ความสามารถ',taRes:'ทรัพยากรคลาส',taUse:'ใช้',taStd:'การกระทำทั่วไป (Dash, Dodge …)',taCustom:'พิมพ์เอง',taCustomPh:'เช่น กระโดดข้ามหน้าผา',
 taXRoll:'ทอยเพิ่ม (เช่น 8d6+2)',taXPh:'d20+3',taXWhy:'เพื่ออะไร (ไม่บังคับ)',taBadDice:'พิมพ์ลูกเต๋าไม่ถูก เช่น d20+3 หรือ 8d6',taRollWord:'ทอย',taLog:'บันทึกการกระทำ',taLogEmpty:'ยังไม่มีบันทึก',taReaOf:'Reaction ของ {n}',
 taAtk:'โจมตี',taDmg:'ดาเมจ',taCrit:'คริติคอล!',taMiss:'พลาดสนิท',taNotTurn:'ยังไม่ใช่ตาของตัวละครนี้',taFail:'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง',taResOut:'ทรัพยากรนี้หมดแล้ว',
 taTkL:'ประเภทเวลาใช้',taTkAuto:'เดาจากข้อความ',taTkAct:'Action',taTkBon:'Bonus Action',taTkRea:'Reaction',taTkNone:'ไม่ใช้ (พาสซีฟ)',taEndAlert:'{n} จบ Turn แล้ว',taTkHint:'กำหนดว่าฟีเจอร์นี้อยู่ในปุ่มไหนของแผง Turn (ถ้าเลือก "เดาจากข้อความ" ระบบจะหาคำว่า bonus action / reaction ในคำอธิบาย)'});
Object.assign(TX.en,{taTitle:"{n}'s turn",taHint:'Tap Action / Bonus / Reaction / Interaction to choose what to do.',taMore:'Extra roll / roll mode',taNoSpellHere:'No spell of this type in your list',taOtherSp:'All other spells (cast in this slot)',taOlder:'Older',taFree:'free',taUndo:'Undo (not used)',taEnd:'End Turn',taEnded:'{n} ended the turn',taWait:'Turn ended — waiting for the GM to move on',taNext:'Next turn →',taEndedShort:'ended the turn',
 taTgt:'Target',taNoTgt:'— none —',taAttack:'Weapon attack',taNoWeap:'No weapons on the sheet yet (add them on the character sheet) — or type below',taCast:'Cast a spell',taNoSpell:'No spell fits this option',taFeat:'Features',taRes:'Class resources',taUse:'Use',taStd:'Common actions (Dash, Dodge …)',taCustom:'Type your own',taCustomPh:'e.g. jump across the gap',
 taXRoll:'Extra roll (e.g. 8d6+2)',taXPh:'d20+3',taXWhy:'What for (optional)',taBadDice:'Dice not understood, e.g. d20+3 or 8d6',taRollWord:'Roll',taLog:'Action log',taLogEmpty:'Nothing logged yet',taReaOf:"{n}'s Reaction",
 taAtk:'attack',taDmg:'damage',taCrit:'critical!',taMiss:'natural 1',taNotTurn:"It is not this character's turn",taFail:'Could not save, try again',taResOut:'That resource is used up',
 taTkL:'Time to use',taTkAuto:'Guess from the text',taTkAct:'Action',taTkBon:'Bonus Action',taTkRea:'Reaction',taTkNone:'None (passive)',taEndAlert:'{n} ended the turn',taTkHint:'Which button of the Turn panel this feature appears under ("Guess from the text" looks for "bonus action" / "reaction" in the description)'});
Object.assign(TX.th,{taCaps:'ปรับจำนวน Action ของตัวนี้',taSlotUsed:'ใช้ช่องนี้ครบแล้ว'});Object.assign(TX.en,{taCaps:'Adjust this one\'s number of actions',taSlotUsed:'This slot is used up'});
