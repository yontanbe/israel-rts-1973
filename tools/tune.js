global.window=global;require('../scenarios.js');require('../engine.js');
const sc=SCENARIOS[2],N=10,out={};
const wins=(st,d)=>{let w=0;for(let s=1;s<=N;s++)if(runSim(d,s*7919,st.id).result==='win')w++;return w;};
for(const id of (process.argv[2]||'2,3,4,5,6,7,8,9,10').split(',').map(Number)){const st=sc.stages[id-1];let lo=0.3,hi=2.5;
 for(let i=0;i<6;i++){st.k=(lo+hi)/2;const w=wins(st,'normal');if(w>6)lo=st.k;else if(w<5)hi=st.k;else break;}
 const r=Object.keys(DIFF).map(d=>wins(st,d));out[id]=+st.k.toFixed(3);console.log('stage',id,'k',out[id],r.join(' '));}
console.log(JSON.stringify(out));
