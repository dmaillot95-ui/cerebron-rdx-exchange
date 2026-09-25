import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const statusPath='dist/api/v1/status.json';
const proofRegistryPath='data/deployments/production-proof-registry.json';
const knownGoodPath='data/deployments/known-good-releases.json';
const manifest=JSON.parse(fs.readFileSync('dist/api/v1/release-manifest.json','utf8'));
const originalStatus=fs.readFileSync(statusPath,'utf8');
const originalProofs=fs.readFileSync(proofRegistryPath,'utf8');
const originalKnownGood=fs.readFileSync(knownGoodPath,'utf8');

function writeJson(file,v){fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n')}
function canonicalProofHash(proof){
  const clone={...proof};
  delete clone.proof_sha256; delete clone.id; delete clone.live_proof_signed;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}
try{
  const status={...JSON.parse(originalStatus),production_deployment_verified:true};
  const proof={
    id:'NEG-ROLLBACK-LIVE',
    schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V2',
    status:'PASS',
    source_commit:manifest.source_commit,
    expected_release_aggregate_sha256:manifest.aggregate_sha256,
    actual_release_aggregate_sha256:manifest.aggregate_sha256,
    manifest_aggregate_match:true,
    provenance_matches_manifest:true,
    github_sha:null,
    github_sha_matches_provenance:true,
    release_attestation_signed:true,
    release_attestation_sha256:'a'.repeat(64),
    live_proof_signed:true
  };
  proof.proof_sha256=canonicalProofHash(proof);
  writeJson(statusPath,status);
  writeJson(proofRegistryPath,{schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:proof.id,proofs:[proof]});
  writeJson(knownGoodPath,{schema:'RDX_KNOWN_GOOD_RELEASE_REGISTRY_V1',policy:'FAIL_CLOSED',active_release:null,releases:[]});
  const r=spawnSync(process.execPath,['scripts/validate-production-rollback.mjs'],{encoding:'utf8'});
  const out=String(r.stdout||'')+String(r.stderr||'');
  if(r.status===0) throw new Error('production verified without known-good baseline unexpectedly passed');
  if(!out.includes('verified production requires active known-good release')) throw new Error('unexpected rejection: '+out.slice(-1200));
  console.log('NEGATIVE PASS VERIFIED_PRODUCTION_WITHOUT_KNOWN_GOOD');
  console.log('RDX Production Rollback Negative Canary: PASS (1/1 rejected)');
}catch(e){
  console.error('RDX Production Rollback Negative Canary: FAIL');
  console.error(e?.stack||String(e));
  process.exitCode=1;
}finally{
  fs.writeFileSync(statusPath,originalStatus);
  fs.writeFileSync(proofRegistryPath,originalProofs);
  fs.writeFileSync(knownGoodPath,originalKnownGood);
}
