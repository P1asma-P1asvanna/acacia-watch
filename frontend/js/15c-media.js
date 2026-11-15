/* ---------- media library for minigames (admin): clips live on Cloudflare R2, the browser uploads straight to it ---------- */
let MEDIA=[],MEDIA_ON=false,mediaUp=null,mediaErr='';
const MEDIA_TYPES={'video/mp4':'MP4','video/webm':'WebM','audio/mpeg':'MP3','audio/ogg':'OGG','audio/mp4':'M4A'};
const mediaMB=n=>(n/1048576).toFixed(n<10485760?1:0)+' MB';
const mediaById=id=>MEDIA.find(m=>m.id===id);
function mediaPanel(){
  if(!isAdmin())return'';
  const list=MEDIA.length?`<ul class="medialist">${MEDIA.map(m=>`<li><div class="mm"><b>${esc(m.name||m.key)}</b><small>${MEDIA_TYPES[m.type]||''} · ${mediaMB(m.size)} · ${m.src==='r2'?'R2':t('mediaInProject')}</small>${m.type.startsWith('video')?`<video src="${esc(m.url)}" controls preload="metadata" playsinline></video>`:`<audio src="${esc(m.url)}" controls preload="none"></audio>`}</div>${m.src==='r2'?`<button class="btn small danger" data-act="media-del" data-id="${esc(m.id)}">${t('del')}</button>`:''}</li>`).join('')}</ul>`:`<p class="note">${t('mediaNone')}</p>`;
  const up=mediaUp?`<div class="mediaup" role="status"><span>${esc(mediaUp.name)}</span><progress max="100" value="${mediaUp.pct}"></progress><b>${mediaUp.pct}%</b></div>`:'';
  return`<section class="panel"><div class="ph"><div><h2>${t('mediaTitle')}</h2><div class="note">${t('mediaSub')}</div></div></div>
   <div class="mediahow"><b>${t('mediaHowT')}</b><ol><li>${t('mediaHow1')}</li><li>${t('mediaHow2')}</li><li>${t('mediaHow3')}</li></ol></div>
   ${MEDIA_ON?`<div class="mediabar"><label class="btn primary" for="media_file">+ ${t('mediaAdd')}</label><input id="media_file" data-media type="file" accept="video/mp4,video/webm,audio/mpeg,audio/ogg,audio/mp4" hidden ${mediaUp?'disabled':''}></div>`:''}
   ${up}${mediaErr?`<p class="err" role="alert">${esc(mediaErr)}</p>`:''}${list}</section>`}
async function mediaUpload(file){
  mediaErr='';if(!file)return;
  const type=file.type||(/\.mp4$/i.test(file.name)?'video/mp4':'');
  if(!MEDIA_TYPES[type]){mediaErr=t('mediaBadType');return render()}
  if(file.size>400*1048576){mediaErr=t('mediaTooBig');return render()}
  mediaUp={name:file.name,pct:0};render();
  try{
    const s=await api('POST','api/media/sign',{type,size:file.size,name:file.name});
    await new Promise((ok,bad)=>{const x=new XMLHttpRequest();x.open('PUT',s.upload);x.setRequestHeader('Content-Type',type);
      x.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.round(e.loaded*100/e.total);if(p!==mediaUp.pct){mediaUp.pct=p;const b=document.querySelector('.mediaup progress');if(b){b.value=p;b.nextElementSibling.textContent=p+'%'}}}};
      x.onload=()=>x.status>=200&&x.status<300?ok():bad(new Error('put '+x.status));x.onerror=()=>bad(new Error('net'));x.send(file)});
    const r=await api('POST','api/media/done',{key:s.key,name:file.name});if(!MEDIA.some(m=>m.id===r.item.id))MEDIA.push(r.item)
  }catch(e){mediaErr=e&&e.code==='media_not_configured'?t('mediaOff'):t('mediaFail')}
  mediaUp=null;render()}
async function mediaDel(id){
  if(!confirm(t('mediaDelAsk')))return;
  try{await api('POST','api/media/del',{id});MEDIA=MEDIA.filter(m=>m.id!==id)}catch(e){mediaErr=t('mediaFail')}render()}
Object.assign(TX.th,{mediaTitle:'คลังวิดีโอ / เสียง',mediaSub:'ไฟล์วิดีโอ/เสียงที่ใช้เป็นพื้นหลังและ cutscene ของมินิเกม',mediaInProject:'ในโปรเจกต์',mediaHowT:'วิธีเพิ่มไฟล์',mediaHow1:'ใส่ไฟล์ (MP4 / WebM / MP3 / OGG / M4A) ในโฟลเดอร์ frontend/media/ ของโปรเจกต์ (ไฟล์ละไม่เกิน 100 MB)',mediaHow2:'git add . → commit → push แล้วรอ Render deploy เสร็จ',mediaHow3:'ไฟล์จะขึ้นในรายการนี้เอง เลือกใช้ในเกมได้ทันที',mediaAdd:'เพิ่มไฟล์ (MP4 / WebM / MP3)',mediaNone:'ยังไม่มีไฟล์',mediaOff:'ยังไม่ได้ตั้งค่า R2 ใน Render (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)',mediaBadType:'รองรับเฉพาะ MP4, WebM, MP3, OGG, M4A',mediaTooBig:'ไฟล์ใหญ่เกิน 400 MB',mediaFail:'อัปโหลดไม่สำเร็จ ตรวจ CORS และคีย์ของ R2 แล้วลองใหม่',mediaDelAsk:'ลบไฟล์นี้ออกจาก R2 ถาวร?'});
Object.assign(TX.en,{mediaTitle:'Video / audio library',mediaSub:'Video / audio files used as minigame backgrounds and cutscenes',mediaInProject:'in project',mediaHowT:'How to add a file',mediaHow1:'Put the file (MP4 / WebM / MP3 / OGG / M4A) in the project folder frontend/media/ (under 100 MB each)',mediaHow2:'git add . → commit → push and wait for Render to deploy',mediaHow3:'It then shows up in this list and can be used in a game at once',mediaAdd:'Add file (MP4 / WebM / MP3)',mediaNone:'No files yet',mediaOff:'R2 is not set up in Render yet (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)',mediaBadType:'Only MP4, WebM, MP3, OGG and M4A are supported',mediaTooBig:'File is over 400 MB',mediaFail:'Upload failed. Check R2 CORS and keys, then try again.',mediaDelAsk:'Delete this file from R2 for good?'});
