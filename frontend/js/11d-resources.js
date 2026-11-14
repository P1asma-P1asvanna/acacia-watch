/* ---------- class resources the player tracks by hand: Rage, Ki, Bardic Inspiration, ...
   Pips work like spell slots. They refill on a short or long rest by themselves (restShort / restLong in 08-views.js). ---------- */
const RES_REST=['short','long','none'];
const resMax=(d,r)=>r.mab&&ABS.includes(r.mab)?Math.max(1,mod(abT(d,r.mab))):Math.max(1,Math.min(30,Math.round(num(r.max))||1));
function resBody(d){
  d.res=d.res||[];
  const rows=d.res.map((r,i)=>{const mx=resMax(d,r),u=Math.min(mx,Math.max(0,Math.round(num(r.used))));
    return`<div class="resrow"><div class="resn"><b>${esc(r.name)}</b><small>${u}/${mx} · ${t('res_'+(r.rest||'long'))}</small></div><div class="dots">${spDots(mx,u,`data-ra="pip" data-i="${i}"`)}</div>
     <details class="resedit"><summary aria-label="${t('resEdit')}">✎</summary><div class="resfields">
      <div class="field"><label for="rn_${r.id}">${t('wName')}</label><input id="rn_${r.id}" data-rf="name" data-i="${i}" maxlength="40" value="${esc(r.name)}"></div>
      <div class="field"><label for="rm_${r.id}">${t('resMax')}</label><input id="rm_${r.id}" data-rf="max" data-i="${i}" type="number" min="1" max="30" value="${esc(r.max||1)}" ${r.mab?'disabled':''}></div>
      <div class="field"><label for="ra_${r.id}">${t('resAb')}</label><select id="ra_${r.id}" data-rf="mab" data-i="${i}"><option value="">—</option>${ABS.map(a=>`<option value="${a}" ${r.mab===a?'selected':''}>${a.toUpperCase()}</option>`).join('')}</select></div>
      <div class="field"><label for="rr_${r.id}">${t('resRest')}</label><select id="rr_${r.id}" data-rf="rest" data-i="${i}">${RES_REST.map(k=>`<option value="${k}" ${(r.rest||'long')===k?'selected':''}>${t('res_'+k)}</option>`).join('')}</select></div>
      <button type="button" class="btn small danger" data-ra="del" data-i="${i}">${t('itDel')}</button></div></details></div>`}).join('');
  return`${rows||`<p class="note" style="padding:0 16px">${t('resEmpty')}</p>`}
   <div class="bar"><div class="field" style="min-width:200px;flex:1"><label for="res_new">${t('resNew')}</label><input id="res_new" maxlength="40" placeholder="${esc(t('resPh'))}"></div><button type="button" class="btn small" data-ra="add" ${d.res.length>=12?'disabled':''}>${t('wAdd')}</button></div>
   <p class="note" style="margin:0;padding:0 16px 14px">${t('resHint')}</p>`}
const resPanel=d=>`<section class="panel"><div class="ph"><h2>${t('resTitle')}</h2></div><div id="resbody">${resBody(d)}</div></section>`;
function refreshRes(){const b=document.getElementById('resbody');if(b&&edit)b.innerHTML=resBody(edit.draft)}
function resAction(a,el){
  const d=edit.draft;d.res=d.res||[];const i=Number(el.dataset.i),r=d.res[i];
  if(a==='add'){const inp=document.getElementById('res_new'),n=(inp&&inp.value||'').trim();if(!n||d.res.length>=12)return;d.res.push({id:uid(),name:n.slice(0,40),max:1,mab:'',used:0,rest:'long'})}
  else if(!r)return;
  else if(a==='del')d.res.splice(i,1);
  else if(a==='pip'){const j=Number(el.dataset.j),u=Math.round(num(r.used));r.used=u>j?j:j+1}
  refreshRes()}
function resField(el){const d=edit.draft,r=(d.res||[])[Number(el.dataset.i)];if(!r)return;const k=el.dataset.rf;
  if(k==='name')r.name=el.value.slice(0,40);
  else if(k==='max')r.max=Math.max(1,Math.min(30,Math.round(num(el.value))||1));
  else{r[k]=el.value;if(k==='mab'||k==='rest'){const open=document.querySelector('#resbody details[open] [data-i="'+el.dataset.i+'"]');refreshRes();const dt=document.querySelectorAll('#resbody .resedit')[Number(el.dataset.i)];if(dt)dt.open=true}}}
/* rests: short refills "short" resources, long refills both */
function resRest(d,kind){(d.res||[]).forEach(r=>{if(r.rest==='short'||(kind==='long'&&r.rest==='long'))r.used=0})}
Object.assign(TX.th,{resTitle:'ทรัพยากรคลาส',resEmpty:'ยังไม่มีทรัพยากร (เช่น Rage, Ki, Bardic Inspiration)',resNew:'เพิ่มทรัพยากร',resPh:'เช่น Rage',resMax:'จำนวนสูงสุด',resAb:'หรือตามค่าพลัง (ขั้นต่ำ 1)',resRest:'ฟื้นเมื่อ',res_short:'พักสั้น',res_long:'พักยาว',res_none:'ไม่ฟื้นเอง',resEdit:'แก้ไขทรัพยากร',resHint:'กดวงกลมเพื่อใช้/คืนทีละครั้ง ฟื้นเองเมื่อพักสั้น/พักยาวตามที่ตั้งไว้ (พักยาวฟื้นทั้งสองแบบ) ใช้ค่าพลังเมื่อจำนวนขึ้นกับโมดิฟายเออร์ เช่น Bardic Inspiration = CHA'});
Object.assign(TX.en,{resTitle:'Class resources',resEmpty:'No resources yet (for example Rage, Ki, Bardic Inspiration)',resNew:'Add a resource',resPh:'e.g. Rage',resMax:'Maximum uses',resAb:'Or follow an ability (at least 1)',resRest:'Refills on',res_short:'Short rest',res_long:'Long rest',res_none:'Never by itself',resEdit:'Edit resource',resHint:'Tap a circle to spend or give back one use. They refill by themselves on a short or long rest as set (a long rest refills both kinds). Use the ability option when the number follows a modifier, such as Bardic Inspiration = CHA.'});
