/* ---------- backup and import ---------- */
let bkShow=false,bkText='',bkMsg='';
const bkBuild=()=>JSON.stringify({app:'acacia-watch',version:1,exported:new Date().toISOString(),data:{users:REMOTE?users.map(u=>({...u,salt:'',hash:''})):users,pcs,npcs,cat:CAT,site:SITE,rooms}});
const bkOkArr=(a,f)=>Array.isArray(a)&&a.every(x=>x&&typeof x==='object'&&f(x));
function bkApply(text){
  let o;try{o=JSON.parse(text)}catch(e){return{err:t('bkBad')}}
  if(!o||(o.app!=='acacia-watch'&&o.app!=='dungeon-desk')||!o.data||typeof o.data!=='object')return{err:t('bkBadApp')};
  const d=o.data,str=v=>typeof v==='string';
  if(!bkOkArr(d.users,u=>str(u.id)&&str(u.name)&&str(u.salt)&&str(u.hash)&&(u.role==='admin'||u.role==='player'))||!bkOkArr(d.pcs,c=>str(c.id)&&c.abil&&typeof c.abil==='object')||!bkOkArr(d.npcs,c=>str(c.id)&&c.abil&&typeof c.abil==='object')||!bkOkArr(d.rooms,r=>str(r.id)&&Array.isArray(r.assign))||!d.cat||typeof d.cat!=='object'||Array.isArray(d.cat)||!d.site||typeof d.site!=='object'||Array.isArray(d.site))return{err:t('bkBad')};
  if(!d.users.some(u=>u.role==='admin'))return{err:t('bkNoAdmin')};
  if(REMOTE)return api('POST','api/import',d).then(async()=>{applyBoot(await api('GET','api/boot'));siteDraft=siteInit();edit=null;dedit=null;roomOpen=null;roomEdit=null;return{ok:true}}).catch(()=>({err:t('netSaveFail')}));
  users=d.users;pcs=d.pcs;npcs=d.npcs;CAT=d.cat;SITE=d.site;rooms=d.rooms;
  normCat();siteDraft=siteInit();edit=null;dedit=null;roomOpen=null;roomEdit=null;
  const ok=[put('dd_users',users),put('dd_pcs',pcs),put('dd_npcs',npcs),put('dd_cat',CAT),put('dd_site',SITE),put('dd_rooms',rooms)].every(Boolean);
  return{ok};
}
async function bkAction(a){
  if(a!=='bk-import')dataArm=null;
  if(a==='bk-show'){bkShow=!bkShow;bkMsg='';render();return}
  if(a==='bk-dl'){
    const text=bkBuild(),name='acacia-watch-backup-'+new Date().toISOString().slice(0,10)+'.json';let done=false;
    try{const dl=await claude.use('downloads');if(dl){await dl.save({filename:name,data:text});bkMsg=t('bkSaved');done=true}}
    catch(e){if(e&&e.code==='declined'){render();return}}
    if(!done){try{const u=URL.createObjectURL(new Blob([text],{type:'application/json'})),x=document.createElement('a');x.href=u;x.download=name;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);bkMsg=t('bkSaved')}catch(e){bkMsg=t('bkDlFail')}}
    render();return}
  if(a==='bk-copy'){
    try{await navigator.clipboard.writeText(bkBuild());bkMsg=t('bkCopied');render()}
    catch(e){bkShow=true;bkMsg=t('bkCopyManual');render();const el=document.getElementById('bk_out');if(el){el.focus();el.select()}}
    return}
  if(a==='bk-import'){
    if(!bkText.trim()){bkMsg=t('bkEmpty');render();return}
    if(dataArm!=='bkImport'){dataArm='bkImport';bkMsg='';render();return}
    dataArm=null;const r=await bkApply(bkText);
    if(r.err){bkMsg=r.err;render();return}
    bkText='';bkMsg=r.ok?t('bkDone'):t('bkDoneTemp');
    if(!me()){session=null;put('dd_session',null);authTab='signin';authErr=t('bkRelogin')}
    render()}
}
function bkPanel(){
  return`<section class="panel" data-w="backup">${wc('site','backup')}<div class="ph"><h2>${t('bkTitle')}</h2><span class="note">${t('bkNote')}</span></div><div class="bkbody">
   <div class="bkrow"><button class="btn primary" data-act="bk-dl">${t('bkDownload')}</button><button class="btn" data-act="bk-copy">${t('bkCopy')}</button><button class="btn" data-act="bk-show">${bkShow?t('bkHide'):t('bkShowText')}</button></div>
   ${bkShow?`<textarea class="bktext" readonly id="bk_out" aria-label="${t('bkTitle')}">${esc(bkBuild())}</textarea>`:''}
   <h3 style="margin:8px 0 0">${t('bkImport')}</h3><p class="note" style="margin:0">${t('bkImportNote')}</p>
   <div class="bkrow"><input type="file" id="bk_file" data-bk="file" accept=".json,application/json"></div>
   <textarea class="bktext" id="bk_in" data-bk="text" aria-label="${t('bkImport')}" placeholder="${t('bkPaste')}">${esc(bkText)}</textarea>
   <div class="bkrow"><button class="btn danger" data-act="bk-import">${dataArm==='bkImport'?t('bkSure'):t('bkDoImport')}</button><span class="note" role="status">${esc(bkMsg)}</span></div></div></section>`;
}
let siteErr='';

