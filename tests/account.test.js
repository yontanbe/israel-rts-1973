// Account tests with an in-memory localStorage and a mocked Supabase.
const test=require('node:test'),assert=require('node:assert');
function fresh(cfg,fetchImpl){const m=new Map();global.window=global;global.localStorage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
 global.IRTS_CONFIG=cfg||{};global.fetch=fetchImpl;global.btoa=s=>Buffer.from(s,'binary').toString('base64');global.atob=s=>Buffer.from(s,'base64').toString('binary');
 delete require.cache[require.resolve('../account.js')];require('../account.js');return {ACC:global.ACC,m};}
test('legacy single-player progress moves to the guest profile',()=>{const m=new Map([['irts_prog','{"normal":4}']]);global.window=global;global.localStorage={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};global.IRTS_CONFIG={};
 delete require.cache[require.resolve('../account.js')];require('../account.js');assert.deepEqual(ACC.getJSON('prog'),{normal:4});});
test('register, keep guest progress, logout, login, wrong password',async()=>{const {ACC}=fresh();ACC.setJSON('prog',{normal:3});
 await ACC.register({name:'יוני',pass:'1234'});assert.equal(ACC.user().name,'יוני');assert.deepEqual(ACC.getJSON('prog'),{normal:3});ACC.setJSON('prog',{normal:6});
 ACC.logout();assert.equal(ACC.user(),null);assert.deepEqual(ACC.getJSON('prog'),{normal:3});
 await assert.rejects(()=>ACC.login({name:'יוני',pass:'0000'}),/סיסמה/);await ACC.login({name:'יוני',pass:'1234'});assert.deepEqual(ACC.getJSON('prog'),{normal:6});
 await assert.rejects(()=>ACC.register({name:'יוני',pass:'5555'}),/כבר רשום/);});
test('profiles are separate',async()=>{const {ACC}=fresh();await ACC.register({name:'a1',pass:'1111'});ACC.set('save','A');ACC.logout();await ACC.register({name:'b2',pass:'2222'});assert.equal(ACC.get('save'),null);});
test('export code moves progress to another device',async()=>{let {ACC}=fresh();await ACC.register({name:'x1',pass:'1111'});ACC.setJSON('prog',{hard:7});ACC.setJSON('stars',{'hard:1':3});ACC.set('save','{"s":1}');const code=ACC.exportCode();
 ({ACC}=fresh());await ACC.register({name:'x1',pass:'1111'});ACC.setJSON('prog',{hard:2,easy:5});ACC.importCode(code);assert.deepEqual(ACC.getJSON('prog'),{hard:7,easy:5});assert.equal(ACC.getJSON('stars')['hard:1'],3);assert.equal(ACC.get('save'),'{"s":1}');
 assert.throws(()=>ACC.importCode('garbage'));});
test('cloud mode: sign up, push and pull through Supabase REST',async()=>{const db={};const calls=[];
 const f=async(url,opt)=>{calls.push(opt.method+' '+url);const body=opt.body?JSON.parse(opt.body):null;const ok=(j,st=200)=>({ok:st<300,status:st,text:async()=>j==null?'':JSON.stringify(j)});
  if(url.includes('/auth/v1/signup'))return ok({access_token:'T',refresh_token:'R',expires_in:3600,user:{id:'U1',user_metadata:{name:body.data.name}}});
  if(url.includes('grant_type=password'))return body.password==='pw12'?ok({access_token:'T2',refresh_token:'R2',expires_in:3600,user:{id:'U1',user_metadata:{name:'מפקד'}}}):ok({msg:'Invalid login credentials'},400);
  if(url.includes('/rest/v1/irts_saves')&&opt.method==='POST'){assert.equal(opt.headers.Authorization.slice(0,7),'Bearer ');db[body.user_id]=body;return ok(null,201);}
  if(url.includes('/rest/v1/irts_saves')&&opt.method==='GET'){const id=url.match(/eq\.([^&]+)/)[1];return ok(db[id]?[db[id]]:[]);}
  return ok({msg:'?'},404);};
 let {ACC}=fresh({supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'anon'},f);assert.ok(ACC.cloud);
 await assert.rejects(()=>ACC.register({name:'מפקד',pass:'pw12'}),/אימייל/);
 await ACC.register({name:'מפקד',email:'a@b.co',pass:'pw12'});ACC.setJSON('prog',{normal:8});ACC.set('save','{"cloud":1}');await ACC.sync();assert.equal(JSON.parse(db.U1.data.prog).normal,8);
 ({ACC}=fresh({supabaseUrl:'https://x.supabase.co',supabaseAnonKey:'anon'},f));await assert.rejects(()=>ACC.login({email:'a@b.co',pass:'bad'}),/Invalid/);
 await ACC.login({email:'a@b.co',pass:'pw12'});assert.equal(ACC.getJSON('prog').normal,8);assert.equal(ACC.get('save'),'{"cloud":1}');});
