import fs from 'node:fs';

const checks=[
  ['dist/index.html',['RDX_CLIENT_REQUEST_V1','/dossiers/RDX-000001.html','/privacy.html','/status.html','/api.html']],
  ['dist/dossiers/RDX-000001.html',['RDX-000001','SOURCED_OR_DRAFT_PREVIEW_ONLY_NO_VERIFIED_DECISION_CLAIM','CLM-000001','SRC-000001']],
  ['dist/privacy.html',['RDX_CLIENT_REQUEST_V1','ne transmet pas cette demande à un serveur']],
  ['dist/status.html',['/api/v1/status.json','Déploiement production vérifié']],
  ['dist/api.html',['/api/v1/packs/RDX-000001.json','/api/v1/request-schema.json']],
  ['dist/api/v1/status.json',['"client_request_local_export_enabled": true','"client_request_server_submission": false']],
  ['dist/api/v1/request-schema.json',['"const": "RDX_CLIENT_REQUEST_V1"','"training_default"']]
];

const errors=[];
for(const [file,markers] of checks){
  if(!fs.existsSync(file)){errors.push('missing '+file);continue}
  const text=fs.readFileSync(file,'utf8');
  for(const marker of markers){
    if(!text.includes(marker)) errors.push(file+' missing marker '+marker);
  }
}

const html=fs.readFileSync('dist/index.html','utf8');
if(/fetch\([^)]*request/i.test(html)) errors.push('index appears to submit client request over network');
if(!html.includes('server_submission:false')) errors.push('local request export must explicitly keep server_submission false');
if(!html.includes('training_default:false')) errors.push('local request export must explicitly keep training_default false');

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Site Contract: FAIL');
  process.exit(1);
}
console.log('RDX Site Contract: PASS');

const vercel=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const globalHeaders=(vercel.headers||[]).find(h=>h.source==='/(.*)')?.headers||[];
const csp=globalHeaders.find(h=>h.key==='Content-Security-Policy')?.value||'';
for(const directive of ["default-src 'self'","connect-src 'self'","object-src 'none'","frame-ancestors 'none'"]){
  if(!csp.includes(directive)) errors.push('CSP missing '+directive);
}
