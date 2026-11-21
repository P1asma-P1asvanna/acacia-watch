/* ---------- limited uses of features / feats ("2 per short rest"): counted on the character, refilled by the rest buttons ---------- */
const fuMax=f=>Math.max(0,Math.min(30,Math.round(num(f.uses))||0));
const fuKey=f=>(f.kind||'f')+':'+String(f.id||f.name||'').slice(0,40);
const fuUsed=(d,f)=>Math.min(fuMax(f),Math.max(0,Math.round(num((d.fu||{})[fuKey(f)]))));
function fuSpend(d,f){const m=fuMax(f);if(!m)return true;const u=fuUsed(d,f);if(u>=m)return false;d.fu=d.fu||{};d.fu[fuKey(f)]=u+1;return true}
const fuLeft=(d,f)=>fuMax(f)?fuMax(f)-fuUsed(d,f):Infinity;
const fuLabel=(d,f)=>fuMax(f)?`${fuLeft(d,f)}/${fuMax(f)} · ${t('res_'+(f.urest||'long'))}`:'';
function fuRest(d,kind){if(!d.fu)return;taFeats(d).forEach(f=>{const r=f.urest||'long';if(fuMax(f)&&(r==='short'||(kind==='long'&&r==='long')))delete d.fu[fuKey(f)]})}
Object.assign(TX.th,{fFeatSrc:'Feat',taFeatOut:'ใช้ครบจำนวนแล้ว (รอพัก)',fuUses:'จำนวนครั้งที่ใช้ได้',fuUsesHint:'0 = ไม่จำกัด',fuRest:'ฟื้นเมื่อ'});
Object.assign(TX.en,{fFeatSrc:'Feat',taFeatOut:'No uses left (rest to refill)',fuUses:'Uses',fuUsesHint:'0 = unlimited',fuRest:'Refills on'});
