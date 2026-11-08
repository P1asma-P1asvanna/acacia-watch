/* ---------- site settings (admin) ---------- */
const COLORS=[['bg','cBg','--bg'],['surface','cSurface','--surface'],['ink','cInk','--ink'],['accent','cAccent','--accent'],['side','cSide','--side'],['fxc','cFx','--fx-color'],['tnow','cTurnNow','--turn-now'],['tnext','cTurnNext','--turn-next'],['tdone','cTurnDone','--turn-done']];
const hexOf=v=>/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():'#000000';
function mediaBlock(k,label){
  const d=siteDraft,has=!!d[k];
  return`<div class="media"><div class="lbl">${label}</div>
   <div class="thumb ${k}" ${has?`style="background-image:url('${esc(d[k])}')"`:''}>${has?'':`<span class="muted">${t('sNoImg')}</span>`}</div>
   <div class="acts" style="justify-content:flex-start"><label class="btn small">${t('sUpload')}<input class="sr" type="file" accept="image/*" data-img="${k}" aria-label="${label}"></label>
   ${has?`<button class="btn small" data-act="simg-rm" data-k="${k}">${t('sRemove')}</button>`:''}</div></div>`;
}
function renderSite(){
  const d=siteDraft||(siteDraft=clone(SITE)),cs=getComputedStyle(document.documentElement);
  const rows=COLORS.map(([k,lab,v])=>{const hex=hexOf(d[k]||cs.getPropertyValue(v).trim());
    return`<div class="crow"><label for="k_${k}">${t(lab)}</label><input type="color" id="k_${k}" data-sk="${k}" value="${hex}"><code id="hx_${k}">${hex}</code>
     ${d[k]?`<button class="btn small" data-act="sc-reset" data-k="${k}">${t('sDefault')}</button>`:`<span class="pill">${t('sDefault')}</span>`}</div>`}).join('');
  const radius=d.radius===undefined||d.radius===''||d.radius===null?parseInt(cs.getPropertyValue('--r'))||8:d.radius;
  return head(t('site'),t('siteSub'))+`
  <section class="panel"><div class="ph"><h2>${t('sIdentity')}</h2></div><div class="grid wide">
    <div class="field"><label for="s_name">${t('sName')}</label><input id="s_name" data-s="name" value="${esc(d.name||'')}" placeholder="${esc(t('brand'))}"></div>
    <div class="field"><label for="s_tag">${t('sTagline')}</label><input id="s_tag" data-s="tagline" value="${esc(d.tagline||'')}"></div></div>
   <div class="medias">${mediaBlock('logo',t('sLogo'))}${mediaBlock('cover',t('sCover'))}</div>
   <div class="err" style="padding:0 16px 12px">${esc(siteErr)}</div></section>
  <section class="panel"><div class="ph"><h2>${t('sColors')}</h2><span class="note">${t('sNote')}</span></div><div class="crows">${rows}</div></section>
  <section class="panel"><div class="ph"><h2>${t('sFx')}</h2></div><div class="grid wide">
    <div class="field"><label for="s_fx">${t('fxStyle')}</label><select id="s_fx" data-s="fx">${['lift','glow','shine','bounce','none'].map(o=>`<option value="${o}" ${(d.fx||'lift')===o?'selected':''}>${t('fx_'+o)}</option>`).join('')}</select></div>
    <div class="field"><label for="s_fxms">${t('fxSpeed')}: <span id="v_fxms">${d.fxms||160}</span> ms</label><input id="s_fxms" data-s="fxms" type="range" min="60" max="500" step="20" value="${d.fxms||160}" style="padding:0"></div>
    <div class="field"><label for="s_fxamt">${t('fxAmt')}: <span id="v_fxamt">${d.fxamt??3}</span></label><input id="s_fxamt" data-s="fxamt" type="range" min="0" max="10" step="1" value="${d.fxamt??3}" style="padding:0"></div></div>
   <div class="fxprev"><span class="note">${t('fxPreview')}</span><button class="btn primary" type="button">${t('save')}</button><button class="btn" type="button">${t('edit')}</button><button class="btn small danger" type="button">${t('del')}</button></div></section>
  <section class="panel"><div class="ph"><h2>${t('sShape')}</h2></div><div class="grid wide">
    <div class="field"><label for="s_radius">${t('sRadius')}: <span id="rv">${radius}</span>px</label><input id="s_radius" data-s="radius" type="range" min="0" max="20" step="1" value="${radius}" style="padding:0"></div>
    <div class="field"><label for="s_font">${t('sFont')}</label><select id="s_font" data-s="font"><option value="" ${d.font?'':'selected'}>${t('sDefault')} (Alegreya)</option>${Object.keys(FONTS).filter(f=>f!=='Alegreya').map(f=>`<option value="${f}" ${d.font===f?'selected':''}>${f==='Plex'?'IBM Plex Mono':f}</option>`).join('')}</select></div></div></section>
  <div class="bar" style="padding:0"><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="srevert">${t('sRevert')}</button><button class="btn danger" data-act="sresetall">${dataArm==='siteReset'?t('sResetSure'):t('sResetAll')}</button></div>
   <div style="display:flex;gap:12px;align-items:center"><span class="note" role="status">${esc(siteMsg)}</span><button class="btn primary" data-act="ssave">${t('sSave')}</button></div></div>${bkPanel()}`;
}
