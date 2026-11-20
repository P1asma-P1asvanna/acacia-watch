/* ---------- more background scenes (draws into the layer made by 24-bgfx.js; helpers arrive as H = {add, rise, cnt, hi}) ---------- */
const BGP=(pre,v='0 0 40 40',st='fill="currentColor" stroke="none"')=>`<svg viewBox="${v}" ${st}>${pre}</svg>`;
const bgEsc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const bgCol=i=>`var(--bc${1+Math.floor(bgRand()*3)})`;
const bgF=(n,d=1)=>Number(n).toFixed(d);
/* chess pieces */
const BG_PIECES=[
  BGP('<circle cx="20" cy="11" r="6"/><path d="M14 18h12l3 10H11z"/><rect x="9" y="29" width="22" height="5" rx="2"/>'),
  BGP('<path d="M10 6h5v4h3V6h4v4h3V6h5v11l-3 3v8h3v6H10v-6h3v-8l-3-3z"/>'),
  BGP('<circle cx="20" cy="6" r="2.6"/><path d="M20 9c7 5 9 11 4 17h4v4H12v-4h4c-5-6-3-12 4-17z"/><rect x="10" y="31" width="20" height="4" rx="2"/>'),
  BGP('<path d="M11 35h19c0-9-1-17-7-24V5l-4 4c-6 4-11 10-11 15l3 2 5-5c-2 6-5 7-5 14z"/>'),
  BGP('<circle cx="8" cy="9" r="2.2"/><circle cx="14" cy="6" r="2.2"/><circle cx="20" cy="5" r="2.2"/><circle cx="26" cy="6" r="2.2"/><circle cx="32" cy="9" r="2.2"/><path d="M8 12l4 15h16l4-15-6 7-4-9-4 9z"/><rect x="10" y="29" width="20" height="6" rx="2"/>'),
  BGP('<path d="M18 2h4v4h4v4h-4v4h-4v-4h-4V6h4z"/><path d="M12 16h16l3 13H9z"/><rect x="8" y="30" width="24" height="5" rx="2"/>')];
/* mind / medicine icons (outlines) */
const BG_MED=[
  SV('<path d="M20 34C6 24 4 14 10 9c4-3 8-1 10 3 2-4 6-6 10-3 6 5 4 15-10 25z"/>'),
  SV('<path d="M20 8v26M20 10c-4-4-12-1-11 5-4 2-3 8 1 9-1 5 5 8 10 5M20 10c4-4 12-1 11 5 4 2 3 8-1 9 1 5-5 8-10 5"/>'),
  SV('<rect x="14" y="6" width="12" height="28" rx="3"/><rect x="6" y="14" width="28" height="12" rx="3"/>'),
  SV('<g transform="rotate(-35 20 20)"><rect x="5" y="13" width="30" height="14" rx="7"/><path d="M20 13v14"/></g>'),
  SV('<path d="M9 5v11a8 8 0 0 0 16 0V5M17 24v3a7 7 0 0 0 14 0v-4"/><circle cx="31" cy="20" r="3"/>'),
  SV('<path d="M26 5l9 9M29 11L14 26l-4 9 9-4L34 16M12 29l-6 6"/>'),
  SV('<path d="M20 5v30M9 7c0 11 5 16 11 16s11-5 11-16"/>'),
  SV('<path d="M15 35V29c-5-3-8-7-8-12 0-6 5-11 12-11 7 0 12 5 12 12 0 4-2 6-4 8v9z"/><path d="M20 21c-4-3-5-5-3-7 1-1 3-1 3 1 0-2 2-2 3-1 2 2 1 4-3 7z"/>'),
  SV('<path d="M20 33c-6-2-10-8-10-14 6 0 10 4 10 14zM20 33c6-2 10-8 10-14-6 0-10 4-10 14zM20 33c-3-5-3-12 0-19 3 7 3 14 0 19z"/>'),
  SV('<rect x="17" y="5" width="6" height="22" rx="3"/><circle cx="20" cy="31" r="5"/>'),
  SV('<path d="M20 9C14 6 8 9 9 15c1 4 5 4 3 8-1 3 3 7 8 8zM20 9c6-3 12 0 11 6-1 4-5 4-3 8 1 3-3 7-8 8z"/>')];
const BG_TM=[SV('<path d="M10 5h20M10 35h20M12 5c0 9 6 11 8 15-2 4-8 6-8 15M28 5c0 9-6 11-8 15 2 4 8 6 8 15"/>'),SV('<circle cx="20" cy="20" r="15"/><path d="M20 10v10l7 4"/>'),SV('<circle cx="20" cy="20" r="15"/><path d="M20 7v3M33 20h-3M20 33v-3M7 20h3M20 20l-5-7"/>')];
const BG_SNIP=['const x = 0;','<div class="app">','SELECT * FROM users;','import React','def main():','git push origin','while(true){}','npm run build','#include <stdio.h>','fn main() {}','await fetch(url)','docker compose up','200 OK','0xFF','true && false','<html lang="en">','return null;','console.log(1)','for i in range(9):','</script>'];
const BG_TOK=['0','1','1','0','1','0','</>','{ }','=>','0x','fn','if','&&','#!','();','[]','//','<>','++','::','10','01','=','$'];
const BG_PHYS=['F = ma','E = mc²','g = 9.8 m/s²','V = IR','F = Gm₁m₂/r²','∇·E = ρ/ε₀','P = IV','ΔE = hf','p = mv','a = Δv/Δt'];
function bgGear(teeth,r1,r2,hole){const pts=[];const st=Math.PI*2/teeth;
  for(let i=0;i<teeth;i++){const a=i*st;[[0,r1],[.18,r2],[.5,r2],[.68,r1]].forEach(([f,r])=>pts.push(`${bgF(50+r*Math.cos(a+f*st),1)},${bgF(50+r*Math.sin(a+f*st),1)}`))}
  return BGP(`<polygon points="${pts.join(' ')}" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="50" cy="50" r="${hole}" stroke="currentColor" stroke-width="2" fill="none"/><path d="M50 ${50-hole}V${50+hole}M${50-hole} 50H${50+hole}" stroke="currentColor" stroke-width="2"/>`,'0 0 100 100','fill="none"')}
/* ---- flame textures: value-noise fire painted once per colour / quality, tileable sideways, 4 frames that loop in time ---- */
const BG_FIRE={};
function bgRgb(c){const k=document.createElement('canvas');k.width=k.height=1;const x=k.getContext('2d');x.fillStyle='#000';x.fillStyle=c;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return[d[0],d[1],d[2]]}
function bgFireFrames([W,Hh],el){
  const pal=[1,2,3].map(i=>getComputedStyle(el).getPropertyValue('--bc'+i).trim()),key=pal.join('|')+W;
  if(BG_FIRE[key])return BG_FIRE[key];
  const [o,a,r]=pal.map(bgRgb),mixc=(x,y,t)=>x.map((v,i)=>v+(y[i]-v)*t),W3=[255,255,255];
  const ramp=[[0,mixc(r,[50,0,0],.65)],[.3,mixc(r,[40,0,0],.15)],[.58,o],[.82,mixc(a,W3,.04)],[1,mixc(a,W3,.55)]];
  const col=I=>{for(let i=1;i<ramp.length;i++)if(I<=ramp[i][0]){const t=(I-ramp[i-1][0])/(ramp[i][0]-ramp[i-1][0]);return mixc(ramp[i-1][1],ramp[i][1],t)}return ramp[4][1]};
  const sm=t=>t*t*(3-2*t),N=4,Z=2;
  const hs=(x,y,z)=>{let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
  const vn=(x,y,z,px,pz)=>{const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),fx=sm(x-xi),fy=sm(y-yi),fz=sm(z-zi),m=(v,p)=>((v%p)+p)%p,x0=m(xi,px),x1=m(xi+1,px),z0=m(zi,pz),z1=m(zi+1,pz),L=(a,b,t)=>a+(b-a)*t;
    return L(L(L(hs(x0,yi,z0),hs(x1,yi,z0),fx),L(hs(x0,yi+1,z0),hs(x1,yi+1,z0),fx),fy),L(L(hs(x0,yi,z1),hs(x1,yi,z1),fx),L(hs(x0,yi+1,z1),hs(x1,yi+1,z1),fx),fy),fz)};
  const fbm=(x,y,z)=>{let s=0,am=.5,f=1;for(let k=0;k<3;k++){s+=am*vn(x*f,y*f,z*f,6*f,Z*f);am*=.5;f*=2}return s};
  const out=[],cv=document.createElement('canvas');cv.width=W;cv.height=Hh;const cx=cv.getContext('2d'),img=cx.createImageData(W,Hh),D=img.data;
  for(let f=0;f<N;f++){const z=f*Z/N;
    for(let py=0;py<Hh;py++){const v=py/Hh,base=Math.pow(v,1.1);
      for(let px=0;px<W;px++){const u=px/W,wv=(vn(u*3,v*2.2,z,3,Z)-.5)*1.9*(1-v*.6),n=fbm(u*6+wv,v*1.7,z+.5);
        let I=base*1.3+(n-.5)*1.9-.2;if(v>.9)I=Math.max(I,1.1*((v-.9)/.1)+I*.0);I=I<0?0:I>1?1:I;
        const c=col(I),al=sm(Math.min(1,Math.max(0,(I-.03)/.3))),p=(py*W+px)*4;D[p]=c[0];D[p+1]=c[1];D[p+2]=c[2];D[p+3]=al*255}}
    cx.putImageData(img,0,0);out.push(cv.toDataURL('image/png'))}
  return BG_FIRE[key]=out}
const BGX={
/* ---------- big city at night ---------- */
city(q,el,H){
  const {add,hi}=H,W=1600,Hh=600;
  const layer=(minH,maxH,minW,maxW,dens,blink)=>{let x=-20,b='',w='',wk='';
    while(x<W+20){const bw=bgR(minW,maxW),bh=bgR(minH,maxH),top=Hh-bh;b+=`<rect x="${bgF(x,0)}" y="${bgF(top,0)}" width="${bgF(bw,0)}" height="${bgF(bh,0)}"/>`;
      if(bgRand()<.3)b+=`<rect x="${bgF(x+bw/2-1,0)}" y="${bgF(top-22,0)}" width="2" height="22"/>`;
      if(dens)for(let wy=top+14;wy<Hh-10;wy+=16)for(let wx=x+8;wx<x+bw-10;wx+=14)if(bgRand()<dens){const r=`<rect x="${bgF(wx,0)}" y="${bgF(wy,0)}" width="6" height="8"`;
        if(blink&&bgRand()<.04)wk+=`${r} class="wk" style="--d:${bgF(bgR(3,9))}s;--dl:-${bgF(bgR(0,9))}s"/>`;else w+=r+' class="win"/>'}
      x+=bw+bgR(0,5)}
    return{b,w,wk}};
  const far=layer(90,260,40,90,hi?.08:.04,0),near=layer(150,430,60,120,hi?.34:.2,hi);
  add('bgcy-sky');add('bgcy-moon');
  add('bgcy far',BGP(far.b+far.w,`0 0 ${W} ${Hh}`).replace('<svg','<svg preserveAspectRatio="xMidYMax slice"'));
  add('bgcy near',BGP(near.b,`0 0 ${W} ${Hh}`).replace('<svg','<svg preserveAspectRatio="xMidYMax slice"').replace('</svg>',near.w+near.wk+'</svg>'));
  for(let i=0;i<(hi?7:4);i++)add('bgcar'+(i%2?' rev':''),0,`--y:${bgR(0,3).toFixed(1)}vh;--d:${bgR(8,18).toFixed(1)}s;--dl:-${bgR(0,18).toFixed(1)}s;--c:var(--bc${i%2?3:1})`)},
/* ---------- brick wall, lit along the mortar ---------- */
brick(q,el,H){
  const {add,hi}=H;add('bgbr-base');const lit=add('bgbr-lit');
  for(let i=0;i<(hi?4:2);i++)add('bgbr-b',0,`--x:${[15,60,85,35][i]}%;--y:${[25,70,30,80][i]}%;--d:${[34,46,40,52][i]}s;--dl:-${i*9}s;--c:var(--bc${(i%3)+1})`,lit);
  add('bgbr-sw',0,`--d:${hi?13:19}s;--dl:-3s`,lit);if(hi)add('bgbr-sw',0,'--d:21s;--dl:-12s;opacity:.6',lit);
  add('bgbr-wash')},
/* ---------- chess board + pieces ---------- */
chess(q,el,H){
  const {add,rise}=H;const w=add('bgch-wrap');add('bgch',0,'',w);
  rise('bgg bgchess',14,()=>bgPick(BG_PIECES),{s0:34,s1:84,d0:30,d1:58,o0:.2,o1:.42})},
/* ---------- code: falling binary / code columns + floating snippets ---------- */
code(q,el,H){
  const {add,rise,cnt}=H,n=cnt(26);
  for(let i=0;i<n;i++){const rows=14+Math.floor(bgRand()*14),bin=bgRand()<.55;let s='';
    for(let r=0;r<rows;r++)s+=(bin?(bgRand()<.5?'0':'1'):bgPick(BG_TOK))+'\n';
    const d=bgR(9,22);add('bgcode',bgEsc(s.trimEnd()),`--x:${bgF(i*(100/n)+bgR(0,2.5),1)}%;--s:${bgF(bgR(12,18),0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--o:${bgF(bgR(.25,.6),2)};--c:var(--bc${bin?1:2+Math.floor(bgRand()*2)})`)}
  rise('bgcs',9,()=>bgEsc(bgPick(BG_SNIP)),{s0:46,s1:84,d0:30,d1:55,o0:.25,o1:.5})},
/* ---------- nature: a flower garden under the sun, with butterflies and falling petals ---------- */
nature(q,el,H){
  const {add,hi,cnt}=H,G='<g style="color:var(--bc2)" stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round">',
    petals=(n,rx,ry,r0,cx,cy)=>{let p='';for(let i=0;i<n;i++){const a=i*360/n;p+=`<ellipse cx="${cx}" cy="${cy-r0}" rx="${rx}" ry="${ry}" transform="rotate(${bgF(a,0)} ${cx} ${cy})"/>`}return p},
    leaf=(y,d)=>`<path d="M20 ${y}c${d*9} -1 ${d*14} -6 ${d*14} -12 ${-d*7} 1 ${-d*13} 5 ${-d*14} 12z" fill="currentColor" fill-opacity=".7"/>`,
    stem=h=>`${G}<path d="M20 ${h}V80"/>${leaf(66,1)}${leaf(58,-1)}</g>`,
    F=[ /* daisy */()=>BGP(`${stem(24)}${petals(12,2.6,6.5,6.5,20,20)}<circle cx="20" cy="20" r="4.4" fill="#f2b705" style="color:#f2b705"/>`,'0 0 40 80'),
      /* sunflower */()=>BGP(`${stem(26)}${petals(16,2.8,8,8,20,22)}<circle cx="20" cy="22" r="7.4" fill="#5a3a1a" style="color:#5a3a1a"/><circle cx="20" cy="22" r="3" fill="#8a5a2a" style="color:#8a5a2a"/>`,'0 0 40 80'),
      /* tulip */()=>BGP(`${stem(26)}<path d="M11 8c0 12 4 20 9 20s9-8 9-20l-4.5 5L20 5l-4.5 8z"/>`,'0 0 40 80'),
      /* lavender */()=>BGP(`${stem(10)}${[12,19,26,33,40].map((y,i)=>`<ellipse cx="${i%2?23:17}" cy="${y}" rx="3.2" ry="4.4"/>`).join('')}<ellipse cx="20" cy="7" rx="2.8" ry="4.6"/>`,'0 0 40 80'),
      /* poppy / rose */()=>BGP(`${stem(26)}<circle cx="20" cy="18" r="10"/><circle cx="15" cy="15" r="5.6" fill-opacity=".55" style="color:#fff"/><circle cx="23" cy="19" r="4.4" fill-opacity=".4" style="color:#000"/>`,'0 0 40 80'),
      /* bluebell */()=>BGP(`${stem(14)}<path d="M20 14c-6 0-9-3-9-3 0 7 3 12 9 12s9-5 9-12c0 0-3 3-9 3z" transform="translate(-6 6)"/><path d="M20 14c-6 0-9-3-9-3 0 7 3 12 9 12s9-5 9-12c0 0-3 3-9 3z" transform="translate(5 14)"/>`,'0 0 40 80')],
    hue=['var(--bc1)','var(--bc3)','var(--bc3)','var(--bc1)','var(--bc3)','var(--bc1)'];
  add('bgsun-r');add('bgsun');add('bgnat-g');add('bgnat-hill','',`--o:.14;--w:150vw;--h:44vh;--x:30%`);add('bgnat-hill','',`--o:.22;--w:130vw;--h:30vh;--x:72%`);
  const rows=[[cnt(18),.3,28,46,.4,9],[cnt(12),.5,44,70,.3,7],[cnt(8),.85,74,128,.18,5]];
  rows.forEach(([n,op,s0,s1,_,dsw],ri)=>{for(let i=0;i<n;i++){const k=Math.floor(bgRand()*F.length),d=bgR(dsw,dsw+4),s=bgR(s0,s1);
    add('bgflw',F[k](),`--x:${bgF((i+bgR(.1,.9))*100/n,1)}%;--s:${bgF(s,0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--c:${hue[k]};--o:${op};--b:${bgF(-ri*1.2,1)}vh`)}});
  const wing=`<svg viewBox="0 0 40 30"><g fill="currentColor"><path d="M20 15C14 4 3 2 3 11c0 7 9 9 17 4z"/><path d="M20 15C26 4 37 2 37 11c0 7-9 9-17 4z"/><path d="M20 15C13 19 8 28 14 28c5 0 8-6 6-13z" fill-opacity=".8"/><path d="M20 15C27 19 32 28 26 28c-5 0-8-6-6-13z" fill-opacity=".8"/></g></svg>`;
  for(let i=0;i<(hi?5:3);i++){const d=bgR(14,24);add('bgbf',wing,`left:${bgF(bgR(30,92),0)}%;top:${bgF(bgR(35,80),0)}%;--s:${bgF(bgR(22,34),0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--x1:${bgF(bgR(-16,16))}vw;--y1:${bgF(bgR(-14,6))}vh;--x2:${bgF(bgR(-16,16))}vw;--y2:${bgF(bgR(-14,6))}vh;--fl:${bgF(bgR(.16,.3),2)}s;--c:var(--bc${[3,1,3,1,3][i]})`)}
  const pet=BGP('<path d="M20 4C30 10 30 28 20 36 10 28 10 10 20 4z"/>');
  for(let i=0;i<cnt(14);i++){const d=bgR(14,26);add('bgpet',pet,`--x:${bgF(bgR(0,100),1)}%;--s:${bgF(bgR(11,22),0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--dx:${bgF(bgR(-14,14))}vw;--r:${bgF(bgR(-300,300),0)}deg;--o:${bgF(bgR(.4,.75),2)};--c:var(--bc${bgRand()<.6?3:1})`)}},
/* ---------- fire and soot: a real flame texture (noise-based, drawn once on a canvas) that cross-fades between a few frames ---------- */
fire(q,el,H){
  const {add,rise,hi}=H,fr=bgFireFrames(hi?[384,192]:[256,128],el);
  add('bgfi-g');
  const stack=(cls,T,dir)=>{const w=add('bgfi2 '+cls,0,`--T:${T}s`);fr.forEach((u,i)=>add('bgfi-fr',0,`background-image:url(${u});--dl:-${bgF(i*T/fr.length,2)}s`,w));return w};
  stack('back',hi?3.4:4.2);stack('front',hi?2.3:3);
  rise('bgem',hi?30:14,()=>'',{s0:3,s1:9,d0:7,d1:16,o0:.5,o1:.95});
  rise('bgsoot',hi?16:8,()=>'',{s0:3,s1:11,d0:12,d1:26,o0:.25,o1:.5});
  for(let i=0;i<(hi?4:2);i++){const d=bgR(14,22);add('bgsmoke',0,`--x:${[18,42,66,86][i]}%;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--dx:${bgF(bgR(-8,8))}vw`)}},
/* ---------- medical / the mind: breathing circle, heartbeat line, calm icons ---------- */
medical(q,el,H){
  const {add,rise,hi}=H;
  for(let i=0;i<(hi?3:2);i++)add('bgmd-b',0,`--dl:${-i*3}s;--c:var(--bc${i+1})`);
  let d='M0 40';for(let i=0;i<8;i++){const o=i*400;d+=`H${o+110}l10-7 10 7h30l8 9 11-44 11 52 9-17h34l14-11 14 11H${o+400}`}
  add('bgmd-e',`<svg viewBox="0 0 3200 80" preserveAspectRatio="none"><path d="${d}"/></svg>`);
  rise('bgg',hi?15:8,()=>bgPick(BG_MED),{s0:32,s1:68,d0:34,d1:62,o0:.2,o1:.42})},
/* ---------- time: clock face with moving hands, turning gears ---------- */
time(q,el,H){
  const {add,rise,hi}=H;let tk='',nm='';
  for(let i=0;i<60;i++){const a=i*Math.PI/30,l=i%5?4:9,r=94;tk+=`<line x1="${bgF(r*Math.sin(a))}" y1="${bgF(-r*Math.cos(a))}" x2="${bgF((r-l)*Math.sin(a))}" y2="${bgF(-(r-l)*Math.cos(a))}" stroke-width="${i%5?1:2.2}"/>`}
  ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'].forEach((s,i)=>{const a=i*Math.PI/6;nm+=`<text x="${bgF(76*Math.sin(a))}" y="${bgF(-76*Math.cos(a)+3.5)}" text-anchor="middle" font-size="10" font-family="Georgia,serif" fill="currentColor" stroke="none">${s}</text>`});
  const now=new Date(),mm=now.getMinutes()+now.getSeconds()/60,hh=(now.getHours()%12)+mm/60;
  const hand=(len,w,a0,dur)=>`<g class="bgtm-h" style="--a0:${bgF(a0,1)}deg;--d:${dur}s"><line x1="0" y1="8" x2="0" y2="${-len}" stroke-width="${w}"/></g>`;
  const face=`<svg viewBox="-100 -100 200 200" fill="none" stroke="currentColor" stroke-linecap="round"><circle r="97" stroke-width="2"/><circle r="2.4" fill="currentColor"/>${tk}${nm}${hand(48,3.4,hh*30,1080)}${hand(76,2.2,mm*6,90)}${hand(82,.9,0,9)}</svg>`;
  add('bgtm-c',face);
  const gears=[[22,'34%','76%',22,84,38,1],[16,'28%','14%',16,60,26,-1],[12,'52%','90%',12,46,20,1],[28,'82%','88%',28,110,60,-1]];
  gears.forEach(([tt,x,y,hole,s,d,dir],i)=>{if(!hi&&i>2)return;add('bgtm-gear',bgGear(tt,44,48,hole>14?18:12),`--x:${x};--y:${y};--s:${s}px;--d:${d}s;--dr:${dir>0?'normal':'reverse'};--c:var(--bc${(i%3)+1});--o:.6`)});
  rise('bgg',hi?9:5,()=>bgPick(BG_TM),{s0:30,s1:62,d0:34,d1:60,o0:.2,o1:.42})},
/* ---------- space and galaxy ---------- */
space(q,el,H){
  const {add,hi,cnt}=H;
  for(let i=0;i<3;i++)add('bgl-pool',0,`--x:${[20,78,50][i]}%;--y:${[30,65,90][i]}%;--d:${[50,64,58][i]}s;--dl:-${i*13}s;--c:var(--bc${i+1})`);
  const rot=add('bgsp-rot');
  for(let i=0;i<cnt(110);i++){const s=bgR(1,3.2);add('bgs',0,`left:${bgF(bgR(0,100))}%;top:${bgF(bgR(0,100))}%;--s:${bgF(s)}px;--d:${bgF(bgR(2,7))}s;--dl:-${bgF(bgR(0,7))}s;--c:var(--bc${1+Math.floor(bgRand()*3)})`,rot)}
  let arms='',dots='';
  for(let k=0;k<3;k++){let pts='';for(let j=0;j<=60;j++){const t=j/60,th=t*Math.PI*3.6+k*Math.PI*2/3,r=8+t*88;pts+=`${bgF(100+r*Math.cos(th))},${bgF(100+r*Math.sin(th))} `;
      if(j%2===0&&j>2)for(let m=0;m<(hi?2:1);m++)dots+=`<circle cx="${bgF(100+r*Math.cos(th)+bgR(-7,7))}" cy="${bgF(100+r*Math.sin(th)+bgR(-7,7))}" r="${bgF(bgR(.5,1.7))}" fill="#fff" opacity="${bgF(bgR(.4,.95),2)}"/>`}
    arms+=`<polyline points="${pts}" stroke="var(--bc${k+1})" stroke-width="13" opacity=".1"/><polyline points="${pts}" stroke="var(--bc${k+1})" stroke-width="4" opacity=".24"/>`}
  const gal=`<svg viewBox="0 0 200 200" fill="none" stroke-linecap="round" stroke-linejoin="round"><defs><radialGradient id="bgcore"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="var(--bc2)" stop-opacity=".55"/><stop offset="1" stop-color="var(--bc2)" stop-opacity="0"/></radialGradient></defs>${arms}<circle cx="100" cy="100" r="30" fill="url(#bgcore)" stroke="none"/>${dots}</svg>`;
  const tilt=add('bgsp-t');add('bgsp-gal',gal,'',tilt);
  add('bgsp-p');
  for(let i=0;i<(hi?2:1);i++)add('bgsh',0,`--x:${bgF(bgR(10,70),0)}%;--y:${bgF(bgR(0,30),0)}%;--dl:${i*7+3}s`)},
/* ---------- circular music / spectrum visualizer ---------- */
music(q,el,H){
  const {add,rise,hi}=H,N=hi?72:40,ring=add('bgmu');
  for(let i=0;i<N;i++){const pos=i/N*3,ix=Math.floor(pos),fr=pos-ix,c=`color-mix(in srgb,var(--bc${ix+1}) ${bgF(100-fr*100,0)}%,var(--bc${(ix+1)%3+1}))`,d=bgR(.35,.95);
    add('bgmu-bar',0,`--a:${bgF(i*360/N)}deg;--d:${bgF(d,2)}s;--dl:-${bgF(bgR(0,d),2)}s;--lo:${bgF(bgR(.12,.3),2)};--hi:${bgF(bgR(.55,1),2)};--c:${c}`,ring)}
  add('bgmu-c',0,'',ring);add('bgmu-c d',0,'',ring);
  for(let i=0;i<3;i++)add('bgmu-rip',0,`--dl:${-i*1.2}s;--mu:min(88vmin,940px)`);
  add('bgmu-core',0,'--mu:min(88vmin,940px)');
  rise('bgcs',hi?10:5,()=>bgPick(['♪','♫','♩','♬','𝄞']),{s0:70,s1:150,d0:20,d1:38,o0:.2,o1:.45})},
/* ---------- physics: lightning, gravity, atoms ---------- */
physics(q,el,H){
  const {add,rise,hi}=H;
  const bolts=hi?3:2;
  for(let b=0;b<bolts;b++){let x=50,d='M50 0',br='';const segs=14;
    for(let i=1;i<=segs;i++){x=Math.max(8,Math.min(92,x+bgR(-11,11)));const y=i*100/segs;d+=`L${bgF(x)} ${bgF(y)}`;
      if(i>3&&i<segs-2&&bgRand()<.4){let bx=x,by=y,s=`M${bgF(x)} ${bgF(y)}`;for(let j=0;j<4;j++){bx+=bgR(-9,12);by+=bgR(3,7);s+=`L${bgF(bx)} ${bgF(by)}`}br+=`<path class="br" d="${s}"/>`}}
    const dd=bgR(7,13),dl=-bgR(0,dd),st=`--d:${bgF(dd)}s;--dl:${bgF(dl)}s;--c:var(--bc${b%2?3:1})`;
    add('bgph-bolt',`<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}"/>${br}</svg>`,`--x:${bgF(bgR(34+b*20,46+b*20),0)}%;${st}`);add('bgph-fl',0,st)}
  // gravity well on the right: rings falling in, two bodies orbiting a mass
  const gx='78%',gy='56%';
  for(let i=0;i<3;i++)add('bgph-ring',0,`--x:${gx};--y:${gy};--d:6s;--dl:-${i*2}s;--c:var(--bc2)`);
  add('bgph-mass',0,`--x:${gx};--y:${gy};--c:var(--bc3)`);
  const orbit=(r,ry,dur,dl,c)=>`<i class="bgph-orb" style="offset-path:path('M ${90+r} 90 A ${r} ${ry} 0 1 1 ${90-r} 90 A ${r} ${ry} 0 1 1 ${90+r} 90 Z');--d:${dur}s;--dl:-${dl}s;--c:${c};left:0;top:0"></i>`;
  const sys=add('bgph-at',`<i class="ring" style="transform:scale(.9,.9) scaleY(.36)"></i>${orbit(80,28,9,3,'var(--bc2)')}${orbit(54,19,5.5,1,'var(--bc3)')}`,`--x:${gx};--y:${gy};--a:-16deg;--c:var(--bc2);width:180px;height:180px`);
  // an atom on the left
  const atom=add('bgph-at',`<i class="nuc"></i>${[0,1,2].map(i=>`<i class="ring" style="transform:rotate(${i*60}deg) scaleY(.36)"></i>`).join('')}`,`--x:30%;--y:34%;--a:0deg;--c:var(--bc1)`);
  [0,60,120].forEach((a,i)=>{const e=document.createElement('i');e.className='bgph-orb';e.style.cssText=`offset-path:path('M 180 90 A 90 32.4 0 1 1 0 90 A 90 32.4 0 1 1 180 90 Z');--d:${3.4+i}s;--dl:-${i*1.1}s;--c:var(--bc1);left:0;top:0;transform-origin:50% 50%`;
    const w=document.createElement('i');w.style.cssText=`inset:0;transform:rotate(${a}deg)`;w.appendChild(e);atom.appendChild(w)});
  for(let i=0;i<(hi?6:3);i++){const d=bgR(1.6,2.8);add('bgph-ball',0,`--x:${bgF(bgR(26,70),0)}%;--s:${bgF(bgR(12,22),0)}px;--h:${bgF(bgR(22,55),0)}vh;--d:${bgF(d,2)}s;--dl:-${bgF(bgRand()*d,2)}s;--c:var(--bc${(i%3)+1})`)}
  add('bgph-gnd');
  rise('bgcs',hi?8:4,()=>bgEsc(bgPick(BG_PHYS)),{s0:44,s1:84,d0:30,d1:55,o0:.22,o1:.45})}
};
Object.assign(TX.th,{bg_space:'อวกาศและกาแล็กซี่',bg_fire:'เปลวไฟและเขม่า',bg_city:'เมืองใหญ่ยามค่ำคืน',bg_brick:'กำแพงอิฐเรืองแสง',bg_chess:'กระดานหมากรุก',bg_code:'โค้ดและเลขฐานสอง',bg_nature:'สวนดอกไม้ ผีเสื้อ แสงอาทิตย์',bg_medical:'การแพทย์และจิตใจ',bg_time:'กาลเวลาและเข็มนาฬิกา',bg_music:'ภาพคลื่นเสียงวงกลม',bg_physics:'ฟิสิกส์ แรงโน้มถ่วง สายฟ้า',
  bgcCustom:'สีกำหนดเอง',bgcCustomOn:'ใช้สีนี้กับทุกฉาก',bgcReset:'กลับไปใช้สีของฉาก'});
Object.assign(TX.en,{bg_space:'Space & galaxy',bg_fire:'Fire & soot',bg_city:'Big city at night',bg_brick:'Glowing brick wall',bg_chess:'Chess board',bg_code:'Code & binary',bg_nature:'Flower garden & sun',bg_medical:'Medicine & mind',bg_time:'Time & clock hands',bg_music:'Circular music visualizer',bg_physics:'Physics: gravity & lightning',
  bgcCustom:'Custom color',bgcCustomOn:'Use this color for every scene',bgcReset:'Back to the scene colors'});
