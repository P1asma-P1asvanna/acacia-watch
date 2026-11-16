/* ---------- feedback: everyone writes, the GM exports one file and hands it to Claude ---------- */
let FB=[],FBPREV='players';
const FBU={kind:'bug',area:'',sev:2,title:'',what:'',expect:'',steps:'',shot:'',msg:'',ok:false,busy:false,flt:'open',exp:'open',mark:true,expMsg:''};
const FB_KINDS=['bug','idea','confusing','other'],FB_STAT=['new','read','done','skip'],
  FB_AREAS=['general','players','adventure','initiative','minigames','dice','data','profile','site','other'],
  FB_ICON={bug:'🐞',idea:'💡',confusing:'❓',other:'💬'};
const fbAreaOf=v=>({players:'players',npcs:'players',adventure:'adventure',games:'minigames',data:'data',conditions:'data',feats:'data',spells:'data',profile:'profile',site:'site',adminset:'site'}[v]||'general');
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="nav"]');if(b&&typeof view!=='undefined'&&view!=='feedback')FBPREV=view},true);
function fbCtx(){
  let touch='no';try{touch=matchMedia('(pointer:coarse)').matches?'yes':'no'}catch(e){}
  return{view:FBPREV,scr:screen.width+'x'+screen.height,vp:innerWidth+'x'+innerHeight,dpr:String(window.devicePixelRatio||1),ua:navigator.userAgent.slice(0,200),lang:lang,touch}}
const fbDate=ts=>{const d=new Date(ts*1000),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const fbOpts=(list,pre,cur)=>list.map(k=>`<option value="${k}" ${cur===k?'selected':''}>${t(pre+k)}</option>`).join('');

function fbForm(){
  if(!FBU.area)FBU.area=fbAreaOf(FBPREV);
  const f=(lab,hint,inner)=>`<div class="field"><label>${lab}</label>${inner}${hint?`<small class="muted">${hint}</small>`:''}</div>`;
  return`<section class="panel fbform"><div class="ph"><h2>✍ ${t('fbNew')}</h2></div><div class="fbbody">
   <p class="muted small">${t('fbIntro')}</p>
   <div class="fbrow">${f(t('fbKind'),'',`<select data-fbf="kind">${fbOpts(FB_KINDS,'fbk_',FBU.kind)}</select>`)}
    ${f(t('fbArea'),'',`<select data-fbf="area">${fbOpts(FB_AREAS,'fba_',FBU.area)}</select>`)}
    ${f(t('fbSev'),'',`<select data-fbf="sev">${[1,2,3].map(n=>`<option value="${n}" ${+FBU.sev===n?'selected':''}>${t('fbs_'+n)}</option>`).join('')}</select>`)}</div>
   ${f(t('fbTitle'),t('fbTitleH'),`<input data-fbf="title" maxlength="80" value="${esc(FBU.title)}">`)}
   ${f(t('fbWhat'),t('fbWhatH'),`<textarea data-fbf="what" rows="4" maxlength="1500">${esc(FBU.what)}</textarea>`)}
   ${f(t('fbExpect'),t('fbExpectH'),`<textarea data-fbf="expect" rows="2" maxlength="1000">${esc(FBU.expect)}</textarea>`)}
   ${f(t('fbSteps'),t('fbStepsH'),`<textarea data-fbf="steps" rows="3" maxlength="1000">${esc(FBU.steps)}</textarea>`)}
   <div class="field"><label>${t('fbShot')}</label>
    ${FBU.shot?`<div class="fbshot"><img src="${esc(FBU.shot)}" alt=""><button class="btn small" data-fb="shot-clear">✕ ${t('fbShotDel')}</button></div>`
     :`<label class="btn small">📎 ${t('fbShotPick')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-fbfile hidden></label>`}
    <small class="muted">${t('fbShotH')}</small></div>
   <p class="muted small">${t('fbAuto')}</p>
   <div class="fbact"><button class="btn primary big" data-fb="send" ${FBU.busy?'disabled':''}>${FBU.busy?t('rWorking'):t('fbSend')}</button><span class="fbmsg ${FBU.ok?'ok':''}" aria-live="polite">${esc(FBU.msg)}</span></div>
  </div></section>`}

function fbCard(e,adm){
  const nm=(e.role==='admin'?'GM ':'')+esc(e.name),sev='●'.repeat(e.sev||1);
  const c=e.ctx||{};
  return`<article class="fbc st-${e.status}" data-id="${e.id}">
   <div class="fbh"><b>${FB_ICON[e.kind]||'💬'} ${esc(e.title)}</b><span class="fbchip st-${e.status}">${t('fbst_'+e.status)}</span></div>
   <div class="muted small">${t('fba_'+e.area)} · ${nm} · ${fbDate(e.at)} · <span title="${t('fbSev')}">${sev}</span></div>
   ${e.what?`<p class="fbtx">${esc(e.what)}</p>`:''}
   ${e.expect?`<p class="fbtx"><b>${t('fbExpect')}:</b> ${esc(e.expect)}</p>`:''}
   ${e.steps?`<p class="fbtx"><b>${t('fbSteps')}:</b> ${esc(e.steps)}</p>`:''}
   ${e.shot?`<a href="${esc(e.shot)}" target="_blank" rel="noopener"><img class="fbimg" src="${esc(e.shot)}" alt=""></a>`:''}
   ${adm?`<div class="muted small fbctx">${esc(c.view||'')} · ${esc(c.vp||'')} (${esc(c.scr||'')}) · ${esc(c.touch==='yes'?'touch':'mouse')} · ${esc(c.lang||'')}</div>
    <div class="fbadm"><select data-fbs="${e.id}">${fbOpts(FB_STAT,'fbst_',e.status)}</select>
     <input data-fbn="${e.id}" maxlength="1000" placeholder="${t('fbNote')}" value="${esc(e.note||'')}">
     <button class="btn small" data-fb="note" data-id="${e.id}">${t('save')}</button>
     <button class="btn small danger" data-fb="del" data-id="${e.id}">${t('del')}</button></div>`
    :`${e.note?`<p class="fbnote"><b>${t('fbGm')}:</b> ${esc(e.note)}</p>`:''}${e.status==='new'?`<button class="btn small danger" data-fb="del" data-id="${e.id}">${t('del')}</button>`:''}`}
  </article>`}

function fbExportPanel(){
  const n=s=>FB.filter(e=>s.includes(e.status)).length;
  return`<section class="panel fbexp"><div class="ph"><h2>📤 ${t('fbExpT')}</h2></div><div class="fbbody">
   <p class="muted small">${t('fbExpH')}</p>
   <div class="fbrow"><div class="field"><label>${t('fbExpWhich')}</label><select data-fbf="exp">
     <option value="new" ${FBU.exp==='new'?'selected':''}>${t('fbExpNew')} (${n(['new'])})</option>
     <option value="open" ${FBU.exp==='open'?'selected':''}>${t('fbExpOpen')} (${n(['new','read'])})</option>
     <option value="all" ${FBU.exp==='all'?'selected':''}>${t('fbExpAll')} (${FB.length})</option></select></div></div>
   <label class="fbchk"><input type="checkbox" data-fbf="mark" ${FBU.mark?'checked':''}> ${t('fbExpMark')}</label>
   <div class="fbact"><button class="btn primary" data-fb="exp-dl">⬇ ${t('fbExpDl')}</button><button class="btn" data-fb="exp-copy">📋 ${t('fbExpCopy')}</button><span class="fbmsg" aria-live="polite">${esc(FBU.expMsg)}</span></div>
  </div></section>`}

function renderFeedback(){
  const adm=isAdmin(),own=FB.filter(e=>e.uid===session);
  const flt={open:['new','read'],new:['new'],done:['done','skip'],all:FB_STAT}[FBU.flt]||FB_STAT;
  const rows=(adm?FB:own).filter(e=>!adm||flt.includes(e.status)).slice().sort((a,b)=>b.at-a.at);
  return head(t('feedback'),t(adm?'fbSubAdm':'fbSub'))+`<div class="fbwrap">${adm?fbExportPanel():''}${fbForm()}
   <section class="panel fblist"><div class="ph"><h2>${adm?t('fbAll'):t('fbMine')} (${rows.length})</h2>${adm?`<select data-fbf="flt" aria-label="${t('fbFilter')}">
     ${[['open',t('fbFOpen')],['new',t('fbst_new')],['done',t('fbFDone')],['all',t('fbExpAll')]].map(([k,l])=>`<option value="${k}" ${FBU.flt===k?'selected':''}>${l}</option>`).join('')}</select>`:''}</div>
    <div class="fbbody">${rows.length?rows.map(e=>fbCard(e,adm)).join(''):`<p class="muted">${t(adm?'fbNoneAdm':'fbNone')}</p>`}</div></section></div>`}

/* ---- the file for Claude ---- */
const FB_AREA_EN={general:'General / not sure',players:'Player sheet',adventure:'Adventure / rooms',initiative:'Initiative tracker',minigames:'Minigames',dice:'Dice',data:'Game data (classes, spells, feats…)',profile:'Profile',site:'Site settings',other:'Other'};
const FB_KIND_EN={bug:'Bug',idea:'Idea / request',confusing:'Confusing',other:'Other'};
function fbBuild(list){
  const now=fbDate(Math.floor(Date.now()/1000)),L=[];
  L.push(`# Acacia Watch — player feedback for Claude`,`Exported ${now} · ${list.length} entr${list.length===1?'y':'ies'}`,'',
   `## What this is`,
   `Acacia Watch is a D&D 5e helper website (GM/admin + players). The GM collected the notes below from players (and himself) and is handing them to you, Claude, to improve the site.`,
   `Players write in Thai or English. "F-xxxx" is the entry id. Severity: 1 = small annoyance, 2 = bothers me, 3 = blocks me.`,'',
   `## What to do`,
   `1. Read every entry. Group duplicates and note which are bugs, which are requests, and which only show confusing wording.`,
   `2. Reply to the GM with a short plan in Thai: what you will change, what you will not and why, and anything you need to ask. Wait for his OK before large changes.`,
   `3. Then implement, keeping the standing rules: smooth on mobile (it is used beside Owlbear), Thai + English UI, admin-only site settings, per-user theme, per-owner upload isolation.`,
   `4. At the end list the entry ids you resolved, partly resolved, and left open, so the GM can mark them.`,'',
   `## Summary`,`| id | kind | area | sev | from | status | title |`,`|---|---|---|---|---|---|---|`);
  for(const e of list)L.push(`| F-${e.id.slice(1)} | ${FB_KIND_EN[e.kind]||e.kind} | ${FB_AREA_EN[e.area]||e.area} | ${e.sev} | ${e.name}${e.role==='admin'?' (GM)':''} | ${e.status} | ${String(e.title).replace(/\|/g,'/').replace(/\n/g,' ')} |`);
  L.push('','## Entries','');
  const shots=[];
  for(const e of list){
    const id='F-'+e.id.slice(1),c=e.ctx||{};
    L.push(`### ${id} · ${FB_KIND_EN[e.kind]||e.kind} · ${FB_AREA_EN[e.area]||e.area} · severity ${e.sev}/3 · status ${e.status}`,
     `- From: ${e.name}${e.role==='admin'?' (GM)':' (player)'} · ${fbDate(e.at)}`,
     `- Was on page: ${c.view||'?'} · screen ${c.scr||'?'} · window ${c.vp||'?'} · touch ${c.touch||'?'} · UI language ${c.lang||'?'}`,
     `- Browser: ${c.ua||'?'}`,`- Title: ${e.title}`,'');
    if(e.what)L.push(`**What happened / what they want:**`,e.what,'');
    if(e.expect)L.push(`**What they expected:**`,e.expect,'');
    if(e.steps)L.push(`**Steps to reproduce:**`,e.steps,'');
    if(e.shot){const ext=(e.shot.match(/\.(\w+)$/)||[0,'webp'])[1],nm=`screenshots/${id}.${ext}`;shots.push({name:nm,url:e.shot});L.push(`**Screenshot:** ${nm}`,'')}
    if(e.note)L.push(`**GM note:** ${e.note}`,'');
    L.push('---','')}
  return{md:L.join('\n'),shots}}
const FB_CRC=(()=>{const T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c>>>0}return T})();
function fbCrc(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=FB_CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function fbZip(files){ /* plain "stored" zip: no compression library needed */
  const enc=new TextEncoder(),parts=[],cd=[],d=new Date();let off=0;
  const dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  for(const f of files){
    const nm=enc.encode(f.name),crc=fbCrc(f.data),n=f.data.length,h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);h.setUint32(14,crc,true);h.setUint32(18,n,true);h.setUint32(22,n,true);h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    const c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,tm,true);c.setUint16(14,dt,true);c.setUint32(16,crc,true);c.setUint32(20,n,true);c.setUint32(24,n,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cd.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+n}
  const cl=cd.reduce((a,x)=>a+x.length,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cl,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/zip'})}
function fbSave(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
const fbPick=()=>{const s={new:['new'],open:['new','read'],all:FB_STAT}[FBU.exp]||['new','read'];return FB.filter(e=>s.includes(e.status)).sort((a,b)=>a.at-b.at)};
async function fbMarkRead(list){
  const ids=list.filter(e=>e.status==='new').map(e=>e.id);if(!ids.length||!FBU.mark)return;
  try{const r=await api('POST','api/fb',{op:'status',ids,status:'read',id:ids[0]});FB=r.fb||FB}catch(e){}}
async function fbExport(copy){
  const list=fbPick();FBU.expMsg='';
  if(!list.length){FBU.expMsg=t('fbExpNone');render();return}
  const {md,shots}=fbBuild(list),stamp=fbDate(Math.floor(Date.now()/1000)).replace(/[- :]/g,'').slice(0,12);
  try{
    if(copy){let ok=false;try{await navigator.clipboard.writeText(md);ok=true}catch(e){const ta=document.createElement('textarea');ta.value=md;document.body.appendChild(ta);ta.select();try{ok=document.execCommand('copy')}catch(e2){}ta.remove()}
      FBU.expMsg=ok?t('fbCopied'):t('fbCopyFail')}
    else if(!shots.length){fbSave(new Blob([md],{type:'text/markdown'}),`acacia-feedback-${stamp}.md`);FBU.expMsg=t('fbDone')}
    else{const files=[{name:'feedback.md',data:new TextEncoder().encode(md)}];
      for(const s of shots){try{const r=await fetch(s.url);files.push({name:s.name,data:new Uint8Array(await r.arrayBuffer())})}catch(e){}}
      fbSave(fbZip(files),`acacia-feedback-${stamp}.zip`);FBU.expMsg=t('fbDoneZip')}
    await fbMarkRead(list)}catch(e){FBU.expMsg=t('eNet')}
  render()}

async function fbSend(){
  if(FBU.busy)return;
  if(!FBU.what.trim()&&!FBU.title.trim()){FBU.ok=false;FBU.msg=t('fbE_fb_empty');render();return}
  FBU.busy=true;FBU.msg='';render();
  try{const r=await api('POST','api/fb',{op:'add',kind:FBU.kind,area:FBU.area,sev:+FBU.sev,title:FBU.title,what:FBU.what,expect:FBU.expect,steps:FBU.steps,shot:FBU.shot,ctx:fbCtx()});
    FB=r.fb||FB;Object.assign(FBU,{title:'',what:'',expect:'',steps:'',shot:'',ok:true,msg:t('fbSent')})}
  catch(e){FBU.ok=false;FBU.msg=(e.code&&t('fbE_'+e.code))||t('eNet')}
  FBU.busy=false;render()}
document.addEventListener('input',e=>{const x=e.target.closest('[data-fbf]');if(!x)return;const k=x.dataset.fbf;
  if(['title','what','expect','steps'].includes(k)){FBU[k]=x.value;FBU.msg=''}});
document.addEventListener('change',async e=>{
  const x=e.target.closest('[data-fbf]');
  if(x){const k=x.dataset.fbf;if(k==='mark')FBU.mark=x.checked;else if(['kind','area','sev','exp','flt'].includes(k)){FBU[k]=x.value;if(k==='exp'||k==='flt')render()}return}
  const s=e.target.closest('[data-fbs]');
  if(s){try{const r=await api('POST','api/fb',{op:'status',id:s.dataset.fbs,status:s.value});FB=r.fb||FB;render()}catch(err){netErr&&netErr(err)}return}
  const f=e.target.closest('[data-fbfile]');
  if(f&&f.files&&f.files[0]){FBU.msg=t('rWorking');FBU.ok=false;render();
    try{const p=await prepImage(f.files[0],'fbshot'),r=await api('POST','api/img',{slot:'fbshot',data:p.b64});FBU.shot=r.url;FBU.msg=''}
    catch(err){FBU.msg=imgErrText(err.code||(err.status===409?'img_quota':err.message),'fbshot')}
    render()}});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-fb]');if(!b)return;const a=b.dataset.fb,id=b.dataset.id;
  if(a==='send')fbSend();
  else if(a==='shot-clear'){FBU.shot='';render()}
  else if(a==='exp-dl')fbExport(false);
  else if(a==='exp-copy')fbExport(true);
  else if(a==='note'){const i=document.querySelector(`[data-fbn="${id}"]`);try{const r=await api('POST','api/fb',{op:'note',id,note:i?i.value:''});FB=r.fb||FB;render()}catch(err){netErr&&netErr(err)}}
  else if(a==='del'){if(!confirm(t('fbDelAsk')))return;try{const r=await api('POST','api/fb',{op:'del',id});FB=r.fb||FB;render()}catch(err){netErr&&netErr(err)}}});

Object.assign(TX.th,{feedback:'ข้อเสนอแนะ',fbSub:'บอกสิ่งที่อยากให้แก้หรือเพิ่ม ผู้ดูแลจะรวบรวมไปให้ Claude ช่วยปรับปรุงเว็บ',fbSubAdm:'รวบรวมสิ่งที่ผู้เล่นเขียนไว้ แล้วส่งออกเป็นไฟล์ให้ Claude อ่านและปรับปรุงเว็บ',
 fbNew:'เขียนข้อเสนอแนะ',fbIntro:'ยิ่งเล่าละเอียดยิ่งแก้ได้ตรงจุด ไม่ต้องใช้ศัพท์เทคนิค เล่าเป็นภาษาไทยหรืออังกฤษได้เลย',
 fbKind:'ประเภท',fbk_bug:'🐞 มีอะไรเสีย / ทำงานผิด',fbk_idea:'💡 อยากให้เพิ่มหรือเปลี่ยน',fbk_confusing:'❓ ใช้แล้วงง',fbk_other:'💬 อื่นๆ',
 fbArea:'เกี่ยวกับหน้าไหน',fba_general:'ทั่วไป / ไม่แน่ใจ',fba_players:'ข้อมูลผู้เล่น / ชีต',fba_adventure:'Adventure / ห้อง',fba_initiative:'Initiative',fba_minigames:'มินิเกม',fba_dice:'ลูกเต๋า',fba_data:'ข้อมูลเกม (คลาส สเปล ฟีต)',fba_profile:'โปรไฟล์',fba_site:'ตั้งค่า / หน้าตาเว็บ',fba_other:'อื่นๆ',
 fbSev:'ระดับความรบกวน',fbs_1:'เล็กน้อย',fbs_2:'รบกวนพอสมควร',fbs_3:'ใช้งานต่อไม่ได้',
 fbTitle:'สรุปสั้นๆ',fbTitleH:'เช่น "ปุ่มกดมินิเกมเล็กไปบนมือถือ"',
 fbWhat:'เกิดอะไรขึ้น / อยากได้อะไร',fbWhatH:'เล่าให้เห็นภาพ: ทำอะไรอยู่ แล้วเกิดอะไรขึ้น หรืออยากให้เป็นแบบไหน',
 fbExpect:'คิดว่าควรเป็นอย่างไร',fbExpectH:'ไม่บังคับ',fbSteps:'ทำอย่างไรถึงเจอ',fbStepsH:'ไม่บังคับ — ถ้าเป็นบัค เขียนเป็นข้อๆ ว่ากดอะไรก่อนหลัง',
 fbShot:'ภาพหน้าจอ',fbShotPick:'เลือกภาพ',fbShotDel:'เอาภาพออก',fbShotH:'ไม่บังคับ — ย่อภาพให้อัตโนมัติ (ภาพจะถูกเก็บรวมในกล่องข้อเสนอแนะ ไม่นับโควตารูปของคุณ)',
 fbAuto:'ระบบแนบให้อัตโนมัติ: หน้าที่เปิดอยู่ ขนาดหน้าจอ ชนิดอุปกรณ์ และภาษา เพื่อให้หาสาเหตุได้ง่ายขึ้น',
 fbSend:'ส่งข้อเสนอแนะ',fbSent:'ส่งแล้ว ขอบคุณครับ!',fbE_fb_empty:'กรุณาเขียนอย่างน้อยสรุปสั้นๆ หรือรายละเอียด',fbE_fb_too_many:'มีเรื่องที่ยังไม่ได้อ่านเยอะแล้ว รอผู้ดูแลอ่านก่อนนะ',fbE_img_quota:'กล่องภาพข้อเสนอแนะเต็ม ลองส่งโดยไม่แนบภาพ',
 fbMine:'ที่ฉันส่งไว้',fbAll:'ข้อเสนอแนะทั้งหมด',fbNone:'ยังไม่เคยส่งอะไร',fbNoneAdm:'ไม่มีรายการในตัวกรองนี้',fbFilter:'ตัวกรอง',fbFOpen:'ที่ยังไม่เสร็จ (ใหม่ + อ่านแล้ว)',fbFDone:'เสร็จแล้ว / ไม่ทำ',
 fbst_new:'ใหม่',fbst_read:'อ่านแล้ว',fbst_done:'แก้แล้ว',fbst_skip:'ไม่ทำ',fbNote:'โน้ตของ GM (ผู้ส่งเห็นด้วย)',fbGm:'ตอบจาก GM',fbDelAsk:'ลบรายการนี้?',
 fbExpT:'ส่งให้ Claude',fbExpH:'รวมข้อเสนอแนะเป็นไฟล์เดียว (มีคำแนะนำให้ Claude อยู่ในไฟล์แล้ว) ถ้ามีภาพหน้าจอจะได้เป็น .zip เอาไปแนบในแชทกับ Claude ได้เลย หรือกด "คัดลอกข้อความ" แล้ววางในแชท',
 fbExpWhich:'ส่งอะไรบ้าง',fbExpNew:'เฉพาะที่ยังเป็น "ใหม่"',fbExpOpen:'ที่ยังไม่เสร็จ (ใหม่ + อ่านแล้ว)',fbExpAll:'ทั้งหมด',fbExpMark:'ทำเครื่องหมาย "อ่านแล้ว" ให้รายการใหม่ที่ส่งออก',fbExpDl:'ดาวน์โหลดไฟล์',fbExpCopy:'คัดลอกข้อความ',
 fbExpNone:'ไม่มีรายการให้ส่งออกในตัวเลือกนี้',fbCopied:'คัดลอกแล้ว วางในแชทกับ Claude ได้เลย (ภาพหน้าจอจะไม่ติดไปกับข้อความ)',fbCopyFail:'คัดลอกไม่ได้ ลองดาวน์โหลดไฟล์แทน',fbDone:'ดาวน์โหลดแล้ว',fbDoneZip:'ดาวน์โหลดแล้ว (.zip มีภาพหน้าจอรวมอยู่)'});
Object.assign(TX.en,{feedback:'Feedback',fbSub:'Tell us what to fix or add. The GM collects it for Claude to improve the site',fbSubAdm:'Collect what players wrote and export it as one file for Claude to read and act on',
 fbNew:'Write feedback',fbIntro:'The more detail, the better the fix. No technical words needed — write in Thai or English.',
 fbKind:'Type',fbk_bug:'🐞 Something is broken',fbk_idea:'💡 I want something added or changed',fbk_confusing:'❓ This is confusing',fbk_other:'💬 Other',
 fbArea:'Which page',fba_general:'General / not sure',fba_players:'Player sheet',fba_adventure:'Adventure / rooms',fba_initiative:'Initiative',fba_minigames:'Minigames',fba_dice:'Dice',fba_data:'Game data (classes, spells, feats)',fba_profile:'Profile',fba_site:'Settings / look',fba_other:'Other',
 fbSev:'How much it bothers you',fbs_1:'Small',fbs_2:'Bothers me',fbs_3:'Blocks me',
 fbTitle:'Short summary',fbTitleH:'e.g. "Minigame buttons are too small on my phone"',
 fbWhat:'What happened / what do you want',fbWhatH:'Paint the picture: what were you doing, what happened, or how should it work',
 fbExpect:'What did you expect',fbExpectH:'Optional',fbSteps:'How to see it',fbStepsH:'Optional — for bugs, list what you pressed, in order',
 fbShot:'Screenshot',fbShotPick:'Choose picture',fbShotDel:'Remove picture',fbShotH:'Optional — resized automatically (kept in the shared feedback box, not in your own picture quota)',
 fbAuto:'Attached automatically: the page you were on, screen size, device type and language, to help find the cause.',
 fbSend:'Send feedback',fbSent:'Sent, thank you!',fbE_fb_empty:'Please write at least a short summary or the details',fbE_fb_too_many:'You have many unread items; wait for the GM to read them first',fbE_img_quota:'The feedback picture box is full; send it without a picture',
 fbMine:'What I sent',fbAll:'All feedback',fbNone:'You have not sent anything yet',fbNoneAdm:'Nothing in this filter',fbFilter:'Filter',fbFOpen:'Open (new + read)',fbFDone:'Done / skipped',
 fbst_new:'New',fbst_read:'Read',fbst_done:'Fixed',fbst_skip:'Won\'t do',fbNote:'GM note (the sender sees it)',fbGm:'GM reply',fbDelAsk:'Delete this entry?',
 fbExpT:'Send to Claude',fbExpH:'Bundles the feedback into one file (instructions for Claude are inside). With screenshots you get a .zip. Attach it in your chat with Claude, or press "Copy text" and paste it.',
 fbExpWhich:'What to send',fbExpNew:'Only "new" ones',fbExpOpen:'Open (new + read)',fbExpAll:'Everything',fbExpMark:'Mark exported new entries as "read"',fbExpDl:'Download file',fbExpCopy:'Copy text',
 fbExpNone:'Nothing to export for this choice',fbCopied:'Copied — paste it into your chat with Claude (screenshots do not come with the text)',fbCopyFail:'Could not copy; download the file instead',fbDone:'Downloaded',fbDoneZip:'Downloaded (.zip includes the screenshots)'});
