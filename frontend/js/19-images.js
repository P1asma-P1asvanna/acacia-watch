/* ---------- pictures: the upload rules, resizing, upload, and drawing backgrounds ----------
   The numbers below are the same as IMG_SLOTS in backend/acacia/config.py (the server checks them again). */
const KB=1024,MB=1024*1024;
const IMG_SLOTS={
  logo:{key:'logo',minShort:64,minLong:64,out:512,inBytes:1*MB,outBytes:200*KB,gifBytes:1*MB,gifSide:512},
  cover:{key:'cover',minShort:480,minLong:800,out:1920,inBytes:5*MB,outBytes:450*KB,gifBytes:2*MB,gifSide:1280},
  bg:{key:'imgBg',minShort:480,minLong:800,out:1920,inBytes:5*MB,outBytes:450*KB,gifBytes:2*MB,gifSide:1280},
  panel:{key:'imgPanel',minShort:256,minLong:256,out:1024,inBytes:3*MB,outBytes:300*KB,gifBytes:1*MB,gifSide:800},
  cond:{key:'icon',minShort:128,minLong:128,out:512,inBytes:2*MB,outBytes:150*KB,gifBytes:1*MB,gifSide:512},
  deco:{key:'imgDeco',minShort:64,minLong:64,out:512,inBytes:1*MB,outBytes:200*KB,gifBytes:1*MB,gifSide:512},
  pavatar:{key:'avatar',minShort:96,minLong:96,out:512,inBytes:2*MB,outBytes:200*KB,gifBytes:1*MB,gifSide:512},
  pbg:{key:'bg',minShort:200,minLong:600,out:1600,inBytes:5*MB,outBytes:400*KB,gifBytes:2*MB,gifSide:1280},
  cpic:{key:'pic',minShort:96,minLong:96,out:512,inBytes:3*MB,outBytes:200*KB,gifBytes:1*MB,gifSide:512},
  pcard:{key:'cardimg',minShort:96,minLong:96,out:512,inBytes:2*MB,outBytes:250*KB,gifBytes:1536*KB,gifSide:512,square:true},
  pframe:{key:'frameimg',minShort:160,minLong:160,out:640,inBytes:2*MB,outBytes:250*KB,gifBytes:1536*KB,gifSide:640,square:true}};
const SITE_SLOTS=['logo','cover','cond'];
const IMG_MAXPX=16000,IMG_STILL_IN=40*MB,IMG_MINBYTES=1*KB,IMG_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
let imgMsg='',imgBusy=false;
const fmtB=n=>n>=MB?(n/MB).toFixed(n%MB?1:0)+' MB':Math.round(n/KB)+' KB';
function ruleText(slot){
  const s=IMG_SLOTS[slot];
  return t('rTypes')+' · '+t('rAuto').replace('{out}',s.out)+' · '+t('rGif').replace('{b}',fmtB(s.gifBytes)).replace('{p}',s.gifSide);
}
const imgFail=code=>{const e=new Error(code);e.code=code;return e};
const imgErrText=(code,slot)=>{const s=IMG_SLOTS[slot]||{};return (t('e_'+code+(code==='img_quota'&&SITE_SLOTS.includes(slot)?'_site':''))||t('sImgErr')+' ['+code+']').replace('{in}',fmtB(s.inBytes||0)).replace('{gif}',fmtB(s.gifBytes||0)).replace('{out}',fmtB(s.outBytes||0)).replace('{s}',s.minShort).replace('{l}',s.minLong).replace('{max}',IMG_MAXPX).replace('{gp}',s.gifSide).replace('{q}',t('rQuota'))};
const loadImg=url=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(imgFail('img_read'));i.src=url});
const toB64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=()=>rej(imgFail('img_read'));r.readAsDataURL(blob)});
const toBlob=(c,type,q)=>new Promise(r=>c.toBlob(r,type,q));
/* check the file against the rules, shrink still pictures to fit, leave GIFs as they are */
async function prepImage(file,slot){
  const s=IMG_SLOTS[slot];
  if(!IMG_TYPES.includes(file.type))throw imgFail('img_type');
  const gif=file.type==='image/gif';
  if(file.size<IMG_MINBYTES)throw imgFail('img_small_file');
  if(file.size>(gif?s.gifBytes:IMG_STILL_IN))throw imgFail(gif?'img_big_gif':'img_big_file');
  const url=URL.createObjectURL(file);
  try{
    const img=await loadImg(url),w=img.naturalWidth,h=img.naturalHeight,short=Math.min(w,h),long=Math.max(w,h);
    if(long>IMG_MAXPX)throw imgFail('img_big_px');
    if(gif){if(s.square&&w!==h)throw imgFail('img_square');if(short<s.minShort||long<s.minLong)throw imgFail('img_small_px');if(long>s.gifSide)throw imgFail('img_big_gif_px');return{b64:await toB64(file),mime:file.type}}
    /* still pictures: any size is fine. A square slot gets the middle square; the result is shrunk until it fits the slot */
    const side=s.square?short:0,sx=s.square?Math.round((w-short)/2):0,sy=s.square?Math.round((h-short)/2):0,sw=s.square?short:w,sh=s.square?short:h,sl=Math.max(sw,sh);
    let sc=Math.min(1,s.out/sl);
    for(let tries=0;tries<12;tries++){
      const cw=Math.max(1,Math.round(sw*sc)),ch=Math.max(1,Math.round(sh*sc)),c=document.createElement('canvas');c.width=cw;c.height=ch;
      c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,cw,ch);
      for(const q of [.82,.7,.58,.46]){
        let b=await toBlob(c,'image/webp',q);
        if(!b||b.type!=='image/webp'){const c2=document.createElement('canvas');c2.width=cw;c2.height=ch;const x=c2.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(img,sx,sy,sw,sh,0,0,cw,ch);b=await toBlob(c2,'image/jpeg',q)}
        if(b&&b.size<=s.outBytes&&b.size>=100)return{b64:await toB64(b),mime:b.type};
      }
      sc*=.8;if(sl*sc<24)break;
    }
    throw imgFail('img_detail');
  }finally{URL.revokeObjectURL(url)}
}
/* upload one picture for a slot and put it in the settings draft (nothing is final until Save) */
async function uploadSlot(slot,file){
  if(imgBusy)return;const prof=['pavatar','pbg','pframe','pcard'].includes(slot),tgt=prof?profDraft:slot==='cpic'?(edit&&edit.draft):slot==='cond'?(dedit&&dedit.draft):(slot==='logo'||slot==='cover')?adminDraft:siteDraft;if(!tgt)return;
  const redraw=()=>{if(view==='site'||view==='adminset'||view==='profile'||(slot==='cpic'&&edit)||(slot==='cond'&&view==='data'))render()};
  /* still pictures that pass the basic checks go through the cropper first; GIFs and refused files skip it */
  if(IMG_TYPES.includes(file.type)&&file.type!=='image/gif'&&file.size>=IMG_MINBYTES&&file.size<=IMG_STILL_IN){const r=await cropImage(file,slot);if(!r)return;file=r}
  imgBusy=true;imgMsg=t('rWorking');redraw();
  try{
    const p=await prepImage(file,slot);
    let url;
    if(REMOTE){const r=await api('POST','api/img',{slot,data:p.b64});url=r.url}
    else url='data:'+p.mime+';base64,'+p.b64;
    if(slot==='pframe'){tgt.frame.img=url;tgt.frame.mode='image'}else if(slot==='pcard'){tgt.card.img=url;tgt.card.style='image'}else tgt[IMG_SLOTS[slot].key]=url;imgMsg='';profMsg='';
  }catch(e){imgMsg=imgErrText(e.code||(e.status===409?'img_quota':e.message),slot);if(e.status===409)imgMsg=imgErrText('img_quota',slot);if(prof)profMsg=imgMsg}
  imgBusy=false;redraw();
}
/* ---- drawing: background, panel texture and corner picture. One fixed layer each, no filters (keeps phones smooth) ---- */
const REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const STILLS={};
const isGif=u=>/\.gif$|^data:image\/gif/.test(u||'');
function stillOf(u){return STILLS[u]||(STILLS[u]=loadImg(u).then(i=>{const sc=Math.min(1,1280/Math.max(i.naturalWidth,i.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(i.naturalWidth*sc));c.height=Math.max(1,Math.round(i.naturalHeight*sc));c.getContext('2d').drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/webp',.8)}).catch(()=>u))}
function decorLayer(id){let e=document.getElementById(id);if(!e){e=document.createElement('div');e.id=id;e.setAttribute('aria-hidden','true');document.body.prepend(e)}return e}
function applyDecor(s){
  const animate=s.anim?s.anim==='on':!REDUCED;
  const show=(el,u,after)=>{
    if(!u){el.style.backgroundImage='';el.style.display='none';return}
    el.style.display='block';
    if(isGif(u)&&!animate){el.dataset.src=u;stillOf(u).then(d=>{if(el.dataset.src===u)el.style.backgroundImage=`url("${d}")`})}
    else{el.dataset.src=u;el.style.backgroundImage=`url("${u}")`}
    if(after)after(el)};
  const dim=Number(s.dim??60),r=document.documentElement;
  show(decorLayer('fxbg'),s.imgBg);
  const dm=decorLayer('fxdim');dm.style.display=s.imgBg?'block':'none';dm.style.opacity=String(dim/100);
  const dc=decorLayer('fxdeco');
  show(dc,s.imgDeco,el=>{const sz=Number(s.decoSize||120);el.style.width=el.style.height=sz+'px';el.style.opacity=String(Number(s.decoOp||100)/100);
    const p=s.decoPos||'br';el.style.top=p[0]==='t'?'12px':'auto';el.style.bottom=p[0]==='b'?'12px':'auto';el.style.left=p[1]==='l'?'12px':'auto';el.style.right=p[1]==='r'?'12px':'auto'});
  if(s.imgPanel){
    const set=u=>{r.style.setProperty('--panel-img',`url("${u}")`);r.classList.add('has-panelimg')};
    r.style.setProperty('--pdim',Number(s.pdim??80)+'%');
    if(isGif(s.imgPanel)&&!animate)stillOf(s.imgPanel).then(set);else set(s.imgPanel);
  }else{r.classList.remove('has-panelimg');r.style.removeProperty('--panel-img')}
}

/* ---- character portrait: shown cropped square on the sheet, in lists, in the initiative order and on pinned profile cards ---- */
const cpicHtml=(c,cls)=>`<span class="cpic ${cls||''}" aria-hidden="true">${c&&c.pic?`<img src="${esc(c.pic)}" alt="" loading="lazy" decoding="async">`:`<i>${esc(String((c&&c.name)||'?').trim().slice(0,1).toUpperCase()||'?')}</i>`}</span>`;
