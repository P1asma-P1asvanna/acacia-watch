/* ---------- minigames ---------- */
function dicePanel(){
  const sides=[4,6,8,10,12,20,100];
  return`  <section class="panel dicepanel"><div class="ph"><h2>${t('diceTitle')}</h2></div>
   <div class="dice" role="group" aria-label="${t('diceTitle')}">${sides.map(s=>`<button data-act="side" data-v="${s}" aria-pressed="${diceSides===s}">d${s}</button>`).join('')}</div>
   <div class="roll-ctl">
    <div class="field"><label for="d_count">${t('count')}</label><input id="d_count" type="number" min="1" max="20" value="${diceCount}"></div>
    <div class="field"><label for="d_mod">${t('mod')}</label><input id="d_mod" type="number" min="-30" max="30" value="${diceMod}"></div>
    <div class="field" style="width:150px"><label for="d_mode">${t('mode')}</label><select id="d_mode"><option value="normal" ${diceMode==='normal'?'selected':''}>${t('normal')}</option><option value="adv" ${diceMode==='adv'?'selected':''}>${t('adv')}</option><option value="dis" ${diceMode==='dis'?'selected':''}>${t('dis')}</option></select></div>
    <button class="btn primary" data-act="roll" style="min-height:44px">${t('roll')}</button>
   </div>
   <div class="result" aria-live="polite">${resultHtml()}</div>
   ${rolls.length?`<div class="ph" style="border-top:1px solid var(--line);border-bottom:0"><h2 style="font-size:1rem">${t('history')}</h2></div><ul class="hist">${rolls.map(x=>`<li><span>${esc(x.label)}</span><b>${x.tossed!=null?`<s class="old">${x.tossed}</s> `:''}${x.total}</b></li>`).join('')}</ul>`:''}
  </section>`;
}
function renderGames(){
  return head(t('games'),t('gamesSub'))+`<div class="games">${dicePanel()}
  <section class="panel"><div class="ph"><h2>${t('ideasTitle')}</h2></div><ol class="plan">${t('ideas').map(i=>`<li>${esc(i)}</li>`).join('')}</ol></section></div>`;
}
function resultHtml(){
  const r=lastRoll;if(!r)return`<div class="muted">${t('rollHint')}</div>`;
  const modTxt=r.mod?` ${sgn(r.mod)}`:'';
  if(r.rolls.length===1)return`<div class="big">${r.total}</div><div class="det">${r.n}d${r.sides} [${r.rolls[0].vals.join(', ')}]${modTxt}</div>`;
  const cards=r.rolls.map(x=>`<div class="rc ${x.kept?'kept':'tossed'}"><span class="tag">${x.kept?t('kept'):t('tossed')}</span>${x.kept?`<b class="num">${x.sum}</b>`:`<s class="num">${x.sum}</s>`}${r.n>1?`<span class="det">[${x.vals.join(', ')}]</span>`:''}</div>`).join('');
  return`<div class="pair">${cards}</div><div class="big">${r.total}</div><div class="det">${r.mode==='adv'?t('adv'):t('dis')} · ${r.rolls.find(x=>x.kept).sum}${modTxt}</div>`;
}
function doRoll(){
  const n=Math.min(20,Math.max(1,Number($('#d_count').value)||1)),m=Number($('#d_mod').value)||0;
  diceCount=n;diceMod=m;diceMode=$('#d_mode').value;
  const one=()=>1+Math.floor(Math.random()*diceSides);
  const batch=()=>{const vals=Array.from({length:n},one);return{vals,sum:vals.reduce((x,y)=>x+y,0)}};
  const A=batch(),res={n,sides:diceSides,mod:m,mode:diceMode};
  if(diceMode==='normal'){res.rolls=[{...A,kept:true}];res.base=A.sum}
  else{
    const B=batch(),keepA=diceMode==='adv'?A.sum>=B.sum:A.sum<=B.sum;
    res.rolls=[{...A,kept:keepA},{...B,kept:!keepA}];res.base=(keepA?A:B).sum;
  }
  res.total=res.base+m;lastRoll=res;
  const tossed=res.rolls.length>1?res.rolls.find(x=>!x.kept).sum+m:null;
  const label=`${n}d${diceSides}${m?sgn(m):''}${diceMode==='normal'?'':' '+(diceMode==='adv'?'adv':'dis')}`;
  rolls.unshift({label,total:res.total,tossed});rolls=rolls.slice(0,8);render();
}

