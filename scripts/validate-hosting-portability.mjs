import fs from 'node:fs';

const htmlFiles=[
  'dist/index.html',
  'dist/status.html',
  'dist/api.html',
  'dist/privacy.html',
  'dist/verify.html',
  'dist/dossiers/index.html',
  'dist/dossiers/RDX-000001.html'
];

const errors=[];
for(const file of htmlFiles){
  if(!fs.existsSync(file)){errors.push('missing '+file);continue}
  const body=fs.readFileSync(file,'utf8');
  for(const m of body.matchAll(/(?:href|src)=["']\/(?!\/)[^"']*["']/g)){
    errors.push(file+' root-relative asset/navigation path: '+m[0]);
  }
  for(const m of body.matchAll(/fetch\(\s*["']\/(?!\/)[^"']*["']/g)){
    errors.push(file+' root-relative fetch: '+m[0]);
  }
}
if(fs.existsSync('dist/index.html')){
  const body=fs.readFileSync('dist/index.html','utf8');
  if(!body.includes("const RDX_BASE=new URL('./',window.location.href)")) errors.push('index missing portable RDX_BASE resolver');
  if(!body.includes("rdxUrl('/api/v1/catalog.json')")) errors.push('index catalog fetch must resolve through rdxUrl');
}
if(fs.existsSync('dist/dossiers/index.html')){
  const body=fs.readFileSync('dist/dossiers/index.html','utf8');
  if(!body.includes("fetch('../api/v1/catalog.json')")) errors.push('dossiers index must fetch catalog relative to parent root');
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Hosting Portability Gate: FAIL');
  process.exit(1);
}
console.log('RDX Hosting Portability Gate: PASS');
