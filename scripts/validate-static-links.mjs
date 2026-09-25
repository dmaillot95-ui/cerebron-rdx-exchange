import fs from 'node:fs';
import path from 'node:path';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}
function targetFor(file,clean){
  let target;
  if(!clean) target=file;
  else if(clean.startsWith('/')) target=path.join('dist',clean.slice(1));
  else target=path.resolve(path.dirname(file),clean);
  if(target.endsWith(path.sep)) target=path.join(target,'index.html');
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
  return target;
}
function hasId(file,id){
  if(!fs.existsSync(file)||!file.endsWith('.html')) return false;
  const body=fs.readFileSync(file,'utf8');
  const ids=new Set([...body.matchAll(/\sid=["']([^"']+)["']/gi)].map(m=>m[1]));
  return ids.has(id);
}

const htmlFiles=walk('dist').filter(f=>f.endsWith('.html')).sort();
const errors=[];
let checked=0;
let anchorsChecked=0;

for(const file of htmlFiles){
  const body=fs.readFileSync(file,'utf8');
  const attrs=[...body.matchAll(/(href|src)=["']([^"']+)["']/gi)].map(m=>({kind:m[1].toLowerCase(),raw:m[2]}));
  for(const {kind,raw} of attrs){
    if(!raw||raw.startsWith('data:')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:')||/^https?:\/\//i.test(raw)||raw.startsWith('//')) continue;

    const hashIndex=raw.indexOf('#');
    const pathPart=(hashIndex>=0?raw.slice(0,hashIndex):raw).split('?')[0];
    const fragment=hashIndex>=0?raw.slice(hashIndex+1):'';

    if(kind==='href'&&fragment){
      anchorsChecked++;
      let id;
      try{id=decodeURIComponent(fragment)}catch{id=fragment}
      const target=targetFor(file,pathPart);
      if(!fs.existsSync(target)){
        errors.push(`${file} broken internal link ${raw} -> ${path.relative('.',target)}`);
        continue;
      }
      if(!hasId(target,id)){
        errors.push(`${file} broken fragment ${raw} -> missing id="${id}" in ${path.relative('.',target)}`);
      }
      continue;
    }

    if(raw.startsWith('#')) continue;
    checked++;
    const target=targetFor(file,pathPart);
    if(!pathPart) continue;
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
console.log(`RDX Static Link Integrity Gate: PASS (html=${htmlFiles.length}, links=${checked}, anchors=${anchorsChecked})`);
