// Scenario configs + campaign story. Engine reads SCENARIOS[]. All characters & units fictional.
window.SCENARIOS = [
 {id:'elections', name:'מערכת בחירות', desc:'שלוש מפלגות בדיוניות (כחול, אדום, ירוק) נאבקות על קולות ב-10 שלבים ברחבי הארץ.', ready:false},
 {id:'neighbors', name:'ישראל מול השכנים', desc:'בונים צבא ומגינים על הגבולות לאורך 10 שלבים.', ready:false},
 {id:'yk1973', name:'מלחמת יום הכיפורים 1973', desc:'מערכה של 10 שלבים: רמת הגולן וחזית סואץ. בלימה, החזקה, מתקפת נגד וצליחה.', ready:true,
  advisor:{name:'סא״ל אהרון גלעדי', role:'קצין המבצעים של החטיבה (דמות בדיונית)', img:'assets/s/advisor_officer.png'},
  intro:'יום כיפור, אוקטובר 1973. השקט של החג נשבר. אתה מפקד כוח שריון בדיוני, ולצידך קצין המבצעים אהרון גלעדי, ותיק ששירת בכל המלחמות הקודמות. המשימה: לבלום, להחזיק, ולהפוך את הקערה על פיה.',
  stages:[
   {id:1,name:'הגולן: הבלימה',map:'golan',k:1.09,W:56,H:36,obj:'hold',waves:6,firstWave:45,waveGap:40,startRes:600,mix:[['t55','t55','btr'],['t55','t62','btr'],['t62','t62','t55','btr']],
    unlock:['truck','jeep','shot','tiran'],
    brief:'"שקט, ואז אש. הם חוצים את הקו בכל הגזרה. אין לנו תגבורת לפני הלילה. תאסוף דלק מהשדות, תבנה מפעל שריון ותחזיק את המפקדה. אם היא נופלת, הגזרה נפתחת."',
    goal:'לעמוד ב-6 גלי שריון ולשמור על המפקדה',
    outro:'הלילה ירד על הרמה. הקו נסדק אבל לא נשבר. גלעדי מניח את המפה על מכסה הטנק: "החזקנו יום אחד. מחר הם ינסו בעמק."'},
   {id:2,name:'עמק הבכא',map:'golan',k:1.8,W:60,H:38,obj:'kills',kills:25,waves:9,firstWave:40,waveGap:34,startRes:500,mix:[['t55','t62','btr'],['t62','t62','btr'],['t62','t62','t55']],
    unlock:['truck','jeep','shot','tiran'],
    brief:'"בעמק הזה כל רכס שווה זהב. הם יבואו בגלים, ואנחנו נירה מלמעלה. כל טנק שנעצור כאן הוא טנק שלא יגיע לגליל. אל תרדפו אחריהם אל תוך העמק."',
    goal:'להשמיד 25 כלי אויב בלי לאבד את המפקדה',
    outro:'העמק מלא עשן ופלדה שרופה. בקשר נשמעת הודעה שחיכינו לה: "המילואים עולים לרמה." גלעדי מחייך לראשונה מאז הבוקר.'},
   {id:3,name:'הגזרה הדרומית: חדירה',map:'golan',k:0.99,W:64,H:40,obj:'destroy',waves:4,firstWave:60,waveGap:55,startRes:700,foeBase:[['factory',52,8],['depot',55,26],['hq',54,16]],
    mix:[['t55','btr','btr'],['t55','t62','btr']],unlock:['truck','jeep','shot','tiran'],
    brief:'"כוח אויב התבסס בגזרה הדרומית והקים בסיס הצטיידות. כל עוד המפעל שלהם עובד, הם ימשיכו לשלוח כלים. הערפל עבה: תשלח ג׳יפ סיור קודם, ואחר כך תכה בכל הכוח."',
    goal:'להשמיד את כל מבני האויב בגזרה',
    outro:'בסיס ההצטיידות שותק. בגזרה הדרומית חזר השקט, ופיקוד הצפון מעביר את החטיבה שלנו דרומה. "סיני," אומר גלעדי, "שם החול מכסה הכל."'},
   {id:4,name:'סואץ: המעוזים',map:'sinai',k:1.2,W:64,H:40,obj:'hold',waves:8,firstWave:40,waveGap:36,startRes:600,mix:[['t55','btr','btr'],['t55','t62','btr'],['t62','t62','btr','btr']],
    unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"קו המעוזים לאורך התעלה מותקף. הצוותים שם מחזיקים בציפורניים. הגיע אלינו גדוד מגח, מהיר ומדויק. נחזיק עד שכוחות המילואים ישלימו את הפריסה."',
    goal:'לעמוד ב-8 גלים בחזית התעלה',
    outro:'המעוזים קיבלו את המרווח שהיו צריכים. אבל המודיעין מדווח על ריכוז שריון גדול שמתכונן לפריצה. "הם מהמרים על הכל," אומר גלעדי.'},
   {id:5,name:'סואץ: קרב השריון',map:'sinai',k:0.75,W:68,H:42,obj:'hold',waves:10,firstWave:50,waveGap:32,startRes:700,air:true,mix:[['t55','t62','btr'],['t62','t62','t55'],['t62','t62','t62','btr']],
    unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"זה הקרב הגדול. מאות כלים מול מאות כלים. לראשונה יש לנו סיוע אווירי: פאנטום יכול לתקוף ריכוז שריון אחד בכל פעם. תשמור אותו לרגע הנכון."',
    goal:'לבלום 10 גלים. סיוע אווירי זמין (כפתור "תקיפה אווירית")',
    outro:'המתקפה הגדולה נשברה. הכף מתחילה לנטות. בצפון, החטיבות כבר נערכות למתקפת נגד, ואנחנו נקראים לחזור לרמה.'},
   {id:6,name:'הגולן: מתקפת הנגד',map:'golan',k:0.53,W:70,H:42,obj:'destroy',waves:5,firstWave:70,waveGap:50,startRes:900,air:true,foeAir:true,foeBase:[['hq',60,18],['factory',58,8],['factory',58,30],['depot',64,26]],
    mix:[['t62','t55','btr'],['t62','t62','btr']],unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"עכשיו אנחנו תוקפים. הקו הסגול מאחורינו, והבסיסים שלהם לפנינו. שים לב: למיג-21 שלהם יש עדיין שיניים. תפזר את הכוח ואל תשאיר טור צפוף."',
    goal:'להשמיד את כל מבני האויב',
    outro:'הקו נפרץ. הכוחות מתקדמים מזרחה, אל עבר הגבעות השולטות. "מי שמחזיק את הגבעות, מחזיק את הגזרה," מזכיר גלעדי.'},
   {id:7,name:'הדרך לגבעות',map:'golan',k:0.47,W:72,H:44,obj:'destroy',waves:6,firstWave:60,waveGap:45,startRes:800,air:true,foeAir:true,foeBase:[['factory',62,6],['sam',66,20],['factory',62,34],['hq',58,20]],
    mix:[['t62','t62','btr'],['t62','t62','t55','btr']],unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"שלוש עמדות מבוצרות על הגבעות. חיל האוויר השיג עליונות בשמיים, אבל על הקרקע זה עלינו. תתקוף מכמה כיוונים כדי לפצל את ההגנה."',
    goal:'להשמיד את העמדות המבוצרות על הגבעות',
    outro:'הגבעות בידינו. מהפסגה רואים את כל הגזרה. ואז מגיעה פקודה: "החטיבה עוברת לסיני. הגיע הזמן לצלוח."'},
   {id:8,name:'הצומת העיקש',map:'sinai',k:0.47,W:72,H:44,obj:'hold',waves:11,firstWave:45,waveGap:30,startRes:700,air:true,foeAir:true,mix:[['t62','t62','btr','btr'],['t62','t62','t62','t55'],['t62','t62','t62','btr','btr']],
    unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"צומת הדרכים הזה פותח את הדרך לתעלה. האויב יודע את זה ויזרוק עלינו הכל. זה הלילה הקשה ביותר של המערכה. תחזיק את הצומת עד הבוקר."',
    goal:'להחזיק את הצומת מול 11 גלים',
    outro:'עם שחר, הצומת עדיין שלנו. המחיר כבד, והשקט שאחרי הקרב כבד יותר. גלעדי שותק ארוכות ואז אומר רק: "הדרך לתעלה פתוחה."'},
   {id:9,name:'הצליחה',map:'sinai',k:0.47,W:74,H:44,obj:'destroy',waves:7,firstWave:50,waveGap:38,startRes:900,air:true,foeAir:true,foeBase:[['hq',64,20],['factory',62,8],['sam',68,32],['factory',66,28],['sam',56,12]],
    mix:[['t62','t62','btr'],['t62','t62','t62','btr']],unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"הגשר הוקם בלילה. עכשיו צריך להרחיב את ראש הגשר ולהשמיד את הבסיסים שמאיימים עליו. כל שעה שאנחנו מחזיקים כאן משנה את המלחמה."',
    goal:'להשמיד את בסיסי האויב שמעבר לתעלה',
    outro:'ראש הגשר יציב. בפעם הראשונה מזה שבועיים, היוזמה בידינו לגמרי. נותר מאמץ אחרון לפני שהמדינאים יכריזו על הפסקת אש.'},
   {id:10,name:'מעבר לתעלה',map:'sinai',k:0.31,W:80,H:48,obj:'destroy',waves:9,firstWave:55,waveGap:32,startRes:1000,air:true,foeAir:true,foeBase:[['hq',70,22],['factory',66,6],['factory',66,40],['sam',74,12],['sam',74,34],['hq',60,30]],
    mix:[['t62','t62','t55','btr'],['t62','t62','t62','btr','btr']],unlock:['truck','jeep','shot','tiran','magach'],
    brief:'"זה המאמץ האחרון. השמדת מערך הפיקוד שלהם תביא להפסקת אש בתנאים שלנו. אני גאה בכל אחד מהצוותים. עוד פעם אחת, ואז הביתה."',
    goal:'להשמיד את כל מערך הפיקוד של האויב',
    outro:'הפסקת האש נכנסת לתוקף. השקט שחוזר הוא שקט אחר. גלעדי מסיר את הכומתה: "לזכר כל מי שלא חזר." המערכה הסתיימה. תודה, מפקד.'}
  ],
  res:{name:'אספקה/דלק', icon:'⛽'},
  buildings:{
   hq:{name:'מפקדה',w:4,h:4,hp:1500,cost:0,img:'hq',sight:9},
   depot:{name:'מחסן אספקה',w:3,h:2,hp:600,cost:300,drop:true,img:'supply_depot',sight:6},
   factory:{name:'מפעל שריון',w:4,h:3,hp:900,cost:400,img:'war_factory',sight:6},
   sam:{name:'סוללת SAM',w:4,h:4,hp:700,cost:0,img:'sam_site',sight:6,foeOnly:true}
  },
  units:{
   truck:{name:'משאית אספקה',hp:150,spd:1.3,cost:250,from:'factory',harv:true,cap:100,img:'supply_truck',sz:34,face:-1},
   jeep:{name:'ג׳יפ סיור (נ״ט)',hp:120,spd:2.2,cost:150,from:'hq',dmg:9,rng:110,rof:40,img:'jeep_at',sz:30,face:-1,sight:9},
   shot:{hull:'shot',tur:'shot',name:'שוט (סנטוריון)',hp:420,spd:1.0,cost:300,from:'factory',dmg:38,rng:130,rof:70,img:'shot_centurion',sz:40,face:1},
   tiran:{hull:'tiran',tur:'tiran',name:'טירן',hp:330,spd:1.25,cost:240,from:'factory',dmg:30,rng:120,rof:60,img:'tiran',sz:36,face:1},
   magach:{hull:'magach',tur:'magach',name:'מגח (M48)',hp:380,spd:1.35,cost:320,from:'factory',dmg:36,rng:135,rof:62,img:'magach',sz:40,face:1},
   t55:{hull:'t55',tur:'t55',name:'T-55',hp:300,spd:0.9,dmg:26,rng:115,rof:70,img:'t55',sz:36,face:1,foe:true},
   t62:{hull:'t62',tur:'t62',name:'T-62',hp:380,spd:0.95,dmg:34,rng:125,rof:75,img:'t62',sz:38,face:1,foe:true},
   btr:{name:'BTR (נ״ט)',hp:160,spd:1.6,dmg:12,rng:100,rof:45,img:'btr',sz:32,face:1,foe:true,dirs:'btr8'}
  },
  air:{me:{img:'phantom',name:'פאנטום',cost:450,cd:60,dmg:260,r:80},alt:'mirage',foe:{img:'mig21',name:'מיג-21',dmg:140,r:60,every:75}}
 }
];
// ---------- v3 content: more buildings, infantry, artillery, stage dates, starting setups, night stages ----------
(function(){const S=SCENARIOS.find(s=>s.id==='yk1973');
 Object.assign(S.buildings,{
  barracks:{name:'מחנה חי״ר',w:4,h:3,hp:700,cost:250,img:'barracks',sight:6,req:'hq',tip:'מאמן חוליות נ״ט וצנחנים'},
  pillbox:{name:'עמדת טנק חפורה',w:3,h:3,hp:900,cost:420,img:'pillbox',sight:8,req:'factory',wpn:{dmg:40,rng:165,rof:72},tur:'shot',tip:'טנק בעמדה מבוצרת. יורה לבד על כל אויב בטווח'},
  radar:{name:'מכ״ם',w:3,h:3,hp:500,cost:350,img:'radar',sight:16,req:'depot',radar:true,tip:'רואה רחוק ומסמן את כל האויבים על המפה הקטנה'},
  repair:{name:'סדנת שדה',w:4,h:4,hp:850,cost:400,img:'repair_bay',sight:6,req:'factory',heal:true,tip:'מתקן כלים ומבנים בסביבה, מהר פי שלושה מהמפקדה'},
  aa:{name:'סוללת הוק',w:4,h:4,hp:650,cost:480,img:'aa_site',sight:9,req:'radar',aa:600,tip:'מיירטת מיגים בטווח רחב'},
  artillery:{name:'עמדת ארטילריה',w:3,h:3,hp:600,cost:520,img:'artillery',sight:7,req:'radar',wpn:{dmg:46,rng:330,rof:170,splash:46,arc:1,min:70},tur:'magach',turLen:1.5,tip:'ירי ארוך טווח עם רסס. צריכה מכ״ם או יחידה שרואה את המטרה'},
  airfield:{name:'מנחת',w:5,h:3,hp:700,cost:550,img:'airfield',sight:7,req:'radar',airfield:true,tip:'מקצר את זמן ההמתנה לתקיפה אווירית ומוזיל אותה'},
  fbunker:{name:'עמדה מבוצרת',w:3,h:3,hp:700,cost:0,img:'pillbox',sight:8,foeOnly:true,wpn:{dmg:30,rng:150,rof:80},tur:'t55'}
 });
 Object.assign(S.units,{
  inf:{name:'חוליית נ״ט',hp:95,spd:.85,cost:110,from:'barracks',dmg:24,rng:105,rof:66,img:'inf',inf:true,sz:22,face:1,sight:7,squad:3},
  para:{name:'צנחנים',hp:130,spd:1.05,cost:160,from:'barracks',dmg:15,rng:110,rof:30,img:'inf',inf:true,sz:22,face:1,sight:8,squad:4,beret:1},
  m113:{name:'נגמ״ש M113',hp:230,spd:1.9,cost:200,from:'factory',dmg:11,rng:110,rof:28,img:'btr',dirs:'btr8',tint:'il',sz:32,face:1,sight:9},
  m109:{hull:'magach',tur:'magach',turLen:1.55,name:'תומ״ת M109',hp:260,spd:.8,cost:420,from:'factory',dmg:44,rng:300,rof:160,splash:42,arc:1,min:70,img:'magach',sz:40,face:1},
  rpg:{name:'חוליית סאגר',hp:80,spd:.8,dmg:22,rng:110,rof:70,img:'inf',inf:true,sz:22,face:1,foe:true,squad:3}
 });
 // per stage: date and place line, buildings and extra units that open, starting setup (offsets in grid cells from the HQ), night
 const X={
  1:{date:'6 באוקטובר 1973 · 14:00',place:'רמת הגולן, הקו הסגול',B:['barracks','pillbox'],U:['inf']},
  2:{date:'7 באוקטובר 1973',place:'עמק הבכא, צפון הרמה',B:['barracks','pillbox','radar','repair'],U:['inf'],startB:[['pillbox',13,-4],['pillbox',13,6]]},
  3:{date:'7 באוקטובר 1973 · לילה',place:'הגזרה הדרומית ברמה',B:['barracks','pillbox','radar','repair'],U:['inf','m113'],night:true,startU:['m113','m113']},
  4:{date:'8 באוקטובר 1973',place:'תעלת סואץ, קו המעוזים',B:['barracks','pillbox','radar','repair','aa'],U:['inf','m113'],startB:[['pillbox',14,-6],['pillbox',15,2],['pillbox',14,9]],startU:['inf','inf']},
  5:{date:'14 באוקטובר 1973',place:'סיני, ציר הרוחב',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109'],startB:[['factory',-1,-8]]},
  6:{date:'11 באוקטובר 1973',place:'רמת הגולן, מעבר לקו הסגול',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109'],startB:[['factory',-1,-8],['radar',6,8]],startU:['m109']},
  7:{date:'12 באוקטובר 1973',place:'הגבעות השולטות במובלעת',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109'],startB:[['factory',-1,-8],['barracks',6,8]],startU:['inf','inf','inf']},
  8:{date:'16 באוקטובר 1973 · לילה',place:'סיני, צומת הדרכים ליד החווה',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109','para'],night:true,startB:[['barracks',-1,-8],['pillbox',13,-3],['pillbox',13,6]],startU:['para','para']},
  9:{date:'16 עד 18 באוקטובר 1973',place:'ראש הגשר מעבר לתעלה',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109','para'],startB:[['factory',-1,-8],['repair',6,8]],startU:['magach','magach','para']},
  10:{date:'22 באוקטובר 1973',place:'מערבית לתעלת סואץ',B:['barracks','pillbox','radar','repair','aa','artillery','airfield'],U:['inf','m113','m109','para'],startB:[['factory',-1,-8],['radar',6,8],['airfield',11,-9]],startU:['magach','m109','para','para']}
 };
 const foeX={4:['rpg'],5:['rpg'],6:['rpg'],7:['rpg'],8:['rpg'],9:['rpg'],10:['rpg']};
 const bunk={3:[['fbunker',46,20]],6:[['fbunker',52,14],['fbunker',52,26]],7:[['fbunker',54,14],['fbunker',54,28]],9:[['fbunker',58,18]],10:[['fbunker',62,16],['fbunker',62,32]]};
 S.stages.forEach(st=>{const x=X[st.id]||{};st.date=x.date;st.place=x.place;st.unlockB=['depot','factory'].concat(x.B||[]);st.unlock=st.unlock.concat(x.U||[]);st.startB=x.startB||[];st.startU=x.startU||[];st.night=!!x.night;
  if(foeX[st.id])st.mix=st.mix.map((m,i)=>i?m.concat(foeX[st.id]):m);if(bunk[st.id])st.foeBase=(st.foeBase||[]).concat(bunk[st.id]);});
 S.memorial='המשחק מוקדש לזכר 2,656 חללי מלחמת יום הכיפורים.';
})();
