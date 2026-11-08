/* ---------- shell ---------- */
const $=s=>document.querySelector(s);
function render(){
  document.documentElement.lang=lang;
  syncPrefsUser();
  applySite(curTheme());
  const root=$('#root');
  root.innerHTML=me()?renderApp():renderLogin();
}

