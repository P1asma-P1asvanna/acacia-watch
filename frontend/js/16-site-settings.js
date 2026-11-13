/* ---------- site settings (admin) ---------- */
const COLORS=[['bg','cBg','--bg'],['surface','cSurface','--surface'],['ink','cInk','--ink'],['accent','cAccent','--accent'],['side','cSide','--side'],['fxc','cFx','--fx-color'],['tnow','cTurnNow','--turn-now'],['tnext','cTurnNext','--turn-next'],['tdone','cTurnDone','--turn-done'],['navb','cNavb','--nav-edge'],['fxb','cFxb','--fxb']];
const hexOf=v=>/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():'#000000';
function mediaBlock(slot,label){
  const key=IMG_SLOTS[slot].key,d=(slot==='logo'||slot==='cover')?adminDraft:siteDraft,has=!!d[key];
  return`<div class="media"><div class="lbl">${label}</div>
   <div class="thumb ${slot}" ${has?`style="background-image:url('${esc(d[key])}')"`:''}>${has?'':`<span class="muted">${t('sNoImg')}</span>`}</div>
   <div class="acts" style="justify-content:flex-start"><label class="btn small">${t('sUpload')}<input class="sr" type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-img="${slot}" aria-label="${label}"></label>
   ${has?`<button class="btn small" data-act="simg-rm" data-k="${slot}">${t('sRemove')}</button>`:''}</div>
   <p class="rules">${ruleText(slot)}</p></div>`;
}
function renderSite(){
  const adm=isAdmin(),d=siteDraft||(siteDraft=siteInit()),cs=getComputedStyle(document.documentElement);
  const rows=COLORS.map(([k,lab,v])=>{const hex=hexOf(d[k]||cs.getPropertyValue(v).trim());
    return`<div class="crow"><label for="k_${k}">${t(lab)}</label><input type="color" id="k_${k}" data-sk="${k}" value="${hex}"><code id="hx_${k}">${hex}</code>
     ${d[k]?`<button class="btn small" data-act="sc-reset" data-k="${k}">${t('sDefault')}</button>`:`<span class="pill">${t('sDefault')}</span>`}</div>`}).join('');
  const radius=d.radius===undefined||d.radius===''||d.radius===null?parseInt(cs.getPropertyValue('--r'))||8:d.radius;
  return head(t('site'),t('siteSubP'),arrangeBtn('site'))+`
  ${arrangeBar('site')}<div class="wgrid${arrangePage==='site'?' arranging':''}" data-page="site">
  <section class="panel" data-w="colors">${wc('site','colors')}<div class="ph"><h2>${t('sColors')}</h2><span class="note">${t('sNote')}</span></div><div class="crows">${rows}</div></section>
  <section class="panel" data-w="decor">${wc('site','decor')}<div class="ph"><h2>${t('sDecor')}</h2><span class="note">${t('sDecorNote')}</span></div>
   <div class="medias">${mediaBlock('bg',t('sBg'))}${mediaBlock('panel',t('sPanelImg'))}${mediaBlock('deco',t('sDeco'))}</div>
   <div class="imgmsg err" role="alert">${esc(imgMsg)}</div>
   <div class="grid wide">
    <div class="field"><label for="s_dim">${t('sDim')}: <span id="v_dim">${d.dim??60}</span>%</label><input id="s_dim" data-s="dim" type="range" min="0" max="90" step="5" value="${d.dim??60}" style="padding:0"></div>
    <div class="field"><label for="s_pdim">${t('sPdim')}: <span id="v_pdim">${d.pdim??80}</span>%</label><input id="s_pdim" data-s="pdim" type="range" min="0" max="100" step="5" value="${d.pdim??80}" style="padding:0"></div>
    <div class="field"><label for="s_decoPos">${t('sDecoPos')}</label><select id="s_decoPos" data-s="decoPos">${['tl','tr','bl','br'].map(o=>`<option value="${o}" ${(d.decoPos||'br')===o?'selected':''}>${t('pos_'+o)}</option>`).join('')}</select></div>
    <div class="field"><label for="s_decoSize">${t('sDecoSize')}: <span id="v_decoSize">${d.decoSize||120}</span> px</label><input id="s_decoSize" data-s="decoSize" type="range" min="48" max="320" step="8" value="${d.decoSize||120}" style="padding:0"></div>
    <div class="field"><label for="s_decoOp">${t('sDecoOp')}: <span id="v_decoOp">${d.decoOp||100}</span>%</label><input id="s_decoOp" data-s="decoOp" type="range" min="10" max="100" step="5" value="${d.decoOp||100}" style="padding:0"></div>
    <div class="field"><label for="s_anim">${t('sAnim')}</label><select id="s_anim" data-s="anim"><option value="" ${d.anim?'':'selected'}>${t('animAuto')}</option><option value="on" ${d.anim==='on'?'selected':''}>${t('animOn')}</option><option value="off" ${d.anim==='off'?'selected':''}>${t('animOff')}</option></select></div></div>
   <p class="note" style="padding:0 16px 14px">${t('sGifNote')}</p></section>
  <section class="panel" data-w="fx">${wc('site','fx')}<div class="ph"><h2>${t('sFx')}</h2></div><div class="grid wide">
    <div class="field"><label for="s_fx">${t('fxStyle')}</label><select id="s_fx" data-s="fx">${['lift','glow','shine','bounce','none'].map(o=>`<option value="${o}" ${(d.fx||'lift')===o?'selected':''}>${t('fx_'+o)}</option>`).join('')}</select></div>
    <div class="field"><label for="s_fxms">${t('fxSpeed')}: <span id="v_fxms">${d.fxms||160}</span> ms</label><input id="s_fxms" data-s="fxms" type="range" min="60" max="500" step="20" value="${d.fxms||160}" style="padding:0"></div>
    <div class="field"><label for="s_fxamt">${t('fxAmt')}: <span id="v_fxamt">${d.fxamt??3}</span></label><input id="s_fxamt" data-s="fxamt" type="range" min="0" max="10" step="1" value="${d.fxamt??3}" style="padding:0"></div></div>
   <div class="fxprev"><span class="note">${t('fxPreview')}</span><button class="btn primary" type="button">${t('save')}</button><button class="btn" type="button">${t('edit')}</button><button class="btn small danger" type="button">${t('del')}</button></div></section>
  <section class="panel" data-w="shape">${wc('site','shape')}<div class="ph"><h2>${t('sShape')}</h2></div><div class="grid wide">
    <div class="field"><label for="s_radius">${t('sRadius')}: <span id="rv">${radius}</span>px</label><input id="s_radius" data-s="radius" type="range" min="0" max="20" step="1" value="${radius}" style="padding:0"></div>
    <div class="field"><label for="s_font">${t('sFont')}</label><select id="s_font" data-s="font"><option value="" ${d.font?'':'selected'}>${t('sDefault')} (Alegreya)</option>${Object.keys(FONTS).filter(f=>f!=='Alegreya').map(f=>`<option value="${f}" ${d.font===f?'selected':''}>${f==='Plex'?'IBM Plex Mono':f}</option>`).join('')}</select></div>
    <div class="field"><label for="s_pg">${t('sPage')}</label><select id="s_pg" data-s="pg">${[5,10,15,20,30,50].map(n=>`<option value="${n}" ${(Number(d.pg)||10)===n?'selected':''}>${n}</option>`).join('')}</select></div></div></section>
  </div>
  <div class="bar" style="padding:0"><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="srevert">${t('sRevert')}</button><button class="btn danger" data-act="sresetall">${dataArm==='siteReset'?t('sResetSure'):t('sResetAll')}</button></div>
   <div style="display:flex;gap:12px;align-items:center"><span class="note" role="status">${esc(siteMsg)}</span><button class="btn primary" data-act="ssave">${t('sSave')}</button></div></div>`;
}

function renderAdminSet(){
  const d=adminDraft||(adminDraft=adminInit());
  return head(t('adminset'),t('adminSub'),arrangeBtn('adminset'))+`
  ${arrangeBar('adminset')}<div class="wgrid${arrangePage==='adminset'?' arranging':''}" data-page="adminset">
  <section class="panel" data-w="identity">${wc('adminset','identity')}<div class="ph"><h2>${t('sIdentity')}</h2><span class="note">${t('sSharedNote')}</span></div><div class="grid wide">
    <div class="field"><label for="a_name">${t('sName')}</label><input id="a_name" data-ad="name" value="${esc(d.name||'')}" placeholder="${esc(t('brand'))}"></div>
    <div class="field"><label for="a_tag">${t('sTagline')}</label><input id="a_tag" data-ad="tagline" value="${esc(d.tagline||'')}"></div></div>
   <div class="medias">${mediaBlock('logo',t('sLogo'))}${mediaBlock('cover',t('sCover'))}</div>
   <div class="imgmsg err" role="alert">${esc(imgMsg)}</div>
   <div class="err" style="padding:0 16px 12px">${esc(siteErr)}</div></section>
  <section class="panel" data-w="rules">${wc('adminset','rules')}<div class="ph"><h2>${t('aRules')}</h2></div><div class="grid wide">
    <div class="field"><label for="a_abmax">${t('abMaxL')}</label><input id="a_abmax" data-ad="abMax" type="number" min="10" max="30" value="${d.abMax}"></div></div>
   <p class="note" style="padding:0 16px 14px">${t('abMaxNote')}</p></section>
  ${bkPanel()}</div>
  <div class="bar" style="padding:0"><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="arevert">${t('sRevert')}</button></div>
   <div style="display:flex;gap:12px;align-items:center"><span class="note" role="status">${esc(adminMsg)}</span><button class="btn primary" data-act="asave">${t('sSave')}</button></div></div>`;
}
