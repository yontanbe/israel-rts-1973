// Builds dist/mivtza-midbar-1973.zip: the playable game + start scripts, for offline download (no Node needed to play).
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');const files=JSON.parse(sw.match(/const FILES=(\[.*?\]);/)[1]).filter(f=>f!=='./');
const extra=['sw.js','start.sh','start.bat','start.command','tools/serve.js','README.md'];const dist=path.join(root,'dist');fs.rmSync(dist,{recursive:true,force:true});
const stage=path.join(dist,'mivtza-midbar-1973');for(const f of files.concat(extra)){const to=path.join(stage,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,f),to);}
for(const f of ['start.sh','start.command'])fs.chmodSync(path.join(stage,f),0o755);
execFileSync('zip',['-qr','mivtza-midbar-1973.zip','mivtza-midbar-1973'],{cwd:dist});console.log('dist/mivtza-midbar-1973.zip',files.length+extra.length,'files');
