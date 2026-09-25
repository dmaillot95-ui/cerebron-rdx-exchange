import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const statusPath='dist/api/v1/status.json';
const registryPath='data/deployments/production-proof-registry.json';
const manifestPath='dist/api/v1/release-manifest.json';
const proofPath='artifacts/rdx-production-deployment-proof.json';
const proposalPath='artifacts/rdx-production-proof-registration-proposal.json';

const originalStatus=fs.readFileSync(statusPath,'utf8');
const originalRegistry=fs.readFileSync(registryPath,'utf8');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const hadProof=fs.existsSync(proofPath);
const originalProof=hadProof?fs.readFileSync(proofPath):null;
const hadProposal=fs.existsSync(proposalPath);
const originalProposal=hadProposal?fs.readFileSync(proposalPath):null;

function writeJson(file,value){
  fs.mkdirSync(file.split('/').slice(0,-1).join('/'),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
function canonicalProofHash(proof){
  const clone={...proof};
  delete clone.proof_sha256;
  delete clone.id;
  delete clone.live_proof_signed;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}
function makeProof({id='NEGATIVE-CANARY',source=manifest.source_commit,aggregate=manifest.aggregate_sha256,liveSigned=true}={}){
  const p={
    id,
    schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V2',
    status:'PASS',
    source_commit:source,
    expected_release_aggregate_sha256:aggregate,
    actual_release_aggregate_sha256:aggregate,
    manifest_aggregate_match:true,
    provenance_matches_manifest:true,
    github_sha:null,
    github_sha_matches_provenance:true,
    release_attestation_signed:true,
    release_attestation_sha256:'a'.repeat(64),
    live_proof_signed:liveSigned
  };
  p.proof_sha256=canonicalProofHash(p);
  return p;
}
function runPromotionExpectFail(label,status,registry,expectedText){
  writeJson(statusPath,status);
  writeJson(registryPath,registry);
  const r=spawnSync(process.execPath,['scripts/validate-production-promotion.mjs'],{encoding:'utf8'});
  const out=String(r.stdout||'')+String(r.stderr||'');
  if(r.status===0){
    throw new Error(label+' unexpectedly passed');
  }
  if(!out.includes('RDX Production Promotion Gate: FAIL')){
    throw new Error(label+' failed for unexpected reason: '+out.slice(-1200));
  }
  if(expectedText&&!out.includes(expectedText)){
    throw new Error(label+' did not trigger expected rejection: '+expectedText+'; got '+out.slice(-1200));
  }
  console.log('NEGATIVE PASS '+label);
}
function restore(){
  fs.writeFileSync(statusPath,originalStatus);
  fs.writeFileSync(registryPath,originalRegistry);
  if(hadProof) fs.writeFileSync(proofPath,originalProof);
  else if(fs.existsSync(proofPath)) fs.rmSync(proofPath);
  if(hadProposal) fs.writeFileSync(proposalPath,originalProposal);
  else if(fs.existsSync(proposalPath)) fs.rmSync(proposalPath);
}

try{
  const baseStatus=JSON.parse(originalStatus);
  const emptyRegistry={schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:null,proofs:[]};

  runPromotionExpectFail(
    'PUBLIC_TRUE_WITHOUT_LIVE_PROOF',
    {...baseStatus,production_deployment_verified:true},
    emptyRegistry,
    'public status cannot claim production verified without registry.latest_verified proof'
  );

  const wrongSource='0'.repeat(40)===manifest.source_commit?'1'.repeat(40):'0'.repeat(40);
  const sourceProof=makeProof({id:'NEG-WRONG-SOURCE',source:wrongSource});
  runPromotionExpectFail(
    'WRONG_SOURCE_COMMIT',
    {...baseStatus,production_deployment_verified:true},
    {schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:sourceProof.id,proofs:[sourceProof]},
    'latest proof source_commit differs from current release manifest'
  );

  const wrongAggregate='0'.repeat(64)===manifest.aggregate_sha256?'1'.repeat(64):'0'.repeat(64);
  const aggregateProof=makeProof({id:'NEG-WRONG-AGGREGATE',aggregate:wrongAggregate});
  runPromotionExpectFail(
    'WRONG_RELEASE_AGGREGATE',
    {...baseStatus,production_deployment_verified:true},
    {schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:aggregateProof.id,proofs:[aggregateProof]},
    'latest proof release aggregate differs from current manifest'
  );

  const syntheticProof=makeProof({id:'NEG-SYNTHETIC-CANARY'});
  syntheticProof.synthetic_canary=true;
  syntheticProof.evidence_class='SYNTHETIC_PIPELINE_CANARY_NOT_LIVE_EVIDENCE';
  syntheticProof.base_url='https://rdx-post-deploy-canary.invalid/';
  syntheticProof.proof_sha256=canonicalProofHash(syntheticProof);
  runPromotionExpectFail(
    'SYNTHETIC_CANARY_IN_REGISTRY',
    {...baseStatus,production_deployment_verified:true},
    {schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:syntheticProof.id,proofs:[syntheticProof]},
    'synthetic canary proof forbidden in production registry'
  );

  const unsignedProof=makeProof({id:'NEG-UNSIGNED-LIVE',liveSigned:false});
  runPromotionExpectFail(
    'UNSIGNED_LIVE_PROOF',
    {...baseStatus,production_deployment_verified:true},
    {schema:'RDX_PRODUCTION_PROOF_REGISTRY_V1',policy:'FAIL_CLOSED',latest_verified:unsignedProof.id,proofs:[unsignedProof]},
    'signed live deployment proof not verified'
  );

  restore();
  const proposalProof=makeProof({id:'NEG-PROPOSAL-UNSIGNED',liveSigned:false});
  const proofPayload={...proposalProof};
  delete proofPayload.id;
  delete proofPayload.live_proof_signed;
  proofPayload.proof_sha256=canonicalProofHash(proofPayload);
  writeJson(proofPath,proofPayload);
  const r=spawnSync(process.execPath,['scripts/build-production-proof-registration-proposal.mjs'],{
    encoding:'utf8',
    env:{...process.env,RDX_SIGNED_LIVE_PROOF_VERIFIED:'false'}
  });
  const out=String(r.stdout||'')+String(r.stderr||'');
  if(r.status===0) throw new Error('UNSIGNED_REGISTRATION_PROPOSAL unexpectedly passed');
  if(!out.includes('signed live deployment proof must be verified before registration proposal')){
    throw new Error('UNSIGNED_REGISTRATION_PROPOSAL failed for unexpected reason: '+out.slice(-1200));
  }
  console.log('NEGATIVE PASS UNSIGNED_REGISTRATION_PROPOSAL');

  console.log('RDX Production Fail-Closed Negative Canaries: PASS (6/6 rejected)');
}catch(e){
  console.error('RDX Production Fail-Closed Negative Canaries: FAIL');
  console.error(e?.stack||String(e));
  process.exitCode=1;
}finally{
  restore();
}
