// UI layer: camera, rendering with AI sprite art, fog, minimap, input (mouse+touch), audio, save/progress, story screens.
(function(){
const $=id=>document.getElementById(id);const {TILE,CELL}=RTS_CONST;const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SC=SCENARIOS.find(s=>s.id==='yk1973');let G=null,diff='normal',paused=false,cam={x:0,y:0},VW=800,VH=600,Z=1;const WV=()=>VW/Z,HV=()=>VH/Z;
// ---------- assets ----------
const IMG={},names=['magach','t55','t62','shot_centurion','tiran','supply_truck','mirage','phantom','mig21','hq','supply_depot','war_factory','advisor_officer','jeep_at','btr','sam_site','rock0','rock1','rock2','rock3','rock4','rock5','rock6','rock7','rock8'];
let loaded=0;const tint={};let META={};const DIRIMG={};
fetch('assets/s/d/meta.json').then(r=>r.json()).then(m=>META=m).catch(()=>{});
['hull_il','hull_foe','btr8'].forEach(n=>{for(let d=0;d<8;d++){const i=new Image();i.src=`assets/s/d/${n}_${d}.png`;DIRIMG[n+'_'+d]=i;}});
['shot','tiran','magach','t55','t62'].forEach(n=>{const i=new Image();i.src=`assets/s/d/tur_${n}.png`;DIRIMG['tur_'+n]=i;});
const dirOf=a=>((Math.round(a/(Math.PI/4))%8)+8)%8;
function angLerp(a,b,t){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*t;}
function tinted(k,filter){const key=k+filter;if(tint[key])return tint[key];const im=IMG[k];const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.filter=filter;x.drawImage(im,0,0);return tint[key]=c;}
const FOE_F='hue-rotate(-25deg) saturate(.7) brightness(.78)',JEEP_F='saturate(.6) brightness(1.15) sepia(.35)';
names.forEach(n=>{const i=new Image();i.onload=()=>loaded++;i.src='assets/s/'+n+'.png';IMG[n]=i;});
const TILES={golan:new Image(),sinai:new Image()};TILES.golan.src='assets/s/tile_golan_basalt.jpg';TILES.sinai.src='assets/s/tile_sinai_sand.jpg';const PAINT={golan:new Image(),sinai:new Image()};PAINT.golan.src='assets/s/map_golan.jpg';PAINT.sinai.src='assets/s/map_sinai.jpg';let puffs=[],smokers=[];
// ---------- audio (Web Audio synth, no files) ----------
let AC=null,muted=localStorage.getItem('irts_mute')==='1',lastShot=0;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function noise(dur,freq,type,vol){const a=ac();if(!a||muted)return;const n=a.sampleRate*dur|0,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
 const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=a.createGain();g.gain.value=vol;s.connect(f).connect(g).connect(a.destination);s.start();}
function tone(f0,f1,dur,vol,wave='square'){const a=ac();if(!a||muted)return;const o=a.createOscillator(),g=a.createGain();o.type=wave;o.frequency.setValueAtTime(f0,a.currentTime);o.frequency.exponentialRampToValueAtTime(f1,a.currentTime+dur);g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+dur);}
function sfx(k,x,y){let v=1;if(x!=null){const dx=x-(cam.x+WV()/2),dy=y-(cam.y+HV()/2);v=Math.max(0,1-Math.hypot(dx,dy)/1400);if(v<=0.02)return;}
 if(k==='shot'){const n=performance.now();if(n-lastShot<70)return;lastShot=n;noise(.12,900,'bandpass',.35*v);}
 else if(k==='boom')noise(.45,320,'lowpass',.8*v);else if(k==='bigboom'){noise(.9,200,'lowpass',1*v);}
 else if(k==='jet'){tone(900,180,1.6,.08,'sawtooth');noise(1.4,1200,'bandpass',.15);}else if(k==='alert'){tone(660,660,.15,.12);setTimeout(()=>tone(880,880,.18,.12),180);}
 else if(k==='ready'||k==='unit')tone(520,1040,.12,.08,'triangle');else if(k==='build')tone(300,150,.2,.1);else if(k==='click')tone(700,700,.05,.05,'triangle');else if(k==='deny')tone(200,140,.15,.08);}
function setMute(m){muted=m;localStorage.setItem('irts_mute',m?'1':'0');['mute','mute1'].forEach(i=>$(i).textContent=m?'🔇':'🔊'+(i==='mute1'?' צליל':''));}
// ---------- progress / saves ----------
const prog=()=>JSON.parse(localStorage.getItem('irts_prog')||'{}');
function unlock(stId){const p=prog();p[diff]=Math.max(p[diff]||1,stId);localStorage.setItem('irts_prog',JSON.stringify(p));}
function saveGame(slot='irts_save'){if(!G||G.over)return;try{localStorage.setItem(slot,G.serialize());if(slot==='irts_save')say('💾 המשחק נשמר');}catch(e){say('שמירה נכשלה');}}
// ---------- menu & story ----------
function menu(){paused=true;G=null;['wrap','brief','end'].forEach(i=>$(i).classList.add('hide'));$('menu').classList.remove('hide');$('cards').innerHTML='';
 $('cont').classList.toggle('hide',!localStorage.getItem('irts_save')&&!localStorage.getItem('irts_auto'));
 SCENARIOS.forEach(s=>{const d=document.createElement('div');d.className='card'+(s.ready?'':' off');d.innerHTML=`<b>${s.name}</b> ${s.ready?'':'<span class="tag">בקרוב</span>'}<div>${s.desc}</div>`;
  if(s.ready){const dr=document.createElement('div');dr.className='diffs';dr.innerHTML='רמת קושי: ';Object.keys(DIFF).forEach(k=>{const b=document.createElement('button');b.textContent=DIFF[k].name;b.className=k===diff?'on':'';b.onclick=()=>{diff=k;menu();};dr.appendChild(b);});d.appendChild(dr);
   const sr=document.createElement('div');sr.innerHTML='שלבים: ';const mx=prog()[diff]||1;s.stages.forEach(st=>{const b=document.createElement('button');b.className='stg'+(st.id>mx?' lock':'');b.textContent=(st.id>mx?'🔒':'')+st.id;b.title=st.name;b.disabled=st.id>mx;b.id='stage-'+st.id;b.onclick=()=>brief(st);sr.appendChild(b);});d.appendChild(sr);}
  $('cards').appendChild(d);});}
function brief(st){ac();sfx('click');$('menu').classList.add('hide');$('end').classList.add('hide');$('brief').classList.remove('hide');
 $('advimg').src=SC.advisor.img;$('advname').textContent=SC.advisor.name;$('advrole').textContent=SC.advisor.role;
 $('bt').textContent=`שלב ${st.id}: ${st.name}`;$('bb').innerHTML=(st.id===1?`<p>${SC.intro}</p>`:'')+`<p>${st.brief}</p>`;$('bg').textContent='🎯 מטרה: '+st.goal+` · רמת קושי: ${DIFF[diff].name}`;$('go').onclick=()=>start(new Game(SC,st,diff,(Math.random()*1e9)|0,false));}
function start(g){if(loaded<names.length||!PAINT.golan.complete||!PAINT.sinai.complete){setTimeout(()=>start(g),150);return;}if(!SC._big){SC._big=1;for(const k in SC.units)SC.units[k].sz=Math.round(SC.units[k].sz*1.5);}Z=Math.min(1.8,Math.max(Z,1.25));G=g;G.msg=say;puffs=[];smokers=[];$('brief').classList.add('hide');$('menu').classList.add('hide');$('wrap').classList.remove('hide');resize();
 const hq=G.ents.find(e=>e.type==='hq'&&e.side==='me');cam.x=hq?hq.cx-WV()/2:0;cam.y=hq?hq.cy-HV()/2:0;clampCam();buildBg();buildSide();paused=false;say(G.st.goal);
 $('airbox').classList.toggle('hide',!G.st.air);$('tAir').classList.toggle('hide',!G.st.air);requestAnimationFrame(loop);}
function endScreen(){const win=G.over==='win',st=G.st;localStorage.removeItem('irts_auto');$('end').classList.remove('hide');$('advimg2').src=SC.advisor.img;
 $('et').textContent=win?`🏆 שלב ${st.id} הושלם`:'💥 המשימה נכשלה';$('eb').textContent=`השמדתם ${G.stats.kills} כלי אויב · אבדו ${G.stats.losses} · זמן ${Math.round(G.t/60)} שניות · ${DIFF[diff].name}`;
 const nx=SC.stages.find(s=>s.id===st.id+1);$('eo').textContent=win?st.outro:'"זה לא נגמר כאן. נתארגן מחדש וננסה שוב. הפעם תבנה כלכלה חזקה יותר לפני שהגלים הגדולים מגיעים."';
 if(win&&nx)unlock(nx.id);$('next').classList.toggle('hide',!(win&&nx));$('next').onclick=()=>brief(nx);$('retry').onclick=()=>brief(st);$('tomenu').onclick=menu;if(win&&!nx)$('eb').textContent+=' · המערכה הושלמה!';}
const VOICE={sel:['כן, המפקד!','מוכנים.','צוות בעמדה.','מקשיב.','עונה!'],move:['זזים!','בדרך.','קיבלתי, נע.','מתקדמים.'],atk:['אש!','מטרה בטווח!','יורים!','קיבלתי, תוקף.'],harv:['יוצא לאסוף דלק.','בדרך לשדה.'],fixed:['תוקנו, חוזרים לקרב.'],repair:['נוסעים לתיקון.'],lost:['איבדנו כלי!','נפגענו!']};
const bubbles=[];let lastVoice=0;function voice(u,k,force){const n=performance.now();if(!force&&n-lastVoice<900)return;lastVoice=n;const a=VOICE[k];bubbles.push({u,x:u.x,y:u.y,t:a[Math.random()*a.length|0],life:90});if(bubbles.length>4)bubbles.shift();tone(k==='atk'?420:620,k==='atk'?380:700,.06,.03,'square');}
let msgT=0;function say(s){$('msg').textContent=s;clearTimeout(msgT);msgT=setTimeout(()=>$('msg').textContent='',5000);}
// ---------- sidebar ----------
const cams=[];
function camBtn(kind,type){const d=kind==='b'?SC.buildings[type]:SC.units[type];const b=document.createElement('button');b.className='cam';b.id=(kind==='b'?'b-':'u-')+type;
 b.innerHTML=`<img src="assets/s/${d.img}.png" style="${d.tint==='jeep'?'filter:'+JEEP_F:''}"><div>${d.name}</div><div>⛽${d.cost}</div><div class="pb" style="width:0"></div>`;
 b.onclick=()=>{ac();if(kind==='b'){if(G.q.build&&G.q.build.done&&G.q.build.t===type){G.place=type;say('בחר מיקום למבנה (ליד הבסיס)');}else if(!G.queueBuild(type))sfx('deny');else sfx('click');}else{if(!G.queueUnit(type))sfx('deny');else sfx('click');}};cams.push({b,kind,type,d});return b;}
function buildSide(){cams.length=0;$('stname').textContent=`${G.st.id}. ${G.st.name}`;$('bld').innerHTML='';$('unt').innerHTML='';
 ['depot','factory'].forEach(t=>$('bld').appendChild(camBtn('b',t)));Object.keys(SC.units).filter(t=>!SC.units[t].foe&&G.unlocked(t)).forEach(t=>$('unt').appendChild(camBtn('u',t)));}
function hud(){$('res').textContent=`${SC.res.icon} ${Math.floor(G.res)}`;const st=G.st;
 $('obj').textContent=st.obj==='kills'?`🎯 הושמדו ${G.stats.kills}/${st.kills}`:st.obj==='destroy'?`🎯 מבני אויב: ${G.ents.filter(e=>e.side==='foe'&&e.kind==='b').length}`:`🎯 ${st.goal}`;
 $('wave').textContent=G.wave>=st.waves?`כל ${st.waves} הגלים יצאו`:`גל ${G.wave}/${st.waves} · הבא בעוד ${Math.ceil(G.nextWave/60)} ש׳`;
 for(const c of cams){const pb=c.b.querySelector('.pb');let p=0,rdy=false,dis=G.res<c.d.cost;
  if(c.kind==='b'){if(G.q.build&&G.q.build.t===c.type){p=G.q.build.p/G.q.build.need;rdy=G.q.build.done;dis=false;}else if(G.q.build)dis=true;}
  else{if(!G.has(c.d.from))dis=true;const i=G.q.unit.findIndex(q=>q.t===c.type);if(i===0)p=G.q.unit[0].p/G.q.unit[0].need;}
  pb.style.width=(p*100)+'%';c.b.classList.toggle('rdy',rdy);c.b.disabled=dis&&!rdy;}
 if(G.st.air){const cd=Math.ceil(G.air.cd/60);$('aircd').textContent=cd>0?` (${cd}ש׳)`:` ⛽${SC.air.me.cost}`;$('air').disabled=cd>0||G.res<SC.air.me.cost;$('tAir').disabled=$('air').disabled;}
 $('sel').textContent=G.sel.length?(G.sel.length===1?`${G.sel[0].def.name} · ${Math.ceil(G.sel[0].hp)}/${Math.ceil(G.sel[0].max)}`:`נבחרו ${G.sel.length} יחידות`):'';}
// ---------- rendering ----------
const cv=$('c'),ctx=cv.getContext('2d'),mini=$('mini'),mctx=mini.getContext('2d');let bg=null,miniBg=null,fogC=null;
function resize(){const v=$('view');VW=cv.width=v.clientWidth;VH=cv.height=v.clientHeight;if(G){const r=G.H/G.W;mini.width=220;mini.height=220*r|0;clampCam();}}
addEventListener('resize',resize);
function clampCam(){if(!G)return;const w=WV(),h=HV();cam.x=Math.max(0,Math.min(G.W-w,cam.x));cam.y=Math.max(0,Math.min(G.H-h,cam.y));if(G.W<w)cam.x=(G.W-w)/2;if(G.H<h)cam.y=(G.H-h)/2;}
function buildBg(){bg=document.createElement('canvas');bg.width=G.W;bg.height=G.H;const x=bg.getContext('2d');const T=TILES[G.st.map]||TILES.golan,sand=G.st.map==='sinai';
 if(T.complete&&T.naturalWidth){x.fillStyle=x.createPattern(T,'repeat');}else x.fillStyle=sand?'#c9a46a':'#6a5a40';x.fillRect(0,0,G.W,G.H);if(!sand){x.fillStyle='rgba(40,28,12,.38)';x.fillRect(0,0,G.W,G.H);}
 const P=PAINT[G.st.map]||PAINT.golan,painted=P.complete&&P.naturalWidth;if(painted){x.drawImage(P,0,0,G.W,G.H);x.globalAlpha=.16;x.globalCompositeOperation='overlay';x.fillStyle=x.createPattern(T,'repeat');x.fillRect(0,0,G.W,G.H);x.globalAlpha=1;x.globalCompositeOperation='source-over';}
 let s=G.seed|0;const r=()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
 if(!painted)for(let i=0;i<G.W*G.H/9000;i++){const px=r()*G.W,py=r()*G.H,rr=30+r()*120;const g=x.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,`rgba(${sand?'255,230,180':'40,30,20'},${.06+r()*.08})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-rr,py-rr,rr*2,rr*2);}
 const rocks=[0,1,2,3,4,5,6,7,8].map(i=>sand?tinted('rock'+i,'sepia(.8) saturate(1.4) brightness(1.5) hue-rotate(-10deg)'):tinted('rock'+i,'brightness(1.55) contrast(1.2) saturate(.7) sepia(.15)'));const cells=[];
 for(let y=0;y<G.gh;y++)for(let xx=0;xx<G.gw;xx++)if(G.rock[y*G.gw+xx])cells.push([xx,y]);
 cells.sort((p,q)=>p[1]-q[1]);if(!painted)for(const [xx,y] of cells){const im=rocks[r()*9|0];if(!im.width)continue;const sz=30+r()*14,cx=xx*CELL+12+(r()-.5)*6,cy=y*CELL+12+(r()-.5)*6;const h=im.height*sz/im.width;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(cx+4,cy+h*.3,sz*.45,sz*.18,0,0,7);x.fill();x.save();x.translate(cx,cy);if(r()<.5)x.scale(-1,1);x.drawImage(im,-sz/2,-h*.6,sz,h);x.restore();if(!sand){x.strokeStyle='rgba(210,200,180,.18)';x.lineWidth=1.5;x.beginPath();x.ellipse(cx,cy-h*.1,sz*.38,h*.38,0,3.5,5.9);x.stroke();}}
 const v=x.createLinearGradient(0,0,G.W,0);v.addColorStop(0,'rgba(60,90,160,.07)');v.addColorStop(.5,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(160,40,30,.07)');x.fillStyle=v;x.fillRect(0,0,G.W,G.H);
 miniBg=document.createElement('canvas');miniBg.width=mini.width;miniBg.height=mini.height;miniBg.getContext('2d').drawImage(bg,0,0,mini.width,mini.height);
 fogC=document.createElement('canvas');fogC.width=G.gw;fogC.height=G.gh;}
function drawFog(){const f=fogC.getContext('2d'),id=f.createImageData(G.gw,G.gh);for(let i=0;i<G.vis.length;i++){id.data[i*4+3]=G.vis[i]?0:G.seen[i]?110:235;}f.putImageData(id,0,0);}
function spr(img,x,y,sz,flip,alpha){const s=sz/Math.max(img.width,img.height);const w=img.width*s,h=img.height*s;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);if(alpha!=null)ctx.globalAlpha=alpha;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
function unitImg(u){const d=u.def;let im=IMG[d.img];if(d.tint==='foe')im=tinted(d.img,FOE_F);else if(d.tint==='jeep')im=tinted(d.img,JEEP_F);return im;}
function draw(){ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);ctx.save();ctx.setTransform(Z,0,0,Z,-Math.round(cam.x*Z),-Math.round(cam.y*Z));
 {const w=Math.min(WV(),G.W-cam.x),h=Math.min(HV(),G.H-cam.y);ctx.drawImage(bg,cam.x,cam.y,w,h,cam.x,cam.y,w,h);}
 const inV=(x,y,m=80)=>x>cam.x-m&&x<cam.x+WV()+m&&y>cam.y-m&&y<cam.y+HV()+m;
 for(const f of G.fields){if(!inV(f.x,f.y))continue;const a=Math.max(.15,f.amt/f.max);const rg=ctx.createRadialGradient(f.x,f.y,2,f.x,f.y,f.r);rg.addColorStop(0,`rgba(240,200,70,${.7*a})`);rg.addColorStop(1,'rgba(240,200,70,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();
  for(let i=0;i<Math.ceil(6*a);i++){const an=i*1.1,dd=f.r*.45;const bx=f.x+Math.cos(an)*dd,by=f.y+Math.sin(an)*dd*.7;ctx.fillStyle='#3d4a2a';ctx.fillRect(bx-6,by-4,12,8);ctx.fillStyle='#6b7a45';ctx.fillRect(bx-6,by-4,12,2);ctx.fillStyle='#b33';ctx.fillRect(bx-1,by-3,2,2);}}
 const list=G.ents.filter(e=>{const p=G.pos(e);if(!inV(p.x,p.y,160))return false;if(e.side==='foe'){if(e.kind==='u')return G.visible(e.x,e.y);return G.seen[(e.cy/CELL|0)*G.gw+(e.cx/CELL|0)];}return true;}).sort((a,b)=>(a.kind==='b'?a.y+a.h:a.y)-(b.kind==='b'?b.y+b.h:b.y));
 for(const e of list){if(e.kind==='b'){let im=IMG[e.def.img];if(e.side==='foe')im=tinted(e.def.img,FOE_F);const s=Math.max(e.w/im.width,(e.h*1.25)/im.height)*1.12;const w=im.width*s,h=im.height*s;
   ctx.save();ctx.globalAlpha=.25+e.dep*.75;ctx.filter='brightness(0) blur(5px)';ctx.globalAlpha*=.4;ctx.drawImage(im,e.cx-w/2+10,e.y+e.h-h+14,w,h);ctx.filter='none';ctx.globalAlpha=.25+e.dep*.75;ctx.drawImage(im,e.cx-w/2,e.y+e.h-h+6,w,h);ctx.restore();
   if(e.side==='foe'){ctx.fillStyle='#b83a2e';ctx.fillRect(e.x+4,e.y-8,12,8);}
   if(G.sel.includes(e)){ctx.strokeStyle='#fff';ctx.strokeRect(e.x,e.y,e.w,e.h);}}
  else{const d=e.def,im=unitImg(e);const c=Math.cos(e.ang);const flip=(c<0)!==(d.face<0);
   {const g=ctx.createRadialGradient(e.x+d.sz*.12,e.y+d.sz*.22,1,e.x+d.sz*.12,e.y+d.sz*.22,d.sz*.55);g.addColorStop(0,'rgba(0,0,0,.42)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(e.x+d.sz*.12,e.y+d.sz*.22,d.sz*.55,d.sz*.26,0,0,7);ctx.fill();
   const pw=d.sz*.46,ph=d.sz*.2,py=e.y+d.sz*.26;ctx.fillStyle=e.side==='me'?'rgba(60,130,255,.32)':'rgba(230,50,35,.32)';ctx.strokeStyle=e.side==='me'?'rgba(110,180,255,.85)':'rgba(255,90,70,.85)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x-pw,py);ctx.lineTo(e.x,py-ph);ctx.lineTo(e.x+pw,py);ctx.lineTo(e.x,py+ph);ctx.closePath();ctx.fill();ctx.stroke();
   if(e._px!=null&&(Math.abs(e.x-e._px)+Math.abs(e.y-e._py))>.4&&(G.t+e.id)%5===0&&!d.inf&&puffs.length<260)puffs.push({x:e.x-Math.cos(e.ang)*d.sz*.4,y:e.y+d.sz*.15-Math.sin(e.ang)*d.sz*.3,r:4+Math.random()*4,t:0,d:50+Math.random()*30,c:G.st.map==='sinai'?'215,180,120':'150,125,95'});e._px=e.x;e._py=e.y;}
   const sn=Math.sin(e.ang),cs=Math.cos(e.ang);const fired=d.rof&&e.cd>d.rof-8?(e.cd-(d.rof-8))/8:0;const ta=e.tur!=null?e.tur:e.ang;
   const rx=e.x-Math.cos(ta)*fired*3,ry=e.y-Math.sin(ta)*fired*2+(d.harv?Math.sin((G.t+e.id*7)*.3)*.4:0);
   if(d.hull||d.dirs){const dir=dirOf(e.ang);const key=(d.hull?'hull_'+d.hull:d.dirs)+'_'+dir;const hi=DIRIMG[key];
    if(hi&&hi.complete&&hi.width){const sc=d.sz*1.3/100;const w=hi.width*sc,h=hi.height*sc;ctx.drawImage(hi,rx-w/2,ry-h/2,w,h);
     if(d.tur){const ti=DIRIMG['tur_'+d.tur],tm=META['tur_'+d.tur],rm=META['hull_'+d.hull]&&META['hull_'+d.hull][dir];const want=(e.cd>0&&e.tur!=null)?e.tur:e.ang;e.tv=e.tv==null?want:angLerp(e.tv,want,.12);
      if(ti&&ti.width&&tm&&rm){const px=rx-w/2+rm[0]*w,py=ry-h/2+rm[1]*h;const ts=sc*1.15;const tw=ti.width*ts,th=ti.height*ts;ctx.save();ctx.translate(px,py-2);ctx.scale(1,.72);ctx.rotate(e.tv);ctx.drawImage(ti,-tm.px*tw,-th/2,tw,th);ctx.restore();}}}
   } else {const s2=d.sz/Math.max(im.width,im.height),w=im.width*s2,h=im.height*s2;ctx.save();ctx.translate(rx,ry);if(flip)ctx.scale(-1,1);const tilt=(cs<0?-1:1)*sn*.28*(flip?-1:1);ctx.rotate(tilt);ctx.scale(1,1-Math.abs(sn)*.12);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
   if(e.cd>d.rof-5&&d.dmg){const a=e.tv!=null?e.tv:(e.tur||e.ang);ctx.fillStyle='rgba(255,220,120,.9)';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*d.sz*(d.tur?.85:.55),e.y-6+Math.sin(a)*d.sz*(d.tur?.6:.4),5,0,7);ctx.fill();}
   if(d.harv&&e.load>0){ctx.fillStyle='#d8b23a';ctx.fillRect(e.x-8,e.y-d.sz*.55,16*e.load/d.cap,3);}
   if(G.sel.includes(e)){const k=Math.max(0,1-(G.t-selPulse)/20);ctx.strokeStyle=`rgba(120,255,140,${.9})`;ctx.lineWidth=1.5+k*2;ctx.beginPath();ctx.ellipse(e.x,e.y+d.sz*.22,d.sz*(.5+k*.3),d.sz*(.22+k*.12),0,0,7);ctx.stroke();
    const q=d.sz*.55;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(e.x+a*q,e.y+b*q*.8-a*0);ctx.lineTo(e.x+a*q-a*6,e.y+b*q*.8);ctx.moveTo(e.x+a*q,e.y+b*q*.8);ctx.lineTo(e.x+a*q,e.y+b*q*.8-b*6);ctx.stroke();});}}
  if(e.hp<e.max||G.sel.includes(e)){const p=G.pos(e),w=e.kind==='b'?e.w:30,y=e.kind==='b'?e.y-12:e.y-e.def.sz*.6;const f=e.hp/e.max;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(p.x-w/2-1,y-1,w+2,6);ctx.fillStyle=f>.5?'#4fd34f':f>.25?'#e8c547':'#e04a3a';ctx.fillRect(p.x-w/2,y,w*f,4);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(p.x-w/2,y,w*f,1);
   ctx.fillStyle='rgba(0,0,0,.55)';const seg=e.kind==='b'?8:4;for(let i=1;i<seg;i++)ctx.fillRect(p.x-w/2+w*i/seg,y,1,4);if(e.side==='me'&&e.kind==='u'&&f<1&&G.ents.some(b=>b.kind==='b'&&b.side==='me'&&(b.type==='hq'||b.def.drop)&&d2(e,{x:b.cx,y:b.cy})<b.w/2+90)){ctx.fillStyle='#7cf';ctx.font='bold 11px sans-serif';ctx.fillText('🔧',p.x+w/2+2,y+5);}}}
 for(const p of G.shots){if(!inV(p.x,p.y))continue;ctx.strokeStyle='rgba(255,230,140,.95)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*3,p.y-p.vy*3);ctx.stroke();}
 for(const f of G.fx){if(f.t<0||!inV(f.x,f.y))continue;const k=f.t/f.d;const rg=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(.6+k*.6));rg.addColorStop(0,`rgba(255,240,180,${1-k})`);rg.addColorStop(.45,`rgba(255,120,30,${.85*(1-k)})`);rg.addColorStop(1,'rgba(60,40,30,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.6+k*.6),0,7);ctx.fill();
  if(f.big&&k<.5){ctx.strokeStyle=`rgba(255,220,160,${.6*(1-k*2)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.5+k*2.2),0,7);ctx.stroke();}
  if(f.big&&k>.3){ctx.fillStyle=`rgba(50,45,40,${.4*(1-k)})`;ctx.beginPath();ctx.arc(f.x+k*10,f.y-k*30,f.r*.6*k+6,0,7);ctx.fill();}}
 for(const f of G.fx)if(f.big&&!f._sm){f._sm=1;if(smokers.length<40)smokers.push({x:f.x,y:f.y,t:0,d:700+Math.random()*400});}
 for(const m of smokers){m.t++;if(!inV(m.x,m.y,200))continue;const k=m.t/m.d;if(k<.55&&m.t%3===0){const fl=.6+Math.random()*.4;const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,9);g.addColorStop(0,`rgba(255,${180+Math.random()*60|0},80,${fl*(1-k*1.6)})`);g.addColorStop(1,'rgba(255,90,20,0)');ctx.fillStyle=g;ctx.fillRect(m.x-10,m.y-12,20,20);}
  if(m.t%6===0&&puffs.length<300)puffs.push({x:m.x+(Math.random()-.5)*6,y:m.y-4,r:6+Math.random()*4,t:0,d:150,c:'45,40,36',rise:1,a0:.55*(1-k)});
  if(k<.5){const hz=(G.t%40)/40;ctx.save();ctx.globalAlpha=.18;const sy=Math.sin(G.t*.3)*1.5;ctx.drawImage(bg,m.x-18,m.y-60,36,40,m.x-18+sy,m.y-61,36,40);ctx.restore();}}
 smokers=smokers.filter(m=>m.t<m.d);
 for(const q of puffs){q.t++;const k=q.t/q.d;if(q.rise){q.y-=.45;q.x+=.25+Math.sin((q.t+q.x)*.05)*.2;}else{q.y-=.06;}const r=q.r*(1+k*(q.rise?3.2:1.8));if(!inV(q.x,q.y))continue;const a=(q.a0||.32)*(1-k);const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r);g.addColorStop(0,`rgba(${q.c},${a})`);g.addColorStop(1,`rgba(${q.c},0)`);ctx.fillStyle=g;ctx.fillRect(q.x-r,q.y-r,r*2,r*2);}
 puffs=puffs.filter(q=>q.t<q.d);
 for(const b of debris){b.x+=b.vx;b.y+=b.vy*.3;b.z+=b.vz;b.vz-=.25;if(b.z<0){b.z=0;b.vx*=.6;b.vz*=-.3;}b.life--;ctx.fillStyle=`rgba(40,32,24,${Math.min(1,b.life/20)})`;ctx.fillRect(b.x,b.y-b.z,3,3);}
 for(let i=debris.length-1;i>=0;i--)if(debris[i].life<=0)debris.splice(i,1);
 if(orderMark&&G.t-orderMark.t<30){const k=(G.t-orderMark.t)/30;ctx.strokeStyle=orderMark.atk?`rgba(255,70,50,${1-k})`:`rgba(120,255,140,${1-k})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(orderMark.x,orderMark.y,20*(1-k)+4,10*(1-k)+2,0,0,7);ctx.stroke();}
 drawFog();ctx.imageSmoothingEnabled=true;ctx.drawImage(fogC,0,0,G.gw*CELL,G.gh*CELL);
 for(const s of G.air.strikes){const im=IMG[s.img];const A=s.side==='me';ctx.save();ctx.translate(s.x,s.y-40);if(!A)ctx.scale(-1,1);const sz=s.img==='mirage'?90:84;const w=sz,h=im.height*sz/im.width;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(10,70,w*.25,h*.12,0,0,7);ctx.fill();ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
 if(G.place){const d=SC.buildings[G.place],x=Math.floor(mouse.x/TILE)*TILE,y=Math.floor(mouse.y/TILE)*TILE;ctx.fillStyle=G.canPlace(G.place,x,y)?'rgba(80,255,80,.35)':'rgba(255,60,60,.35)';ctx.fillRect(x,y,d.w*TILE,d.h*TILE);}
 if(airMode){ctx.strokeStyle='rgba(255,80,60,.9)';ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(mouse.x,mouse.y,SC.air.me.r,0,7);ctx.stroke();ctx.setLineDash([]);}
 if(drag&&drag.box){ctx.strokeStyle='#7f7';ctx.lineWidth=1;ctx.strokeRect(drag.x,drag.y,mouse.x-drag.x,mouse.y-drag.y);}
 ctx.font='bold 13px Heebo,Arial';ctx.textAlign='center';for(const b of bubbles){if(b.u.hp>0){b.x=b.u.x;b.y=b.u.y;}const a=Math.min(1,b.life/20);const tw=ctx.measureText(b.t).width+12,yy=b.y-46-(90-b.life)*.15;ctx.fillStyle=`rgba(20,16,10,${.8*a})`;ctx.fillRect(b.x-tw/2,yy-14,tw,19);ctx.fillStyle=`rgba(255,230,150,${a})`;ctx.fillText(b.t,b.x,yy);b.life--;}ctx.textAlign='start';
 for(let i=bubbles.length-1;i>=0;i--)if(bubbles[i].life<=0)bubbles.splice(i,1);
 ctx.restore();ctx.setTransform(1,0,0,1,0,0);{const gr=ctx.createLinearGradient(0,0,VW,VH);gr.addColorStop(0,'rgba(255,200,120,.16)');gr.addColorStop(.55,'rgba(255,170,90,.03)');gr.addColorStop(1,'rgba(40,30,60,.22)');ctx.globalCompositeOperation='soft-light';ctx.fillStyle=gr;ctx.fillRect(0,0,VW,VH);ctx.globalCompositeOperation='source-over';}const v=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)/2.5,VW/2,VH/2,Math.max(VW,VH)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(10,6,2,.5)');ctx.fillStyle=v;ctx.fillRect(0,0,VW,VH);
 drawMini();}
function drawMini(){const sx=mini.width/G.W,sy=mini.height/G.H;mctx.drawImage(miniBg,0,0);
 for(const e of G.ents){if(e.side==='foe'&&!(e.kind==='u'?G.visible(e.x,e.y):G.seen[(e.cy/CELL|0)*G.gw+(e.cx/CELL|0)]))continue;mctx.fillStyle=e.side==='me'?'#5af':'#f44';if(e.kind==='b')mctx.fillRect(e.x*sx,e.y*sy,Math.max(3,e.w*sx),Math.max(3,e.h*sy));else mctx.fillRect(e.x*sx-1.5,e.y*sy-1.5,3,3);}
 mctx.imageSmoothingEnabled=true;mctx.drawImage(fogC,0,0,mini.width,mini.height);mctx.strokeStyle='#fff';mctx.strokeRect(cam.x*sx,cam.y*sy,WV()*sx,HV()*sy);}
function scorch(x,y,r){if(!bg||x==null)return;const c=bg.getContext('2d');const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(15,10,5,.55)');g.addColorStop(1,'rgba(15,10,5,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,r,r*.7,0,0,7);c.fill();
 for(let i=0;i<(r>30?14:7);i++){const a=Math.random()*6.283,v=1+Math.random()*3;debris.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,z:0,vz:2+Math.random()*3,life:40+Math.random()*30});}}
const debris=[];let selPulse=-99,orderMark=null;
// zoom
function zoomAt(f,sx,sy){const wx=sx/Z+cam.x,wy=sy/Z+cam.y;Z=Math.max(.5,Math.min(1.8,Z*f));cam.x=wx-sx/Z;cam.y=wy-sy/Z;clampCam();}
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top);},{passive:false});
// control groups
const groups={};addEventListener('keydown',e=>{if(!G||!/^[1-9]$/.test(e.key))return;if(e.ctrlKey||e.metaKey){e.preventDefault();groups[e.key]=G.sel.slice();say(`קבוצה ${e.key}: ${G.sel.length} יחידות`);}
 else{const g=(groups[e.key]||[]).filter(u=>u.hp>0);if(!g.length)return;const now=performance.now();if(groups['_t'+e.key]&&now-groups['_t'+e.key]<350){cam.x=g[0].x-WV()/2;cam.y=g[0].y-HV()/2;clampCam();}groups['_t'+e.key]=now;G.sel=g;selPulse=G.t;voice(g[0],'sel');}});
// music: slow minor-key march, synthesized
let musicOn=localStorage.getItem('irts_music')!=='0',musicT=null,mstep=0;
const PROG=[[57,60,64],[55,59,62],[53,57,60],[52,56,59]];
function musicTick(){const a=AC;if(!a||!musicOn||muted||!G||paused)return;const t=a.currentTime;const ch=PROG[(mstep>>3)%4];
 if(mstep%8===0)ch.forEach(n=>{const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=440*Math.pow(2,(n-12-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.4);g.gain.linearRampToValueAtTime(0,t+3.8);o.connect(g).connect(a.destination);o.start(t);o.stop(t+4);});
 if(mstep%2===0){const n=ch[(mstep>>1)%3]+12;const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=440*Math.pow(2,(n-69)/12);g.gain.setValueAtTime(.012,t);g.gain.exponentialRampToValueAtTime(.0005,t+.4);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.45);}
 if([0,3,4,6].includes(mstep%8)){const nb=a.sampleRate*.08|0,b=a.createBuffer(1,nb,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<nb;i++)d[i]=(Math.random()*2-1)*(1-i/nb);const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=1500;const g=a.createGain();g.gain.value=mstep%8===0?.05:.025;s.connect(f).connect(g).connect(a.destination);s.start(t);}
 mstep++;}
setInterval(musicTick,500);
function setMusic(m){musicOn=m;localStorage.setItem('irts_music',m?'1':'0');$('music').textContent=m?'🎵':'🎵✖';}
// ---------- loop ----------
let keys={},lastAuto=0,acc=0,lastT=0;
function loop(ts){if(!G)return;if(!paused){const dt=Math.min(100,ts-(lastT||ts));acc+=dt;while(acc>=16.67){G.step();acc-=16.67;if(G.over)break;}}lastT=ts;
 const sp=14;if(keys.ArrowLeft||keys.a)cam.x-=sp;if(keys.ArrowRight||keys.d)cam.x+=sp;if(keys.ArrowUp||keys.w)cam.y-=sp;if(keys.ArrowDown||keys.s)cam.y+=sp;
 if(edge&&!touching){const sp2=sp/Z;if(edge.x<18)cam.x-=sp2;if(edge.x>VW-18)cam.x+=sp2;if(edge.y<18)cam.y-=sp2;if(edge.y>VH-18)cam.y+=sp2;}clampCam();
 for(const e of G.ev.splice(0)){if(e.k==='say'){const u=G.ents.find(x=>x.id===e.id);if(u)voice(u,e.t,1);continue;}sfx(e.k,e.x,e.y);if(e.k==='boom'||e.k==='bigboom')scorch(e.x,e.y,e.k==='bigboom'?40:22);}
 draw();hud();if(G.t-lastAuto>1800){lastAuto=G.t;saveGame('irts_auto');}
 if(G.over){sfx(G.over==='win'?'ready':'bigboom');paused=true;endScreen();return;}requestAnimationFrame(loop);}
// ---------- input ----------
let drag=null,mouse={x:0,y:0},edge=null,airMode=false,touching=false;
const toWorld=(cx,cy)=>{const r=cv.getBoundingClientRect();return{x:(cx-r.left)/Z+cam.x,y:(cy-r.top)/Z+cam.y,sx:cx-r.left,sy:cy-r.top};};
function pick(p){return G.ents.find(e=>e.side==='me'&&(e.kind==='u'?d2(e,p)<e.def.sz*.5:p.x>e.x&&p.x<e.x+e.w&&p.y>e.y&&p.y<e.y+e.h));}
function tap(p){ac();if(airMode){if(G.airStrike(p.x,p.y))say('✈ פאנטום בדרך!');else sfx('deny');airMode=false;return;}
 if(G.place){if(G.placeBuild(p.x,p.y))G.place=null;else sfx('deny');return;}
 const own=pick(p);if(own&&own.kind==='u'){G.sel=[own];selPulse=G.t;voice(own,'sel',1);sfx('click');return;}
 if(own&&own.kind==='b'&&G.sel.length&&(own.type==='hq'||own.def.drop)){G.sel.forEach(u=>{if(!u.def.harv){u.tgt=null;u.mv={x:own.cx+(Math.random()-.5)*own.w,y:own.y+own.h+20};u.path=null;u.repairing=1;}});voice(G.sel[0],'repair',1);return;}
 if(G.sel.length)order(p);else if(own)G.sel=[own];}
function boxSel(a,b){const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);G.sel=G.ents.filter(e=>e.kind==='u'&&e.side==='me'&&e.x>=x0-8&&e.x<=x1+8&&e.y>=y0-8&&e.y<=y1+8);if(G.sel.length){sfx('click');selPulse=G.t;voice(G.sel[0],'sel',1);}}
function order(p){const tgt=G.ents.find(e=>e.side==='foe'&&(e.kind==='u'?G.visible(e.x,e.y)&&d2(e,p)<22:p.x>e.x&&p.x<e.x+e.w&&p.y>e.y&&p.y<e.y+e.h));const fld=G.fields.find(f=>d2(f,p)<f.r);
 const combat=G.sel.filter(u=>!u.def.harv);const k=Math.ceil(Math.sqrt(combat.length));
 G.sel.forEach(u=>{if(u.def.harv){if(fld){u.field=fld;u.state='harvest';u.path=null;u.manual=0;}else{G.goTo(u,p.x,p.y);u.manual=1;}return;}
  const i=combat.indexOf(u);if(tgt){u.tgt=tgt;u.mv=null;u.path=null;}else{u.tgt=null;u.amove=false;u.mv={x:p.x+(i%k)*30-k*15,y:p.y+((i/k)|0)*30-k*15};u.path=null;}});
 G.fx.push({x:p.x,y:p.y,r:8,t:0,d:12});orderMark={x:p.x,y:p.y,t:G.t,atk:!!tgt};if(G.sel[0])voice(G.sel[0],G.sel[0].def.harv?'harv':tgt?'atk':'move',1);sfx('click');}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousedown',ev=>{if(!G)return;ac();const p=toWorld(ev.clientX,ev.clientY);if(ev.button===2){G.place=null;airMode=false;if(G.sel.length)order(p);return;}drag={x:p.x,y:p.y,sx:p.sx,sy:p.sy,box:false};});
addEventListener('mousemove',ev=>{if(!G)return;const p=toWorld(ev.clientX,ev.clientY);mouse=p;const r=cv.getBoundingClientRect();edge=(ev.clientX>=r.left&&ev.clientX<=r.right&&ev.clientY>=r.top&&ev.clientY<=r.bottom)?{x:p.sx,y:p.sy}:null;if(drag&&Math.hypot(p.sx-drag.sx,p.sy-drag.sy)>6)drag.box=true;});
addEventListener('mouseup',ev=>{if(!G||!drag||ev.button!==0)return;const p=toWorld(ev.clientX,ev.clientY);if(drag.box)boxSel(drag,p);else tap(p);drag=null;});
cv.addEventListener('mouseleave',()=>edge=null);
addEventListener('keydown',e=>{keys[e.key]=1;if(!G)return;if(e.key==='Escape'){G.place=null;G.sel=[];airMode=false;}if(e.key===' '){togglePause();e.preventDefault();}});addEventListener('keyup',e=>keys[e.key]=0);
// touch: 1 finger drag = pan, tap = select/order, long-press then drag = box select, 2 fingers = pan
let tp=null,lpT=0;
cv.addEventListener('touchstart',ev=>{if(!G)return;ev.preventDefault();ac();touching=true;const t=ev.touches[0];const p=toWorld(t.clientX,t.clientY);tp={x0:t.clientX,y0:t.clientY,cx:cam.x,cy:cam.y,moved:false,box:false,w:p};mouse=p;
 clearTimeout(lpT);if(ev.touches.length===1)lpT=setTimeout(()=>{if(tp&&!tp.moved){tp.box=true;drag={x:p.x,y:p.y,box:true};if(navigator.vibrate)navigator.vibrate(20);}},450);},{passive:false});
cv.addEventListener('touchmove',ev=>{if(!G||!tp)return;ev.preventDefault();if(ev.touches.length===2){const [a,b]=ev.touches;const dd=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);const r=cv.getBoundingClientRect();if(tp.pd)zoomAt(dd/tp.pd,(a.clientX+b.clientX)/2-r.left,(a.clientY+b.clientY)/2-r.top);tp.pd=dd;tp.moved=true;tp.pinch=1;clearTimeout(lpT);return;}if(tp.pinch)return;const t=ev.touches[0];const dx=t.clientX-tp.x0,dy=t.clientY-tp.y0;if(Math.hypot(dx,dy)>10)tp.moved=true;mouse=toWorld(t.clientX,t.clientY);
 if(tp.box)return;if(tp.moved&&!G.place&&!airMode){cam.x=tp.cx-dx/Z;cam.y=tp.cy-dy/Z;clampCam();}},{passive:false});
cv.addEventListener('touchend',ev=>{if(!G||!tp)return;ev.preventDefault();clearTimeout(lpT);if(tp.box){boxSel(drag,mouse);drag=null;}else if(!tp.pinch&&(!tp.moved||G.place||airMode))tap(mouse);if(ev.touches.length)return;tp=null;touching=false;},{passive:false});
function miniJump(ev){const r=mini.getBoundingClientRect();const t=ev.touches?ev.touches[0]:ev;cam.x=(t.clientX-r.left)/r.width*G.W-WV()/2;cam.y=(t.clientY-r.top)/r.height*G.H-HV()/2;clampCam();}
let mdown=false;mini.addEventListener('mousedown',e=>{mdown=true;miniJump(e);});addEventListener('mouseup',()=>mdown=false);mini.addEventListener('mousemove',e=>{if(mdown)miniJump(e);});
mini.addEventListener('touchstart',e=>{e.preventDefault();miniJump(e);},{passive:false});mini.addEventListener('touchmove',e=>{e.preventDefault();miniJump(e);},{passive:false});
function togglePause(){paused=!paused;$('pause').textContent=paused?'▶':'⏸';say(paused?'⏸ המשחק מושהה':'');if(!paused){lastT=0;}}
$('pause').onclick=togglePause;$('save').onclick=()=>saveGame();$('load').onclick=()=>{const s=localStorage.getItem('irts_save');if(s){start(Game.load(s));say('📂 נטען');}else say('אין שמירה');};
$('mute').onclick=$('mute1').onclick=()=>setMute(!muted);$('quit').onclick=()=>{saveGame('irts_auto');menu();};
$('air').onclick=$('tAir').onclick=()=>{airMode=true;say('✈ בחר מטרה לתקיפה האווירית');};
$('tAll').onclick=()=>{G.sel=G.ents.filter(e=>e.side==='me'&&e.kind==='u'&&!e.def.harv);sfx('click');};$('tNone').onclick=()=>{G.sel=[];G.place=null;airMode=false;};
$('cont').onclick=()=>{const s=localStorage.getItem('irts_save')||localStorage.getItem('irts_auto');try{const g=Game.load(localStorage.getItem('irts_auto')||s);diff=g.diff;start(g);}catch(e){say('השמירה פגומה');}};
// PWA
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('inst').classList.remove('hide');});
$('inst').onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$('inst').classList.add('hide');};
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
$('zin').onclick=()=>zoomAt(1.2,VW/2,VH/2);$('zout').onclick=()=>zoomAt(1/1.2,VW/2,VH/2);$('music').onclick=()=>{ac();setMusic(!musicOn);};setMusic(musicOn);setMute(muted);window.__game=()=>G;window.__cam=cam;menu();
})();
