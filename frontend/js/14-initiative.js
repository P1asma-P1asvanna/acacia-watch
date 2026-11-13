/* ---------- initiative tracker ---------- */
let iniErr='';
const iniData=rm=>{if(!rm.init)rm.init={round:1,cur:null,list:[]};return rm.init};
const iniChar=e=>{if(!e.ref)return null;const[k,i]=e.ref.split(':');return(k==='pc'?pcs:npcs).find(c=>c.id===i)||null};
const iniModOf=e=>{const c=iniChar(e);return c?mod(abT(c,'dex'))+fxAll(c).init:Math.round(num(e.mod))};
const iniName=e=>{const c=iniChar(e);return c?(c.name||'—'):e.name};
function iniSort(I){
  const ix=new Map(I.list.map((e,i)=>[e.id,i])),val=e=>e.init==null?-Infinity:e.init;
  I.list.sort((a,b)=>val(a)!==val(b)?val(b)-val(a):iniModOf(a)!==iniModOf(b)?iniModOf(b)-iniModOf(a):ix.get(a.id)-ix.get(b.id));
}
const iniActive=I=>I.list.filter(e=>e.init!=null);
function iniRollOne(e){e.init=Math.floor(Math.random()*20)+1+iniModOf(e)}
function iniPanel(rm){
  const I=iniData(rm),act=iniActive(I),started=I.cur&&act.some(e=>e.id===I.cur),ci=started?act.findIndex(e=>e.id===I.cur):-1,nextId=started&&act.length>1?act[(ci+1)%act.length].id:null,doneIds=new Set(started?act.slice(0,ci).map(e=>e.id):[]);
  const gm=npcs.map(c=>`<option value="${c.id}">${esc(c.name||'—')}</option>`).join('');
  const rows=I.list.map(e=>{
    const c=iniChar(e),now=started&&e.id===I.cur,nxt=e.id===nextId,dn=doneIds.has(e.id),kind=e.ref&&e.ref.startsWith('pc:')?t('iniPc'):e.ref?t('iniGm'):t('iniFoe');
    const hp=c?`${curHp(c)} / ${c.hp}${num(c.hpTemp)?' +'+num(c.hpTemp):''}`:`<input type="number" min="0" aria-label="${t('iniHpF')}" data-ini="hp" data-id="${e.id}" value="${e.hp==null?'':esc(e.hp)}" placeholder="HP">`;
    return`<li class="ini-row ${now?'now':nxt?'next':dn?'done':''}" ${now?'aria-current="true"':''}><span class="ini-mark" aria-hidden="true">${now?'▶':nxt?'→':dn?'✓':''}</span>
     <div class="ini-name">${c?cpicHtml(c,'sm'):''}<div><b>${esc(iniName(e))}</b><small>${kind} · ${t('iniMod')} ${sgn(iniModOf(e))}${now?' · '+t('iniNow'):nxt?' · '+t('iniNextTag'):dn?' · '+t('iniDoneTag'):''}</small></div></div>
     <input type="number" aria-label="${t('iniInit')}: ${esc(iniName(e))}" data-ini="init" data-id="${e.id}" value="${e.init==null?'':e.init}" placeholder="${t('iniNoRoll')}">
     <span class="ini-hp">${t('iniHpF')} ${hp}</span>
     <div class="ini-act"><button class="btn small" data-act="ini-roll" data-id="${e.id}">${t('iniRoll')}</button><button class="btn small danger" data-act="ini-del" data-id="${e.id}" aria-label="${t('iniDel')} ${esc(iniName(e))}">✕</button></div>${cbSub(e)}</li>`}).join('');
  return`<section class="panel ini"><div class="ph"><h2>${t('iniTab')}</h2></div>
   <div class="ini-top"><span class="ini-round">${t('iniRound')} ${I.round}</span>
    <button class="btn" data-act="ini-prev" ${act.length?'':'disabled'}>← ${t('iniPrev')}</button>
    <button class="btn primary" data-act="ini-next" ${act.length?'':'disabled'}>${started?t('iniNext')+' →':t('iniStart')}</button>
    <button class="btn" data-act="cb-rest" data-k="short" title="${cb('restSH')}" ${I.list.length?'':'disabled'}>${cb('rsS')}</button><button class="btn" data-act="cb-rest" data-k="long" title="${cb('restLH')}" ${I.list.length?'':'disabled'}>${cb('rsL')}</button>
    <button class="btn danger" data-act="ini-clear" ${I.list.length?'':'disabled'}>${dataArm==='iniclear'?t('iniSureClear'):t('iniClear')}</button></div>
   <div class="ini-add">
    <button class="btn" data-act="ini-addseat">${t('iniAddSeat')}</button>
    <div class="field"><label for="ini_gm">${t('iniPickGm')}</label><select id="ini_gm"><option value="">—</option>${gm}</select></div>
    <button class="btn" data-act="ini-addgm">${t('iniAddGm')}</button>
    <button class="btn" data-act="ini-rollall">${t('iniRollAll')}</button></div>
   <div class="ini-add"><span class="note" style="width:100%">${t('iniCustom')}</span>
    <div class="field"><label for="ini_name">${t('iniName')}</label><input id="ini_name" placeholder="Goblin 1"></div>
    <div class="field sm"><label for="ini_mod">${t('iniMod')}</label><input id="ini_mod" type="number" value="0"></div>
    <div class="field sm"><label for="ini_hp">${t('iniHpF')}</label><input id="ini_hp" type="number" min="0"></div>
    <button class="btn" data-act="ini-addcustom">${t('iniAdd')}</button><span class="err" role="alert">${esc(iniErr)}</span></div>
   ${cbEvtHtml(I.evt,I.list,true)}${cbQueue(I)}${cbHowHtml()}${started?`<div class="ini-legend"><span><i style="background:var(--turn-now)"></i>${t('iniNow')}</span><span><i style="background:var(--turn-next)"></i>${t('iniNextTag')}</span><span><i style="background:var(--turn-done)"></i>${t('iniDoneTag')}</span></div>`:''}${I.list.length?`<ul class="ini-list">${rows}</ul><p class="note" style="margin:0;padding:10px 16px 14px">${t('iniTies')} · ${t('iniHpNote')}</p>`:`<div class="empty"><div>${t('iniEmpty')}</div></div>`}${cbLogHtml(I)}</section>`;
}
function iniAction(a,id){
  const rm=rooms.find(r=>r.id===roomOpen);if(!rm)return;const I=iniData(rm);iniErr='';
  const has=ref=>I.list.some(e=>e.ref===ref),add=o=>I.list.push(Object.assign({id:uid(),name:'',ref:'',init:null,mod:0,hp:null},o));
  if(a!=='ini-clear')dataArm=null;
  if(a==='ini-addseat'){rm.assign.filter(Boolean).forEach(cid=>{if(!has('pc:'+cid))add({ref:'pc:'+cid})})}
  else if(a==='ini-addgm'){const g=document.getElementById('ini_gm').value;if(g&&!has('npc:'+g))add({ref:'npc:'+g})}
  else if(a==='ini-addcustom'){const n=document.getElementById('ini_name').value.trim();if(!n){iniErr=t('iniNeedName');render();return}
    const hpv=document.getElementById('ini_hp').value;add({name:n,mod:Math.round(num(document.getElementById('ini_mod').value)),hp:hpv===''?null:Math.max(0,Math.round(num(hpv))),hpMax:hpv===''?null:Math.max(0,Math.round(num(hpv)))})}
  else if(a==='ini-rollall'){I.list.forEach(e=>{if(e.init==null)iniRollOne(e)})}
  else if(a==='ini-roll'){const e=I.list.find(x=>x.id===id);if(e)iniRollOne(e)}
  else if(a==='ini-del'){
    const act=iniActive(I),i=act.findIndex(x=>x.id===id);
    if(I.cur===id){const nx=act[i+1]||act[0];I.cur=nx&&nx.id!==id?nx.id:null}
    I.list=I.list.filter(x=>x.id!==id);I.q=(I.q||[]).filter(x=>x.eid!==id)}
  else if(a==='ini-clear'){if(dataArm!=='iniclear'){dataArm='iniclear';render();return}dataArm=null;I.list=[];I.cur=null;I.round=1;I.q=[];I.log=[]}
  else if(a==='ini-next')cbNext(I);
  else if(a==='ini-prev')cbPrev(I);
  iniSort(I);saveRooms();render();
}
function iniChange(el){
  const rm=rooms.find(r=>r.id===roomOpen);if(!rm)return;const I=iniData(rm),e=I.list.find(x=>x.id===el.dataset.id);if(!e)return;
  if(el.dataset.ini==='init')e.init=el.value===''?null:Math.round(num(el.value));
  else if(el.dataset.ini==='hp'){e.hp=el.value===''?null:Math.max(0,Math.round(num(el.value)));if(e.hp!=null&&(e.hpMax==null||e.hp>e.hpMax))e.hpMax=e.hp}
  iniSort(I);saveRooms();render();
}

