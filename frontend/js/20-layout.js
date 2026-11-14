/* ---------- arrange mode: drag, resize and hide the boxes of a page ----------
   Each box ("widget") is a <section class="panel" data-w="id"> inside <div class="wgrid" data-page="page">.
   The person's layout lives in PREFS.lay[page] = {o:[order], h:[hidden ids], s:{id:1 = half width}} and is turned into
   CSS rules (order / grid-column / display) in one <style>, so re-rendering never loses it and the page DOM stays as is. */
const LAYOUT={
  sheet:{ids:['basic','bgpick','abil','asi','prof','hp','spells','res','weapons','profs','items','ac','feat','combat'],
    label:{basic:'secBasic',bgpick:'secBgPick',abil:'secAbil',asi:'secAsi',prof:'secProf',hp:'hpTitle',spells:'spTitle',res:'resTitle',weapons:'wTitle',profs:'prTitle',items:'itTitle',ac:'acTitle',feat:'featTitleP',combat:'secCombat'}},
  players:{ids:['list','accounts'],label:{list:'players',accounts:'accounts'}},
  site:{ids:['colors','decor','fx','shape'],label:{colors:'sColors',decor:'sDecor',fx:'sFx',shape:'sShape'}},
  adminset:{ids:['identity','rules','backup'],label:{identity:'sIdentity',rules:'aRules',backup:'bkTitle'}},
  stage:{ids:['main','rail'],label:{main:'advMain',rail:'playersRail'},nosize:true}
};
let arrangePage=null,layTimer=0;
const layOf=p=>{const l=(PREFS.lay&&PREFS.lay[p])||{};return{o:l.o||[],h:l.h||[],s:l.s||{}}};
function layOrder(p){const ids=LAYOUT[p].ids,l=layOf(p),known=l.o.filter(i=>ids.includes(i));return[...known,...ids.filter(i=>!known.includes(i))]}
function layWrite(p,fn){PREFS.lay=PREFS.lay||{};const l=PREFS.lay[p]=layOf(p);l.o=layOrder(p);fn(l);applyLayout();layDirty()}
function layDirty(){clearTimeout(layTimer);layTimer=setTimeout(()=>{layTimer=0;savePrefs()},500)}
function applyLayout(){
  let css='';
  for(const p in LAYOUT){
    const o=layOrder(p),l=layOf(p),sel=i=>`[data-page="${p}"]>[data-w="${i}"]`;
    o.forEach((i,n)=>{css+=`${sel(i)}{order:${n}}`;if(l.h.includes(i))css+=`${sel(i)}{display:none}`});
    if(!LAYOUT[p].nosize)css+='@media(min-width:1100px){'+o.filter(i=>l.s[i]===1).map(i=>`${sel(i)}{grid-column:span 1}`).join('')+'}';
    if(p==='stage'){  /* the stage is a two-column grid: main and a side rail; keep the columns right when the rail moves or hides */
      const g='.stagebody[data-page="stage"]';
      if(l.h.includes('rail'))css+=`${g}{grid-template-columns:minmax(0,1fr)}`;
      else if(o.indexOf('rail')<o.indexOf('main'))css+=`${g}{grid-template-columns:280px minmax(0,1fr)}@media(max-width:820px){${g}{grid-template-columns:128px minmax(0,1fr)}}`;
    }
  }
  let st=document.getElementById('lay-css');if(!st){st=document.createElement('style');st.id='lay-css';document.head.appendChild(st)}
  if(st.textContent!==css)st.textContent=css;
}
/* markup helpers used by the pages */
function W(p,id,html){
  if(!html||!html.trim())return'';
  const ctl=arrangePage===p?wctl(p,id):'';
  return html.replace('<section class="panel">',`<section class="panel" data-w="${id}">${ctl}`);
}
function wctl(p,id){
  const half=layOf(p).s[id]===1;
  return`<div class="wctl" data-page="${p}" data-id="${id}"><span class="wh" role="button" tabindex="0" aria-label="${t('arrDrag')}" title="${t('arrDrag')}">⠿</span><b>${t(LAYOUT[p].label[id])}</b>
   <span class="wbtns"><button class="btn small" data-act="w-up" data-page="${p}" data-id="${id}" aria-label="${t('arrUp')}">↑</button><button class="btn small" data-act="w-down" data-page="${p}" data-id="${id}" aria-label="${t('arrDown')}">↓</button>
   ${LAYOUT[p].nosize?'':`<button class="btn small wsize" data-act="w-size" data-page="${p}" data-id="${id}" aria-pressed="${half}" title="${t('arrSizeTip')}">${half?'½':'↔'}</button>`}<button class="btn small" data-act="w-hide" data-page="${p}" data-id="${id}">${t('arrHide')}</button></span></div>`;
}
const wc=(p,id)=>arrangePage===p?wctl(p,id):'';
function wgrid(p,items){return`<div class="wgrid${arrangePage===p?' arranging':''}" data-page="${p}">${items.map(([id,h])=>W(p,id,h)).join('')}</div>`}
const arrangeBtn=p=>`<button class="btn" data-act="arrange" data-page="${p}" aria-pressed="${arrangePage===p}">⠿ ${t(arrangePage===p?'arrDone':'arrange')}</button>`;
function arrangeBar(p){
  if(arrangePage!==p)return'';
  const hid=layOf(p).h.filter(i=>LAYOUT[p].ids.includes(i));
  return`<section class="panel arrbar" role="region" aria-label="${t('arrange')}"><p class="note" style="margin:0">${t('arrHelp')}</p>
   <div class="arrhid"><span class="note">${t('arrHidden')}:</span>${hid.length?hid.map(i=>`<button class="btn small" data-act="w-show" data-page="${p}" data-id="${i}">+ ${t(LAYOUT[p].label[i])}</button>`).join(''):`<span class="muted">${t('arrNone')}</span>`}</div>
   <div class="acts"><button class="btn small" data-act="w-reset" data-page="${p}">${t('arrReset')}</button><button class="btn small primary" data-act="arrange" data-page="${p}">${t('arrDone')}</button></div></section>`;
}
/* button actions (called from the click handler) */
function layAction(a,p,id){
  if(!LAYOUT[p])return;
  const vis=()=>layOrder(p).filter(i=>!layOf(p).h.includes(i));
  if(a==='arrange'){arrangePage=arrangePage===p?null:p;render();return}
  if(a==='w-up'||a==='w-down'){const v=vis(),n=v.indexOf(id),m=a==='w-up'?n-1:n+1;if(n<0||m<0||m>=v.length)return;
    layWrite(p,l=>{const o=l.o,x=o.indexOf(id),y=o.indexOf(v[m]);o.splice(x,1);o.splice(a==='w-up'?o.indexOf(v[m]):o.indexOf(v[m])+1,0,id)});focusCtl(a,p,id);return}
  if(a==='w-size'){layWrite(p,l=>{if(l.s[id]===1)delete l.s[id];else l.s[id]=1});render();return}
  if(a==='w-hide'){layWrite(p,l=>{if(!l.h.includes(id))l.h.push(id)});render();return}
  if(a==='w-show'){layWrite(p,l=>{l.h=l.h.filter(i=>i!==id)});render();return}
  if(a==='w-reset'){if(PREFS.lay)delete PREFS.lay[p];if(PREFS.lay&&!Object.keys(PREFS.lay).length)delete PREFS.lay;applyLayout();layDirty();render()}
}
function focusCtl(a,p,id){const b=document.querySelector(`[data-act="${a}"][data-page="${p}"][data-id="${id}"]`);if(b){b.focus();b.closest('[data-w]')?.scrollIntoView({block:'nearest'})}}
/* dragging by the handle (pointer events: mouse, pen and touch) */
(function(){
  let drag=null,raf=0;
  function move(e){
    if(!drag)return;drag.x=e.clientX;drag.y=e.clientY;
    const el=document.elementFromPoint(e.clientX,e.clientY),t0=el&&el.closest&&el.closest('[data-w]');
    if(!t0||t0===drag.w||t0.parentElement!==drag.grid||Date.now()<drag.lock)return;
    const r=t0.getBoundingClientRect(),w=drag.w.getBoundingClientRect(),sameRow=Math.abs(r.top-w.top)<20&&Math.abs(r.height-w.height)<r.height;
    const after=sameRow&&r.left>w.left+2?e.clientX>r.left+r.width/2:sameRow&&r.left<w.left-2?e.clientX<r.left+r.width/2?false:true:e.clientY>r.top+r.height/2;
    layWrite(drag.p,l=>{const o=l.o;o.splice(o.indexOf(drag.id),1);const k=o.indexOf(t0.dataset.w);o.splice(after?k+1:k,0,drag.id)});
    drag.lock=Date.now()+140;
  }
  function tick(){if(!drag)return;const h=innerHeight;if(drag.y<80)scrollBy(0,-16);else if(drag.y>h-80)scrollBy(0,16);raf=requestAnimationFrame(tick)}
  function up(){if(!drag)return;drag.w.classList.remove('dragging');document.body.classList.remove('dragging-w');cancelAnimationFrame(raf);
    removeEventListener('pointermove',move);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);drag=null}
  document.addEventListener('pointerdown',e=>{
    const h=e.target.closest&&e.target.closest('.wh');if(!h||(e.button!==undefined&&e.button>0))return;
    const w=h.closest('[data-w]'),ctl=h.closest('.wctl');if(!w||!ctl)return;e.preventDefault();
    drag={w,grid:w.parentElement,p:ctl.dataset.page,id:ctl.dataset.id,x:e.clientX,y:e.clientY,lock:0};
    w.classList.add('dragging');document.body.classList.add('dragging-w');
    addEventListener('pointermove',move);addEventListener('pointerup',up);addEventListener('pointercancel',up);raf=requestAnimationFrame(tick);
  });
})();
