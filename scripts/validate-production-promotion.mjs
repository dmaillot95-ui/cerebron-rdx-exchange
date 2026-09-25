import fs from 'node:fs';
import crypto from 'node:crypto';

const statusPath='dist/api/v1/status.json';
const registryPath='data/deployments/production-proof-registry.json';
const policyPath='config/production-promotion-policy.json';
const attestationPath='artifacts/rdx-release-attestation.json';
const manifestPath='dist/api/v1/release-manifest.json';
const provenancePath='dist/api/v1/build-provenance.json';
const errors=[];

for(const f of [statusPath,registryPath,policyPath,manifestPath,provenancePath]){
  if(!fs.existsSync(f)) errors.push('missing '+f);
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Promotion Gate: FAIL');
  process.exit(1);
}

const status=JSON.parse(fs.readFileSync(statusPath,'utf8'));
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));

if(registry.schema!=='RDX_PRODUCTION_PROOF_REGISTRY_V1') errors.push('registry schema mismatch');
if(registry.policy!=='FAIL_CLOSED') errors.push('registry policy must be FAIL_CLOSED');
if(policy.schema!=='RDX_PRODUCTION_PROMOTION_POLICY_V1') errors.push('promotion policy schema mismatch');
if(policy.required_live_proof_schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push('required live proof schema mismatch');

const proofs=Array.isArray(registry.proofs)?registry.proofs:[];
const latestId=registry.latest_verified;
const latest=latestId?proofs.find(p=>p.id===latestId):null;

function canonicalProofHash(proof){
  const clone={...proof};
  delete clone.proof_sha256;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

for(const p of proofs){
  if(!p||typeof p!=='object'){errors.push('invalid proof registry entry');continue}
  if(!p.id) errors.push('proof entry missing id');
  if(p.schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push((p.id||'proof')+' schema mismatch');
  if(p.status!=='PASS') errors.push((p.id||'proof')+' status must be PASS');
  if(!/^[0-9a-f]{40}$/.test(p.source_commit||'')) errors.push((p.id||'proof')+' invalid source_commit');
  if(!/^[0-9a-f]{64}$/.test(p.expected_release_aggregate_sha256||'')) errors.push((p.id||'proof')+' invalid release aggregate');
  if(p.manifest_aggregate_match!==true) errors.push((p.id||'proof')+' manifest_aggregate_match must be true');
  if(p.provenance_matches_manifest!==true) errors.push((p.id||'proof')+' provenance_matches_manifest must be true');
  if(p.github_sha && p.github_sha_matches_provenance!==true) errors.push((p.id||'proof')+' github_sha provenance mismatch');
  if(!/^[0-9a-f]{64}$/.test(p.proof_sha256||'')) errors.push((p.id||'proof')+' invalid proof_sha256');
  else if(canonicalProofHash(p)!==p.proof_sha256) errors.push((p.id||'proof')+' proof_sha256 mismatch');
  if(p.release_attestation_signed!==true) errors.push((p.id||'proof')+' signed release attestation not verified');
}

if(status.production_deployment_verified===true){
  if(!latest) errors.push('public status cannot claim production verified without registry.latest_verified proof');
  if(latest){
    if(latest.source_commit!==manifest.source_commit) errors.push('latest proof source_commit differs from current release manifest');
    if(latest.source_commit!==provenance.source_commit) errors.push('latest proof source_commit differs from current build provenance');
    if(latest.expected_release_aggregate_sha256!==manifest.aggregate_sha256) errors.push('latest proof release aggregate differs from current manifest');
    if(latest.release_attestation_signed!==true) errors.push('latest proof lacks signed release attestation verification');
  }
}else{
  if(latest && latest.status==='PASS'){
    console.log('INFO verified production proof exists in control plane, but public static status remains false until an explicit publication-state workflow binds it');
  }
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Promotion Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Promotion Gate: PASS public_claim='+String(status.production_deployment_verified)+' proofs='+proofs.length+' latest='+(latestId||'NONE'));
