import fs from 'node:fs';

const statusPath='dist/api/v1/status.json';
const proofRegistryPath='data/deployments/production-proof-registry.json';
const knownGoodPath='data/deployments/known-good-releases.json';
const policyPath='config/production-rollback-policy.json';
const manifestPath='dist/api/v1/release-manifest.json';
const provenancePath='dist/api/v1/build-provenance.json';
const errors=[];

for(const f of [statusPath,proofRegistryPath,knownGoodPath,policyPath,manifestPath,provenancePath]){
  if(!fs.existsSync(f)) errors.push('missing '+f);
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Rollback Gate: FAIL');
  process.exit(1);
}

const status=JSON.parse(fs.readFileSync(statusPath,'utf8'));
const proofRegistry=JSON.parse(fs.readFileSync(proofRegistryPath,'utf8'));
const knownGood=JSON.parse(fs.readFileSync(knownGoodPath,'utf8'));
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));

if(policy.schema!=='RDX_PRODUCTION_ROLLBACK_POLICY_V1') errors.push('rollback policy schema mismatch');
if(policy.mode!=='FAIL_CLOSED') errors.push('rollback policy mode must be FAIL_CLOSED');
if(knownGood.schema!=='RDX_KNOWN_GOOD_RELEASE_REGISTRY_V1') errors.push('known-good registry schema mismatch');
if(knownGood.policy!=='FAIL_CLOSED') errors.push('known-good registry policy must be FAIL_CLOSED');
if(proofRegistry.schema!=='RDX_PRODUCTION_PROOF_REGISTRY_V1') errors.push('production proof registry schema mismatch');

const releases=Array.isArray(knownGood.releases)?knownGood.releases:[];
const proofs=Array.isArray(proofRegistry.proofs)?proofRegistry.proofs:[];
const ids=new Set();
for(const r of releases){
  if(!r||typeof r!=='object'){errors.push('invalid known-good release entry');continue}
  if(!r.id) errors.push('known-good release missing id');
  if(ids.has(r.id)) errors.push('duplicate known-good release id '+r.id);
  ids.add(r.id);
  if(!/^[0-9a-f]{40}$/.test(r.source_commit||'')) errors.push((r.id||'release')+' invalid source_commit');
  if(!/^[0-9a-f]{64}$/.test(r.release_aggregate_sha256||'')) errors.push((r.id||'release')+' invalid aggregate');
  if(!/^[0-9a-f]{64}$/.test(r.release_attestation_sha256||'')) errors.push((r.id||'release')+' invalid release attestation sha');
  if(!r.live_proof_id) errors.push((r.id||'release')+' missing live_proof_id');
  if(r.release_attestation_signed!==true) errors.push((r.id||'release')+' release attestation must be signed');
  if(r.live_proof_signed!==true) errors.push((r.id||'release')+' live proof must be signed');
  const proof=proofs.find(p=>p.id===r.live_proof_id);
  if(!proof) errors.push((r.id||'release')+' references unregistered live proof '+r.live_proof_id);
  if(proof){
    if(proof.source_commit!==r.source_commit) errors.push((r.id||'release')+' source differs from live proof');
    if(proof.expected_release_aggregate_sha256!==r.release_aggregate_sha256) errors.push((r.id||'release')+' aggregate differs from live proof');
    if(proof.release_attestation_sha256!==r.release_attestation_sha256) errors.push((r.id||'release')+' attestation differs from live proof');
    if(proof.release_attestation_signed!==true||proof.live_proof_signed!==true) errors.push((r.id||'release')+' proof signatures are not verified');
  }
}

const activeId=knownGood.active_release;
const active=activeId?releases.find(r=>r.id===activeId):null;
if(activeId&&!active) errors.push('active_release does not exist in known-good registry');

if(status.production_deployment_verified===true){
  if(!active) errors.push('verified production requires active known-good release');
  if(active){
    if(active.source_commit!==manifest.source_commit) errors.push('active known-good source_commit differs from current manifest');
    if(active.source_commit!==provenance.source_commit) errors.push('active known-good source_commit differs from current provenance');
    if(active.release_aggregate_sha256!==manifest.aggregate_sha256) errors.push('active known-good aggregate differs from current manifest');
    if(proofRegistry.latest_verified!==active.live_proof_id) errors.push('active known-good live proof is not latest_verified');
  }
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Rollback Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Rollback Gate: PASS public_claim='+String(status.production_deployment_verified)+' known_good='+releases.length+' active='+(activeId||'NONE'));
