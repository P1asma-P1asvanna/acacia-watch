/* ---------- picture cropper: pick the part of a still picture that is used, before it is uploaded ----------
   GIFs skip this step (a canvas would freeze them). Aspect options per slot: 1 = square, 0 = keep the picture's own shape, else width/height. */
const CROP_ASP={logo:[0,1],cover:[16/5,16/9,0],bg:[16/9,0],panel:[0,1],cond:[1],deco:[0,1],pavatar:[1],pbg:[16/9,3,0],cpic:[1],pcard:[1],pframe:[1]};
const cropAspLabel=a=>a===1?'1:1':a===0?t('cropOwn'):a===16/9?'16:9':a===16/5?'16:5':a===3?'3:1':a.toFixed(2);
function cropImage(file,slot){
  return new Promise(async resolve=>{
    let img;const url=URL.createObjectURL(file);
    try{img=await loadImg(url)}catch(e){URL.revokeObjectURL(url);resolve(file);return}   /* unreadable: let the normal check report it */
    const W=img.naturalWidth,H=img.naturalHeight,opts=CROP_ASP[slot]||[0],s=IMG_SLOTS[slot];
    let asp=opts[0]===0?W/H:opts[0];
    const box=Math.min(340,Math.max(220,innerWidth-64));
    let bw,bh,min,sc,ox,oy,zoom=1;
    const layout=()=>{ if(asp>=1){bw=box;bh=Math.round(box/asp)}else{bh=box;bw=Math.round(box*asp)}
      min=Math.max(bw/W,bh/H);sc=min*zoom;ox=Math.min(0,Math.max(bw-W*sc,ox==null?(bw-W*sc)/2:ox));oy=Math.min(0,Math.max(bh-H*sc,oy==null?(bh-H*sc)/2:oy))};
    ox=null;oy=null;layout();
    const root=document.createElement('div');root.className='cropwrap';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',t('cropT'));
    const sizeNote=()=>{const rw=Math.round(bw/sc),rh=Math.round(bh/sc);return fill(t('cropSel'),{w:rw,h:rh,m:s.minShort})+(Math.min(rw,rh)<s.minShort?' ⚠':'')};
    root.innerHTML=`<div class="cropbox"><h3>${t('cropT')}</h3><p class="note">${t('cropHint')}</p>
     ${opts.length>1?`<div class="cropasp" role="group">${opts.map((a,i)=>`<button type="button" class="btn small" data-crop-asp="${i}" aria-pressed="${i===0}">${esc(cropAspLabel(a))}</button>`).join('')}</div>`:''}
     <div class="cropstage" tabindex="0"><canvas></canvas></div>
     <label class="cropz"><span>${t('cropZoom')}</span><input type="range" min="1" max="4" step="0.01" value="1" aria-label="${t('cropZoom')}"></label>
     <p class="note cropsel" role="status"></p>
     <div class="cropacts"><button type="button" class="btn" data-crop="cancel">${t('pfCancel')}</button><button type="button" class="btn" data-crop="whole">${t('cropWhole')}</button><button type="button" class="btn primary" data-crop="ok">${t('cropOk')}</button></div></div>`;
    document.body.appendChild(root);
    const cv=root.querySelector('canvas'),stage=root.querySelector('.cropstage'),rng=root.querySelector('input[type=range]'),note=root.querySelector('.cropsel');
    const clamp=()=>{ox=Math.min(0,Math.max(bw-W*sc,ox));oy=Math.min(0,Math.max(bh-H*sc,oy))};
    const draw=()=>{cv.width=bw;cv.height=bh;stage.style.width=bw+'px';stage.style.height=bh+'px';const x=cv.getContext('2d');x.drawImage(img,ox,oy,W*sc,H*sc);note.textContent=sizeNote()};
    const setZoom=(z,cx,cy)=>{z=Math.max(1,Math.min(4,z));const old=sc;zoom=z;sc=min*zoom;const px=(cx-ox)/old,py=(cy-oy)/old;ox=cx-px*sc;oy=cy-py*sc;clamp();rng.value=zoom;draw()};
    draw();
    const ptr=new Map();let pinch=0;
    stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);ptr.set(e.pointerId,[e.clientX,e.clientY]);pinch=0});
    stage.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;const p=ptr.get(e.pointerId);
      if(ptr.size===1){ox+=e.clientX-p[0];oy+=e.clientY-p[1];ptr.set(e.pointerId,[e.clientX,e.clientY]);clamp();draw()}
      else if(ptr.size===2){ptr.set(e.pointerId,[e.clientX,e.clientY]);const [a,b]=[...ptr.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)setZoom(zoom*d/pinch,bw/2,bh/2);pinch=d}});
    const up=e=>{ptr.delete(e.pointerId);pinch=0};stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
    stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();setZoom(zoom*(e.deltaY<0?1.1:.9),e.clientX-r.left,e.clientY-r.top)},{passive:false});
    stage.addEventListener('keydown',e=>{const k={ArrowLeft:[20,0],ArrowRight:[-20,0],ArrowUp:[0,20],ArrowDown:[0,-20]}[e.key];if(k){e.preventDefault();ox+=k[0];oy+=k[1];clamp();draw()}});
    rng.addEventListener('input',()=>setZoom(Number(rng.value),bw/2,bh/2));
    const prevFocus=document.activeElement;
    const close=v=>{document.removeEventListener('keydown',onKey,true);root.remove();URL.revokeObjectURL(url);document.body.style.overflow=bo;if(prevFocus&&prevFocus.focus)try{prevFocus.focus()}catch(e){}resolve(v)};
    const onKey=e=>{if(e.key==='Escape'){e.stopPropagation();close(null)}};document.addEventListener('keydown',onKey,true);
    const bo=document.body.style.overflow;document.body.style.overflow='hidden';
    root.addEventListener('click',async e=>{
      const a=e.target.closest('[data-crop-asp]');
      if(a){asp=opts[+a.dataset.cropAsp]===0?W/H:opts[+a.dataset.cropAsp];root.querySelectorAll('[data-crop-asp]').forEach(b=>b.setAttribute('aria-pressed',b===a));zoom=1;rng.value=1;ox=null;oy=null;layout();draw();return}
      const b=e.target.closest('[data-crop]');if(!b)return;
      if(b.dataset.crop==='cancel')close(null);
      else if(b.dataset.crop==='whole')close(file);
      else{const sw=Math.round(bw/sc),sh=Math.round(bh/sc),sx=Math.round(-ox/sc),sy=Math.round(-oy/sc),k=Math.min(1,s.out/Math.max(sw,sh)),ow=Math.max(1,Math.round(sw*k)),oh=s.square||asp===1?ow:Math.max(1,Math.round(sh*k));
        const c=document.createElement('canvas');c.width=ow;c.height=oh;c.getContext('2d').drawImage(img,Math.min(sx,W-sw),Math.min(sy,H-sh),sw,sh,0,0,ow,oh);
        const blob=await toBlob(c,'image/webp',.92)||await toBlob(c,'image/jpeg',.92);close(new File([blob],'crop.'+(blob.type==='image/webp'?'webp':'jpg'),{type:blob.type}))}
    });
    (root.querySelector('[data-crop=ok]')).focus();
  });
}
Object.assign(TX.th,{cropT:'เลือกส่วนของรูปที่ต้องการ',cropHint:'ลากรูปเพื่อเลื่อน ใช้แถบ/ล้อเมาส์/บีบสองนิ้วเพื่อซูม ส่วนที่เห็นในกรอบคือส่วนที่จะถูกใช้',cropZoom:'ซูม',cropOk:'ใช้ส่วนนี้',cropWhole:'ใช้รูปทั้งใบ',cropOwn:'ตามรูป',cropSel:'ส่วนที่เลือก {w}×{h} px (ควรไม่ต่ำกว่า {m} px ไม่งั้นภาพอาจเบลอ)'});
Object.assign(TX.en,{cropT:'Choose the part of the picture',cropHint:'Drag to move, use the slider, mouse wheel or two fingers to zoom. What is inside the frame is what gets used.',cropZoom:'Zoom',cropOk:'Use this part',cropWhole:'Use whole picture',cropOwn:'Original',cropSel:'Selected {w}×{h} px (best at {m} px or more, smaller may look blurry)'});
