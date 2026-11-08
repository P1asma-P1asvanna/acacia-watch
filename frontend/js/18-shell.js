/* ---------- shell ---------- */
const $=s=>document.querySelector(s);
function render(){
  document.documentElement.lang=lang;
  syncPrefsUser();
  applySite(curTheme());applyLayout();
  const root=$('#root');
  root.innerHTML=me()?renderApp():renderLogin();
}

