// Zero dependency static server: node tools/serve.js [port]. Opens the game at http://localhost:PORT
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),port=+(process.argv[2]||process.env.PORT||8080);
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(root,path.normalize(u).replace(/^(\.\.[\/\\])+/,''));
 if(!f.startsWith(root)){r.writeHead(403);return r.end();}
 fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('not found');}r.writeHead(200,{'Content-Type':T[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});r.end(d);});
}).listen(port,()=>console.log(`מבצע מדבר רץ על http://localhost:${port}`));
