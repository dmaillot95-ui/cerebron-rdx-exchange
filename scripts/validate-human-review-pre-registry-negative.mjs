import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const liveDir='artifacts/input/live';
const proposalDir='artifacts/input/proposal';
const proofPath=liveDir+'/rdx-production-deployment-proof.json';
const regProposalPath=proposalDir+'/rdx-production-proof-registration-proposal.json';
const reviewPath='artifacts/rdx-production-human-review.json';
const updatePath='artifacts/rdx-production-registry-update-proposal.json';

const tracked=[proofPath,regProposalPath,reviewPath,updatePath];
const backups=new Map();
for(const f of tracked){
  backups.set(f,fs.existsSync(f)?fs.readFileSync(f):null);
}
function restore(){
  for(const [f,b] of backups){
    if(b===null){if(fs.existsSync(f))fs.rmSync(f)}
    else {fs.mkdirSync(f.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(f,b)}
  }
}
function writeJson(file,obj){
  fs.mkdirSync(file.split('/').slice(0,-1).join('/'),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n');
}
function proofHash(p){
  const clone={...p};delete clone.proof_sha256;delete clone.id;delete clone.live_proof_signed;delete clone.human_review;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}
function run(cmd,args,env={}){
  return spawnSync(cmd,args,{encoding:'utf8',env:{...process.env,...env}});
}
function expectFail(label,r,needle){
  const out=String(r.stdout||'')+String(r.stderr||'');
  if(r.status===0) throw new Error(label+' unexpectedly passed');
  if(needle&&!out.includes(needle)) throw new Error(label+' wrong failure: '+out.slice(-1500));
  console.log('NEGATIVE PASS '+label);
}

try{
  const source='1'.repeat(40);
  const aggregate='2'.repeat(64);
  const proof={
    schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V2',
    status:'PASS',
    base_url:'https://rdx-human-review-canary.invalid/',
    source_commit:source,
    expected_release_aggregate_sha256:aggregate,
    actual_release_aggregate_sha256:aggregate,
    manifest_aggregate_match:true,
    provenance_matches_manifest:true,
    github_sha:null,
    github_sha_matches_provenance:true,
    release_attestation_signed:true,
    release_attestation_sha256:'3'.repeat(64),
    synthetic_canary:true,
    evidence_class:'SYNTHETIC_PIPELINE_CANARY_NOT_LIVE_EVIDENCE'
  };
  proof.proof_sha256=proofHash(proof);
  const candidateId='RDX-LIVE-'+source.slice(0,12)+'-'+proof.proof_sha256.slice(0,12);
  const proposal={
    schema:'RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1',
    mode:'PROPOSAL_ONLY',
    auto_apply:false,
    target_registry:'data/deployments/production-proof-registry.json',
    candidate_latest_verified:candidateId,
    candidate_proof:{id:candidateId,live_proof_signed:true,...proof},
    required_review:['synthetic contract canary only']
  };
  writeJson(proofPath,proof);
  writeJson(regProposalPath,proposal);

  let r=run(process.execPath,['scripts/build-production-human-review.mjs'],{
    RDX_HUMAN_DECISION:'APPROVE',
    RDX_HUMAN_REVIEWER_ID:'SYNTHETIC-CANARY-REVIEWER',
    RDX_SIGNED_LIVE_PROOF_VERIFIED:'true',
    RDX_SIGNED_REGISTRATION_PROPOSAL_VERIFIED:'true'
  });
  if(r.status!==0) throw new Error('synthetic APPROVE review build failed before pre-registry gate: '+String(r.stderr||r.stdout));
  r=run(process.execPath,['scripts/validate-production-human-review.mjs']);
  if(r.status!==0) throw new Error('synthetic APPROVE review validation failed before pre-registry gate: '+String(r.stderr||r.stdout));

  r=run(process.execPath,['scripts/build-production-registry-update-proposal.mjs']);
  expectFail('SYNTHETIC_APPROVE_BLOCKED_PRE_REGISTRY',r,'synthetic canary forbidden in registry update proposal');

  if(fs.existsSync(updatePath)) fs.rmSync(updatePath);
  r=run(process.execPath,['scripts/build-production-human-review.mjs'],{
    RDX_HUMAN_DECISION:'REJECT',
    RDX_HUMAN_REVIEWER_ID:'SYNTHETIC-CANARY-REVIEWER',
    RDX_SIGNED_LIVE_PROOF_VERIFIED:'true',
    RDX_SIGNED_REGISTRATION_PROPOSAL_VERIFIED:'true'
  });
  if(r.status!==0) throw new Error('synthetic REJECT review build failed: '+String(r.stderr||r.stdout));
  r=run(process.execPath,['scripts/build-production-registry-update-proposal.mjs']);
  expectFail('REJECT_DECISION_CANNOT_BUILD_REGISTRY_UPDATE',r,'APPROVE human review required');

  const registry=JSON.parse(fs.readFileSync('data/deployments/production-proof-registry.json','utf8'));
  if((registry.proofs||[]).length!==0||registry.latest_verified!==null) throw new Error('production registry changed during synthetic pre-registry canary');

  console.log('RDX Human Review Pre-Registry Negative Canaries: PASS (2/2 rejected, registry unchanged)');
}catch(e){
  console.error('RDX Human Review Pre-Registry Negative Canaries: FAIL');
  console.error(e?.stack||String(e));
  process.exitCode=1;
}finally{
  restore();
}
