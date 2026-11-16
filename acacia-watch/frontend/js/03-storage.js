/* ---------- storage (localStorage when available, memory otherwise) ---------- */
const mem={};
function load(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return mem[k]!==undefined?mem[k]:d}
let REMOTE=false,firstRun=false;
const REMOTE_KEYS={dd_cat:'cat',dd_site:'site',dd_rooms:'rooms'};
function put(k,v){mem[k]=v;
  if(REMOTE){if(REMOTE_KEYS[k]){pushKv(k,v);return true}if(k==='dd_users'||k==='dd_session'||k==='dd_pcs'||k==='dd_npcs')return true}
  try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
