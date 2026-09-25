import fs from 'node:fs';
import path from 'node:path';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}
const htmlFiles=walk('dist').filter(f=>f.endsWith('.html')).sort();
const errors=[];
let checked=0;

for(const file of htmlFiles){
  const body=fs.readFileSync(file,'utf8');
  const attrs=[...body.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]);
  for(const raw of attrs){
    if(!raw||raw.startsWith('#')||raw.startsWith('data:')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:')||/^https?:\/\//i.test(raw)||raw.startsWith('//')) continue;
    checked++;
    const clean=raw.split('#')[0].split('?')[0];
    if(!clean) continue;
    let target;
    if(clean.startsWith('/')) target=path.join('dist',clean.slice(1));
    else target=path.resolve(path.dirname(file),clean);
    if(target.endsWith(path.sep)) target=path.join(target,'index.html');
    if(fs.existsSync(target)&&fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
    if(!fs.existsSync(target)){
      errors.push(`${file} broken internal link ${raw} -> ${path.relative('.',target)}`);
    }
  }
}
if(!htmlFiles.length) errors.push('no HTML files found under dist');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Static Link Integrity Gate: FAIL');
  process.exit(1);
}
console.log(`RDX Static Link Integrity Gate: PASS (html=${htmlFiles.length}, links=${checked})`);
