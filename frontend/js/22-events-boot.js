/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const sb=e.target.closest('#authForm [type=submit]');if(sb){e.preventDefault();submitAuth(sb.form);return}
  const ia=e.target.closest('[data-ita]');
  if(ia&&edit){const d0=edit.draft;if(ia.dataset.ita==='add'){const it={id:uid(),name:'',qty:1,src:''};d0.items.push(it);refreshItems('it_n_'+it.id)}else{d0.items=d0.items.filter(x=>x.id!==ia.dataset.id);refreshItems()}return}
  const wa=e.target.closest('[data-wa]');
  if(wa&&edit){const d0=edit.draft;if(wa.dataset.wa==='add'){const v=document.getElementById('w_add').value;if(v){d0.weapons.push({id:uid(),ref:v,bonus:0});refreshWeapons()}}else{d0.weapons=d0.weapons.filter(x=>x.id!==wa.dataset.id);refreshWeapons()}return}
  const ha=e.target.closest('[data-hpa]');
  if(ha&&edit){hpAction(ha.dataset.hpa,ha.id);return}
  const aa=e.target.closest('[data-asia]');
  if(aa&&edit){asiClick(aa.dataset.asia,aa);return}
  const pt=e.target.closest('[data-pt]');
  if(pt&&edit){const[kind,k]=pt.dataset.pt.split(':'),dd=edit.draft;dd.prof=dd.prof||{save:{},skill:{}};dd.prof[kind]=dd.prof[kind]||{};const cur=profLevel(dd,kind,k);let nx=(cur+1)%3;if(nx===0&&kind==='skill'&&bgSkills(dd).includes(k))nx=1;dd.prof[kind][k]=nx;refreshProf(pt.id);$('#derived').innerHTML=derived(dd);return}
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,v=b.dataset.v,k=b.dataset.k,id=b.dataset.id;
  if(a==='arrange'||a.startsWith('w-')){layAction(a,b.dataset.page,id);return}
  if(['nav','back','edit','new','save','del-edit','open','ropen','rclose'].includes(a))arrangePage=null;
  if(a.startsWith('bk-')){bkAction(a);return}
  if(a.startsWith('ini-')){iniAction(a,id);return}
  if(a.startsWith('cb-')||a.startsWith('fx-')||a.startsWith('q-')){cbAction(a,b);return}
  if(a==='lang'){lang=v;put('dd_lang',lang);render()}
  else if(a==='tab'){authTab=v;authErr='';render()}
  else if(a==='logout'){if(REMOTE){api('POST','api/logout',{}).catch(()=>{});users=[];pcs=[];npcs=[];rooms=[];netBar('')}session=null;put('dd_session',null);edit=null;dedit=null;siteDraft=null;roomOpen=null;roomEdit=null;authTab='signin';render()}
  else if(a==='nav'){condPop=null;view=v;edit=null;dedit=null;delArm=null;dataArm=null;flashMsg='';siteDraft=v==='site'?siteInit():null;siteMsg='';siteErr='';roomOpen=null;roomEdit=null;location.hash=v;render();pull()}
  else if(a==='new'){edit={kind:k,draft:blank(k),isNew:true};delArm=null;render()}
  else if(a==='edit'){const r=list(k).find(x=>x.id===id);edit={kind:k,draft:JSON.parse(JSON.stringify(r)),isNew:false};delArm=null;render()}
  else if(a==='back'){edit=null;delArm=null;render()}
  else if(a==='save'){
    const L=list(edit.kind),d=edit.draft,i=L.findIndex(x=>x.id===d.id);
    if(!d.name.trim())d.name=lang==='th'?'ไม่มีชื่อ':'Unnamed';
    d.ac=effAc(d);d.hp=effMax(d);if(d.hpCur!=null)d.hpCur=curOf(d,d.hp);
    if(i>=0)L[i]=d;else L.push(d);commit(edit.kind);edit=null;render()}
  else if(a==='del'||a==='del-edit'){
    const kind=a==='del'?k:edit.kind,rid=a==='del'?id:edit.draft.id;
    if(delArm!==rid){delArm=rid;render();return}
    const L=list(kind),i=L.findIndex(x=>x.id===rid);if(i>=0)L.splice(i,1);commit(kind);delArm=null;edit=null;render()}
  else if(a==='pwset'){const inp=document.getElementById('pw_'+id),pw=inp?inp.value:'';if(pw.length<6){flashMsg=t('pwShort');render();return}
    api('POST','api/users/'+id+'/password',{pass:pw}).then(()=>{flashMsg=t('pwDone');render()}).catch(e=>{flashMsg=t('netSaveFail');render()})}
  else if(a==='userdel'){if(dataArm!=='udel_'+id){dataArm='udel_'+id;render();return}dataArm=null;
    api('POST','api/users/'+id+'/delete',{}).then(()=>{users=users.filter(x=>x.id!==id);pcs.forEach(r=>{if(r.owner===id)r.owner=''});resetSynced();flashMsg='';render()}).catch(e=>{flashMsg=e.code==='last_admin'?t('lastAdmin'):t('netSaveFail');render()})}
  else if(a==='sample'){sample(k).forEach(x=>list(k).push(x));commit(k);render()}
  else if(a==='radd'){roomEdit={draft:{id:uid(),name:'',seats:4,assign:[]},isNew:true};roomErr='';render()}
  else if(a==='redit'){roomEdit={draft:clone(rooms.find(x=>x.id===id)),isNew:false};roomErr='';render()}
  else if(a==='rback'){roomEdit=null;roomErr='';render()}
  else if(a==='rsave'){
    const d=roomEdit.draft,n=Math.round(Number(d.seats));
    if(!(n>=1&&n<=MAXSEATS)){roomErr=t('errSeats');return render()}
    d.seats=n;d.name=String(d.name||'').trim()||t('roomDefault')+' '+(rooms.length+(roomEdit.isNew?1:0));
    d.assign=Array.from({length:n},(_,i)=>d.assign[i]||'');
    const i=rooms.findIndex(x=>x.id===d.id);if(i>=0)rooms[i]=d;else rooms.push(d);
    saveRooms();roomEdit=null;roomErr='';render()}
  else if(a==='rdel'){if(dataArm!=='room:'+id){dataArm='room:'+id;render();return}rooms=rooms.filter(x=>x.id!==id);saveRooms();dataArm=null;render()}
  else if(a==='ropen'){roomOpen=id;render()}
  else if(a==='rclose'){roomOpen=null;render()}
  else if(a==='rgame'){advGame=v;render()}
  else if(a==='simg-rm'){siteDraft[IMG_SLOTS[k].key]='';siteErr='';imgMsg='';render()}
  else if(a==='sc-reset'){delete siteDraft[k];render()}
  else if(a==='srevert'){siteDraft=siteInit();siteMsg='';siteErr='';render()}
  else if(a==='ssave'){
    const d=siteDraft,g={},p={};
    GLOBAL_KEYS.forEach(x=>{if(d[x])g[x]=d[x]});PREF_KEYS.forEach(x=>{if(d[x]!==undefined&&d[x]!==''&&d[x]!==null)p[x]=d[x]});
    let ok=true;if(isAdmin()){SITE=g;ok=put('dd_site',SITE)}
    if(PREFS.lay)p.lay=PREFS.lay;else delete p.lay;
    PREFS=p;ok=savePrefs()&&ok;siteMsg=ok?t('sSaved'):t('sSavedTemp');siteDraft=siteInit();render()}
  else if(a==='sresetall'){if(dataArm!=='siteReset'){dataArm='siteReset';render();return}PREFS={};savePrefs();siteDraft=siteInit();dataArm=null;siteMsg=t('sSaved');render()}
  else if(a.startsWith('cr-')&&dedit){condRuleClick(a,b)}
  else if(a==='cpop'){condPop=id;render()}
  else if(a==='cpop-x'){condPop=null;render()}
  else if(a==='cicon-rm'){dedit.draft.icon='';imgMsg='';render()}
  else if(a==='ccol-reset'){dedit.draft.color='';render()}
  else if(a==='cond'){condOpen.has(id)?condOpen.delete(id):condOpen.add(id);render()}
  else if(a==='cond-all'){condOpen=v==='1'?new Set((CAT.conditions||[]).map(c=>c.id)):new Set();render()}
  else if(a==='cond-edit'){view='data';dataTab='conditions';dataPage=0;dedit=null;location.hash='data';render()}
  else if(a==='dtab'){dataTab=v;dataPage=0;dataArm=null;render()}
  else if(a==='dpage'){dataPage+=Number(v)||0;render()}
  else if(a==='dnew'){dedit={cat:dataTab,draft:blankItem(dataTab),isNew:true};dataErr='';dataArm=null;render()}
  else if(a==='dedit'){dedit={cat:dataTab,draft:clone(CAT[dataTab].find(x=>x.id===id)),isNew:false};dataErr='';dataArm=null;render()}
  else if(a==='dback'){dedit=null;dataErr='';dataArm=null;render()}
  else if(a==='dsave'){saveData()}
  else if(a==='ddel'||a==='ddel-edit'){
    const rid=a==='ddel'?id:dedit.draft.id,c=a==='ddel'?dataTab:dedit.cat;
    if(dataArm!==rid){dataArm=rid;render();return}
    CAT[c]=CAT[c].filter(x=>x.id!==rid);put('dd_cat',CAT);dataArm=null;dedit=null;render()}
  else if(a==='dreset'){if(dataArm!=='reset'){dataArm='reset';render();return}CAT[dataTab]=clone(SEED[dataTab]);put('dd_cat',CAT);dataArm=null;render()}
  else if(a==='ftadd'){dedit.draft.feats=dedit.draft.feats||[];dedit.draft.feats.push({id:uid(),name:'',lvl:1,desc:''});render()}
  else if(a==='ftdel'){dedit.draft.feats.splice(Number(b.dataset.i),1);render()}
  else if(a==='subadd'){dedit.draft.subs.push({id:uid(),name:'',alt:'',bhp:'',prof:''});render()}
  else if(a==='subdel'){dedit.draft.subs.splice(Number(b.dataset.i),1);render()}
  else if(a==='side'){diceSides=Number(v);render()}
  else if(a==='roll'){doRoll()}
});
document.addEventListener('submit',e=>{if(e.target.id==='authForm'){e.preventDefault();submitAuth(e.target)}});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.bk){if(el.dataset.bk==='text')bkText=el.value;return}
  if(view==='site'&&siteDraft&&(el.dataset.sk||el.dataset.s)){
    if(el.dataset.sk){siteDraft[el.dataset.sk]=el.value;const h=$('#hx_'+el.dataset.sk);if(h)h.textContent=el.value}
    else{const f=el.dataset.s;siteDraft[f]=['radius','fxms','fxamt','dim','pdim','decoSize','decoOp'].includes(f)?Number(el.value):el.value;const sp=f==='radius'?$('#rv'):$('#v_'+f);if(sp)sp.textContent=el.value}
    applySite(siteDraft);const bd=document.querySelector('.side .brand');if(bd)bd.innerHTML=brandHtml();return;
  }
  if(roomEdit&&el.dataset.r){roomEdit.draft[el.dataset.r]=el.value;return}
  if(dedit){
    const dd=dedit.draft;
    if(condRuleEdit(el))return;
    if(el.dataset.cf){const f=el.dataset.cf;dd[f]=el.tagName==='SELECT'?(f==='cat'?el.value:Number(el.value)):(el.type==='number'?(el.value===''?'':Number(el.value)):el.value)}
    else if(el.dataset.sf){dd.subs[Number(el.dataset.si)][el.dataset.sf]=el.value}
    else if(el.dataset.ftf){const f=(dd.feats||[])[Number(el.dataset.fti)];if(f)f[el.dataset.ftf]=el.dataset.ftf==='lvl'?Number(el.value):el.value}
    else if(el.dataset.bgs){const a=dd.sk=dd.sk||[],k=el.dataset.bgs,ix=a.indexOf(k);if(el.checked&&ix<0)a.push(k);if(!el.checked&&ix>=0)a.splice(ix,1)}
    return;
  }
  if(!edit)return;const d=edit.draft;
  if(el.dataset.it){const it=d.items.find(x=>x.id===el.dataset.id);if(it){if(el.dataset.it==='name'){it.name=el.value;schedRefresh({a:1})}else if(el.dataset.it==='qty')it.qty=Math.max(1,Math.round(num(el.value))||1)}return}
  if(el.dataset.ac){if(el.dataset.ac==='mode'){d.acMode=el.value;refreshAc('ac_mode');return}d.acManual=el.value;const av=document.getElementById('ac_val');if(av)av.textContent=effAc(d);return}
  if(el.dataset.hp){const h=el.dataset.hp;
    if(h==='mode'){d.hpMode=el.value;refreshHp('hp_mode');return}
    if(h==='cur')d.hpCur=el.value===''?null:Math.max(0,Math.round(num(el.value)));
    else if(h==='temp')d.hpTemp=Math.max(0,Math.round(num(el.value)));
    else if(h==='manual')d.hpManual=el.value;
    updateHpBar();return}
  if(el.dataset.a){d.abil[el.dataset.a]=Number(el.value)||10;refreshAbil(d);schedRefresh({h:el.dataset.a==='con',a:el.dataset.a==='dex'||el.dataset.a==='str'})}
  else if(el.dataset.f&&el.tagName!=='SELECT'){
    const f=el.dataset.f;d[f]=el.type==='number'?Number(el.value):el.value;
    if(f==='level'||f==='dex')$('#derived').innerHTML=derived(d);
    if(f==='level'){schedRefresh({h:1,f:1});refreshAsi()}
  }
});
document.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.bk==='file'){const f=el.files&&el.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>{bkText=String(fr.result||'');bkMsg=fill(t('bkLoaded'),{n:Math.round(bkText.length/1024)});dataArm=null;render()};fr.onerror=()=>{bkMsg=t('bkBad');render()};fr.readAsText(f);return}
  if(el.dataset.sk){render();return}
  if(el.dataset.ini){iniChange(el);return}
  if(el.dataset.it&&edit){itChange(el);return}
  if(el.dataset.ac&&edit&&el.dataset.ac==='mode'){edit.draft.acMode=el.value;refreshAc('ac_mode');return}
  if(el.dataset.seat!==undefined){const rm=rooms.find(r=>r.id===roomOpen);if(rm){rm.assign[Number(el.dataset.seat)]=el.value;saveRooms();render()}return}
  if(el.dataset.img){
    const f=el.files&&el.files[0],k=el.dataset.img;el.value='';if(!f)return;siteErr='';imgMsg='';uploadSlot(k,f);return}
  if(el.dataset.act==='role'){
    const u=users.find(x=>x.id===el.dataset.id),admins=users.filter(x=>x.role==='admin').length;
    if(u.role==='admin'&&el.value==='player'&&admins<2){flashMsg=t('lastAdmin');render();return}
    const prev=u.role;u.role=el.value;put('dd_users',users);flashMsg='';
    if(REMOTE)api('POST','api/users/'+u.id+'/role',{role:u.role}).catch(e=>{u.role=prev;flashMsg=e.code==='last_admin'?t('lastAdmin'):t('netSaveFail');render()});
    if(u.id===session&&u.role!=='admin')view='players';render();return}
  if(edit&&el.dataset.wk){const r=edit.draft.weapons.find(x=>x.id===el.dataset.id);if(r){if(el.dataset.wk==='p')r.p=el.checked;else r.bonus=Math.round(num(el.value))}refreshWeapons();return}
  if(edit&&(el.dataset.asi||el.dataset.xf)){asiChange(el);return}
  if(edit&&el.dataset.pk){const a=edit.draft.pick[el.dataset.pk]=edit.draft.pick[el.dataset.pk]||[];a[Number(el.dataset.pi)]=el.value;return}
  if(!edit||!el.dataset.f)return;const d=edit.draft,f=el.dataset.f;
  if(f==='insp')d.insp=el.value==='1';else d[f]=el.value;
  if(f==='cls'){d.sub='';$('#e_sub').innerHTML=subOpts(d.cls,'')}
  if(f==='bg'){syncBgItems(d);render()}
  if(f==='cls'||f==='bg')refreshAsi();
  if(f==='cls'||f==='sub'||f==='race'){refreshHp();refreshExtra()}
});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(me()&&['players','npcs','data','games','site','adventure','conditions'].includes(h)&&h!==view&&(isAdmin()||h==='players'||h==='adventure'||h==='site'||h==='conditions')){view=h;edit=null;dedit=null;roomOpen=null;roomEdit=null;siteDraft=h==='site'?siteInit():null;render()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
async function boot(){
  const served=!!document.querySelector('meta[name=dd-server]');
  if(served)try{
    const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),8000);
    const r=await fetch('api/boot',{credentials:'same-origin',headers:{'X-Requested-With':'dd'},signal:ac.signal});clearTimeout(tm);
    if(r.ok&&/json/.test(r.headers.get('content-type')||''))applyBoot(await r.json());
    else throw new Error('boot');
  }catch(e){
    {$('#root').innerHTML='<div class="login"><div class="login-card"><h1 style="margin:0">'+t('netDown')+'</h1><button class="btn primary" id="retryBoot" type="button">'+t('netRetry')+'</button></div></div>';document.getElementById('retryBoot').onclick=()=>location.reload();return}
  }
  const h=location.hash.slice(1);if(['players','npcs','data','games','site','adventure'].includes(h))view=h;
  if(session&&!me())session=null;
  render();
}
boot();

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&condPop){condPop=null;render()}});
