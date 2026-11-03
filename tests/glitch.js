// Glitch hunt (needs Playwright): every stage runs in the browser with waves forced early.
// Checks page errors, NaN/out-of-map positions, units stuck in rock, save/load mid-battle, HUD text overflow, phone layout.
// node tests/glitch.js [outdir for screenshots]
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const out=process.argv[2];
const port=8900+(Math.random()*90|0),URL=`http://localhost:${port}/`;let fails=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)fails++;};
(async()=>{const srv=spawn('node',[path.join(__dirname,'../tools/serve.js'),String(port)],{stdio:'ignore'});await new Promise(r=>setTimeout(r,700));const b=await chromium.launch();
 try{const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(URL+'#play');await p.waitForTimeout(900);
 for(let id=1;id<=10;id++){await p.evaluate(id=>{ACC.setSetting('tutDone',true);__startStage(id,'hard');},id);await p.waitForTimeout(900);
  await p.evaluate(()=>{const G=__game();G.nextWave=60;G.res+=3000;});
  for(let k=0;k<4;k++){await p.waitForTimeout(4000);await p.evaluate(()=>{const G=__game();if(G.nextWave>120&&G.wave<G.st.waves)G.nextWave=60;const hq=G.ents.find(e=>e.type==='hq'&&e.side==='me');const army=G.ents.filter(e=>e.side==='me'&&e.kind==='u'&&!e.def.harv);G.sel=army;army.forEach((u,i)=>{if(!u.dug)u.mv={x:hq.cx+300+(i%5)*30,y:hq.cy+((i/5|0)-2)*30};u.amove=true;});});}
  const chk=await p.evaluate(()=>{const G=__game(),R={nan:0,out:0,rock:0,n:G.ents.length,over:G.over,wave:G.wave};for(const e of G.ents){if(!isFinite(e.x)||!isFinite(e.y)||!isFinite(e.hp))R.nan++;if(e.x<-60||e.y<-60||e.x>G.W+60||e.y>G.H+60)R.out++;if(e.kind==='u'){const c=(e.y/24|0)*G.gw+(e.x/24|0);if(G.rock[c]&&!G.free((e.x/24|0)+1,(e.y/24|0))&&!G.free((e.x/24|0)-1,(e.y/24|0))&&!G.free(e.x/24|0,(e.y/24|0)+1)&&!G.free(e.x/24|0,(e.y/24|0)-1))R.rock++;}}
   const s=G.serialize();const H=Game.load(s);R.save=H.ents.length===G.ents.length&&H.wave===G.wave&&Math.abs(H.res-G.res)<1;
   const side=document.getElementById('hud');R.hudOverflow=side.scrollWidth>side.clientWidth+2;return R;});
  ok(!chk.nan&&!chk.out,`stage ${id}: positions valid (${chk.n} entities, wave ${chk.wave})`);ok(chk.rock===0,`stage ${id}: no unit trapped in rock (${chk.rock})`);ok(chk.save,`stage ${id}: save/load mid-battle`);ok(!chk.hudOverflow,`stage ${id}: sidebar fits`);
  if(out){await p.evaluate(()=>{const G=__game();const f=G.ents.filter(e=>e.side==='foe'&&e.kind==='u'&&G.visible(e.x,e.y))[0]||G.ents.find(e=>e.type==='hq');__cam.x=(f.cx||f.x)-500;__cam.y=(f.cy||f.y)-330;});await p.waitForTimeout(400);await p.screenshot({path:`${out}/st${id}.png`});}}
 ok(errs.length===0,'no page errors'+(errs.length?': '+errs.slice(0,3).join(' | '):''));
 // briefing and menus fit on small screens
 for(const [w,h] of [[390,844],[844,390],[1024,600]]){const q=await b.newPage({viewport:{width:w,height:h},isMobile:w<900,hasTouch:w<900});await q.goto(URL+'#play');await q.waitForTimeout(700);await q.evaluate(()=>{document.getElementById('dpick').classList.add('hide');ACC.setSetting('diff','normal');ACC.setJSON('prog',{normal:10});__menu();});await q.click('#stage-5');await q.waitForTimeout(500);
  const f=await q.evaluate(()=>{const s=document.getElementById('brief');const go=document.getElementById('go');s.scrollTop=1e5;const r=go.getBoundingClientRect();return {sideways:document.documentElement.scrollWidth>innerWidth+1||s.scrollWidth>s.clientWidth+1,reach:r.bottom<=innerHeight+1&&r.top>=0};});
  ok(!f.sideways&&f.reach,`${w}x${h}: briefing fits and the start button is reachable`);if(out)await q.screenshot({path:`${out}/brief_${w}x${h}.png`});await q.close();}
 }catch(e){console.error(e);fails++;}finally{await b.close();srv.kill();}console.log(fails?fails+' failed':'no glitches found');process.exit(fails?1:0);})();
