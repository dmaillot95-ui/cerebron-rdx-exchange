import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}

const htmlFiles=walk('dist')
  .filter(file=>file.endsWith('.html'))
  .sort();

const errors=[];
let inlineScriptCount=0;
for(const file of htmlFiles){
  const body=fs.readFileSync(file,'utf8');
  const scripts=[...body.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  inlineScriptCount+=scripts.length;
  scripts.forEach((source,i)=>{
    try{
      new vm.Script(source,{filename:`${file}#inline-script-${i+1}`});
    }catch(e){
      errors.push(`${file} inline script ${i+1} syntax error: ${e.message}`);
    }
  });
}
if(!htmlFiles.length) errors.push('no HTML files found under dist');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Browser JS Syntax Gate: FAIL');
  process.exit(1);
}
console.log(`RDX Browser JS Syntax Gate: PASS (html=${htmlFiles.length}, inline_scripts=${inlineScriptCount})`);
