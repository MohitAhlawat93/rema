import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.txt':'text/plain'};
http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+name);if(file!==root&&!file.startsWith(root+path.sep))throw new Error('Bad path');if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404,{'Content-Type':'text/html'});res.end(await readFile(path.join(root,'404.html')));}}).listen(3000,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:3000'));
