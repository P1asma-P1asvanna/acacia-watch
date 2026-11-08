/* ---------- shell ---------- */
const $=s=>document.querySelector(s);
function render(){
  document.documentElement.lang=lang;
  applySite(curSite());
  const root=$('#root');
  root.innerHTML=me()?renderApp():renderLogin();
}

