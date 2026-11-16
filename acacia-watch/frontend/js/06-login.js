/* ---------- login ---------- */
function langSwitch(){return`<div class="lang" role="group" aria-label="Language"><button type="button" data-act="lang" data-v="th" aria-pressed="${lang==='th'}">ไทย</button><button type="button" data-act="lang" data-v="en" aria-pressed="${lang==='en'}">EN</button></div>`}
function renderLogin(){
  const up=authTab==='signup';
  const cv=SITE.cover?` style="background-image:linear-gradient(rgba(10,16,15,.5),rgba(10,16,15,.62)),url('${esc(SITE.cover)}');background-size:cover;background-position:center"`:'';
  return`<div class="login"${cv}><div class="login-card">
  <div class="login-top"><div class="brand">${brandHtml()}</div>${langSwitch()}</div>${SITE.tagline?`<p class="note" style="margin:-6px 0 0">${esc(SITE.tagline)}</p>`:''}
  <div class="tabs" role="tablist"><button role="tab" data-act="tab" data-v="signin" aria-selected="${!up}">${t('signin')}</button><button role="tab" data-act="tab" data-v="signup" aria-selected="${up}">${t('signup')}</button></div>
  <form class="stack" id="authForm" autocomplete="off" novalidate>
    <div class="field"><label for="a_user">${t('user')}</label><input id="a_user" name="user" autocapitalize="none" autocomplete="username"></div>
    ${up?`<div class="field"><label for="a_disp">${t('disp')}</label><input id="a_disp" name="disp"></div>`:''}
    <div class="field"><label for="a_pass">${t('pass')}</label><input id="a_pass" name="pass" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
    ${up?`<div class="field"><label for="a_pass2">${t('pass2')}</label><input id="a_pass2" name="pass2" type="password" autocomplete="new-password"></div>`:''}
    <div class="err" id="authErr" role="alert">${esc(authErr)}</div>
    <button class="btn primary" type="submit">${up?t('signup'):t('signin')}</button>
  </form>
  <p class="note">${up?t('firstNote')+' ':''}${REMOTE?t('serverNote'):t('protoNote')}</p></div></div>`;
}
async function submitAuth(form){
  const f=Object.fromEntries(new FormData(form));
  const name=(f.user||'').trim().toLowerCase();
  if(authTab==='signup'){
    if(!/^[a-z0-9_]{3,}$/.test(name))return authErr=t('eUser'),render();
    if((f.pass||'').length<6)return authErr=t('ePass'),render();
    if(f.pass!==f.pass2)return authErr=t('eMatch'),render();
    if(REMOTE)return remoteAuth('api/register',{name,disp:(f.disp||'').trim(),pass:f.pass});
    if(users.some(u=>u.name===name))return authErr=t('eTaken'),render();
    const salt=uid()+uid();
    const u={id:uid(),name,disp:(f.disp||'').trim()||name,role:users.length?'player':'admin',salt,hash:await hashPw(f.pass,salt)};
    users.push(u);put('dd_users',users);startSession(u);
  }else{
    if(REMOTE)return remoteAuth('api/login',{name,pass:f.pass||''});
    const u=users.find(x=>x.name===name);
    if(!u||u.hash!==await hashPw(f.pass||'',u.salt))return authErr=t('eBad'),render();
    startSession(u);
  }
}
async function remoteAuth(path,body){
  try{const j=await api('POST',path,body);applyBoot(j);netBar('');startSession(j.me)}
  catch(e){authErr=({bad_login:t('eBad'),name_taken:t('eTaken'),bad_name:t('eUser'),bad_pass:t('ePass'),too_many_attempts:t('eThrottle')})[e.code]||t('eNet');render()}
}
function startSession(u){session=u.id;put('dd_session',session);authErr='';edit=null;view='players';location.hash='players';render()}

