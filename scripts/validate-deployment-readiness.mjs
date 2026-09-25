import fs from 'node:fs';

const required=[
  'dist/index.html',
  'dist/api/v1/status.json',
  'dist/api/v1/catalog.json',
  'dist/api/v1/request-schema.json',
  'dist/privacy.html',
  'dist/status.html',
  'dist/dossiers/index.html',
  'dist/api.html',
  'dist/api/v1/packs/RDX-000001.json',
  'dist/dossiers/RDX-000001.html',
  'dist/api/v1/architecton-40.json',
  'dist/api/v1/architecton-missions.json',
  'dist/api/v1/architecton-wave-01.json',
  'dist/api/v1/architecton-pipeline.json',
  'vercel.json'
];

const errors=[];
const warnings=[];
const fail=m=>errors.push(m);
const warn=m=>warnings.push(m);

for(const f of required){
  if(!fs.existsSync(f)) fail(`missing required deploy file ${f}`);
}

if(fs.existsSync('vercel.json')){
  try{
    const v=JSON.parse(fs.readFileSync('vercel.json','utf8'));
    if(v.outputDirectory!=='dist') fail('vercel.json outputDirectory must be dist');
    if(v.cleanUrls!==true) warn('vercel.json cleanUrls is not true');
    if(v.trailingSlash!==false) warn('vercel.json trailingSlash is not false');
    const globalHeaders=(v.headers||[]).find(h=>h.source==='/(.*)')?.headers||[];
    const keys=new Set(globalHeaders.map(h=>h.key));
    for(const key of ['Content-Security-Policy','X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy']){
      if(!keys.has(key)) fail('vercel.json missing security header '+key);
    }
  }catch(e){fail('invalid vercel.json: '+e.message)}
}

if(fs.existsSync('dist/api/v1/architecton-40.json')){
  const r=JSON.parse(fs.readFileSync('dist/api/v1/architecton-40.json','utf8'));
  if(r.total_souches!==40) fail(`architecton-40 total_souches expected 40, got ${r.total_souches}`);
  if(!r.read_only) fail('architecton-40 projection must be read_only');
}

if(fs.existsSync('dist/api/v1/architecton-missions.json')){
  const m=JSON.parse(fs.readFileSync('dist/api/v1/architecton-missions.json','utf8'));
  if(m.total_missions!==40) fail(`architecton-missions total_missions expected 40, got ${m.total_missions}`);
  if(m.execution_claims!==0){
    warn(`architecton-missions execution_claims=${m.execution_claims}; verify this is supported by canonical EXEC traces`);
  }
}

if(fs.existsSync('dist/api/v1/architecton-pipeline.json')){
  const p=JSON.parse(fs.readFileSync('dist/api/v1/architecton-pipeline.json','utf8'));
  if(p.totals?.souches!==40) fail('pipeline totals.souches must be 40');
  if(p.totals?.m01_work_orders!==40) fail('pipeline totals.m01_work_orders must be 40');
  if(p.read_only!==true) fail('pipeline projection must be read_only');
}

if(fs.existsSync('dist/api/v1/status.json')){
  const s=JSON.parse(fs.readFileSync('dist/api/v1/status.json','utf8'));
  if(s.production_mode!=='CONTROLLED_MANUAL') fail('status production_mode must remain CONTROLLED_MANUAL');
  if(s.automatic_ai_execution!==false) fail('status automatic_ai_execution must remain false');
  if(s.automatic_publication!==false) fail('status automatic_publication must remain false');
  if(s.payment_enabled!==false) fail('status payment_enabled must remain false');
  if(s.client_request_local_export_enabled!==true) fail('local request export must be enabled');
  if(s.client_request_server_submission!==false) fail('client request server submission must remain false until a real gateway is bound');
}

if(fs.existsSync('dist/index.html')){
  const html=fs.readFileSync('dist/index.html','utf8');
  for(const marker of ['ARCHITECTON Ω','architectonWaveFilter',"rdxUrl('/api/v1/architecton-missions.json')","rdxUrl('/api/v1/architecton-pipeline.json')",'RDX_CLIENT_REQUEST_V1','privacy.html','status.html','api.html',"rdxUrl('/api/v1/catalog.json')"]){
    if(!html.includes(marker)) fail(`dist/index.html missing marker: ${marker}`);
  }
}

if(fs.existsSync('dist/api/v1/catalog.json')){
  try{
    const catalog=JSON.parse(fs.readFileSync('dist/api/v1/catalog.json','utf8'));
    if(!Array.isArray(catalog.packs)) fail('catalog packs must be an array');
    for(const pack of catalog.packs||[]){
      if(pack.detail_url){
        const detail='dist'+pack.detail_url;
        if(!fs.existsSync(detail)) fail(`catalog detail_url missing file: ${detail}`);
      }
      if(pack.api_url){
        const api='dist'+pack.api_url;
        if(!fs.existsSync(api)) fail(`catalog api_url missing file: ${api}`);
      }
    }
    const first=(catalog.packs||[]).find(p=>p.id==='RDX-000001');
    if(!first) fail('catalog missing RDX-000001');
    if(first && first.status==='SOURCED' && !first.detail_url) fail('SOURCED RDX-000001 must expose detail_url');
  }catch(e){fail('invalid catalog.json: '+e.message)}
}

warnings.forEach(w=>console.warn('WARN '+w));
errors.forEach(e=>console.error('FAIL '+e));
if(errors.length){
  console.error(`RDX Deployment Readiness Gate: FAIL (${errors.length} errors)`);
  process.exit(1);
}
console.log('RDX Deployment Readiness Gate: PASS');
