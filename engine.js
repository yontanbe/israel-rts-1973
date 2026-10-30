// Shared RTS engine v2: big map, A* pathfinding, fog of war, stages, air strikes, save/load. Headless sim via runSim().
(function(){
const TILE=24,CELL=24; // building grid = path grid
const DIFF={easy:{name:'קל',hp:.8,cnt:.75,res:1.3,gap:1.25},normal:{name:'רגיל',hp:1.1,cnt:1.45,res:1,gap:.92},hard:{name:'קשה',hp:1.15,cnt:1.55,res:.95,gap:.9},veteran:{name:'ותיק',hp:1.3,cnt:1.85,res:.85,gap:.82}};
function rng(seed){let s=seed>>>0||1;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0,((s^s>>>14)>>>0)/4294967296));}
const d2=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function Game(sc,stage,diffKey,seed,headless){
 const G=this;G.sc=sc;G.st=stage;G.D=Object.assign({},DIFF[diffKey]);const K=stage.k||1;G.D.cnt*=K;G.D.hp*=Math.sqrt(K);G.diff=diffKey;G.seed=seed;G.rnd=rng(seed);G.t=0;G.over=null;G.headless=headless;
 G.W=stage.W*2*CELL;G.H=stage.H*2*CELL;G.gw=G.W/CELL|0;G.gh=G.H/CELL|0; // stage W/H given in 48px units
 G.res=Math.round(stage.startRes*G.D.res);G.ents=[];G.shots=[];G.fx=[];G.sel=[];G.q={build:null,unit:[]};G.place=null;G.wave=0;
 G.nextWave=stage.firstWave*G.D.gap*60;G.stats={kills:0,losses:0,harv:0};G.air={cd:0,strikes:[]};G.foeAirT=(sc.air.foe.every*60)|0;G.ev=[];G.uid=1;
 const R=rng(seed*31+stage.id);G.rock=new Uint8Array(G.gw*G.gh);
 const bx=6*CELL,by=G.H/2-2*CELL; // player base top-left
 // resource fields: near base + spread
 G.fields=[];const fp=[[bx+260,by-200],[bx+240,by+300],[bx+380,by+60],[G.W*.38,G.H*.25],[G.W*.4,G.H*.75],[G.W*.55,G.H*.5],[G.W*.68,G.H*.2],[G.W*.7,G.H*.8]];
 fp.forEach((p,i)=>G.fields.push({x:p[0],y:p[1],r:50,amt:i<3?2200:1500,max:i<3?2200:1500}));
 // rock clusters (blocked cells), kept off base, fields and enemy base
 const keep=[{x:bx+60,y:by+60,r:330},...G.fields.map(f=>({x:f.x,y:f.y,r:90})),...(stage.foeBase||[]).map(b=>({x:b[1]*CELL+40,y:b[2]*CELL+40,r:160}))];
 const MK=(typeof MAPS!=='undefined')&&MAPS[stage.map];
 if(MK){for(let y=0;y<G.gh;y++)for(let x=2;x<G.gw-2;x++){const mx=Math.min(MK.w-1,x*MK.w/G.gw|0),my=Math.min(MK.h-1,y*MK.h/G.gh|0);if(MK.m[my*MK.w+mx]!=='1')continue;const p={x:x*CELL+12,y:y*CELL+12};if(keep.some(k=>d2(k,p)<k.r))continue;G.rock[y*G.gw+x]=1;}}
 else{const nClust=Math.round(G.gw*G.gh/260);
 for(let i=0;i<nClust;i++){let cx=R()*G.gw|0,cy=R()*G.gh|0;const len=3+R()*9|0;for(let k=0;k<len;k++){cx+=(R()*3|0)-1;cy+=(R()*3|0)-1;for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const x=cx+dx,y=cy+dy;if(x<2||y<0||x>=G.gw-2||y>=G.gh)continue;const p={x:x*CELL+12,y:y*CELL+12};if(keep.some(k=>d2(k,p)<k.r))continue;G.rock[y*G.gw+x]=1;}}}}
 G.addB('hq',bx,by,'me',true);G.addB('depot',bx,by+5*CELL,'me',true);
 G.addU('truck','me',bx+150,by+60);G.addU('shot','me',bx+170,by-10);G.addU('shot','me',bx+190,by+30);G.addU('jeep','me',bx+160,by+100);
 (stage.foeBase||[]).forEach(b=>{const e=G.addB(b[0],b[1]*2*CELL/2*1,b[2]*CELL,'foe',true);});
 // foe base coords in scenarios are in 48px units for x? normalise: treat as fraction of map
 G.ents.filter(e=>e.kind==='b'&&e.side==='foe').forEach((e,i)=>{const b=stage.foeBase[i];e.x=Math.min(G.W-e.w-CELL,Math.round(b[1]/stage.W*G.W/CELL)*CELL);e.y=Math.min(G.H-e.h-CELL,Math.round(b[2]/stage.H*G.H/CELL)*CELL);e.cx=e.x+e.w/2;e.cy=e.y+e.h/2;e.spawnT=600+i*240;});
 G.ents.filter(e=>e.kind==='b'&&e.side==='foe').forEach(b=>{const n=Math.round((stage.garrison||2)*G.D.cnt);for(let i=0;i<n;i++){const a=i/n*6.283;const u=G.addU(i%3?'t62':'t55','foe',b.cx+Math.cos(a)*(b.w/2+40),b.cy+Math.sin(a)*(b.h/2+40));u.state='guard';u.post={x:u.x,y:u.y};}});
 G.rebuildGrid();
 G.vis=new Uint8Array(G.gw*G.gh);G.seen=new Uint8Array(G.gw*G.gh);G.updFog();
}
const P=Game.prototype;
P.addB=function(type,x,y,side,instant){const d=this.sc.buildings[type];const hp=d.hp*(side==='foe'?this.D.hp*(d.foeHp||2.5):1);const b={id:this.uid++,kind:'b',type,def:d,x,y,w:d.w*TILE,h:d.h*TILE,side,hp,max:hp,dep:instant?1:0};b.cx=x+b.w/2;b.cy=y+b.h/2;this.ents.push(b);this.gridDirty=1;return b;};
P.addU=function(type,side,x,y){const d=this.sc.units[type];const hp=d.hp*(side==='foe'?this.D.hp:1);const u={id:this.uid++,kind:'u',type,def:d,side,x,y,hp,max:hp,ang:side==='foe'?Math.PI:0,cd:0,load:0,tgt:null,mv:null,path:null,state:d.harv?'harvest':'idle'};this.ents.push(u);return u;};
P.pos=e=>e.kind==='b'?{x:e.cx,y:e.cy}:e;
P.has=function(t){return this.ents.some(e=>e.kind==='b'&&e.side==='me'&&e.type===t&&e.dep>=1);};
P.buildTime=c=>c*0.12*60/10;
P.unlocked=function(t){return !this.st.unlock||this.st.unlock.includes(t);};
P.queueBuild=function(t){const d=this.sc.buildings[t];if(this.q.build||this.res<d.cost)return false;this.res-=d.cost;this.q.build={t,p:0,need:this.buildTime(d.cost)*1.5,done:false};return true;};
P.queueUnit=function(t){const d=this.sc.units[t];if(!this.unlocked(t)||!this.has(d.from)||this.res<d.cost||this.q.unit.length>=5)return false;this.res-=d.cost;this.q.unit.push({t,p:0,need:this.buildTime(d.cost)});return true;};
// ---- grid / pathfinding ----
P.rebuildGrid=function(){const G=this;G.block=new Uint8Array(G.rock);for(const e of G.ents)if(e.kind==='b'){const x0=e.x/CELL|0,y0=e.y/CELL|0,x1=Math.ceil((e.x+e.w)/CELL),y1=Math.ceil((e.y+e.h)/CELL);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(x>=0&&y>=0&&x<G.gw&&y<G.gh)G.block[y*G.gw+x]=2;}G.gridDirty=0;};
P.free=function(x,y){return x>=0&&y>=0&&x<this.gw&&y<this.gh&&!this.block[y*this.gw+x];};
P.findPath=function(sx,sy,tx,ty){const G=this,gw=G.gw,gh=G.gh;let s=[sx/CELL|0,sy/CELL|0],t=[Math.max(0,Math.min(gw-1,tx/CELL|0)),Math.max(0,Math.min(gh-1,ty/CELL|0))];
 if(!G.free(t[0],t[1])){let best=null,bd=1e9;for(let r=1;r<8&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=t[0]+dx,y=t[1]+dy;if(G.free(x,y)){const dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=[x,y];}}}if(!best)return null;t=best;}
 const N=gw*gh,g=new Float32Array(N).fill(1e9),came=new Int32Array(N).fill(-1),closed=new Uint8Array(N);const si=s[1]*gw+s[0],ti=t[1]*gw+t[0];g[si]=0;
 const heap=[[0,si]];const push=(f,i)=>{heap.push([f,i]);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
 let it=0;while(heap.length&&it++<25000){const [,i]=pop();if(i===ti)break;if(closed[i])continue;closed[i]=1;const x=i%gw,y=i/gw|0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(!G.free(nx,ny)&&!(nx*1+ny*gw===ti))continue;if(dx&&dy&&(!G.free(x+dx,y)||!G.free(x,y+dy)))continue;const ni=ny*gw+nx;const ng=g[i]+(dx&&dy?1.414:1);if(ng<g[ni]){g[ni]=ng;came[ni]=i;push(ng+Math.hypot(nx-t[0],ny-t[1]),ni);}}}
 if(came[ti]<0&&ti!==si)return null;const path=[];let c=ti;while(c!==si&&c>=0){path.push({x:(c%gw)*CELL+12,y:(c/gw|0)*CELL+12});c=came[c];}path.reverse();
 // smooth: drop waypoints with clear line of sight
 const out=[];let a={x:sx,y:sy};for(let k=0;k<path.length;k++){if(k===path.length-1||!G.los(a,path[k+1])){out.push(path[k]);a=path[k];}}if(out.length)out[out.length-1]={x:tx,y:ty};return out;};
P.los=function(a,b){const n=Math.ceil(d2(a,b)/10);for(let i=1;i<n;i++){const x=(a.x+(b.x-a.x)*i/n)/CELL|0,y=(a.y+(b.y-a.y)*i/n)/CELL|0;if(!this.free(x,y))return false;}return true;};
P.goTo=function(u,x,y){u.path=this.findPath(u.x,u.y,x,y)||[{x,y}];u.goal={x,y};};
P.follow=function(u){if(!u.path||!u.path.length)return true;const w=u.path[0];if(this.moveTo(u,w.x,w.y,u.path.length===1?3:10))u.path.shift();return !u.path.length;};
P.moveTo=function(u,tx,ty,eps=3){const dx=tx-u.x,dy=ty-u.y,d=Math.hypot(dx,dy);if(d<eps)return true;const a=Math.atan2(dy,dx);let da=a-u.ang;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;u.ang+=Math.max(-.14,Math.min(.14,da));
 if(Math.abs(da)<1.1){const nx=u.x+Math.cos(u.ang)*u.def.spd,ny=u.y+Math.sin(u.ang)*u.def.spd;if(this.free(nx/CELL|0,ny/CELL|0)){u.x=nx;u.y=ny;}else{u.x+=Math.cos(a)*u.def.spd*.5;u.y+=Math.sin(a)*u.def.spd*.5;}}return false;};
P.canPlace=function(t,x,y){const G=this,d=G.sc.buildings[t],w=d.w*TILE,h=d.h*TILE;if(x<0||y<0||x+w>G.W||y+h>G.H)return false;
 for(let yy=y/CELL|0;yy<(y+h)/CELL;yy++)for(let xx=x/CELL|0;xx<(x+w)/CELL;xx++)if(G.block[yy*G.gw+xx])return false;
 if(G.ents.some(e=>e.kind==='u'&&e.x>x-6&&e.x<x+w+6&&e.y>y-6&&e.y<y+h+6))return false;
 if(G.fields.some(f=>f.x>x-30&&f.x<x+w+30&&f.y>y-30&&f.y<y+h+30))return false;
 return G.ents.some(e=>e.kind==='b'&&e.side==='me'&&Math.hypot(e.cx-(x+w/2),e.cy-(y+h/2))<260);};
P.placeBuild=function(x,y){const b=this.q.build;if(!b||!b.done)return false;x=Math.floor(x/TILE)*TILE;y=Math.floor(y/TILE)*TILE;if(!this.canPlace(b.t,x,y))return false;this.addB(b.t,x,y,'me');this.q.build=null;this.emit('build');return true;};
P.emit=function(k,x,y,id,t){if(!this.headless)this.ev.push({k,x,y,id,t});};
P.spawnWave=function(){const G=this;G.wave++;const n=Math.round((2+G.wave*1.6)*G.D.cnt);const mix=G.st.mix;const comp=mix[Math.min(mix.length-1,Math.floor((G.wave-1)/Math.max(1,G.st.waves/mix.length)))];
 const fb=G.ents.filter(e=>e.kind==='b'&&e.side==='foe');
 for(let i=0;i<n;i++){let x,y;if(fb.length){const b=fb[i%fb.length];x=b.x-20-G.rnd()*30;y=b.cy+(G.rnd()-.5)*80;}else{x=G.W-30-G.rnd()*60;y=G.H*.15+G.rnd()*G.H*.7;}
  if(!G.free(x/CELL|0,y/CELL|0)){x=G.W-30;}const u=G.addU(comp[i%comp.length],'foe',x,y);u.state='attack';}
 G.nextWave=G.wave>=G.st.waves?Infinity:G.st.waveGap*G.D.gap*60;G.msg&&G.msg(`גל ${G.wave} מתוך ${G.st.waves}: ${n} כלי אויב מתקדמים!`);G.emit('alert');};
P.nearestEnemy=function(u,r){let best=null,bd=r;for(const e of this.ents){if(e.side===u.side||e.hp<=0)continue;const p=this.pos(e);const d=d2(u,p)-(e.kind==='b'?e.w/2:0);if(d<bd){bd=d;best=e;}}return best;};
P.dropAt=function(u){let best=null,bd=1e9;for(const e of this.ents)if(e.kind==='b'&&e.side==='me'&&e.dep>=1&&(e.def.drop||e.type==='hq')){const d=d2(u,{x:e.cx,y:e.cy});if(d<bd){bd=d;best=e;}}return best;};
P.damage=function(t,dmg){const G=this;if(t.hp<=0)return;t.hp-=dmg;if(t.hp<=0){const p=G.pos(t);G.fx.push({x:p.x,y:p.y,r:t.kind==='b'?60:26,t:0,d:40,big:1});G.emit(t.kind==='b'?'bigboom':'boom',p.x,p.y);if(t.side==='foe')G.stats.kills++;else G.stats.losses++;if(t.kind==='b')G.gridDirty=1;}};
P.airStrike=function(x,y){const G=this,A=G.sc.air.me;if(!G.st.air||G.air.cd>0||G.res<A.cost)return false;G.res-=A.cost;G.air.cd=A.cd*60;G.air.strikes.push({side:'me',x:-80,y,tx:x,ty:y,vx:9,done:0,img:G.rnd()<.5?A.img:G.sc.air.alt});G.emit('jet');return true;};
P.step=function(){const G=this;if(G.over)return;G.t++;
 if(G.gridDirty)G.rebuildGrid();
 if(--G.nextWave<=0)G.spawnWave();
 if(G.air.cd>0)G.air.cd--;
 if(G.st.foeAir&&--G.foeAirT<=0){G.foeAirT=G.sc.air.foe.every*60*G.D.gap|0;const tg=G.ents.filter(e=>e.side==='me'&&e.kind==='u'&&!e.def.harv);if(tg.length){const t=tg[G.rnd()*tg.length|0];G.air.strikes.push({side:'foe',x:G.W+80,y:t.y,tx:t.x,ty:t.y,vx:-8,done:0,img:G.sc.air.foe.img});G.msg&&G.msg('⚠ מיג-21 בשמיים! פזרו את הכוח');G.emit('jet');}}
 for(const s of G.air.strikes){s.x+=s.vx;if(!s.done&&Math.abs(s.x-s.tx)<10){s.done=1;if(s.side==='me'&&G.ents.some(e=>e.type==='sam'&&e.side==='foe'&&d2({x:e.cx,y:e.cy},{x:s.tx,y:s.ty})<480)){G.msg&&G.msg('🚀 סוללת טילים יירטה את התקיפה! השמידו את סוללות ה-SAM');G.fx.push({x:s.tx,y:s.ty-40,r:30,t:0,d:30,big:1});continue;}const A=s.side==='me'?G.sc.air.me:G.sc.air.foe;for(const e of G.ents)if(e.side!==s.side&&d2(G.pos(e),{x:s.tx,y:s.ty})<A.r+(e.kind==='b'?e.w/2:0))G.damage(e,A.dmg*(s.side==='foe'?G.D.hp:1)*(e.kind==='b'?.6:1));for(let k=0;k<5;k++)G.fx.push({x:s.tx+(G.rnd()-.5)*A.r,y:s.ty+(G.rnd()-.5)*A.r,r:30,t:-k*3,d:36,big:1});G.emit('bigboom',s.tx,s.ty);}}
 G.air.strikes=G.air.strikes.filter(s=>s.x>-200&&s.x<G.W+200);
 if(G.q.build&&!G.q.build.done&&++G.q.build.p>=G.q.build.need){G.q.build.done=true;G.emit('ready');}
 const uq=G.q.unit[0];if(uq&&++uq.p>=uq.need){G.q.unit.shift();const from=G.ents.find(e=>e.kind==='b'&&e.side==='me'&&e.type===G.sc.units[uq.t].from);if(from){const u=G.addU(uq.t,'me',from.x+from.w+14,from.cy);G.emit('unit');if(!u.def.harv)G.goTo(u,from.x+from.w+60+G.rnd()*40,from.cy+(G.rnd()-.5)*80);}}
 // enemy factories produce raiders
 for(const b of G.ents)if(b.kind==='b'&&b.side==='foe'&&b.type==='factory'&&--b.spawnT<=0){b.spawnT=(1500/G.D.cnt)|0;const u=G.addU(G.rnd()<.5?'t55':'t62','foe',b.x-16,b.cy);u.state='attack';}
 for(const e of G.ents){if(e.kind==='b'){if(e.dep<1)e.dep=Math.min(1,e.dep+.02);continue;}G.unitAI(e);}
 for(const p of G.shots){p.x+=p.vx;p.y+=p.vy;p.life--;if(p.life<=0){G.damage(p.tgt,p.dmg*(p.tgt.kind==='b'?.5:1));G.fx.push({x:p.x,y:p.y,r:9,t:0,d:12});}}
 G.shots=G.shots.filter(p=>p.life>0);G.fx.forEach(f=>f.t++);G.fx=G.fx.filter(f=>f.t<f.d);
 G.ents=G.ents.filter(e=>e.hp>0);G.sel=G.sel.filter(e=>e.hp>0);
 if(G.t%10===0&&!G.headless)G.updFog();
 const foes=G.ents.filter(e=>e.side==='foe');
 if(!G.ents.some(e=>e.side==='me'&&e.type==='hq'))G.over='lose';
 else if(G.st.obj==='hold'&&G.wave>=G.st.waves&&!foes.length)G.over='win';
 else if(G.st.obj==='kills'&&G.stats.kills>=G.st.kills)G.over='win';
 else if(G.st.obj==='kills'&&G.wave>=G.st.waves&&!foes.length)G.over=G.stats.kills>=G.st.kills?'win':'lose';
 else if(G.st.obj==='destroy'&&!foes.some(e=>e.kind==='b'))G.over='win';
};
P.updFog=function(){const G=this;G.vis.fill(0);for(const e of G.ents){if(e.side!=='me')continue;const p=G.pos(e),r=(e.def.sight||7)+(e.kind==='b'?e.w/CELL/2:0);const cx=p.x/CELL|0,cy=p.y/CELL|0,R=Math.ceil(r);
 for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){if(dx*dx+dy*dy>r*r)continue;const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=G.gw||y>=G.gh)continue;const i=y*G.gw+x;G.vis[i]=1;G.seen[i]=1;}}};
P.visible=function(x,y){return this.vis[(y/CELL|0)*this.gw+(x/CELL|0)];};
P.unitAI=function(u){const G=this,d=u.def;if(u.cd>0)u.cd--;
 if(u.side==='me'&&u.hp<u.max&&G.t%20===0&&u.cd<=0){const rb=G.ents.find(b=>b.kind==='b'&&b.side==='me'&&b.dep>=1&&(b.type==='hq'||b.def.drop)&&d2(u,{x:b.cx,y:b.cy})<b.w/2+90);if(rb){u.hp=Math.min(u.max,u.hp+u.max*.01);if(u.repairing&&u.hp>=u.max){u.repairing=0;G.emit('say',u.x,u.y,u.id,'fixed');}}}
 if(d.harv){
  if(u.path&&u.path.length&&u.manual){if(G.follow(u))u.manual=0;return;}
  if(u.state==='harvest'){if(u.load>=d.cap){u.state='return';u.path=null;return;}let f=u.field;if(!f||f.amt<=0){f=u.field=G.fields.filter(f=>f.amt>0).sort((a,b)=>d2(u,a)-d2(u,b))[0];u.path=null;if(!f)return;}
   if(d2(u,f)>f.r*.6){if(!u.path)G.goTo(u,f.x,f.y);G.follow(u);if(!u.path.length)u.path=null;}else{u.path=null;const take=Math.min(.8,f.amt,d.cap-u.load);u.load+=take;f.amt-=take;}}
  else{const dp=G.dropAt(u);if(!dp)return;if(d2(u,{x:dp.cx,y:dp.cy})>dp.w/2+22){if(!u.path)G.goTo(u,dp.cx,dp.cy+dp.h/2+10);G.follow(u);if(!u.path.length)u.path=null;}else{u.path=null;G.res+=Math.round(u.load*1.5);G.stats.harv+=u.load;u.load=0;u.state='harvest';}}
  return;}
 let t=u.tgt&&u.tgt.hp>0?u.tgt:null;if(!t)u.tgt=null;
 if(!t&&!u.mv)t=G.nearestEnemy(u,u.state==='guard'?300:u.side==='foe'?230:d.rng+50);if(t&&u.state==='guard'&&u.post&&d2(u,u.post)>420){t=null;u.tgt=null;}if(!t&&u.mv&&u.amove)t=G.nearestEnemy(u,d.rng+20);
 if(t){const p=G.pos(t);const dist=d2(u,p)-(t.kind==='b'?Math.min(t.w,t.h)/2:0);u.tur=Math.atan2(p.y-u.y,p.x-u.x);
  if(dist<=d.rng){u.path=null;if(u.cd<=0){u.cd=d.rof;const sp=8,a=u.tur,len=d2(u,p);G.shots.push({x:u.x+Math.cos(a)*14,y:u.y+Math.sin(a)*14,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:Math.max(1,len/sp|0),dmg:d.dmg*(0.85+G.rnd()*.3),tgt:t,side:u.side});if(G.headless||G.visible(u.x,u.y))G.emit('shot',u.x,u.y);}
   let da=u.tur-u.ang;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;u.ang+=Math.max(-.06,Math.min(.06,da));return;}
  if(!u.mv||u.tgt){if(!u.path||(G.t+u.id)%60===0)G.goTo(u,p.x,p.y);G.follow(u);return;}}
 if(u.mv){if(!u.path)G.goTo(u,u.mv.x,u.mv.y);if(G.follow(u)){u.mv=null;u.path=null;}return;}
 if(u.state==='guard'&&u.post&&d2(u,u.post)>30){if(!u.path)G.goTo(u,u.post.x,u.post.y);if(G.follow(u))u.path=null;}
 if(u.side==='foe'&&u.state==='attack'){const hq=G.ents.find(e=>e.side==='me'&&e.type==='hq')||G.ents.find(e=>e.side==='me');if(hq){const p=G.pos(hq);if(!u.path||(G.t+u.id)%240===0)G.goTo(u,p.x,p.y);G.follow(u);}}
 for(const o of G.ents)if(o!==u&&o.kind==='u'&&Math.abs(o.x-u.x)<16&&Math.abs(o.y-u.y)<16){const a=Math.atan2(u.y-o.y,u.x-o.x)||G.rnd()*6;const nx=u.x+Math.cos(a)*.6,ny=u.y+Math.sin(a)*.6;if(G.free(nx/CELL|0,ny/CELL|0)){u.x=nx;u.y=ny;}}
};
// ---- save / load ----
P.serialize=function(){const G=this;return JSON.stringify({sc:G.sc.id,st:G.st.id,diff:G.diff,seed:G.seed,t:G.t,res:G.res,wave:G.wave,nextWave:G.nextWave===Infinity?-1:G.nextWave,stats:G.stats,q:G.q,air:{cd:G.air.cd},foeAirT:G.foeAirT,uid:G.uid,
 fields:G.fields.map(f=>f.amt),seen:Array.from(G.seen).join(''),ents:G.ents.map(e=>({post:e.post,atk:e.atk,id:e.id,kind:e.kind,type:e.type,side:e.side,x:e.x,y:e.y,hp:e.hp,max:e.max,dep:e.dep,ang:e.ang,load:e.load,state:e.state,spawnT:e.spawnT,mv:e.mv,amove:e.amove}))});};
Game.load=function(str){const o=JSON.parse(str);const sc=SCENARIOS.find(s=>s.id===o.sc),st=sc.stages.find(s=>s.id===o.st);const G=new Game(sc,st,o.diff,o.seed,false);
 Object.assign(G,{t:o.t,res:o.res,wave:o.wave,nextWave:o.nextWave<0?Infinity:o.nextWave,stats:o.stats,q:o.q,foeAirT:o.foeAirT,uid:o.uid});G.air.cd=o.air.cd;o.fields.forEach((a,i)=>G.fields[i]&&(G.fields[i].amt=a));
 for(let i=0;i<o.seen.length;i++)G.seen[i]=+o.seen[i];
 G.ents=o.ents.map(e=>{const d=e.kind==='b'?sc.buildings[e.type]:sc.units[e.type];const n=Object.assign({},e,{def:d,tgt:null,path:null,cd:0});if(e.kind==='b'){n.w=d.w*TILE;n.h=d.h*TILE;n.cx=e.x+n.w/2;n.cy=e.y+n.h/2;}return n;});G.rebuildGrid();G.updFog();return G;};
// ---- player bot for balance sims ----
P.bot=function(){const G=this;if(G.t%30)return;const me=G.ents.filter(e=>e.side==='me'&&e.kind==='u');const trucks=me.filter(u=>u.def.harv).length;const army=me.filter(u=>!u.def.harv);
 const hq=G.ents.find(e=>e.type==='hq'&&e.side==='me');if(!hq)return;
 if(G.q.build&&G.q.build.done){for(let i=0;i<80;i++){const x=hq.x-60+G.rnd()*300,y=hq.y-220+G.rnd()*440;if(G.placeBuild(x,y))break;}}
 const best=G.unlocked('magach')?'magach':'shot';
 if(!G.has('factory')&&!G.q.build)G.queueBuild('factory');
 else if(G.has('factory')&&trucks<3)G.queueUnit('truck');
 else if(G.ents.filter(e=>e.type==='depot'&&e.side==='me').length<2&&!G.q.build&&G.res>500)G.queueBuild('depot');
 else if(G.has('factory'))G.queueUnit(G.rnd()<.55?best:'tiran');else G.queueUnit('jeep');
 // air: hit biggest foe cluster near base
 if(G.st.air&&G.air.cd<=0&&G.res>G.sc.air.me.cost){const f=G.ents.filter(e=>e.side==='foe'&&e.kind==='u'&&d2(e,{x:hq.cx,y:hq.cy})<700);if(f.length>=4)G.airStrike(f[0].x,f[0].y);}
 const foeB=G.ents.filter(e=>e.side==='foe'&&e.kind==='b');const H={x:hq.cx,y:hq.cy};
 const threat=G.ents.some(e=>e.side==='foe'&&e.kind==='u'&&d2(e,H)<650);
 if(G.st.obj==='destroy'&&foeB.length){
  const tb=foeB.slice().sort((a,b)=>(b.type==='sam')-(a.type==='sam')||d2({x:a.cx,y:a.cy},H)-d2({x:b.cx,y:b.cy},H))[0];const T={x:tb.cx,y:tb.cy};
  const rally={x:H.x+(T.x-H.x)*.3,y:H.y+(T.y-H.y)*.3};
  const idle=army.filter(u=>!u.atk);const need=Math.round(9+5*G.D.cnt);
  if(G.st.air&&G.air.cd<=0&&G.res>G.sc.air.me.cost+200&&!threat&&!foeB.some(e=>e.type==='sam'))G.airStrike(T.x,T.y);
  if(threat)idle.forEach(u=>{if(!u.tgt){u.mv=null;u.path=null;u.tgt=G.nearestEnemy(u,800);}});
  else if(idle.length>=need){idle.forEach(u=>{u.atk=1;u.tgt=null;u.mv={x:T.x-60,y:T.y};u.amove=true;u.path=null;});}
  else idle.filter(u=>!u.mv&&!u.tgt&&d2(u,rally)>120).forEach(u=>{u.mv={x:rally.x+(G.rnd()-.5)*160,y:rally.y+(G.rnd()-.5)*160};u.amove=true;u.path=null;});
  army.filter(u=>u.atk&&!u.mv&&!u.tgt).forEach(u=>{u.tgt=tb;});
 } else army.filter(u=>!u.mv&&!u.tgt&&!G.nearestEnemy(u,220)).forEach(u=>{u.mv={x:hq.cx+150+G.rnd()*140,y:hq.cy+(G.rnd()-.5)*320};u.amove=true;u.path=null;});
};
const root=typeof window!=='undefined'?window:globalThis;
root.runSim=function(diff,seed,stageId=1,maxSec=1500){const sc=SCENARIOS.find(s=>s.id==='yk1973');const G=new Game(sc,sc.stages.find(s=>s.id===stageId),diff,seed,true);while(!G.over&&G.t<maxSec*60){G.bot();G.step();}
 return {diff,seed,stage:stageId,result:G.over||'timeout',sec:Math.round(G.t/60),wave:G.wave,kills:G.stats.kills,losses:G.stats.losses};};
root.DIFF=DIFF;root.Game=Game;root.RTS_CONST={TILE,CELL};
})();
