/* ---------- monster templates (GM): save a finished enemy, then spawn several copies into a fight ---------- */
const MT_SLOTS=['act','bon','rea','int'];
const mtCapOf=d=>{const a=d&&d.acap||{};return MT_SLOTS.reduce((o,k)=>(o[k]=a[k]==null?1:Math.max(0,Math.min(9,Math.round(num(a[k])))),o),{})};
const mtList=()=>npcs.filter(c=>c.tpl);
const MTX={th:{mtTitle:'แม่แบบมอนสเตอร์',mtSave:'บันทึกเป็นแม่แบบ (เรียกมาลงสนามได้หลายตัวที่หน้า Initiative)',mtCaps:'จำนวนการกระทำต่อเทิร์น',mtHint:'ตั้งตัวนี้ให้เสร็จ (สถิติ สเปล Feature ทรัพยากร) แล้วติ๊กเป็นแม่แบบ ที่หน้า Initiative เลือกแม่แบบ + จำนวนเพื่อสร้างสำเนาลงสนาม ทุกตัวมีสถิติและช่อง Action ตามที่ตั้งไว้',
  mtSpawn:'เรียกมอนสเตอร์',mtPick:'แม่แบบ',mtN:'จำนวน',mtGo:'สร้างลงสนาม',mtNone:'ยังไม่มีแม่แบบ (ที่หน้า ตัวละครของผู้ดูแล เปิดตัวละคร แล้วติ๊กเป็นแม่แบบ)',mtTag:'แม่แบบ',mtCopy:'สำเนา',mtClean:'ลบสำเนาที่ไม่ได้อยู่ในสนาม',mtCleaned:'ลบแล้ว {n} ตัว'},
 en:{mtTitle:'Monster template',mtSave:'Save as a template (spawn copies from the Initiative page)',mtCaps:'Actions per turn',mtHint:'Finish this enemy (stats, spells, features, resources), tick template, then on the Initiative page pick it and a number to put copies into the fight. Every copy keeps these stats and action counts.',
  mtSpawn:'Spawn monsters',mtPick:'Template',mtN:'How many',mtGo:'Add to fight',mtNone:'No templates yet (open a GM character and tick "template")',mtTag:'Template',mtCopy:'Copy',mtClean:'Delete copies that are not in a fight',mtCleaned:'Deleted {n}'}};
Object.assign(TX.th,MTX.th);Object.assign(TX.en,MTX.en);
function mtBlock(d){const c=mtCapOf(d),nm={act:'Action',bon:'Bonus Action',rea:'Reaction',int:'Interaction'};
  return`<div class="mtbox"><h3>${t('mtTitle')}</h3><label class="chk"><input type="checkbox" data-tf="tpl" ${d.tpl?'checked':''}> 📋 ${t('mtSave')}</label>
   <div class="mtcaps"><span>${t('mtCaps')}</span>${MT_SLOTS.map(k=>`<label>${nm[k]} <input type="number" min="0" max="9" data-tf="${k}" value="${c[k]}" aria-label="${nm[k]}"></label>`).join('')}</div><p class="note">${t('mtHint')}</p></div>`}
function mtField(el){const d=edit&&edit.draft;if(!d)return false;const k=el.dataset.tf;
  if(k==='tpl'){d.tpl=el.checked?1:0;return true}
  if(MT_SLOTS.includes(k)){d.acap=Object.assign(mtCapOf(d),{[k]:Math.max(0,Math.min(9,Math.round(num(el.value))))});return true}
  return false}
/* the "spawn" row on the Initiative page */
function mtSpawnHtml(){const L=mtList();
  return`<div class="ini-add mtspawn"><span class="note" style="width:100%">📋 ${t('mtSpawn')}</span>${L.length?`<div class="field"><label for="ini_tpl">${t('mtPick')}</label><select id="ini_tpl">${L.map(c=>`<option value="${c.id}">${esc(c.name||'—')}</option>`).join('')}</select></div>
   <div class="field" style="max-width:90px"><label for="ini_tn">${t('mtN')}</label><input id="ini_tn" type="number" min="1" max="12" value="3"></div><button class="btn" data-act="ini-spawn">${t('mtGo')}</button>`:`<span class="note">${t('mtNone')}</span>`}</div>`}
function mtSpawn(I){const sel=document.getElementById('ini_tpl'),tp=sel&&npcs.find(c=>c.id===sel.value&&c.tpl);if(!tp)return;
  const n=Math.max(1,Math.min(12,Math.round(num(document.getElementById('ini_tn').value))||1)),names=new Set(npcs.map(c=>c.name)),base=tp.name||'Monster';let k=0;
  for(let i=0;i<n;i++){let nm;do{k++;nm=`${base} ${k}`}while(names.has(nm));names.add(nm);
    const c=JSON.parse(JSON.stringify(tp));c.id=uid();c.tpl=0;c.from=tp.id;c.name=nm;c.hpCur=null;c.hpTemp=0;c.sl={u:[],p:0};c.fu={};c.conc='';(c.res||[]).forEach(r=>{r.used=0});
    npcs.push(c);I.list.push({id:uid(),name:'',ref:'npc:'+c.id,init:null,mod:0,hp:null})}
  commit('npc')}
/* a copy that leaves its only fight is thrown away; "delete copies" cleans up the rest */
const mtInUse=id=>rooms.some(r=>((r.init&&r.init.list)||[]).some(e=>e.ref==='npc:'+id));
function mtDrop(id){const c=npcs.find(x=>x.id===id);if(c&&c.from&&!mtInUse(id)){npcs=npcs.filter(x=>x.id!==id);commit('npc')}}
function mtClean(){const before=npcs.length;npcs=npcs.filter(c=>!c.from||mtInUse(c.id));commit('npc');return before-npcs.length}
/* the GM sets action counts on the template; each fresh copy in a running fight gets them once */
const MT_DONE={};let MT_BUSY=false,MT_TRY=0;
async function mtCapSync(){if(MT_BUSY||!isAdmin()||typeof taSt!=='function')return;MT_BUSY=true;let waiting=false;
  try{for(const rm of rooms){const L=(rm.init&&rm.init.list)||[];
    for(const en of L){if(!String(en.ref||'').startsWith('npc:'))continue;const d=npcs.find(c=>c.id===en.ref.slice(4));if(!d||!d.acap)continue;
      const want=mtCapOf(d);
      let st;try{st=taSt(rm.id)}catch(e){waiting=true;continue}if(!st||!st.e)continue;
      for(const k of MT_SLOTS){const now=taSt(rm.id).e[en.id]||taBlank();if(taCap(now,k)!==want[k])await taPost(rm.id,en.id,{op:'cap',slot:k,n:want[k]})}}}}
  finally{MT_BUSY=false}
  /* a new copy shows up in the turn state a moment after it is added: look again a few times */
  if(waiting&&MT_TRY<8){MT_TRY++;setTimeout(()=>{try{mtCapSync()}catch(e){}},1500)}else if(!waiting)MT_TRY=0}
/* safety net: the GM's page looks every few seconds for copies that still need their action counts (cheap: finished ones are skipped) */
setInterval(()=>{try{if(!document.hidden)mtCapSync()}catch(e){}},3000);
