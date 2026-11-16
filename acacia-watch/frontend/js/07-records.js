/* ---------- records ---------- */
function blank(kind){
  return{id:uid(),kind,owner:kind==='pc'?(isAdmin()?'':session):'',name:'',race:pick(names('races'),'Human'),cls:pick(names('classes'),'Fighter'),sub:'',level:1,xp:0,bg:'',align:pick(names('alignments'),'True Neutral'),
    abil:{str:10,dex:10,con:10,int:10,wis:10,cha:10},ac:10,speed:30,hp:10,insp:false,notes:'',type:'neutral',pick:{lang:[],tool:[],veh:[]},asi:{},xf:[],sl:{u:[],p:0},spells:[],conc:'',prof:{save:{},skill:{}},items:[],weapons:[],profOther:'',speeds:'',hpMode:'auto',hpManual:'',hpCur:null,hpTemp:0,hdUsed:0,death:{s:0,f:0},acMode:'auto',acManual:''};
}
function sample(kind){
  const mk=(o)=>{const r=Object.assign(blank(kind),o);if(kind==='npc'){r.hpMode='manual';r.hpManual=r.hp;r.acMode='manual';r.acManual=r.ac}else{r.hp=effMax(r);r.ac=effAc(r)}return r};
  if(kind==='npc')return[
   mk({name:'Mirelle Voss',race:'Half-Elf',cls:'Rogue',sub:'Thief',level:4,xp:2700,bg:'Tavern keeper',align:'Chaotic Neutral',abil:{str:9,dex:16,con:12,int:13,wis:12,cha:15},ac:14,hp:27,type:'ally',notes:'Knows every rumor in the harbor district.'}),
   mk({name:'Brother Halvard',race:'Hill Dwarf',cls:'Cleric',sub:'Life',level:6,xp:14000,bg:'Acolyte',align:'Lawful Good',abil:{str:12,dex:10,con:15,int:11,wis:17,cha:13},ac:18,speed:25,hp:52,type:'ally'}),
   mk({name:'Ashkaar the Pale',race:'Tiefling',cls:'Warlock',sub:'Fiend',level:8,xp:34000,bg:'Charlatan',align:'Neutral Evil',abil:{str:8,dex:14,con:14,int:12,wis:11,cha:19},ac:13,hp:58,type:'villain',notes:'Wants the lighthouse key.'})];
  return[mk({name:'Tessa Wren',owner:isAdmin()?'':session,race:'Lightfoot Halfling',cls:'Bard',sub:'Lore',level:3,xp:900,bg:'Entertainer',align:'Chaotic Good',abil:{str:8,dex:15,con:12,int:11,wis:10,cha:16},speed:25,hp:21,items:[{id:uid(),name:'Leather',qty:1,src:'',eq:true},{id:uid(),name:'Costume',qty:1,src:'',eq:false}],weapons:[{id:uid(),ref:'Dagger',bonus:0},{id:uid(),ref:'Rapier',bonus:0},{id:uid(),ref:'Light Crossbow',bonus:0}]})];
}
const list=k=>k==='pc'?pcs:npcs;
function commit(k){if(REMOTE){syncKind(k);return}put(k==='pc'?'dd_pcs':'dd_npcs',list(k))}
const ownerName=id=>users.find(u=>u.id===id)?.disp||'';
const nextXp=l=>l>=20?null:XP[l];

