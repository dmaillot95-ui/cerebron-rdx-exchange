import fs from 'node:fs';

const checks=[
  ['dist/index.html',['RDX_CLIENT_REQUEST_V1',"rdxUrl('/api/v1/catalog.json')",'privacy.html','status.html','api.html']],
  ['dist/dossiers/RDX-000001.html',['RDX-000001','SOURCED_OR_DRAFT_PREVIEW_ONLY_NO_VERIFIED_DECISION_CLAIM','Claims et preuves liées','CLM-000001','SUPPORTS','SRC-000001','Locator :']],
  ['dist/privacy.html',['RDX_CLIENT_REQUEST_V1','ne transmet pas cette demande à un serveur']],
  ['dist/verify.html',['RDX_RELEASE_MANIFEST_V1','RDX_BUILD_PROVENANCE_V1','crypto.subtle.digest','Vérifier maintenant','api/v1/release-manifest.json','api/v1/build-provenance.json','source_commit']],
  ['dist/status.html',['api/v1/status.json','Déploiement production vérifié']],
  ['dist/api.html',['api/v1/packs/RDX-000001.json','api/v1/request-schema.json']],
  ['dist/api/v1/status.json',['"client_request_local_export_enabled": true','"client_request_server_submission": false']],
  ['dist/api/v1/request-schema.json',['"const": "RDX_CLIENT_REQUEST_V1"','"training_default"']]
];

const errors=[];
for(const [file,markers] of checks){
  if(!fs.existsSync(file)){errors.push('missing '+file);continue}
  const body=fs.readFileSync(file,'utf8');
  for(const marker of markers){
    if(!body.includes(marker)) errors.push(file+' missing marker '+marker);
  }
}

if(fs.existsSync('dist/api/v1/catalog.json')){
  try{
    const catalog=JSON.parse(fs.readFileSync('dist/api/v1/catalog.json','utf8'));
    const first=(catalog.packs||[]).find(p=>p.id==='RDX-000001');
    if(!first) errors.push('catalog missing RDX-000001');
    if(first?.status!=='SOURCED') errors.push('RDX-000001 catalog status must remain SOURCED');
    if(first?.detail_url!=='/dossiers/RDX-000001.html') errors.push('RDX-000001 detail_url mismatch');
    if(first?.api_url!=='/api/v1/packs/RDX-000001.json') errors.push('RDX-000001 api_url mismatch');
    if(first?.detail_url && !fs.existsSync('dist'+first.detail_url)) errors.push('catalog detail file missing for RDX-000001');
    if(first?.api_url && !fs.existsSync('dist'+first.api_url)) errors.push('catalog API file missing for RDX-000001');
  }catch(e){
    errors.push('invalid catalog.json: '+e.message);
  }
}else{
  errors.push('missing dist/api/v1/catalog.json');
}

if(fs.existsSync('dist/index.html')){
  const html=fs.readFileSync('dist/index.html','utf8');
  if(/fetch\([^)]*request/i.test(html)) errors.push('index appears to submit client request over network');
  if(!html.includes('server_submission:false')) errors.push('local request export must explicitly keep server_submission false');
  if(!html.includes('training_default:false')) errors.push('local request export must explicitly keep training_default false');
}

if(fs.existsSync('vercel.json')){
  try{
    const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
    const globalHeaders=(vercel.headers||[]).find(h=>h.source==='/(.*)')?.headers||[];
    const csp=globalHeaders.find(h=>h.key==='Content-Security-Policy')?.value||'';
    for(const directive of ["default-src 'self'","connect-src 'self'","object-src 'none'","frame-ancestors 'none'"]){
      if(!csp.includes(directive)) errors.push('CSP missing '+directive);
    }
  }catch(e){
    errors.push('invalid vercel.json: '+e.message);
  }
}else{
  errors.push('missing vercel.json');
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Site Contract: FAIL');
  process.exit(1);
}
console.log('RDX Site Contract: PASS');
