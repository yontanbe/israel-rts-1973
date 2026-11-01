// Accounts and progress storage.
// Local mode (default): commander profiles live in this browser, each with its own progress, saves and stars.
// Cloud mode (optional): set supabaseUrl + supabaseAnonKey in config.js and progress follows the player to any device.
(function(){
const CFG=window.IRTS_CONFIG||{};const CLOUD=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
const LS={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}},del:k=>{try{localStorage.removeItem(k);}catch(e){}}};
const SYNC_KEYS=['prog','stars','stats','save','auto','last','settings'];
let cur=null,listeners=[],syncT=0;
const users=()=>{try{return JSON.parse(LS.get('irts_users')||'{}');}catch(e){return {};}};
const saveUsers=u=>LS.set('irts_users',JSON.stringify(u));
const uid=()=>cur?cur.id:'guest';
const key=k=>`irts:${uid()}:${k}`;
function emit(){listeners.forEach(f=>{try{f(cur);}catch(e){}});}
// one time move of the old single-player keys into the guest profile
(function migrate(){if(LS.get('irts_migrated'))return;const map={irts_prog:'prog',irts_save:'save',irts_auto:'auto'};for(const o in map){const v=LS.get(o);if(v!=null&&LS.get('irts:guest:'+map[o])==null)LS.set('irts:guest:'+map[o],v);}LS.set('irts_migrated','1');})();
async function hash(pass,salt){const txt=salt+':'+pass;try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}catch(e){let h=5381;for(let i=0;i<txt.length;i++)h=(h*33)^txt.charCodeAt(i);return 'x'+(h>>>0).toString(16);}}
const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const clean=s=>String(s||'').trim().slice(0,24);
// ---------- cloud (Supabase REST, no SDK) ----------
async function api(path,opt={},auth){const h=Object.assign({'apikey':CFG.supabaseAnonKey,'Content-Type':'application/json'},opt.headers||{});if(auth)h.Authorization='Bearer '+auth;
 const r=await fetch(CFG.supabaseUrl.replace(/\/$/,'')+path,Object.assign({},opt,{headers:h}));const t=await r.text();let j=null;try{j=t?JSON.parse(t):null;}catch(e){}
 if(!r.ok){const m=(j&&(j.msg||j.error_description||j.message||j.error))||('HTTP '+r.status);throw new Error(m);}return j;}
async function cloudSession(){if(!cur||!cur.cloud)return null;const s=cur.session;if(s&&s.exp>Date.now()+60000)return s.token;
 try{const j=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh})});setSession(j);return j.access_token;}catch(e){return null;}}
function setSession(j){cur.session={token:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000};const u=users();u[cur.id]=cur;saveUsers(u);}
function bundle(){const o={};for(const k of SYNC_KEYS){const v=LS.get(key(k));if(v!=null)o[k]=v;}o.at=Date.now();return o;}
function mergeIn(o,force){if(!o)return;const J=(s,d)=>{try{return JSON.parse(s);}catch(e){return d;}};
 const P=J(LS.get(key('prog'))||'{}',{}),Pr=J(o.prog||'{}',{});for(const d in Pr)P[d]=Math.max(P[d]||1,Pr[d]);LS.set(key('prog'),JSON.stringify(P));
 const S=J(LS.get(key('stars'))||'{}',{}),Sr=J(o.stars||'{}',{});for(const k in Sr)S[k]=Math.max(S[k]||0,Sr[k]);LS.set(key('stars'),JSON.stringify(S));
 const localAt=+(LS.get(key('at'))||0);if(force||(o.at||0)>localAt){for(const k of ['stats','save','auto','last','settings'])if(o[k]!=null)LS.set(key(k),o[k]);LS.set(key('at'),String(o.at));}}
async function pull(){const t=await cloudSession();if(!t)return false;const rows=await api(`/rest/v1/irts_saves?user_id=eq.${cur.remote}&select=data,updated_at`,{method:'GET'},t);if(rows&&rows[0])mergeIn(rows[0].data);return true;}
async function push(){const t=await cloudSession();if(!t)return false;const b=bundle();LS.set(key('at'),String(b.at));
 await api('/rest/v1/irts_saves',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:cur.remote,data:b,updated_at:new Date(b.at).toISOString()})},t);ACC.lastSync=Date.now();return true;}
// ---------- public API ----------
const ACC={cloud:CLOUD,lastSync:0,
 user:()=>cur,label:()=>cur?`👤 ${cur.name}`+(cur.cloud?' ☁':''):'👤 אורח',
 get:k=>LS.get(key(k)),set:(k,v)=>{LS.set(key(k),v);LS.set(key('at'),String(Date.now()));},del:k=>LS.del(key(k)),
 getJSON:(k,d)=>{try{const v=LS.get(key(k));return v==null?d:JSON.parse(v);}catch(e){return d;}},setJSON:(k,v)=>ACC.set(k,JSON.stringify(v)),
 getSetting:k=>{const s=ACC.getJSON('settings',{});return s[k];},setSetting:(k,v)=>{const s=ACC.getJSON('settings',{});s[k]=v;ACC.setJSON('settings',s);},
 onChange:f=>listeners.push(f),
 list:()=>Object.values(users()).filter(u=>!u.cloud||u.session).map(u=>({id:u.id,name:u.name,cloud:!!u.cloud})),
 async register({name,email,pass}){name=clean(name);if(name.length<2)throw new Error('שם המפקד צריך לפחות 2 תווים');if(!pass||pass.length<4)throw new Error('סיסמה של 4 תווים לפחות');
  if(CLOUD){if(!/^\S+@\S+\.\S+$/.test(email||''))throw new Error('צריך אימייל תקין לחשבון בענן');
   const j=await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password:pass,data:{name}})});
   if(!j||!j.access_token){return {confirm:true};}
   const id='c_'+j.user.id;cur={id,name,cloud:true,remote:j.user.id,email,created:Date.now()};setSession(j);LS.set('irts_session',id);await push().catch(()=>{});emit();return {ok:true};}
  const U=users();if(Object.values(U).some(u=>!u.cloud&&u.name.toLowerCase()===name.toLowerCase()))throw new Error('השם הזה כבר רשום במכשיר. בחר שם אחר או התחבר');
  const id='u_'+rid(),salt=rid();const guestHad=LS.get('irts:guest:prog');
  U[id]={id,name,email:email||'',salt,pass:await hash(pass,salt),created:Date.now()};saveUsers(U);cur=U[id];LS.set('irts_session',id);
  if(guestHad&&!LS.get(key('prog')))for(const k of SYNC_KEYS){const v=LS.get('irts:guest:'+k);if(v!=null)LS.set(key(k),v);} // keep what the guest already won
  emit();return {ok:true};},
 async login({name,email,pass}){if(CLOUD&&email){const j=await api('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password:pass})});
   const id='c_'+j.user.id;cur={id,name:(j.user.user_metadata&&j.user.user_metadata.name)||email.split('@')[0],cloud:true,remote:j.user.id,email};setSession(j);LS.set('irts_session',id);await pull().catch(()=>{});emit();return {ok:true};}
  const U=users(),n=clean(name).toLowerCase();const u=Object.values(U).find(x=>!x.cloud&&x.name.toLowerCase()===n);if(!u)throw new Error('לא נמצא מפקד בשם הזה במכשיר');
  if(await hash(pass,u.salt)!==u.pass)throw new Error('סיסמה שגויה');cur=u;LS.set('irts_session',u.id);emit();return {ok:true};},
 logout(){if(cur&&cur.cloud){push().catch(()=>{});}cur=null;LS.del('irts_session');emit();},
 remove(){if(!cur)return;const U=users();delete U[cur.id];saveUsers(U);for(const k of SYNC_KEYS.concat(['at']))LS.del(key(k));cur=null;LS.del('irts_session');emit();},
 sync(){if(!cur||!cur.cloud)return Promise.resolve(false);clearTimeout(syncT);return new Promise(r=>{syncT=setTimeout(()=>push().then(r,()=>r(false)),400);});},
 pull:()=>cur&&cur.cloud?pull():Promise.resolve(false),
 exportCode(){const b=bundle();b.name=cur?cur.name:'אורח';b.v=1;return 'IRTS1.'+btoa(unescape(encodeURIComponent(JSON.stringify(b))));},
 importCode(code){code=String(code||'').trim();if(!code.startsWith('IRTS1.'))throw new Error('קוד לא תקין');let o;try{o=JSON.parse(decodeURIComponent(escape(atob(code.slice(6)))));}catch(e){throw new Error('קוד לא תקין');}
  o.at=Date.now();mergeIn(o,true);ACC.sync();emit();return true;},
 totals(){const S=ACC.getJSON('stars',{});let n=0;for(const k in S)n+=S[k];const T=ACC.getJSON('stats',{kills:0,losses:0,wins:0,played:0,secs:0});return Object.assign({stars:n},T);}
};
// restore session
const sid=LS.get('irts_session');if(sid){const u=users()[sid];if(u){cur=u;if(u.cloud)pull().then(ok=>ok&&emit()).catch(()=>{});}}
window.ACC=ACC;
})();
