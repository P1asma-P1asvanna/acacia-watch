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
/* ---------- nature: sun, trees, flowers, falling petals ---------- */
nature(q,el,H){
  const {add,hi,cnt}=H;
  add('bgsun-r');add('bgsun');add('bgnat-g');
  const pine=BGP('<path d="M20 2l11 14h-6l9 12H25l8 10H7l8-10H6l9-12H9z"/><rect x="18" y="36" width="4" height="4"/>'),
        oak=BGP('<circle cx="20" cy="14" r="11"/><circle cx="11" cy="21" r="8"/><circle cx="29" cy="21" r="8"/><rect x="18" y="26" width="4" height="14"/>'),
        flw=()=>{const c=3+Math.floor(bgRand()*3);let p='';for(let i=0;i<c+2;i++){const a=i*Math.PI*2/(c+2);p+=`<ellipse cx="${bgF(20+8*Math.cos(a),1)}" cy="${bgF(10+8*Math.sin(a),1)}" rx="5" ry="3.4" transform="rotate(${bgF(a*180/Math.PI,0)} ${bgF(20+8*Math.cos(a),1)} ${bgF(10+8*Math.sin(a),1)})"/>`}
          return BGP(`${p}<circle cx="20" cy="10" r="3.6" fill-opacity=".9"/><path d="M20 14V50" stroke="currentColor" stroke-width="1.6"/><path d="M20 36c-6-1-9-4-9-8 5 0 8 3 9 8z"/>`,'0 0 40 52')};
  const nT=cnt(10);for(let i=0;i<nT;i++){const far=i%2===0,s=far?bgR(80,150):bgR(130,230),d=bgR(5,9);
    add('bgtree',bgRand()<.6?pine:oak,`--x:${bgF(bgR(-2,98),1)}%;--s:${bgF(s,0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--c:var(--bc2);--o:${far?.2:.38}`)}
  const nF=cnt(16);for(let i=0;i<nF;i++){const d=bgR(3,6);add('bgflw',flw(),`--x:${bgF(bgR(1,97),1)}%;--s:${bgF(bgR(26,44),0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--c:var(--bc${bgRand()<.5?3:1});--o:.6`)}
  const pet=BGP('<path d="M20 4C30 10 30 28 20 36 10 28 10 10 20 4z"/>');
  for(let i=0;i<cnt(16);i++){const d=bgR(14,26);add('bgpet',pet,`--x:${bgF(bgR(0,100),1)}%;--s:${bgF(bgR(12,24),0)}px;--d:${bgF(d)}s;--dl:-${bgF(bgRand()*d)}s;--dx:${bgF(bgR(-14,14))}vw;--r:${bgF(bgR(-300,300),0)}deg;--o:${bgF(bgR(.35,.7),2)};--c:var(--bc${bgRand()<.5?3:2})`)}},
/* ---------- fire and soot ---------- */
fire(q,el,H){
  const {add,rise,hi,cnt}=H;add('bgfi-g');
  const n=cnt(26);for(let i=0;i<n;i++){const d=bgR(.9,2.1);add('bgfi-f',0,`--x:${bgF((i+.5)*100/n+bgR(-2,2),1)}%;--w:${bgF(bgR(6,12))}vw;--h:${bgF(bgR(18,42),0)}vh;--d:${bgF(d,2)}s;--dl:-${bgF(bgRand()*d,2)}s;--o:${bgF(bgR(.4,.75),2)}`)}
  rise('bgem',hi?30:14,()=>'',{s0:3,s1:9,d0:7,d1:16,o0:.5,o1:.95});
  rise('bgsoot',hi?18:9,()=>'',{s0:4,s1:13,d0:12,d1:26,o0:.25,o1:.5});
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
Object.assign(TX.th,{bg_space:'อวกาศและกาแล็กซี่',bg_fire:'เปลวไฟและเขม่า',bg_city:'เมืองใหญ่ยามค่ำคืน',bg_brick:'กำแพงอิฐเรืองแสง',bg_chess:'กระดานหมากรุก',bg_code:'โค้ดและเลขฐานสอง',bg_nature:'ธรรมชาติ ต้นไม้ ดอกไม้ แสงอาทิตย์',bg_medical:'การแพทย์และจิตใจ',bg_time:'กาลเวลาและเข็มนาฬิกา',bg_music:'ภาพคลื่นเสียงวงกลม',bg_physics:'ฟิสิกส์ แรงโน้มถ่วง สายฟ้า',
  bgcCustom:'สีกำหนดเอง',bgcCustomOn:'ใช้สีนี้กับทุกฉาก',bgcReset:'กลับไปใช้สีของฉาก'});
Object.assign(TX.en,{bg_space:'Space & galaxy',bg_fire:'Fire & soot',bg_city:'Big city at night',bg_brick:'Glowing brick wall',bg_chess:'Chess board',bg_code:'Code & binary',bg_nature:'Nature: trees, flowers, sun',bg_medical:'Medicine & mind',bg_time:'Time & clock hands',bg_music:'Circular music visualizer',bg_physics:'Physics: gravity & lightning',
  bgcCustom:'Custom color',bgcCustomOn:'Use this color for every scene',bgcReset:'Back to the scene colors'});
