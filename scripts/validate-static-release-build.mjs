import fs from 'node:fs';

const errors=[];
if(!fs.existsSync('scripts/build-static-release.mjs')) errors.push('missing scripts/build-static-release.mjs');
if(!fs.existsSync('vercel.json')) errors.push('missing vercel.json');
if(fs.existsSync('vercel.json')){
  try{
    const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));
    if(v.outputDirectory!=='dist') errors.push('vercel outputDirectory must be dist');
    if(v.buildCommand!=='node scripts/build-static-release.mjs') errors.push('vercel buildCommand must use shared RDX static release builder');
    if(v.installCommand!=='') errors.push('vercel installCommand must be empty because RDX static build has no package install dependency');
  }catch(e){errors.push('invalid vercel.json: '+e.message)}
}
if(fs.existsSync('.github/workflows/rdx-github-pages.yml')){
  const y=fs.readFileSync('.github/workflows/rdx-github-pages.yml','utf8');
  if(!y.includes('run: node scripts/build-static-release.mjs')) errors.push('Pages workflow must use shared RDX static release builder');
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Static Release Build Contract: FAIL');
  process.exit(1);
}
console.log('RDX Static Release Build Contract: PASS');
