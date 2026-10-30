global.window=global;require('./scenarios.js');require('./engine.js');
const stages=(process.argv[2]||'1').split(',').map(Number),N=+(process.argv[3]||20);
for(const st of stages){for(const d of Object.keys(DIFF)){let w=0,sec=0,to=0;for(let s=1;s<=N;s++){const r=runSim(d,s*7919,st);if(r.result==='win')w++;if(r.result==='timeout')to++;sec+=r.sec;}
 console.log(`stage ${st} ${d}: bot win ${w}/${N}${to?` (timeouts ${to})`:''}, avg ${Math.round(sec/N)}s`);}}
