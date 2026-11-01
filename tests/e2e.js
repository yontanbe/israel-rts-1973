// Browser test (needs Playwright with Chromium): node tests/e2e.js [--shots]
// Landing page, sign up, all 10 stages start, building + training, save, reload and continue, offline play, phone layout.
// --shots also refreshes the gallery images in assets/shots/.
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
const SHOTS=process.argv.includes('--shots');const port=8700+(Math.random()*200|0);const URL=`http://localhost:${port}/`;
let fails=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)fails++;};
(async()=>{const srv=spawn('node',[path.join(__dirname,'../tools/serve.js'),String(port)],{stdio:'ignore'});await new Promise(r=>setTimeout(r,700));
 const b=await chromium.launch();try{
 const ctx=await b.newContext({viewport:{width:1366,height:768}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(URL);await p.waitForTimeout(800);
 ok(await p.isVisible('#home'),'landing page is shown');ok(await p.isVisible('#hPlay'),'play button');ok((await p.$$('#features .feat>div')).length===6,'feature cards');
 await p.click('#hReg');await p.fill('#aName','מפקד בדיקה');await p.fill('#aPass','abcd');await p.click('#aGo');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>ACC.user()&&ACC.user().name==='מפקד בדיקה'),'sign up works');
 await p.click('#hPlay');await p.waitForTimeout(300);ok(await p.isVisible('#menu'),'menu opens');ok(await p.isDisabled('#stage-2'),'stage 2 locked for a new player');
 await p.click('#stage-1');await p.waitForTimeout(300);ok(await p.isVisible('#bmap'),'briefing shows a map');ok((await p.textContent('#bdate')).includes('1973'),'briefing shows the date');
 await p.click('#go');await p.waitForTimeout(1500);ok(await p.isVisible('#c'),'stage 1 runs');
 ok((await p.$$('#bld .cam')).length===4,'stage 1 offers 4 buildings');
 const built=await p.evaluate(async()=>{const G=__game();G.res=5000;G.queueBuild('barracks');for(let i=0;i<400;i++)G.step();const hq=G.ents.find(e=>e.type==='hq');for(let r=0;r<80&&!G.ents.some(e=>e.type==='barracks');r++)G.placeBuild(hq.x+150+(r%8)*24,hq.y-150+(r>>3)*24);for(let i=0;i<120;i++)G.step();G.queueUnit('inf');for(let i=0;i<400;i++)G.step();return {b:G.ents.some(e=>e.type==='barracks'),u:G.ents.some(e=>e.type==='inf')};});
 ok(built.b,'barracks built');ok(built.u,'infantry trained');
 await p.waitForTimeout(500);if(SHOTS)await p.screenshot({path:'assets/shots/s2.jpg',quality:80});
 await p.click('#save');const before=await p.evaluate(()=>({t:__game().t,n:__game().ents.length}));
 await p.reload();await p.waitForTimeout(1200);ok(await p.isVisible('#menu'),'reload returns to the menu');ok(await p.evaluate(()=>ACC.user()&&ACC.user().name),'still signed in after reload');
 await p.click('#cont');await p.waitForTimeout(1500);const after=await p.evaluate(()=>({t:__game().t,n:__game().ents.length,st:__game().st.id}));ok(after.st===1&&after.t>=before.t&&after.n===before.n,'continue resumes the saved game');
 for(let id=1;id<=10;id++){const r=await p.evaluate(id=>{try{__startStage(id,'normal');return true;}catch(e){return e.message;}},id);await p.waitForTimeout(id===1||id===4||id===8||id===9?1800:700);const g=await p.evaluate(()=>({id:__game().st.id,t:__game().t}));ok(r===true&&g.id===id&&g.t>0,'stage '+id+' starts');
  if(SHOTS&&[1,4,8,9].includes(id)){await p.evaluate(()=>{const G=__game();G.nextWave=1;});await p.waitForTimeout(9000);await p.screenshot({path:`assets/shots/${{1:'s1',4:'s4',8:'s3',9:'s6'}[id]}.jpg`,quality:80});}}
 if(SHOTS){await p.evaluate(()=>__menu());await p.evaluate(()=>{ACC.setJSON('prog',{normal:10});__menu();});await p.click('#stage-6');await p.waitForTimeout(500);await p.screenshot({path:'assets/shots/s5.jpg',quality:80});}
 // win flow: stars + next stage unlock
 await p.evaluate(()=>{__startStage(1,'normal');});await p.waitForTimeout(800);await p.evaluate(()=>{const G=__game();G.over='win';G.t=600;});await p.waitForTimeout(500);
 ok(await p.isVisible('#end'),'win screen');ok((await p.$$('#estars .on')).length>=1,'stars shown');ok(await p.evaluate(()=>ACC.getJSON('prog',{}).normal>=2),'next stage unlocked');
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
 // offline: service worker caches the game
 await p.goto(URL);await p.waitForTimeout(2500);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(1500);await ctx.setOffline(true);await p.reload();await p.waitForTimeout(800);
 ok(await p.isVisible('#home'),'loads offline after first visit');await ctx.setOffline(false);
 // phone
 const ph=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2});const m=await ph.newPage();const merr=[];m.on('pageerror',e=>merr.push(e.message));
 await m.goto(URL);await m.waitForTimeout(800);const ov=await m.evaluate(()=>document.getElementById('home').scrollWidth<=innerWidth+1);ok(ov,'phone: landing page has no sideways scroll');
 await m.tap('#hPlay');await m.waitForTimeout(300);await m.tap('#stage-1');await m.waitForTimeout(300);await m.tap('#go');await m.waitForTimeout(1500);ok(await m.isVisible('#c'),'phone: game runs');ok(merr.length===0,'phone: no errors');
 const pp=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const q=await pp.newPage();await q.goto(URL);await q.waitForTimeout(600);ok(await q.evaluate(()=>document.getElementById('home').scrollWidth<=innerWidth+1),'portrait phone: landing fits');
 }catch(e){console.error(e);fails++;}finally{await b.close();srv.kill();}
 console.log(fails?`${fails} failed`:'all browser checks passed');process.exit(fails?1:0);})();
