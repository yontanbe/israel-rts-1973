// Landing page, account dialogs and profile panel. Talks to ACC (account.js) and to the game menu in ui.js.
(function(){
const $=id=>document.getElementById(id);const SC=SCENARIOS.find(s=>s.id==='yk1973');
const SHOTS=[['assets/shots/s1.jpg','שלב 1: הבלימה ברמת הגולן'],['assets/shots/s2.jpg','עמדות טנק חפורות ומחנה חי״ר'],['assets/shots/s3.jpg','לילה בגזרה הדרומית'],['assets/shots/s4.jpg','סיני: קרב השריון'],['assets/shots/s5.jpg','תדריך עם מפה'],['assets/shots/s6.jpg','ארטילריה ומכ״ם']];
let mode='reg';
function toast(t){const e=$('toast');e.textContent=t;e.classList.remove('hide');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.add('hide'),2600);}
function show(id){['home','menu','brief','end','wrap'].forEach(i=>$(i).classList.toggle('hide',i!==id));}
function goHome(){show('home');refresh();try{history.replaceState(null,'',location.pathname);}catch(e){}}
function goPlay(){show('menu');window.__menu&&window.__menu();try{history.replaceState(null,'','#play');}catch(e){}}
function refresh(){const u=ACC.user();$('hAcc').textContent=u?ACC.label():'👤 התחברות';$('hReg').classList.toggle('hide',!!u);
 const L=ACC.getJSON('last',null);const has=ACC.get('save')||ACC.get('auto');$('hCont').classList.toggle('hide',!has||!L);if(L&&has)$('hCont').textContent=`▶ המשך משלב ${L.st}`;
 const T=ACC.totals(),P=ACC.getJSON('prog',{});const mx=Math.max(1,...Object.values(P).map(Number));
 $('hStat').innerHTML=u||T.played?`<span>${u?u.name:'אורח'}</span><span>שלב ${mx} נפתח</span><span>★ ${T.stars}/30</span><span>${T.wins} ניצחונות</span><span>${T.kills} כלי אויב הושמדו</span>`:'';
 if($('who'))$('who').textContent=ACC.label();}
function openAuth(m){mode=m||'reg';$('auth').classList.remove('hide');setMode(mode);$('aErr').textContent='';const L=ACC.list();$('aList').innerHTML=L.length&&!ACC.cloud?'<div class="dim small">מפקדים במכשיר הזה:</div>'+L.map(u=>`<button data-u="${u.name.replace(/"/g,'')}">${u.name}</button>`).join(''):'';
 $('aList').querySelectorAll('button').forEach(b=>b.onclick=()=>{setMode('login');$('aName').value=b.dataset.u;$('aPass').focus();});setTimeout(()=>$('aName').focus(),50);}
function setMode(m){mode=m;$('aTabR').classList.toggle('on',m==='reg');$('aTabL').classList.toggle('on',m==='login');$('aGo').textContent=m==='reg'?'צור חשבון':'התחבר';$('aPass').autocomplete=m==='reg'?'new-password':'current-password';
 const cl=ACC.cloud;$('aEmailHint').textContent=cl?'(חובה)':'(רשות)';$('aEmail').required=cl;$('aEmailL').classList.toggle('hide',!cl&&m==='login');$('aName').parentElement.classList.toggle('hide',cl&&m==='login');$('aName').required=!(cl&&m==='login');
 $('aNote').textContent=cl?'החשבון נשמר בענן: ההתקדמות תחכה לך בכל מכשיר.':'החשבון נשמר במכשיר הזה. כדי להמשיך במכשיר אחר משתמשים בקוד העברה בפרופיל.';}
async function submit(ev){ev.preventDefault();$('aErr').textContent='';$('aGo').disabled=true;
 try{const a={name:$('aName').value,email:$('aEmail').value.trim(),pass:$('aPass').value};const r=mode==='reg'?await ACC.register(a):await ACC.login(a);
  if(r&&r.confirm){$('aErr').textContent='נשלח אליך אימייל לאישור. אחרי האישור חוזרים לכאן ומתחברים.';setMode('login');return;}
  $('auth').classList.add('hide');$('aPass').value='';toast(mode==='reg'?`ברוך הבא, ${ACC.user().name}!`:`שלום, ${ACC.user().name}`);refresh();}
 catch(e){$('aErr').textContent=e.message||'שגיאה';}finally{$('aGo').disabled=false;}}
function openProf(){const u=ACC.user();if(!u){openAuth('login');return;}$('prof').classList.remove('hide');$('pName').textContent=ACC.label();const T=ACC.totals();
 $('pStats').innerHTML=`<div><b>★ ${T.stars}</b>כוכבים</div><div><b>${T.wins}/${T.played}</b>ניצחונות</div><div><b>${T.kills}</b>הושמדו</div><div><b>${Math.round(T.secs/60)}</b>דקות משחק</div>`;
 $('pCode').value=ACC.exportCode();$('pVoice').checked=ACC.getSetting('voice')!==false;$('pMsg').textContent=u.cloud?(ACC.lastSync?'סונכרן לענן':'מחובר לענן'):'';}
function installHelp(){goHome();setTimeout(()=>$('install').scrollIntoView({behavior:'smooth'}),50);}
function init(){$('hIntro').textContent=SC.intro;$('hMem').textContent=SC.memorial||'';
 $('gal').innerHTML=SHOTS.map(([src,t])=>`<figure><img loading="lazy" src="${src}" alt="${t}" onerror="this.parentElement.remove()"><figcaption>${t}</figcaption></figure>`).join('');
 $('hPlay').onclick=goPlay;$('hCont').onclick=()=>{goPlay();setTimeout(()=>$('cont').click(),30);};$('hReg').onclick=()=>openAuth('reg');$('hAcc').onclick=()=>ACC.user()?openProf():openAuth('login');$('hInst').onclick=()=>window.__install();
 $('toHome').onclick=goHome;$('who').onclick=()=>ACC.user()?openProf():openAuth('login');$('bback').onclick=goPlay;
 $('aTabR').onclick=()=>setMode('reg');$('aTabL').onclick=()=>setMode('login');$('aForm').onsubmit=submit;
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hide'));
 document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.add('hide');}));
 $('pCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('pCode').value);$('pMsg').textContent='הקוד הועתק';}catch(e){$('pCode').select();document.execCommand('copy');$('pMsg').textContent='הקוד הועתק';}};
 $('pImp').onclick=()=>{const c=prompt('הדבק כאן את קוד ההתקדמות');if(!c)return;try{ACC.importCode(c);$('pMsg').textContent='ההתקדמות יובאה';openProf();refresh();}catch(e){$('pMsg').textContent=e.message;}};
 $('pVoice').onchange=()=>ACC.setSetting('voice',$('pVoice').checked);
 $('pOut').onclick=()=>{ACC.logout();$('prof').classList.add('hide');toast('יצאת מהחשבון');refresh();};
 $('pDel').onclick=()=>{if(confirm('למחוק את הפרופיל וכל ההתקדמות שלו מהמכשיר?')){ACC.remove();$('prof').classList.add('hide');refresh();}};
 ACC.onChange(refresh);refresh();if(location.hash==='#play')goPlay();else goHome();}
window.HOME={init,installHelp,goHome,goPlay,toast,refresh};
})();
