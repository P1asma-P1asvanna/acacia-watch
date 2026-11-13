/* ---------- Profiles: everyone can decorate their own and look at everybody else's ---------- */
let MEMBERS=[],profView='',profDraft=null,profMsg='',profBusy=false;
const PF_PRESETS=['solid','double','dashed','dotted','ridge','glow','gradient'],PF_SHAPES=['circle','rounded','square'];
/* picture rules shown to the person (the same numbers as IMG_SLOTS in backend/acacia/config.py) */
const PF_FRAME_IDEAL=320,PF_FRAME_SHOW=160;
const pfDefault=()=>({tag:'',bio:'',accent:'',avatar:'',bg:'',dim:55,frame:{mode:'none',preset:'solid',w:4,c1:'#c9a227',c2:'#7a5c00',shape:'circle',img:''},card:{style:'none',w:2,c:'#c9a227'},pins:[]});
const pfNorm=p=>{const d=pfDefault(),s=p||{};return{...d,...s,frame:{...d.frame,...(s.frame||{})},card:{...d.card,...(s.card||{})},pins:Array.isArray(s.pins)?s.pins.slice():[]}};
const memberOf=id=>MEMBERS.find(m=>m.id===id)||null;
const myMember=()=>memberOf(session)||{id:session,disp:(me()||{}).disp||'',role:(me()||{}).role||'player',p:{},pins:[]};
const pfInit=n=>esc(String(n||'?').trim().slice(0,1).toUpperCase()||'?');
/* the ring around the avatar: a preset (solid, double, dashed, dotted, ridge, glow, gradient) or a picture laid over the avatar */
function pfAvatar(p,name,size){
  const f=p.frame,w=f.mode==='preset'?Math.max(0,Math.min(16,Number(f.w)||0)):0,shape=f.mode==='image'?'circle':f.shape;
  const rad=shape==='circle'?'50%':shape==='rounded'?'22%':'0';
  let ring='';
  if(f.mode==='preset'&&w>0){
    if(f.preset==='gradient')ring=`border:${w}px solid transparent;background:conic-gradient(${f.c1},${f.c2},${f.c1}) border-box;`;
    else if(f.preset==='glow')ring=`border:${Math.max(1,Math.round(w/2))}px solid ${f.c1};box-shadow:0 0 ${w*2}px ${Math.round(w/2)}px ${f.c1},inset 0 0 ${w}px ${f.c2};`;
    else ring=`border:${f.preset==='double'?Math.max(3,w):w}px ${f.preset} ${f.c1};`}
  const img=p.avatar?`<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async" style="border-radius:${rad}">`:`<span class="pfini" style="border-radius:${rad}">${pfInit(name)}</span>`;
  const over=f.mode==='image'&&f.img?`<img class="pfover" src="${esc(f.img)}" alt="" loading="lazy" decoding="async">`:'';
  return`<div class="pfav" style="width:${size}px;height:${size}px;border-radius:${rad};${ring}"><div class="pfavin" style="border-radius:${rad}">${img}</div>${over}</div>`}
const pfCardStyle=(p,adm)=>{const c=p.card,col=p.accent||'';let s=col?`--pf-acc:${col};`:'';
  if(c.style!=='none'&&c.w>0){if(c.style==='gradient')s+=`border:${c.w}px solid transparent;background:linear-gradient(var(--panel,#1e1e20),var(--panel,#1e1e20)) padding-box,conic-gradient(${c.c},${p.accent||c.c},${c.c}) border-box;`;
    else if(c.style==='glow')s+=`border:1px solid ${c.c};box-shadow:0 0 ${c.w*3}px ${c.w}px ${c.c};`;
    else s+=`border:${c.style==='double'?Math.max(3,c.w):c.w}px ${c.style} ${c.c};`}
  return s};
const pfRole=m=>m.role==='admin'?t('pfAdmin'):t('pfPlayer');
const pfDate=ts=>{try{return new Date((ts||0)*1000).toLocaleDateString(lang==='th'?'th-TH':'en-GB',{year:'numeric',month:'short',day:'numeric'})}catch(e){return''}};
/* one profile card; full=false is the small version in the member list */
function pfCard(m,full){
  const p=pfNorm(m.p),size=full?PF_FRAME_SHOW:96,pins=full?(m.pins||[]):[];
  const bg=p.bg?`<div class="pfbg" data-bgsrc="${esc(p.bg)}" data-full="${full?1:0}" style="background-image:url('${esc(p.bg)}')"></div><div class="pfdim" style="opacity:${(Number(p.dim)||0)/100}"></div>`:'';
  return`<article class="pfcard${full?' full':''}${p.bg?' hasbg':''}" style="${pfCardStyle(p)}" aria-label="${esc(m.disp)}">${bg}
   <div class="pfmain">${pfAvatar(p,m.disp,size)}
    <div class="pftxt"><h2 class="pfname">${esc(m.disp||'—')}</h2><div class="pfmeta"><span class="pill${m.role==='admin'?' admin':''}">${pfRole(m)}</span>${p.tag?`<span class="pftag">${esc(p.tag)}</span>`:''}</div></div></div>
   ${full&&p.bio?`<p class="pfbio">${esc(p.bio).replace(/\n/g,'<br>')}</p>`:''}
   ${full&&pins.length?`<div class="pfpins"><h3>${t('pfPins')}</h3><ul>${pins.map(x=>`<li><b>${esc(x.name||'—')}</b><span>${esc(x.race)} · ${esc(x.cls)}</span></li>`).join('')}</ul></div>`:''}
   ${full&&m.created?`<p class="note pfjoin">${t('pfJoined')} ${pfDate(m.created)}</p>`:''}</article>`}
function pfStills(){document.querySelectorAll('.pfbg[data-bgsrc]').forEach(e=>{const u=e.dataset.bgsrc,animate=PREFS.anim?PREFS.anim==='on':!REDUCED;if(isGif(u)&&(!animate||e.dataset.full!=='1')){stillOf(u).then(d=>{if(e.dataset.bgsrc===u)e.style.backgroundImage=`url("${d}")`})}})}
function renderProfilePage(){
  if(profDraft)return pfEditPage();
  if(profView&&memberOf(profView))return pfViewPage(memberOf(profView));
  const mine=myMember(),list=MEMBERS.filter(m=>m.id!==session);
  return head(t('profile'),t('pfSub'),`<div class="acts"><button class="btn primary" data-pfa="edit">${t('pfEdit')}</button></div>`)
   +`<section class="panel"><div class="pfgrid"><button type="button" class="pfopen mine" data-pfa="open" data-id="${esc(mine.id)}" aria-label="${esc(mine.disp)}">${pfCard(mine,false)}<span class="pfyou">${t('pfYou')}</span></button>`
   +list.map(m=>`<button type="button" class="pfopen" data-pfa="open" data-id="${esc(m.id)}" aria-label="${esc(m.disp)}">${pfCard(m,false)}</button>`).join('')+`</div>${list.length?'':`<p class="note" style="padding:0 16px 16px">${t('pfNoOthers')}</p>`}</section>`}
function pfViewPage(m){
  const mineP=m.id===session;
  return head(m.disp||t('profile'),'',`<div class="acts"><button class="btn" data-pfa="back">← ${t('pfBack')}</button>${mineP?`<button class="btn primary" data-pfa="edit">${t('pfEdit')}</button>`:''}</div>`)+`<section class="panel pfpanel">${pfCard(m,true)}</section>`}
/* ---- the editor: every change shows in the preview at once; nothing is saved until Save ---- */
const pfRule=(slot)=>{const s=IMG_SLOTS[slot];return t('rTypes')+' · '+fill(t('rFile'),{min:fmtB(IMG_MINBYTES),max:fmtB(s.inBytes)})+' · '+fill(t('rPx'),{s:s.minShort,l1:s.minLong,l2:IMG_MAXPX})+' · '+fill(t('rGif'),{b:fmtB(s.gifBytes),p:s.gifSide})};
const pfSel=(k,val,opts,lab)=>`<select data-pf="${k}" aria-label="${lab}">${opts.map(([v,l])=>`<option value="${v}" ${String(val)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
const pfPreset=v=>t('pfp_'+v);
function pfEditBody(d){
  const f=d.frame,my=pcs.filter(c=>c.owner===session||(isAdmin()&&c.owner===''&&false));
  const up=(slot,has,k)=>`<div class="pfup"><label class="btn small filebtn">${t('pfUpload')}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-img="${slot}" hidden></label>${has?`<button type="button" class="btn small danger" data-pfa="rm" data-k="${k}">${t('pfRemove')}</button>`:''}</div>`;
  return`<div class="pfform">
   <div class="field"><label for="pf_tag">${t('pfTag')}</label><input id="pf_tag" data-pf="tag" maxlength="40" value="${esc(d.tag)}" placeholder="${t('pfTagPh')}"></div>
   <div class="field"><label for="pf_bio">${t('pfBio')} <small id="pf_bioc">${d.bio.length}/500</small></label><textarea id="pf_bio" data-pf="bio" maxlength="500" rows="4">${esc(d.bio)}</textarea></div>
   <div class="field"><label for="pf_acc">${t('pfAccent')}</label><div class="pfcolor"><input type="color" id="pf_acc" data-pf="accent" value="${d.accent||'#c9a227'}"><button type="button" class="btn small" data-pfa="rm" data-k="accent">${t('pfNoColor')}</button></div></div>
   <fieldset class="pfset"><legend>${t('pfAvatar')}</legend><p class="note">${t('pfAvatarHint')}</p>${up('pavatar',!!d.avatar,'avatar')}<p class="note rule">${pfRule('pavatar')}</p></fieldset>
   <fieldset class="pfset"><legend>${t('pfBg')}</legend><p class="note">${t('pfBgHint')}</p>${up('pbg',!!d.bg,'bg')}
    <div class="field"><label for="pf_dim">${t('pfDim')} <small id="pf_dimv">${d.dim}%</small></label><input id="pf_dim" data-pf="dim" type="range" min="0" max="90" value="${d.dim}"></div><p class="note rule">${pfRule('pbg')}</p></fieldset>
   <fieldset class="pfset"><legend>${t('pfFrame')}</legend>
    <div class="field"><label for="pf_fm">${t('pfFrameMode')}</label>${pfSel('fmode',f.mode,[['none',t('pfFNone')],['preset',t('pfFPreset')],['image',t('pfFImage')]],t('pfFrameMode'))}</div>
    ${f.mode==='preset'?`<div class="pfrow"><div class="field"><label>${t('pfStyle')}</label>${pfSel('fpreset',f.preset,PF_PRESETS.map(v=>[v,pfPreset(v)]),t('pfStyle'))}</div>
      <div class="field"><label>${t('pfShape')}</label>${pfSel('fshape',f.shape,PF_SHAPES.map(v=>[v,t('pfs_'+v)]),t('pfShape'))}</div></div>
     <div class="field"><label for="pf_fw">${t('pfThick')} <small id="pf_fwv">${f.w}px</small></label><input id="pf_fw" data-pf="fw" type="range" min="0" max="16" value="${f.w}"></div>
     <div class="pfrow"><div class="field"><label for="pf_c1">${t('pfColor1')}</label><input type="color" id="pf_c1" data-pf="fc1" value="${f.c1}"></div><div class="field"><label for="pf_c2">${t('pfColor2')}</label><input type="color" id="pf_c2" data-pf="fc2" value="${f.c2}"></div></div>`:''}
    ${f.mode==='image'?`<div class="pfguide"><b>${t('pfFrameSize')}</b><ul><li>${fill(t('pfFrameIdeal'),{n:PF_FRAME_IDEAL,s:PF_FRAME_SHOW})}</li><li>${fill(t('pfFrameLimit'),{min:IMG_SLOTS.pframe.minShort,max:IMG_SLOTS.pframe.out})}</li><li>${t('pfFrameHole')}</li></ul>
      <svg class="pfdiag" viewBox="0 0 120 120" role="img" aria-label="${t('pfFrameDiag')}"><rect x="2" y="2" width="116" height="116" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><circle cx="60" cy="60" r="40" fill="none" stroke="currentColor"/><text x="60" y="64" text-anchor="middle" font-size="10" fill="currentColor">${PF_FRAME_IDEAL}×${PF_FRAME_IDEAL}</text></svg></div>
     ${up('pframe',!!f.img,'frameimg')}<p class="note rule">${pfRule('pframe')} · ${t('pfSquareOnly')}</p>`:''}
   </fieldset>
   <fieldset class="pfset"><legend>${t('pfCard')}</legend><p class="note">${t('pfCardHint')}</p>
    <div class="pfrow"><div class="field"><label>${t('pfStyle')}</label>${pfSel('cstyle',d.card.style,[['none',t('pfFNone')],...PF_PRESETS.map(v=>[v,pfPreset(v)])],t('pfStyle'))}</div>
     <div class="field"><label for="pf_cc">${t('pfColor1')}</label><input type="color" id="pf_cc" data-pf="cc" value="${d.card.c}"></div></div>
    ${d.card.style!=='none'?`<div class="field"><label for="pf_cw">${t('pfThick')} <small id="pf_cwv">${d.card.w}px</small></label><input id="pf_cw" data-pf="cw" type="range" min="0" max="12" value="${d.card.w}"></div>`:''}</fieldset>
   <fieldset class="pfset"><legend>${t('pfPins')}</legend><p class="note">${t('pfPinsHint')}</p>${my.length?my.map(c=>`<label class="chk"><input type="checkbox" data-pfpin="${esc(c.id)}" ${d.pins.includes(c.id)?'checked':''}> ${esc(c.name||'—')} <small>${esc(c.race)} · ${clsLabel(c)}</small></label>`).join(''):`<p class="note">${t('pfNoChars')}</p>`}</fieldset>
  </div>`}
function pfEditPage(){
  const m={...myMember(),p:profDraft};
  return head(t('pfEditTitle'),t('pfEditSub'),`<div class="acts"><button class="btn" data-pfa="cancel">${t('pfCancel')}</button><button class="btn primary" data-pfa="save" ${profBusy?'disabled':''}>${t('save')}</button></div>`)
   +`${profMsg?`<p class="note" role="alert" style="padding:0 16px;color:var(--danger,#e66)">${esc(profMsg)}</p>`:''}`
   +`<div class="pfedit"><section class="panel"><div class="ph"><h2>${t('pfPreview')}</h2></div><div id="pfprev" class="pfpanel">${pfCard(m,true)}</div></section><section class="panel"><div id="pfbody">${pfEditBody(profDraft)}</div></section></div>`}
function pfRefreshPrev(){const el=document.getElementById('pfprev');if(el&&profDraft){el.innerHTML=pfCard({...myMember(),p:profDraft},true);pfStills()}}
function pfStart(){profDraft=pfNorm(myMember().p);profMsg='';profView='';render()}
async function pfSave(){
  if(!profDraft||profBusy)return;profBusy=true;profMsg='';render();
  try{const r=await api('POST','api/profile',{value:profDraft});const m=memberOf(session);if(m)m.p=r.value;profDraft=null}
  catch(e){profMsg=t('pfSaveFail')}
  profBusy=false;render()}
function pfInput(el){
  const d=profDraft;if(!d)return false;const k=el.dataset.pf,v=el.value;
  if(k==='tag')d.tag=v;else if(k==='bio'){d.bio=v;const c=document.getElementById('pf_bioc');if(c)c.textContent=v.length+'/500'}
  else if(k==='accent')d.accent=v;else if(k==='dim'){d.dim=Number(v);const c=document.getElementById('pf_dimv');if(c)c.textContent=v+'%'}
  else if(k==='fmode'){d.frame.mode=v;render();return true}
  else if(k==='fpreset')d.frame.preset=v;else if(k==='fshape')d.frame.shape=v;
  else if(k==='fw'){d.frame.w=Number(v);const c=document.getElementById('pf_fwv');if(c)c.textContent=v+'px'}
  else if(k==='fc1')d.frame.c1=v;else if(k==='fc2')d.frame.c2=v;
  else if(k==='cstyle'){d.card.style=v;render();return true}
  else if(k==='cc')d.card.c=v;
  else if(k==='cw'){d.card.w=Number(v);const c=document.getElementById('pf_cwv');if(c)c.textContent=v+'px'}
  else return false;
  pfRefreshPrev();return true}
function pfClick(e){
  const b=e.target.closest('[data-pfa]');if(!b)return false;const a=b.dataset.pfa;
  if(a==='open'){profView=b.dataset.id;render()}
  else if(a==='back'){profView='';render()}
  else if(a==='edit')pfStart();
  else if(a==='cancel'){profDraft=null;profMsg='';render()}
  else if(a==='save')pfSave();
  else if(a==='rm'&&profDraft){const k=b.dataset.k;if(k==='frameimg'){profDraft.frame.img='';if(profDraft.frame.mode==='image')profDraft.frame.mode='none'}else if(k==='accent')profDraft.accent='';else profDraft[k]='';render()}
  return true}
Object.assign(TX.th,{pfCancel:'ยกเลิก',profile:'โปรไฟล์',pfSub:'โปรไฟล์ของทุกคนในกลุ่ม กดดูได้ และแต่งโปรไฟล์ของตัวเองได้',pfEdit:'แต่งโปรไฟล์ของฉัน',pfYou:'ของฉัน',pfBack:'กลับ',pfNoOthers:'ยังไม่มีสมาชิกคนอื่น',pfAdmin:'ผู้ดูแล',pfPlayer:'ผู้เล่น',pfPins:'ตัวละครที่ปักหมุด',pfJoined:'เข้าร่วมเมื่อ',
 pfEditTitle:'แต่งโปรไฟล์',pfEditSub:'เปลี่ยนอะไรแล้วเห็นในตัวอย่างทันที ต้องกดบันทึกถึงจะมีผลกับคนอื่น',pfPreview:'ตัวอย่าง',pfSaveFail:'บันทึกโปรไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง',
 pfTag:'คำโปรยสั้นๆ',pfTagPh:'เช่น นักดาบจอมเมา',pfBio:'แนะนำตัว',pfAccent:'สีเด่นของโปรไฟล์',pfNoColor:'ใช้สีของธีม',pfUpload:'เลือกรูป',pfRemove:'ลบรูป',
 pfAvatar:'รูปโปรไฟล์',pfAvatarHint:'แนะนำภาพสี่เหลี่ยมจัตุรัส 256×256 px ขึ้นไป (ภาพไม่จัตุรัสจะถูกครอปตรงกลาง) ใช้ GIF ได้',
 pfBg:'พื้นหลังโปรไฟล์',pfBgHint:'ใช้ภาพหรือ GIF เป็นพื้นหลังของการ์ด',pfDim:'ความมืดของพื้นหลัง (ให้ตัวหนังสืออ่านง่าย)',
 pfFrame:'กรอบรูปโปรไฟล์',pfFrameMode:'แบบกรอบ',pfFNone:'ไม่มีกรอบ',pfFPreset:'กรอบสำเร็จรูป (ปรับความหนา/สีเอง)',pfFImage:'กรอบจากรูปของฉัน',pfStyle:'ลายกรอบ',pfShape:'รูปทรง',pfThick:'ความหนา',pfColor1:'สีหลัก',pfColor2:'สีรอง',
 pfp_solid:'เส้นทึบ',pfp_double:'เส้นคู่',pfp_dashed:'เส้นประ',pfp_dotted:'จุดไข่ปลา',pfp_ridge:'นูน',pfp_glow:'เรืองแสง',pfp_gradient:'ไล่สี',pfs_circle:'วงกลม',pfs_rounded:'สี่เหลี่ยมมน',pfs_square:'สี่เหลี่ยม',
 pfFrameSize:'ขนาดรูปกรอบที่พอดี',pfFrameIdeal:'แนะนำ {n}×{n} px จัตุรัส (แสดงจริงที่ {s} px จึงคมบนจอความละเอียดสูง)',pfFrameLimit:'ขนาดที่รับได้: จัตุรัสเท่านั้น ตั้งแต่ {min}×{min} ถึง {max}×{max} px',pfFrameHole:'เว้นตรงกลางให้โปร่งใส (PNG/WebP/GIF) รูปโปรไฟล์จะโผล่ตรงช่องนั้น กรอบวางทับรูปเต็มขนาดพอดี',pfFrameDiag:'ตัวอย่างขนาดกรอบ',pfSquareOnly:'ต้องเป็นรูปจัตุรัส',
 pfCard:'ขอบการ์ดโปรไฟล์',pfCardHint:'ขอบรอบการ์ดทั้งใบ (กรอบสำเร็จรูป ปรับสีและความหนาได้)',pfPinsHint:'เลือกตัวละครของคุณได้ไม่เกิน 3 ตัวเพื่อโชว์ (คนอื่นเห็นแค่ชื่อ เผ่าพันธุ์ อาชีพ เลเวล)',pfNoChars:'ยังไม่มีตัวละครของคุณ'});
Object.assign(TX.en,{pfCancel:'Cancel',e_img_square:'The frame picture must be square (same width and height), for example 320×320 px',profile:'Profile',pfSub:'Everyone\'s profile. Open any of them, and decorate your own.',pfEdit:'Edit my profile',pfYou:'You',pfBack:'Back',pfNoOthers:'No other members yet.',pfAdmin:'Admin',pfPlayer:'Player',pfPins:'Pinned characters',pfJoined:'Joined',
 pfEditTitle:'Edit profile',pfEditSub:'Changes show in the preview at once. Others only see them after you press Save.',pfPreview:'Preview',pfSaveFail:'Could not save the profile. Try again.',
 pfTag:'Tagline',pfTagPh:'e.g. Tipsy swordsman',pfBio:'About me',pfAccent:'Accent colour',pfNoColor:'Use theme colour',pfUpload:'Choose picture',pfRemove:'Remove',
 pfAvatar:'Avatar',pfAvatarHint:'A square picture of 256×256 px or more is best (other shapes are cropped in the middle). GIF works.',
 pfBg:'Background',pfBgHint:'A picture or GIF behind the card.',pfDim:'Background darkness (keeps text readable)',
 pfFrame:'Avatar frame',pfFrameMode:'Frame type',pfFNone:'No frame',pfFPreset:'Ready-made frame (set thickness and colour)',pfFImage:'Frame from my own picture',pfStyle:'Style',pfShape:'Shape',pfThick:'Thickness',pfColor1:'Main colour',pfColor2:'Second colour',
 pfp_solid:'Solid',pfp_double:'Double',pfp_dashed:'Dashed',pfp_dotted:'Dotted',pfp_ridge:'Ridge',pfp_glow:'Glow',pfp_gradient:'Gradient',pfs_circle:'Circle',pfs_rounded:'Rounded square',pfs_square:'Square',
 pfFrameSize:'Frame picture size',pfFrameIdeal:'Best: {n}×{n} px square (shown at {s} px, so it stays sharp on sharp screens)',pfFrameLimit:'Accepted: square only, from {min}×{min} to {max}×{max} px',pfFrameHole:'Keep the middle transparent (PNG/WebP/GIF): the avatar shows through. The frame is laid over the avatar at full size.',pfFrameDiag:'Frame size example',pfSquareOnly:'must be square',
 pfCard:'Card border',pfCardHint:'A border around the whole card (ready-made styles, set colour and thickness).',pfPinsHint:'Pick up to 3 of your characters to show off (others see only name, race, class and level).',pfNoChars:'You have no characters yet.'});
