/* ---------- shell ---------- */
const $=s=>document.querySelector(s);
function render(){
  document.documentElement.lang=lang;
  syncPrefsUser();
  applySite(curTheme());applyLayout();
  const root=$('#root');
  /* replacing the whole tree makes the page momentarily empty, which would snap the scroll to the top: remember and restore it (same page only) */
  const SC='.stagemain,.tdfeed,.cpop,.ta-body,.mgescroll',keep=[...document.querySelectorAll(SC)].map(e=>e.scrollTop),sx=window.scrollX,sy=window.scrollY,k0=typeof FX!=='undefined'?FX.key:'';
  root.innerHTML=me()?renderApp():renderLogin();
  fxAfterRender();
  if(typeof FX==='undefined'||FX.key===k0){
    if(sy||sx)window.scrollTo(sx,sy);
    document.querySelectorAll(SC).forEach((e,i)=>{if(keep[i])e.scrollTop=keep[i]})}
}

