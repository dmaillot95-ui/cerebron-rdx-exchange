import fs from 'node:fs';
import vm from 'node:vm';

const htmlFiles=[
  'dist/index.html',
  'dist/status.html',
  'dist/verify.html',
  'dist/dossiers/index.html'
];

const errors=[];
for(const file of htmlFiles){
  if(!fs.existsSync(file)){errors.push('missing '+file);continue}
  const body=fs.readFileSync(file,'utf8');
  const scripts=[...body.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  scripts.forEach((source,i)=>{
    try{
      new vm.Script(source,{filename:`${file}#inline-script-${i+1}`});
    }catch(e){
      errors.push(`${file} inline script ${i+1} syntax error: ${e.message}`);
    }
  });
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Browser JS Syntax Gate: FAIL');
  process.exit(1);
}
console.log('RDX Browser JS Syntax Gate: PASS');
