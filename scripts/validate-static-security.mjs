import fs from 'node:fs';
import path from 'node:path';

const requiredCsp="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const requiredReferrer='strict-origin-when-cross-origin';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}

const htmlFiles=walk('dist').filter(f=>f.endsWith('.html')).sort();
const errors=[];
for(const file of htmlFiles){
  const body=fs.readFileSync(file,'utf8');
  const cspMatch=body.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>(?:<\/meta>)?/i);
  if(!cspMatch){errors.push(file+' missing CSP meta');continue}
  const policy=cspMatch[1];
  for(const directive of ["default-src 'self'","style-src 'self' 'unsafe-inline'","script-src 'self' 'unsafe-inline'","img-src 'self' data:","connect-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'"]){
    if(!policy.includes(directive)) errors.push(file+' CSP missing '+directive);
  }
  const ref=body.match(/<meta\s+name="referrer"\s+content="([^"]+)"\s*\/?>(?:<\/meta>)?/i)?.[1];
  if(ref!==requiredReferrer) errors.push(file+' referrer policy mismatch');
}
if(fs.existsSync('vercel.json')){
  try{
    const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));
    const headers=(v.headers||[]).find(h=>h.source==='/(.*)')?.headers||[];
    const vcsp=headers.find(h=>h.key==='Content-Security-Policy')?.value||'';
    for(const directive of requiredCsp.split(';').map(x=>x.trim()).filter(Boolean)){
      if(!vcsp.includes(directive)) errors.push('vercel CSP missing '+directive);
    }
    const vr=headers.find(h=>h.key==='Referrer-Policy')?.value||'';
    if(vr!==requiredReferrer) errors.push('vercel Referrer-Policy mismatch');
  }catch(e){errors.push('invalid vercel.json: '+e.message)}
}else errors.push('missing vercel.json');

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Static Security Policy Gate: FAIL');
  process.exit(1);
}
console.log(`RDX Static Security Policy Gate: PASS (html=${htmlFiles.length})`);
