// UI layer: camera, rendering with AI sprite art, fog, minimap, input (mouse+touch), audio, save/progress, story screens.
(function(){
const $=id=>document.getElementById(id);const {TILE,CELL}=RTS_CONST;const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const SC=SCENARIOS.find(s=>s.id==='yk1973');let G=null,diff='normal',paused=false,cam={x:0,y:0},VW=800,VH=600,Z=1;const WV=()=>VW/Z,HV=()=>VH/Z;
// ---------- assets ----------
const IMG={},names=['magach','t55','t62','shot_centurion','tiran','supply_truck','mirage','phantom','mig21','hq','supply_depot','war_factory','advisor_officer','jeep_at','btr','sam_site','barracks','pillbox','radar','repair_bay','aa_site','artillery','airfield','rock0','rock1','rock2','rock3','rock4','rock5','rock6','rock7','rock8'];
let loaded=0;const tint={};let META={};const DIRIMG={};
fetch('assets/s/d/meta.json').then(r=>r.json()).then(m=>META=m).catch(()=>{});
['hull_shot','hull_tiran','hull_magach','hull_t55','hull_t62','btr8'].forEach(n=>{for(let d=0;d<8;d++){const i=new Image();i.src=`assets/s/d/${n}_${d}.png`;DIRIMG[n+'_'+d]=i;}});
['shot','tiran','magach','t55','t62'].forEach(n=>{const i=new Image();i.src=`assets/s/d/tur_${n}.png`;DIRIMG['tur_'+n]=i;});
const dirOf=a=>((Math.round(a/(Math.PI/4))%8)+8)%8;
function angLerp(a,b,t){let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return a+d*t;}
function tinted(k,filter){const key=k+filter;if(tint[key])return tint[key];const im=IMG[k];const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.filter=filter;x.drawImage(im,0,0);return tint[key]=c;}
const FOE_F='hue-rotate(-25deg) saturate(.7) brightness(.78)',JEEP_F='saturate(.6) brightness(1.15) sepia(.35)',IL_F='sepia(.45) saturate(.75) brightness(1.12) hue-rotate(8deg)';
const tintDir={};function dirTinted(im,f){const k=im.src+f;if(tintDir[k])return tintDir[k];if(!im.width)return im;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.filter=f;x.drawImage(im,0,0);return tintDir[k]=c;}
names.forEach(n=>{const i=new Image();i.onload=()=>loaded++;i.src='assets/s/'+n+'.png';IMG[n]=i;});
const TILES={golan:new Image(),sinai:new Image()};TILES.golan.src='assets/s/tile_golan_basalt.jpg';TILES.sinai.src='assets/s/tile_sinai_sand.jpg';const PAINT={};const DEC={};['bush0','bush1','crate','rk0','rk1','rk2','rk3','sbag0','sbag1','sbag2','wire','wreck0','wreck1','wreck2','wreck3'].forEach(n=>{const i=new Image();i.src='assets/s/dec_'+n+'.png';DEC[n]=i;});function paintFor(st){const k='s'+st.id;if(!PAINT[k]){PAINT[k]=new Image();PAINT[k].src='assets/s/map_'+k+'.jpg';}return PAINT[k];}let puffs=[],smokers=[],gradeC=null;const SOFT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();const SH=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(0,0,0,.42)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return c;})();const tintC={};const shC=new Map();function shadowOf(im){let c=shC.get(im);if(c)return c;c=document.createElement('canvas');const W=im.width,H=im.height,p=Math.round(Math.max(W,H)*.06);c.width=W+2*p;c.height=H+2*p;const g=c.getContext('2d');g.filter='brightness(0) blur('+Math.max(2,p/2)+'px)';g.drawImage(im,p,p);shC.set(im,c);return c;}function puffImg(c){if(tintC[c])return tintC[c];const k=document.createElement('canvas');k.width=k.height=64;const g=k.getContext('2d');g.drawImage(SOFT,0,0);g.globalCompositeOperation='source-in';g.fillStyle='rgb('+c+')';g.fillRect(0,0,64,64);return tintC[c]=k;}
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
 else if(k==='arty'){noise(.6,140,'lowpass',.9*v);}else if(k==='rifle'){const n=performance.now();if(n-lastShot<50)return;lastShot=n;noise(.06,2400,'highpass',.18*v);}else if(k==='rank'){tone(660,990,.1,.07,'triangle');setTimeout(()=>tone(990,1320,.12,.07,'triangle'),110);}
 else if(k==='ready'||k==='unit')tone(520,1040,.12,.08,'triangle');else if(k==='build')tone(300,150,.2,.1);else if(k==='click')tone(700,700,.05,.05,'triangle');else if(k==='deny')tone(200,140,.15,.08);}
function setMute(m){muted=m;localStorage.setItem('irts_mute',m?'1':'0');['mute','mute1'].forEach(i=>$(i).textContent=m?'🔇':'🔊'+(i==='mute1'?' צליל':''));}
// ---------- progress / saves ----------
const prog=()=>ACC.getJSON('prog',{});
function unlock(stId){const p=prog();p[diff]=Math.max(p[diff]||1,stId);ACC.setJSON('prog',p);}
function saveGame(slot='save'){if(!G||G.over)return;try{ACC.set(slot,G.serialize());ACC.set('last',JSON.stringify({st:G.st.id,diff:G.diff,at:Date.now(),slot}));if(slot==='save')say('💾 המשחק נשמר');}catch(e){say('שמירה נכשלה');}}
function recordResult(){const S=ACC.getJSON('stars',{}),k=diff+':'+G.st.id,n=G.stars();if(n>(S[k]||0)){S[k]=n;ACC.setJSON('stars',S);}const T=ACC.getJSON('stats',{kills:0,losses:0,wins:0,played:0,secs:0});T.kills+=G.stats.kills;T.losses+=G.stats.losses;T.played++;T.secs+=Math.round(G.t/60);if(G.over==='win')T.wins++;ACC.setJSON('stats',T);return n;}
window.__startStage=(id,d)=>{diff=d||diff;const st=SC.stages.find(s=>s.id===id);start(new Game(SC,st,diff,(Math.random()*1e9)|0,false));};
// ---------- menu & story ----------
function menu(){paused=true;G=null;['wrap','brief','end','home'].forEach(i=>$(i).classList.add('hide'));$('menu').classList.remove('hide');$('cards').innerHTML='';
 $('cont').classList.toggle('hide',!ACC.get('save')&&!ACC.get('auto'));const L=ACC.getJSON('last',null);$('cont').textContent=L?`▶ המשך: שלב ${L.st} · ${DIFF[L.diff]?DIFF[L.diff].name:''}`:'▶ המשך משחק שמור';$('who').textContent=ACC.label();const STR=ACC.getJSON('stars',{});
 SCENARIOS.forEach(s=>{const d=document.createElement('div');d.className='card'+(s.ready?'':' off');d.innerHTML=`<b>${s.name}</b> ${s.ready?'':'<span class="tag">בקרוב</span>'}<div>${s.desc}</div>`;
  if(s.ready){const dr=document.createElement('div');dr.className='diffs';dr.innerHTML='רמת קושי: ';Object.keys(DIFF).forEach(k=>{const b=document.createElement('button');b.textContent=DIFF[k].name;b.className=k===diff?'on':'';b.onclick=()=>{diff=k;menu();};dr.appendChild(b);});d.appendChild(dr);
   const sr=document.createElement('div');sr.innerHTML='שלבים: ';const mx=prog()[diff]||1;s.stages.forEach(st=>{const b=document.createElement('button');b.className='stg'+(st.id>mx?' lock':'');const ns=STR[diff+':'+st.id]||0;b.innerHTML=(st.id>mx?'🔒':'')+st.id+(ns?`<i class="st">${'★'.repeat(ns)}${'☆'.repeat(3-ns)}</i>`:'');b.title=st.name+(st.date?' · '+st.date:'');b.disabled=st.id>mx;b.id='stage-'+st.id;b.onclick=()=>brief(st);sr.appendChild(b);});d.appendChild(sr);}
  $('cards').appendChild(d);});}
function brief(st){ac();sfx('click');$('menu').classList.add('hide');$('end').classList.add('hide');$('brief').classList.remove('hide');
 $('advimg').src=SC.advisor.img;$('advname').textContent=SC.advisor.name;$('advrole').textContent=SC.advisor.role;
 $('bt').textContent=`שלב ${st.id}: ${st.name}`;$('bdate').textContent=[st.date,st.place].filter(Boolean).join(' · ');drawBriefMap(st);$('bb').innerHTML=(st.id===1?`<p>${SC.intro}</p>`:'')+`<p>${st.brief}</p>`;$('bg').textContent='🎯 מטרה: '+st.goal+` · רמת קושי: ${DIFF[diff].name}`;$('go').onclick=()=>start(new Game(SC,st,diff,(Math.random()*1e9)|0,false));}
function drawBriefMap(st){const c=$('bmap');if(!c)return;const x=c.getContext('2d'),W=c.width,H=c.height;const im=paintFor(st);const go=()=>{x.clearRect(0,0,W,H);if(im.naturalWidth)x.drawImage(im,0,0,W,H);else{x.fillStyle='#3a3020';x.fillRect(0,0,W,H);}
  x.fillStyle='rgba(20,14,8,.25)';x.fillRect(0,0,W,H);const sx=W/st.W,sy=H/st.H;const by=H/2;
  x.fillStyle='rgba(60,140,255,.9)';x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.arc(8*W/st.W/2*1+14,by,8,0,7);x.fill();x.stroke();x.fillStyle='#fff';x.font='bold 11px Heebo,Arial';x.fillText('בסיס',30,by+4);
  (st.foeBase||[]).forEach(b=>{const px=b[1]*sx,py=b[2]*sy;x.fillStyle=b[0]==='sam'?'rgba(255,190,40,.95)':'rgba(230,50,40,.95)';x.fillRect(px-5,py-5,10,10);x.strokeRect(px-5,py-5,10,10);});
  x.strokeStyle='rgba(235,60,45,.85)';x.fillStyle='rgba(235,60,45,.85)';x.lineWidth=3;for(let i=0;i<3;i++){const yy=H*(.25+i*.25),x0=W-12,x1=W*.55;x.beginPath();x.moveTo(x0,yy);x.quadraticCurveTo((x0+x1)/2,yy+(i-1)*14,x1,by+(yy-by)*.35);x.stroke();const a=Math.atan2(by+(yy-by)*.35-(yy+(i-1)*14),x1-(x0+x1)/2);x.beginPath();x.moveTo(x1,by+(yy-by)*.35);x.lineTo(x1-10*Math.cos(a-.5),by+(yy-by)*.35-10*Math.sin(a-.5));x.lineTo(x1-10*Math.cos(a+.5),by+(yy-by)*.35-10*Math.sin(a+.5));x.fill();}
  if(st.night){x.fillStyle='rgba(10,20,60,.35)';x.fillRect(0,0,W,H);}};if(im.complete)go();else im.onload=go;}
function start(g){if(loaded<names.length||!paintFor(g.st).complete){setTimeout(()=>start(g),150);return;}tab('b');if(!SC._big){SC._big=1;for(const k in SC.units)SC.units[k].sz=Math.round(SC.units[k].sz*1.5);}Z=Math.min(1.8,Math.max(Z,1.25));G=g;G.msg=say;puffs=[];smokers=[];['brief','menu','home','end'].forEach(i=>$(i).classList.add('hide'));$('wrap').classList.remove('hide');resize();
 ACC.set('last',JSON.stringify({st:G.st.id,diff:G.diff,at:Date.now(),slot:'auto'}));const hq=G.ents.find(e=>e.type==='hq'&&e.side==='me');cam.x=hq?hq.cx-WV()/2:0;cam.y=hq?hq.cy-HV()/2:0;clampCam();buildBg();buildSide();paused=false;say(G.st.goal);
 $('airbox').classList.toggle('hide',!G.st.air);$('tAir').classList.toggle('hide',!G.st.air);requestAnimationFrame(loop);}
function endScreen(){const win=G.over==='win',st=G.st;ACC.del('auto');const nS=recordResult();$('end').classList.remove('hide');$('advimg2').src=SC.advisor.img;
 $('et').textContent=win?`🏆 שלב ${st.id} הושלם`:'💥 המשימה נכשלה';$('eb').textContent=`השמדתם ${G.stats.kills} כלי אויב · אבדו ${G.stats.losses} · זמן ${Math.round(G.t/60)} שניות · ${DIFF[diff].name}`;
 const nx=SC.stages.find(s=>s.id===st.id+1);$('eo').textContent=win?st.outro:'"זה לא נגמר כאן. נתארגן מחדש וננסה שוב. הפעם תבנה כלכלה חזקה יותר לפני שהגלים הגדולים מגיעים."';
 if(win&&nx)unlock(nx.id);$('estars').innerHTML=win?[0,1,2].map(i=>`<span class="${i<nS?'on':''}">★</span>`).join(''):'';$('ehint').textContent=win?(nS<3?'כוכב על ניצחון, כוכב על פחות מ-'+Math.max(3,Math.round(st.waves*.8))+' אבדות וכוכב על סיום מהיר':'ניצחון מושלם!'):'';$('memorial').classList.toggle('hide',!(win&&!nx));$('memorial').textContent=SC.memorial||'';ACC.sync();$('next').classList.toggle('hide',!(win&&nx));$('next').onclick=()=>brief(nx);$('retry').onclick=()=>brief(st);$('tomenu').onclick=menu;if(win&&!nx)$('eb').textContent+=' · המערכה הושלמה!';}
const VOICE={sel:['כן, המפקד!','מוכנים.','צוות בעמדה.','מקשיב.','עונה!'],move:['זזים!','בדרך.','קיבלתי, נע.','מתקדמים.'],atk:['אש!','מטרה בטווח!','יורים!','קיבלתי, תוקף.'],harv:['יוצא לאסוף דלק.','בדרך לשדה.'],fixed:['תוקנו, חוזרים לקרב.'],repair:['נוסעים לתיקון.'],lost:['איבדנו כלי!','נפגענו!']};
const bubbles=[];let lastVoice=0;function voice(u,k,force){const n=performance.now();if(!force&&n-lastVoice<900)return;lastVoice=n;const a=VOICE[k];const line=a[Math.random()*a.length|0];bubbles.push({u,x:u.x,y:u.y,t:line,life:90});if(bubbles.length>4)bubbles.shift();speak(line);tone(k==='atk'?420:620,k==='atk'?380:700,.06,.03,'square');}
let HEV=null;function speak(t){if(muted||!window.speechSynthesis||ACC.getSetting('voice')===false)return;try{if(!HEV){const v=speechSynthesis.getVoices();HEV=v.find(x=>/^he/i.test(x.lang))||0;}if(!HEV)return;if(speechSynthesis.speaking)return;const u=new SpeechSynthesisUtterance(t);u.voice=HEV;u.lang='he-IL';u.rate=1.15;u.pitch=.8;u.volume=.8;speechSynthesis.speak(u);}catch(e){}}
let msgT=0;function say(s){$('msg').textContent=s;clearTimeout(msgT);msgT=setTimeout(()=>$('msg').textContent='',5000);}
// ---------- sidebar ----------
const cams=[];
function camBtn(kind,type){const d=kind==='b'?SC.buildings[type]:SC.units[type];const b=document.createElement('button');b.className='cam';b.id=(kind==='b'?'b-':'u-')+type;
 b.innerHTML=`<img src="${d.inf?infIcon(d):'assets/s/'+d.img+'.png'}" style="${d.tint==='jeep'?'filter:'+JEEP_F:d.tint==='il'?'filter:'+IL_F:''}"><div>${d.name}</div><div>⛽${d.cost}</div><div class="req"></div><div class="pb" style="width:0"></div>`;b.title=(d.tip||'')+(d.req?' · דרוש: '+SC.buildings[d.req].name:'');
 b.onclick=()=>{ac();if(kind==='b'){if(G.q.build&&G.q.build.done&&G.q.build.t===type){G.place=type;say('בחר מיקום למבנה (ליד הבסיס)');}else if(!G.queueBuild(type))sfx('deny');else sfx('click');}else{if(!G.queueUnit(type))sfx('deny');else sfx('click');}};cams.push({b,kind,type,d});return b;}
function buildSide(){cams.length=0;$('stname').textContent=`${G.st.id}. ${G.st.name}`;$('bld').innerHTML='';$('unt').innerHTML='';
 (G.st.unlockB||['depot','factory']).forEach(t=>$('bld').appendChild(camBtn('b',t)));Object.keys(SC.units).filter(t=>!SC.units[t].foe&&G.unlocked(t)).forEach(t=>$('unt').appendChild(camBtn('u',t)));}
function hud(){$('res').textContent=`${SC.res.icon} ${Math.floor(G.res)}`;const st=G.st;
 $('obj').textContent=st.obj==='kills'?`🎯 הושמדו ${G.stats.kills}/${st.kills}`:st.obj==='destroy'?`🎯 מבני אויב: ${G.ents.filter(e=>e.side==='foe'&&e.kind==='b').length}`:`🎯 ${st.goal}`;
 $('wave').textContent=G.wave>=st.waves?`כל ${st.waves} הגלים יצאו`:`גל ${G.wave}/${st.waves} · הבא בעוד ${Math.ceil(G.nextWave/60)} ש׳`;
 for(const c of cams){const pb=c.b.querySelector('.pb');let p=0,rdy=false,dis=G.res<c.d.cost;
  if(c.kind==='b'){const ok=G.reqOk(c.type);c.b.querySelector('.req').textContent=ok?'':'דרוש: '+SC.buildings[c.d.req].name;if(!ok)dis=true;if(G.q.build&&G.q.build.t===c.type){p=G.q.build.p/G.q.build.need;rdy=G.q.build.done;dis=false;}else if(G.q.build)dis=true;}
  else{if(!G.has(c.d.from))dis=true;const i=G.q.unit.findIndex(q=>q.t===c.type);if(i===0)p=G.q.unit[0].p/G.q.unit[0].need;}
  pb.style.width=(p*100)+'%';c.b.classList.toggle('rdy',rdy);c.b.disabled=dis&&!rdy;}
 if(G.st.air){const cd=Math.ceil(G.air.cd/60);$('aircd').textContent=cd>0?` (${cd}ש׳)`:` ⛽${G.airCost()}`;$('air').disabled=cd>0||G.res<G.airCost();$('tAir').disabled=$('air').disabled;}
 $('ucount').textContent='🛡 '+G.ents.filter(e=>e.side==='me'&&e.kind==='u').length;const sec=G.t/60|0;$('clock').textContent='⏱ '+(sec/60|0)+':'+String(sec%60).padStart(2,'0');
 const S=G.sel;$('sel').classList.toggle('empty',!S.length);if(S.length){const u=S[0];const im=IMG[u.def.img];$('selimg').src=u.def.inf?infIcon(u.def):im&&im.src||'';$('selname').textContent=(S.length===1?u.def.name:`${u.def.name} +${S.length-1}`)+(u.rank?' '+'⌃'.repeat(u.rank):'');const f=u.hp/u.max;$('selhp').firstChild.style.width=(f*100)+'%';$('selhp').firstChild.style.background=f>.5?'#4fd34f':f>.25?'#e8c547':'#e04a3a';$('selst').textContent=`${Math.ceil(u.hp)}/${Math.ceil(u.max)}`+(u.def.dmg?` · ⚔${u.def.dmg} · ⌖${u.def.rng}`:'');}}
function tab(w){$('bld').classList.toggle('hide',w!=='b');$('unt').classList.toggle('hide',w!=='u');$('tabB').classList.toggle('on',w==='b');$('tabU').classList.toggle('on',w==='u');}
$('tabB').onclick=()=>{sfx('click');tab('b')};$('tabU').onclick=()=>{sfx('click');tab('u')};
// ---------- rendering ----------
const cv=$('c'),ctx=cv.getContext('2d'),mini=$('mini'),mctx=mini.getContext('2d');let bg=null,miniBg=null,fogC=null;
function resize(){const v=$('view');VW=v.clientWidth;VH=v.clientHeight;DPR=Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.75:2);cv.width=VW*DPR|0;cv.height=VH*DPR|0;if(G){const r=G.H/G.W;mini.width=220;mini.height=220*r|0;clampCam();}}
addEventListener('resize',resize);
function clampCam(){if(!G)return;const w=WV(),h=HV();cam.x=Math.max(0,Math.min(G.W-w,cam.x));cam.y=Math.max(0,Math.min(G.H-h,cam.y));if(G.W<w)cam.x=(G.W-w)/2;if(G.H<h)cam.y=(G.H-h)/2;}
function buildBg(){bg=document.createElement('canvas');bg.width=G.W*BGS|0;bg.height=G.H*BGS|0;const x=bg.getContext('2d');x.scale(BGS,BGS);x.imageSmoothingQuality='high';const T=TILES[G.st.map]||TILES.golan,sand=G.st.map==='sinai';
 if(T.complete&&T.naturalWidth){x.fillStyle=x.createPattern(T,'repeat');}else x.fillStyle=sand?'#c9a46a':'#6a5a40';x.fillRect(0,0,G.W,G.H);if(!sand){x.fillStyle='rgba(40,28,12,.38)';x.fillRect(0,0,G.W,G.H);}
 const P=paintFor(G.st),painted=P.complete&&P.naturalWidth;if(painted){x.drawImage(P,0,0,G.W,G.H);x.globalAlpha=sand?.1:.2;x.globalCompositeOperation='overlay';x.fillStyle=x.createPattern(T,'repeat');x.fillRect(0,0,G.W,G.H);x.globalAlpha=1;x.globalCompositeOperation='source-over';}
 let s=G.seed|0;const r=()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
 if(!painted)for(let i=0;i<G.W*G.H/9000;i++){const px=r()*G.W,py=r()*G.H,rr=30+r()*120;const g=x.createRadialGradient(px,py,0,px,py,rr);g.addColorStop(0,`rgba(${sand?'255,230,180':'40,30,20'},${.06+r()*.08})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-rr,py-rr,rr*2,rr*2);}
 const rocks=[0,1,2,3,4,5,6,7,8].map(i=>sand?tinted('rock'+i,'sepia(.8) saturate(1.4) brightness(1.5) hue-rotate(-10deg)'):tinted('rock'+i,'brightness(1.55) contrast(1.2) saturate(.7) sepia(.15)'));const cells=[];
 for(let y=0;y<G.gh;y++)for(let xx=0;xx<G.gw;xx++)if(G.rock[y*G.gw+xx])cells.push([xx,y]);
 cells.sort((p,q)=>p[1]-q[1]);if(!painted)for(const [xx,y] of cells){const im=rocks[r()*9|0];if(!im.width)continue;const sz=30+r()*14,cx=xx*CELL+12+(r()-.5)*6,cy=y*CELL+12+(r()-.5)*6;const h=im.height*sz/im.width;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(cx+4,cy+h*.3,sz*.45,sz*.18,0,0,7);x.fill();x.save();x.translate(cx,cy);if(r()<.5)x.scale(-1,1);x.drawImage(im,-sz/2,-h*.6,sz,h);x.restore();if(!sand){x.strokeStyle='rgba(210,200,180,.18)';x.lineWidth=1.5;x.beginPath();x.ellipse(cx,cy-h*.1,sz*.38,h*.38,0,3.5,5.9);x.stroke();}}
 if(painted){const D=(n,px,py,sz,fl,al)=>{const im=DEC[n];if(!im||!im.width)return;const h=im.height*sz/im.width;x.save();x.translate(px,py);if(fl)x.scale(-1,1);if(al!=null)x.globalAlpha=al;{const sh=shadowOf(im),q=sz/im.width;x.globalAlpha*=.35;x.drawImage(sh,-sz/2+7-(sh.width-im.width)/2*q,-h*.6+6-(sh.height-im.height)/2*q,sh.width*q,sh.height*q);}x.globalAlpha=al!=null?al:1;x.drawImage(im,-sz/2,-h*.6,sz,h);x.restore();};
  const free=(px,py)=>{const cx=px/CELL|0,cy=py/CELL|0;return cx>=0&&cy>=0&&cx<G.gw&&cy<G.gh&&!G.rock[cy*G.gw+cx]&&!G.ents.some(e=>e.kind==='b'&&px>e.x-30&&px<e.x+e.w+30&&py>e.y-30&&py<e.y+e.h+30);};
  const rc=cells.filter(()=>r()<.09);for(const [xx,y] of rc)D('rk'+(r()*4|0),xx*CELL+12,y*CELL+14,34+r()*26,r()<.5);
  for(let i=0;i<G.W*G.H/38000;i++){const px=r()*G.W,py=r()*G.H;if(free(px,py))D('bush'+(r()*2|0),px,py,22+r()*14,r()<.5,sand?.75:.9);}
  for(let i=0,n=0;i<200&&n<6+G.st.id;i++){const px=G.W*(.25+r()*.65),py=G.H*(.08+r()*.84);if(!free(px,py))continue;n++;const g=x.createRadialGradient(px,py,0,px,py,46);g.addColorStop(0,'rgba(20,14,8,.55)');g.addColorStop(1,'rgba(20,14,8,0)');x.fillStyle=g;x.fillRect(px-46,py-46,92,92);D('wreck'+(r()*4|0),px,py,58+r()*10,r()<.5);}
  for(const b of G.ents.filter(e=>e.kind==='b')){const me=b.side==='me';const R0=me?Math.max(b.w,b.h)*.9+60:Math.max(b.w,b.h)*.8+30;const k=me?(b.type==='hq'?5:2):2;
   for(let j=0;j<k;j++){const an=(me?-0.9:Math.PI-0.9)+j*(1.8/Math.max(1,k-1));const px=b.cx+Math.cos(an)*R0,py=b.cy+Math.sin(an)*R0*.75;if(free(px,py))D('sbag'+(r()*3|0),px,py,52+r()*12,Math.cos(an)<0);}
   if(me&&b.type==='hq'){D('crate',b.x-18,b.y+b.h+10,40);D('crate',b.x+b.w+16,b.y+8,34,true);}
   if(!me&&r()<.8){const px=b.cx-b.w*.9-30,py=b.cy+(r()-.5)*b.h;if(free(px,py))D('wire',px,py,70);}}}
 const v=x.createLinearGradient(0,0,G.W,0);v.addColorStop(0,'rgba(60,90,160,.07)');v.addColorStop(.5,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(160,40,30,.07)');x.fillStyle=v;x.fillRect(0,0,G.W,G.H);
 miniBg=document.createElement('canvas');miniBg.width=mini.width;miniBg.height=mini.height;miniBg.getContext('2d').drawImage(bg,0,0,mini.width,mini.height);
 fogC=document.createElement('canvas');fogC.width=G.gw;fogC.height=G.gh;}
function drawFog(){const f=fogC.getContext('2d'),id=f.createImageData(G.gw,G.gh);for(let i=0;i<G.vis.length;i++){id.data[i*4+3]=G.vis[i]?0:G.seen[i]?110:235;}f.putImageData(id,0,0);}
function spr(img,x,y,sz,flip,alpha){const s=sz/Math.max(img.width,img.height);const w=img.width*s,h=img.height*s;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);if(alpha!=null)ctx.globalAlpha=alpha;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
function unitImg(u){const d=u.def;let im=IMG[d.img];if(d.tint==='foe')im=tinted(d.img,FOE_F);else if(d.tint==='jeep')im=tinted(d.img,JEEP_F);return im;}
const GLW={};function glow(c,r=32){const k=c+r;if(GLW[k])return GLW[k];const cv=document.createElement('canvas');cv.width=cv.height=r*2;const x=cv.getContext('2d');const g=x.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,`rgba(${c},1)`);g.addColorStop(.25,`rgba(${c},.5)`);g.addColorStop(1,`rgba(${c},0)`);x.fillStyle=g;x.fillRect(0,0,r*2,r*2);return GLW[k]=cv;}
let sparks=[];const LOWFX=matchMedia('(pointer:coarse)').matches;function addGlow(c,x,y,r,a){ctx.globalAlpha=Math.max(0,Math.min(1,a));ctx.drawImage(glow(c),x-r,y-r,r*2,r*2);}
function draw(){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,cv.width,cv.height);ctx.save();ctx.setTransform(Z*DPR,0,0,Z*DPR,-Math.round(cam.x*Z*DPR),-Math.round(cam.y*Z*DPR));
 {const w=Math.min(WV(),G.W-cam.x),h=Math.min(HV(),G.H-cam.y);ctx.drawImage(bg,cam.x*BGS,cam.y*BGS,w*BGS,h*BGS,cam.x,cam.y,w,h);}drawWater();
 const inV=(x,y,m=80)=>x>cam.x-m&&x<cam.x+WV()+m&&y>cam.y-m&&y<cam.y+HV()+m;
 for(const f of G.fields){if(!inV(f.x,f.y))continue;const a=Math.max(.15,f.amt/f.max);const rg=ctx.createRadialGradient(f.x,f.y,2,f.x,f.y,f.r);rg.addColorStop(0,`rgba(240,200,70,${.7*a})`);rg.addColorStop(1,'rgba(240,200,70,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();
  for(let i=0;i<Math.ceil(6*a);i++){const an=i*1.1,dd=f.r*.45;const bx=f.x+Math.cos(an)*dd,by=f.y+Math.sin(an)*dd*.7;ctx.fillStyle='#3d4a2a';ctx.fillRect(bx-6,by-4,12,8);ctx.fillStyle='#6b7a45';ctx.fillRect(bx-6,by-4,12,2);ctx.fillStyle='#b33';ctx.fillRect(bx-1,by-3,2,2);}}
 const list=G.ents.filter(e=>{const p=G.pos(e);if(!inV(p.x,p.y,160))return false;if(e.side==='foe'){if(e.kind==='u')return G.visible(e.x,e.y);return G.seen[(e.cy/CELL|0)*G.gw+(e.cx/CELL|0)];}return true;}).sort((a,b)=>(a.kind==='b'?a.y+a.h:a.y)-(b.kind==='b'?b.y+b.h:b.y));
 for(const e of list){if(e.kind==='b'){let im=IMG[e.def.img];if(e.side==='foe')im=tinted(e.def.img,FOE_F);const s=Math.max(e.w/im.width,(e.h*1.25)/im.height)*1.12;const w=im.width*s,h=im.height*s;
   const top=e.y+e.h-h+6;ctx.save();ctx.globalAlpha=.4*Math.min(1,.3+e.dep);ctx.drawImage(shadowOf(im),e.cx-w/2+10-8,e.y+e.h-h+14-8,w+16,h+16);ctx.globalAlpha=1;
   if(e.dep<1){const rh=h*e.dep;ctx.beginPath();ctx.rect(e.cx-w/2-4,top+h-rh,w+8,rh+4);ctx.clip();}ctx.drawImage(im,e.cx-w/2,top,w,h);ctx.restore();
   if(e.dep<1)drawScaffold(e,w,h,top);else bTop(e,w,h,top);
   if(e.side==='foe'){ctx.fillStyle='#b83a2e';ctx.fillRect(e.x+4,e.y-8,12,8);}
   {ctx.save();ctx.globalCompositeOperation='lighter';if(((G.t+e.id*13)%90)<9)addGlow(e.side==='me'?'120,200,255':'255,80,60',e.cx+e.w*.28,e.y+e.h-h+6+h*.14,15,.95);if(e.hp<e.max*.4&&SC.fx!=='confetti')addGlow('255,120,40',e.cx,e.cy,e.w*.6,.18+.08*Math.sin(G.t*.4));ctx.restore();}
   if(G.sel.includes(e)){const p=4+Math.sin(G.t*.15)*2,L=Math.min(e.w,e.h)*.28;ctx.strokeStyle='rgba(140,255,170,.95)';ctx.lineWidth=2.2;ctx.beginPath();for(const [cx,cy,sx,sy] of [[e.x-p,e.y-p,1,1],[e.x+e.w+p,e.y-p,-1,1],[e.x-p,e.y+e.h+p,1,-1],[e.x+e.w+p,e.y+e.h+p,-1,-1]]){ctx.moveTo(cx+sx*L,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*L);}ctx.stroke();}}
  else{const d=e.def,im=unitImg(e);const c=Math.cos(e.ang);const flip=(c<0)!==(d.face<0);
   {if(G.sel.includes(e)){ctx.save();ctx.globalCompositeOperation='lighter';addGlow(e.side==='me'?'80,190,255':'255,90,70',e.x,e.y+d.sz*.22,d.sz*.9,.3);ctx.restore();}ctx.drawImage(SH,e.x+d.sz*.12-d.sz*.55,e.y+d.sz*.22-d.sz*.26,d.sz*1.1,d.sz*.52);
   const pw=d.sz*.46,ph=d.sz*.2,py=e.y+d.sz*.26;ctx.fillStyle=e.side==='me'?'rgba(60,130,255,.32)':'rgba(230,50,35,.32)';ctx.strokeStyle=e.side==='me'?'rgba(110,180,255,.85)':'rgba(255,90,70,.85)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x-pw,py);ctx.lineTo(e.x,py-ph);ctx.lineTo(e.x+pw,py);ctx.lineTo(e.x,py+ph);ctx.closePath();ctx.fill();ctx.stroke();
   e._mv=e._px!=null&&(Math.abs(e.x-e._px)+Math.abs(e.y-e._py))>.3;if(e._px!=null&&(Math.abs(e.x-e._px)+Math.abs(e.y-e._py))>.4&&(G.t+e.id)%5===0&&!d.inf&&puffs.length<260)puffs.push({x:e.x-Math.cos(e.ang)*d.sz*.4,y:e.y+d.sz*.15-Math.sin(e.ang)*d.sz*.3,r:4+Math.random()*4,t:0,d:50+Math.random()*30,c:G.st.map==='sinai'?'215,180,120':'150,125,95'});e._px=e.x;e._py=e.y;}
   const sn=Math.sin(e.ang),cs=Math.cos(e.ang);const fired=d.rof&&e.cd>d.rof-8?(e.cd-(d.rof-8))/8:0;const ta=e.tur!=null?e.tur:e.ang;
   const rx=e.x-Math.cos(ta)*fired*3,ry=e.y-Math.sin(ta)*fired*2+(d.harv?Math.sin((G.t+e.id*7)*.3)*.4:0);
   if(d.inf){const k=d.sz/13;ctx.save();ctx.translate(rx,ry);ctx.scale(k,k);drawSquad(ctx,0,0,e.ang,e.side,Math.max(1,Math.ceil((d.squad||3)*e.hp/e.max)),d.beret,G.t+e.id*5,e._mv,e.cd>d.rof-4);ctx.restore();}
   else if(d.hull||d.dirs){const dir=dirOf(e.ang);const key=(d.hull?'hull_'+d.hull:d.dirs)+'_'+dir;let hi=DIRIMG[key];if(hi&&d.tint==='il')hi=dirTinted(hi,IL_F);
    if(hi&&hi.complete&&hi.width){const sc=d.sz*1.3/100,hm=META[d.hull?'hull_'+d.hull:d.dirs],hs=sc/((hm&&hm.s)||1);const w=hi.width*hs,h=hi.height*hs;ctx.drawImage(hi,rx-w/2,ry-h/2,w,h);
     if(d.tur){const ti=DIRIMG['tur_'+d.tur],tm=META['tur_'+d.tur],rm=META['hull_'+d.hull]&&META['hull_'+d.hull][dir];const want=(e.cd>0&&e.tur!=null)?e.tur:e.ang;e.tv=e.tv==null?want:angLerp(e.tv,want,.12);
      if(ti&&ti.width&&tm&&rm){const px=rx-w/2+rm[0]*w,py=ry-h/2+rm[1]*h;const ts=sc*1.15;const tw=ti.width*ts*(d.turLen||1),th=ti.height*ts;ctx.save();ctx.translate(px,py-2);ctx.scale(1,.72);ctx.rotate(e.tv);ctx.drawImage(ti,-tm.px*tw,-th/2,tw,th);ctx.restore();}}}
   } else {const s2=d.sz/Math.max(im.width,im.height),w=im.width*s2,h=im.height*s2;ctx.save();ctx.translate(rx,ry);if(flip)ctx.scale(-1,1);const tilt=(cs<0?-1:1)*sn*.28*(flip?-1:1);ctx.rotate(tilt);ctx.scale(1,1-Math.abs(sn)*.12);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
   if(e.cd>d.rof-5&&d.dmg){const a=e.tv!=null?e.tv:(e.tur||e.ang);ctx.fillStyle='rgba(255,220,120,.9)';ctx.beginPath();ctx.arc(e.x+Math.cos(a)*d.sz*(d.tur?.85:.55),e.y-6+Math.sin(a)*d.sz*(d.tur?.6:.4),5,0,7);ctx.fill();}
   if(d.harv&&e.load>0){ctx.fillStyle='#d8b23a';ctx.fillRect(e.x-8,e.y-d.sz*.55,16*e.load/d.cap,3);}
   if(e.rank){ctx.fillStyle='#ffd75e';ctx.strokeStyle='#000';ctx.lineWidth=1;for(let i=0;i<e.rank;i++){const yy=e.y-d.sz*.62-i*4,xx=e.x+d.sz*.42;ctx.beginPath();ctx.moveTo(xx-4,yy+2);ctx.lineTo(xx,yy-1);ctx.lineTo(xx+4,yy+2);ctx.lineTo(xx+4,yy+3.5);ctx.lineTo(xx,yy+.5);ctx.lineTo(xx-4,yy+3.5);ctx.closePath();ctx.fill();ctx.stroke();}}
   if(G.sel.includes(e)){ctx.save();ctx.setLineDash([5,4]);ctx.lineDashOffset=-G.t*.6;ctx.strokeStyle='rgba(210,255,220,.75)';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(e.x,e.y+d.sz*.22,d.sz*.7,d.sz*.31,0,0,7);ctx.stroke();ctx.restore();}
   if(G.sel.includes(e)){const k=Math.max(0,1-(G.t-selPulse)/20);ctx.strokeStyle=`rgba(120,255,140,${.9})`;ctx.lineWidth=1.5+k*2;ctx.beginPath();ctx.ellipse(e.x,e.y+d.sz*.22,d.sz*(.5+k*.3),d.sz*(.22+k*.12),0,0,7);ctx.stroke();
    const q=d.sz*.55;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(e.x+a*q,e.y+b*q*.8-a*0);ctx.lineTo(e.x+a*q-a*6,e.y+b*q*.8);ctx.moveTo(e.x+a*q,e.y+b*q*.8);ctx.lineTo(e.x+a*q,e.y+b*q*.8-b*6);ctx.stroke();});}}
  if(e.hp<e.max||G.sel.includes(e)){const p=G.pos(e),w=e.kind==='b'?e.w:30,y=e.kind==='b'?e.y-12:e.y-e.def.sz*.6;const f=e.hp/e.max;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(p.x-w/2-1,y-1,w+2,6);ctx.fillStyle=f>.5?'#4fd34f':f>.25?'#e8c547':'#e04a3a';ctx.fillRect(p.x-w/2,y,w*f,4);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(p.x-w/2,y,w*f,1);
   ctx.fillStyle='rgba(0,0,0,.55)';const seg=e.kind==='b'?8:4;for(let i=1;i<seg;i++)ctx.fillRect(p.x-w/2+w*i/seg,y,1,4);if(e.side==='me'&&e.kind==='u'&&f<1&&G.ents.some(b=>b.kind==='b'&&b.side==='me'&&(b.type==='hq'||b.def.drop)&&d2(e,{x:b.cx,y:b.cy})<b.w/2+90)){ctx.fillStyle='#7cf';ctx.font='bold 11px sans-serif';ctx.fillText('🔧',p.x+w/2+2,y+5);}}}
 {const cf=SC.fx==='confetti';for(const p of G.shots){if((G.t+(p.x|0))%3===0&&inV(p.x,p.y)&&puffs.length<(LOWFX?160:260))puffs.push({x:p.x-p.vx*2,y:p.y-p.vy*2,r:2.5,t:0,d:36,c:cf?(SC.smoke||['200,200,200'])[(p.x|0)%3]:'190,185,175',a0:.35});}
 ctx.globalCompositeOperation='lighter';for(const p of G.shots){if(!inV(p.x,p.y))continue;if(p.arc){const k=1-p.life/(p.life0||1),hgt=Math.sin(Math.PI*k)*Math.min(140,(p.life0||1)*2.2);addGlow('255,170,80',p.x,p.y-hgt,8,.95);ctx.globalAlpha=.35;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(p.x,p.y,3,1.5,0,0,7);ctx.fill();ctx.globalAlpha=1;continue;}addGlow(cf?'255,255,230':'255,190,100',p.x,p.y,9,.9);ctx.globalAlpha=.95;ctx.strokeStyle=cf?'rgba(255,245,190,.95)':'rgba(255,235,170,.95)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*4,p.y-p.vy*4);ctx.stroke();}
 for(const e of G.ents){if(e.kind!=='u'||!e.def.rof||!(e.cd>e.def.rof-5)||!inV(e.x,e.y))continue;const a=e.tur!=null?e.tur:e.ang,L=e.def.sz*.75,k=(e.cd-(e.def.rof-5))/5;addGlow(cf?'255,250,210':'255,190,90',e.x+Math.cos(a)*L,e.y+Math.sin(a)*L*.72-3,12+k*12,k);addGlow(cf?'255,240,200':'255,150,60',e.x,e.y+e.def.sz*.2,e.def.sz*1.2,.22*k);}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
 for(const f of G.fx){if(f.t<0||!inV(f.x,f.y))continue;const k=f.t/f.d;const rg=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(.6+k*.6));rg.addColorStop(0,`rgba(255,240,180,${1-k})`);rg.addColorStop(.45,`rgba(255,120,30,${.85*(1-k)})`);rg.addColorStop(1,'rgba(60,40,30,0)');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.6+k*.6),0,7);ctx.fill();
  if(f.big&&k<.5){ctx.strokeStyle=`rgba(255,220,160,${.6*(1-k*2)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.5+k*2.2),0,7);ctx.stroke();}
  if(f.big&&k>.3){ctx.fillStyle=`rgba(50,45,40,${.4*(1-k)})`;ctx.beginPath();ctx.arc(f.x+k*10,f.y-k*30,f.r*.6*k+6,0,7);ctx.fill();}}
 for(const f of G.fx){if(!f._sp){f._sp=1;const n=f.big?(LOWFX?10:22):(LOWFX?3:6),C=SC.confetti;for(let i=0;i<n&&sparks.length<400;i++){const an=Math.random()*6.283,sp=(f.big?2.4:1.2)*(.4+Math.random());sparks.push({x:f.x,y:f.y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp*.6,z:0,vz:1+Math.random()*(f.big?3:1.5),life:20+Math.random()*25,c:C?C[i%C.length]:null});}}
  if(f.t>=0&&inV(f.x,f.y)){ctx.globalCompositeOperation='lighter';addGlow(SC.fx==='confetti'?'255,240,210':'255,140,50',f.x,f.y,f.r*(f.big?4:2.5),.5*(1-f.t/f.d));ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;}}
 ctx.globalCompositeOperation='lighter';for(const s of sparks){s.x+=s.vx;s.y+=s.vy;s.z+=s.vz;s.vz-=.22;if(s.z<0){s.z=0;s.vz*=-.3;s.vx*=.7;s.vy*=.7;}s.life--;if(!inV(s.x,s.y))continue;if(s.c){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=Math.min(1,s.life/15);ctx.fillStyle=s.c;ctx.fillRect(s.x-1.5,s.y-s.z-1,3.5,2.2);ctx.globalCompositeOperation='lighter';}else{ctx.globalAlpha=Math.min(1,s.life/12);ctx.fillStyle='rgb(255,'+Math.min(240,150+s.life*3|0)+',70)';ctx.fillRect(s.x-1,s.y-s.z-1,2.4,2.4);}}
 for(const m of smokers){const k=m.t/m.d;if(SC.fx!=='confetti'&&k<.55&&inV(m.x,m.y))addGlow('255,130,40',m.x,m.y-4,38,(.16+Math.random()*.08)*(1-k*1.6));}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';sparks=sparks.filter(s=>s.life>0);
 for(const f of G.fx)if(f.big&&!f._sm){f._sm=1;if(smokers.length<40)smokers.push({x:f.x,y:f.y,t:0,d:700+Math.random()*400});}
 for(const m of smokers){m.t++;if(!inV(m.x,m.y,200))continue;const k=m.t/m.d;if(k<.55&&m.t%3===0){const fl=.6+Math.random()*.4;ctx.globalAlpha=Math.max(0,fl*(1-k*1.6));ctx.drawImage(puffImg('255,170,60'),m.x-10,m.y-12,20,20);ctx.globalAlpha=1;}
  if(m.t%6===0&&puffs.length<300)puffs.push({x:m.x+(Math.random()-.5)*6,y:m.y-4,r:6+Math.random()*4,t:0,d:150,c:'45,40,36',rise:1,a0:.55*(1-k)});
  if(k<.5){const hz=(G.t%40)/40;ctx.save();ctx.globalAlpha=.18;const sy=Math.sin(G.t*.3)*1.5;ctx.drawImage(bg,(m.x-18)*BGS,(m.y-60)*BGS,36*BGS,40*BGS,m.x-18+sy,m.y-61,36,40);ctx.restore();}}
 smokers=smokers.filter(m=>m.t<m.d);
 for(const q of puffs){q.t++;const k=q.t/q.d;if(q.rise){q.y-=.45;q.x+=.25+Math.sin((q.t+q.x)*.05)*.2;}else{q.y-=.06;}const r=q.r*(1+k*(q.rise?3.2:1.8));if(!inV(q.x,q.y))continue;ctx.globalAlpha=(q.a0||.32)*(1-k);ctx.drawImage(puffImg(q.c),q.x-r,q.y-r,r*2,r*2);ctx.globalAlpha=1;}
 puffs=puffs.filter(q=>q.t<q.d);
 for(const b of debris){b.x+=b.vx;b.y+=b.vy*.3;b.z+=b.vz;b.vz-=.25;if(b.z<0){b.z=0;b.vx*=.6;b.vz*=-.3;}b.life--;ctx.fillStyle=`rgba(40,32,24,${Math.min(1,b.life/20)})`;ctx.fillRect(b.x,b.y-b.z,3,3);}
 for(let i=debris.length-1;i>=0;i--)if(debris[i].life<=0)debris.splice(i,1);
 if(orderMark&&G.t-orderMark.t<30){const k=(G.t-orderMark.t)/30;ctx.strokeStyle=orderMark.atk?`rgba(255,70,50,${1-k})`:`rgba(120,255,140,${1-k})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(orderMark.x,orderMark.y,20*(1-k)+4,10*(1-k)+2,0,0,7);ctx.stroke();}
 if(G.st.night){ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgb(92,104,150)';ctx.fillRect(cam.x,cam.y,WV(),HV());ctx.globalCompositeOperation='lighter';for(const e of G.ents)if(e.side==='me'&&e.kind==='b'&&e.dep>=1&&inV(e.cx,e.cy,200))addGlow('255,190,110',e.cx,e.cy,e.w*.9,.16);ctx.restore();ctx.globalAlpha=1;}
 drawFog();ctx.imageSmoothingEnabled=true;ctx.drawImage(fogC,0,0,G.gw*CELL,G.gh*CELL);
 for(const s of G.air.strikes){const im=IMG[s.img];const A=s.side==='me';ctx.save();ctx.translate(s.x,s.y-40);if(!A)ctx.scale(-1,1);const sz=s.img==='mirage'?90:84;const w=sz,h=im.height*sz/im.width;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(10,70,w*.25,h*.12,0,0,7);ctx.fill();ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();}
 if(G.place){const d=SC.buildings[G.place],x=Math.floor(mouse.x/TILE)*TILE,y=Math.floor(mouse.y/TILE)*TILE,ok=G.canPlace(G.place,x,y);ctx.fillStyle=ok?'rgba(80,255,80,.28)':'rgba(255,60,60,.32)';ctx.fillRect(x,y,d.w*TILE,d.h*TILE);const im=IMG[d.img];if(im&&im.width){const w0=d.w*TILE,h0=d.h*TILE,s=Math.max(w0/im.width,(h0*1.25)/im.height)*1.12;ctx.globalAlpha=.6;ctx.drawImage(im,x+w0/2-im.width*s/2,y+h0-im.height*s+6,im.width*s,im.height*s);ctx.globalAlpha=1;}if(d.wpn){ctx.strokeStyle='rgba(255,230,140,.5)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(x+d.w*TILE/2,y+d.h*TILE/2,d.wpn.rng,d.wpn.rng*.8,0,0,7);ctx.stroke();ctx.setLineDash([]);}}
 if(airMode){ctx.strokeStyle='rgba(255,80,60,.9)';ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(mouse.x,mouse.y,SC.air.me.r,0,7);ctx.stroke();ctx.setLineDash([]);}
 if(drag&&drag.box){ctx.strokeStyle='#7f7';ctx.lineWidth=1;ctx.strokeRect(drag.x,drag.y,mouse.x-drag.x,mouse.y-drag.y);}
 ctx.font='bold 13px Heebo,Arial';ctx.textAlign='center';for(const b of bubbles){if(b.u.hp>0){b.x=b.u.x;b.y=b.u.y;}const a=Math.min(1,b.life/20);const tw=ctx.measureText(b.t).width+12,yy=b.y-46-(90-b.life)*.15;ctx.fillStyle=`rgba(20,16,10,${.8*a})`;ctx.fillRect(b.x-tw/2,yy-14,tw,19);ctx.fillStyle=`rgba(255,230,150,${a})`;ctx.fillText(b.t,b.x,yy);b.life--;}ctx.textAlign='start';
 for(let i=bubbles.length-1;i>=0;i--)if(bubbles[i].life<=0)bubbles.splice(i,1);
 ctx.restore();ctx.setTransform(DPR,0,0,DPR,0,0);
 drawMini();}
function drawScaffold(e,w,h,top){const ly=top+h*(1-e.dep);ctx.save();ctx.strokeStyle='rgba(225,190,90,.9)';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<=4;i++){const x=e.cx-w*.42+w*.84*i/4;ctx.moveTo(x,ly-10);ctx.lineTo(x,top+h-6);}for(let y=ly-10;y<top+h-6;y+=12){ctx.moveTo(e.cx-w*.42,y);ctx.lineTo(e.cx+w*.42,y);}ctx.stroke();
 ctx.globalCompositeOperation='lighter';addGlow('255,200,90',e.cx-w*.3+((G.t*3)%(w*.6)),ly-6,10,.8);ctx.restore();ctx.globalAlpha=1;if(G.t%6===0&&puffs.length<260)puffs.push({x:e.cx+(Math.random()-.5)*w*.7,y:e.y+e.h,r:6,t:0,d:40,c:G.st.map==='sinai'?'215,180,120':'150,125,95'});
 ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(e.cx-22,e.y+e.h+2,44,5);ctx.fillStyle='#ffd75e';ctx.fillRect(e.cx-22,e.y+e.h+2,44*e.dep,5);}
function bTop(e,w,h,top){const d=e.def;
 if(d.tur){const ti=DIRIMG['tur_'+d.tur],tm=META['tur_'+d.tur];if(ti&&ti.width&&tm){const k=(d.w*TILE*1.05)/ti.width*(d.turLen?1.05:1),tw=ti.width*k*(d.turLen||1),th=ti.height*k;const px=e.cx,py=top+h*.48;
   const hull=DIRIMG['hull_'+(d.tur==='t55'?'t55':'shot')+'_'+dirOf(e.tur)];if(hull&&hull.width&&!d.turLen){const hk=(d.w*TILE*.95)/hull.width;ctx.save();ctx.globalAlpha=.95;ctx.drawImage(hull,px-hull.width*hk/2,py-hull.height*hk/2+4,hull.width*hk,hull.height*hk);ctx.restore();}
   ctx.save();ctx.translate(px,py);ctx.scale(1,.72);ctx.rotate(e.tur);if(e.side==='foe')ctx.filter=FOE_F;ctx.drawImage(ti,-tm.px*tw,-th/2,tw,th);ctx.restore();
   if(e.cd>d.wpn.rof-5){const L=tw*(1-tm.px)*.95;ctx.save();ctx.globalCompositeOperation='lighter';addGlow('255,190,90',px+Math.cos(e.tur)*L,py+Math.sin(e.tur)*L*.72,16,1);ctx.restore();ctx.globalAlpha=1;}}}
 if(d.radar){const px=e.cx+w*.07,py=top+h*.27,a=G.t*.05;ctx.save();ctx.translate(px,py);ctx.fillStyle='#4b4d36';ctx.fillRect(-2,0,4,10);const sx=Math.cos(a);ctx.scale(sx,1);const g=ctx.createLinearGradient(-14,0,14,0);g.addColorStop(0,'#5d604a');g.addColorStop(.5,'#c9cbb3');g.addColorStop(1,'#6d705a');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-6,15,10,0,0,7);ctx.fill();ctx.strokeStyle='#2c2d20';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  if((G.t%120)<60){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(120,255,160,${.5*(1-(G.t%120)/60)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,20+(G.t%120)*3,0,7);ctx.stroke();ctx.restore();}}
 if(d.heal&&G.ents.some(u=>u.side==='me'&&u.kind==='u'&&u.hp<u.max&&d2(u,{x:e.cx,y:e.cy})<e.w/2+170)&&G.t%8<4){ctx.save();ctx.globalCompositeOperation='lighter';addGlow('140,220,255',e.cx-w*.2+Math.random()*w*.2,top+h*.55,10,1);ctx.restore();ctx.globalAlpha=1;}
 if(e.hp<e.max*.5&&G.t%7===0&&puffs.length<280)puffs.push({x:e.cx+(Math.random()-.5)*w*.4,y:top+h*.35,r:7,t:0,d:120,c:'40,36,32',rise:1,a0:.5});}
function infIcon(d){const k=d.beret?'b':d.foe?'f':'i';if(INFI[k])return INFI[k];const c=document.createElement('canvas');c.width=60;c.height=44;const x=c.getContext('2d');x.translate(30,26);x.scale(2.1,2.1);drawSquad(x,0,0,0,d.foe?'foe':'me',3,d.beret,0,0,1);return INFI[k]=c.toDataURL();}
const INFI={};
function drawSquad(x,cx,cy,ang,side,n,beret,t,moving,fire){const body=side==='me'?'#6e6c3e':'#8a7a4c',dark=side==='me'?'#3f3d22':'#4e4228',helm=beret?'#8a2f2f':side==='me'?'#59603a':'#7a6b44';
 const F=[[0,0],[-7,-5],[-7,5],[-13,0]];for(let i=0;i<n;i++){const o=F[i%4];const ca=Math.cos(ang),sa=Math.sin(ang);const px=cx+o[0]*ca-o[1]*sa,py=cy+(o[0]*sa+o[1]*ca)*.7;const step=moving?Math.sin(t*.35+i*1.7)*2:0;
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(px+1.5,py+4,4.2,1.8,0,0,7);x.fill();
  x.strokeStyle=dark;x.lineWidth=1.6;x.beginPath();x.moveTo(px-1,py+1);x.lineTo(px-1.5+step*.5,py+4);x.moveTo(px+1,py+1);x.lineTo(px+1.5-step*.5,py+4);x.stroke();
  x.fillStyle=body;x.beginPath();x.ellipse(px,py-1.5,2.8,3.4,0,0,7);x.fill();x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=.7;x.stroke();
  const wl=i===0&&!beret?9:6;x.strokeStyle=i===0&&!beret?'#2a2a20':'#1c1c16';x.lineWidth=i===0&&!beret?2.2:1.2;x.beginPath();x.moveTo(px+ca*1,py-2+sa*.7);x.lineTo(px+ca*wl,py-2.5+sa*wl*.7);x.stroke();
  x.fillStyle=helm;x.beginPath();x.arc(px,py-5.2,2.3,0,7);x.fill();x.strokeStyle='rgba(0,0,0,.6)';x.lineWidth=.6;x.stroke();x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.arc(px-.7,py-6,1,0,7);x.fill();
  if(fire){x.save();x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,200,100,.9)';x.beginPath();x.arc(px+ca*(wl+2),py-2.5+sa*(wl+2)*.7,2.2,0,7);x.fill();x.restore();}}}
function drawMini(){const sx=mini.width/G.W,sy=mini.height/G.H;mctx.drawImage(miniBg,0,0);
 const rad=G.radarOn();for(const e of G.ents){if(e.side==='foe'&&!(e.kind==='u'?(rad||G.visible(e.x,e.y)):G.seen[(e.cy/CELL|0)*G.gw+(e.cx/CELL|0)]))continue;mctx.fillStyle=e.side==='me'?'#5af':'#f44';if(e.kind==='b')mctx.fillRect(e.x*sx,e.y*sy,Math.max(3,e.w*sx),Math.max(3,e.h*sy));else mctx.fillRect(e.x*sx-1.5,e.y*sy-1.5,3,3);}
 mctx.imageSmoothingEnabled=true;mctx.drawImage(fogC,0,0,mini.width,mini.height);if(rad){mctx.fillStyle='#f44';for(const e of G.ents)if(e.side==='foe'&&e.kind==='u')mctx.fillRect(e.x*sx-1.5,e.y*sy-1.5,3,3);const a=G.t*.04;mctx.save();mctx.globalCompositeOperation='lighter';mctx.strokeStyle='rgba(120,255,160,.35)';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(mini.width/2,mini.height/2);mctx.lineTo(mini.width/2+Math.cos(a)*mini.width,mini.height/2+Math.sin(a)*mini.width);mctx.stroke();mctx.restore();}mctx.strokeStyle='#fff';mctx.strokeRect(cam.x*sx,cam.y*sy,WV()*sx,HV()*sy);}
function scorch(x,y,r){if(!bg||x==null)return;const c=bg.getContext('2d');const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(15,10,5,.55)');g.addColorStop(1,'rgba(15,10,5,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,r,r*.7,0,0,7);c.fill();
 for(let i=0;i<(r>30?14:7);i++){const a=Math.random()*6.283,v=1+Math.random()*3;debris.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,z:0,vz:2+Math.random()*3,life:40+Math.random()*30});}}
const debris=[];let DPR=1;const BGS=matchMedia('(pointer:coarse)').matches?1.5:2;let selPulse=-99,orderMark=null;
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
 for(const e of G.ev.splice(0)){if(e.k==='rank'){const u=G.ents.find(x=>x.id===e.id);if(u&&u.side==='me')bubbles.push({u,x:u.x,y:u.y,t:'⭐ דרגה עלתה!',life:90});}if(e.k==='say'){const u=G.ents.find(x=>x.id===e.id);if(u)voice(u,e.t,1);continue;}sfx(e.k,e.x,e.y);if(e.k==='boom'||e.k==='bigboom')scorch(e.x,e.y,e.k==='bigboom'?40:22);}
 draw();hud();if(G.t-lastAuto>1200){lastAuto=G.t;saveGame('auto');}
 if(G.over){sfx(G.over==='win'?'ready':'bigboom');paused=true;endScreen();return;}requestAnimationFrame(loop);}
// ---------- input ----------
let drag=null,mouse={x:0,y:0},edge=null,airMode=false,touching=false;
const toWorld=(cx,cy)=>{const r=cv.getBoundingClientRect();return{x:(cx-r.left)/Z+cam.x,y:(cy-r.top)/Z+cam.y,sx:cx-r.left,sy:cy-r.top};};
function pick(p){return G.ents.find(e=>e.side==='me'&&(e.kind==='u'?d2(e,p)<e.def.sz*.5:p.x>e.x&&p.x<e.x+e.w&&p.y>e.y&&p.y<e.y+e.h));}
function tap(p){ac();if(airMode){if(G.airStrike(p.x,p.y))say('✈ פאנטום בדרך!');else sfx('deny');airMode=false;return;}
 if(G.place){if(G.placeBuild(p.x,p.y))G.place=null;else sfx('deny');return;}
 const own=pick(p);if(own&&own.kind==='u'){G.sel=[own];selPulse=G.t;voice(own,'sel',1);sfx('click');return;}
 if(own&&own.kind==='b'&&G.sel.length&&(own.type==='hq'||own.def.drop||own.def.heal)){G.sel.forEach(u=>{if(!u.def.harv){u.tgt=null;u.mv={x:own.cx+(Math.random()-.5)*own.w,y:own.y+own.h+20};u.path=null;u.repairing=1;}});voice(G.sel[0],'repair',1);return;}
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
$('pause').onclick=togglePause;$('save').onclick=()=>saveGame();$('load').onclick=()=>{const s=ACC.get('save');if(s){try{start(Game.load(s));say('📂 נטען');}catch(e){say('השמירה פגומה');}}else say('אין שמירה');};
$('mute').onclick=$('mute1').onclick=()=>setMute(!muted);$('quit').onclick=()=>{saveGame('auto');ACC.sync();menu();};
$('air').onclick=$('tAir').onclick=()=>{airMode=true;say('✈ בחר מטרה לתקיפה האווירית');};
$('tAll').onclick=()=>{G.sel=G.ents.filter(e=>e.side==='me'&&e.kind==='u'&&!e.def.harv);sfx('click');};$('tNone').onclick=()=>{G.sel=[];G.place=null;airMode=false;};
$('cont').onclick=()=>{const L=ACC.getJSON('last',{}),s=ACC.get(L.slot==='save'?'save':'auto')||ACC.get('auto')||ACC.get('save');try{const g=Game.load(s);diff=g.diff;start(g);}catch(e){alert('השמירה פגומה, אפשר להתחיל את השלב מחדש');}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&G&&!G.over){saveGame('auto');ACC.sync();}});
// PWA
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.querySelectorAll('.instbtn').forEach(b=>b.classList.remove('hide'));});
window.__install=async()=>{if(!deferred){HOME.installHelp();return;}deferred.prompt();await deferred.userChoice;deferred=null;};$('inst').onclick=window.__install;
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
$('zin').onclick=()=>zoomAt(1.2,VW/2,VH/2);$('zout').onclick=()=>zoomAt(1/1.2,VW/2,VH/2);$('music').onclick=()=>{ac();setMusic(!musicOn);};setMusic(musicOn);setMute(muted);window.__game=()=>G;window.__cam=cam;window.__Z=()=>Z;window.__menu=menu;ACC.onChange(()=>{if(!G&&!$('menu').classList.contains('hide'))menu();});HOME.init();
// water shimmer (gfx level 2): water cells detected from painted bg, cheap additive glints
let WAT=[],GLS=null,WBG=null;const WC=16;
function calcWater(){WAT=[];try{const cw=Math.ceil(G.W/WC),ch=Math.ceil(G.H/WC),c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.drawImage(bg,0,0,cw,ch);const d=x.getImageData(0,0,cw,ch).data;
 for(let j=0;j<ch;j++)for(let i=0;i<cw;i++){const k=(j*cw+i)*4,r=d[k],g=d[k+1],b=d[k+2];if((b>r+25&&b>g-5&&b>60)||(b>r+10&&b>=g&&b>70))WAT.push([i*WC,j*WC,Math.random()*6.28]);}}catch(e){WAT=[];}
 if(!GLS){GLS=document.createElement('canvas');GLS.width=24;GLS.height=8;const q=GLS.getContext('2d'),gr=q.createRadialGradient(12,4,0,12,4,12);gr.addColorStop(0,'rgba(255,255,245,.95)');gr.addColorStop(.4,'rgba(200,235,255,.45)');gr.addColorStop(1,'rgba(200,235,255,0)');q.fillStyle=gr;q.save();q.scale(1,1/3);q.fillRect(0,0,24,24);q.restore();}}
function drawWater(){if(WBG!==bg){WBG=bg;calcWater();}if(!WAT.length)return;const t=G.t*.06,x0=cam.x-WC,y0=cam.y-WC,x1=cam.x+WV(),y1=cam.y+HV(),st=LOWFX?2:1;ctx.save();ctx.globalCompositeOperation='lighter';
 for(let n=0;n<WAT.length;n+=st){const w=WAT[n];if(w[0]<x0||w[0]>x1||w[1]<y0||w[1]>y1)continue;const ph=w[2]+t,a=Math.sin(ph)*.5+.5;if(a<.35)continue;ctx.globalAlpha=(a-.35)*.55;const ox=(Math.sin(ph*.7+w[1]*.05)*.5+.5)*WC,oy=(Math.cos(ph*.5+w[0]*.04)*.5+.5)*WC;ctx.drawImage(GLS,w[0]+ox-6,w[1]+oy-2,12+a*8,3+a*2);}
 ctx.restore();ctx.globalAlpha=1;}
window.__wat=()=>WAT.length;
})();

