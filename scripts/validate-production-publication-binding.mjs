import fs from 'node:fs';

const statusPath='dist/api/v1/status.json';
const pagePath='dist/status.html';
const errors=[];

for(const f of [statusPath,pagePath]){
  if(!fs.existsSync(f)) errors.push('missing '+f);
}

if(!errors.length){
  const status=JSON.parse(fs.readFileSync(statusPath,'utf8'));
  const page=fs.readFileSync(pagePath,'utf8');

  if(status.production_deployment_verified!==false){
    errors.push('static production_deployment_verified must remain false; effective state is control-plane derived');
  }

  const required=[
    "https://raw.githubusercontent.com/dmaillot95-ui/cerebron-rdx-exchange/main/data/deployments/production-proof-registry.json",
    "getJson('api/v1/build-provenance.json')",
    "getJson('api/v1/release-manifest.json')",
    "p.source_commit===provenance.source_commit",
    "p.source_commit===manifest.source_commit",
    "p.expected_release_aggregate_sha256===manifest.aggregate_sha256",
    "p.human_review?.decision==='APPROVE'",
    "p.live_proof_signed===true",
    "p.release_attestation_signed===true",
    "p.status==='PASS'",
    "cache:'no-store'",
    "connect-src 'self' https://raw.githubusercontent.com"
  ];
  for(const token of required){
    if(!page.includes(token)) errors.push('status page missing publication binding token: '+token);
  }
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Publication Binding Gate: FAIL');
  process.exit(1);
}

console.log('RDX Production Publication Binding Gate: PASS static_claim=false dynamic_registry_binding=fail_closed');
