import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const proofPath='artifacts/rdx-production-deployment-proof.json';
const registrationPath='artifacts/rdx-production-proof-registration-proposal.json';
const knownGoodPath='artifacts/rdx-known-good-release-registration-proposal.json';
const proofRegistryPath='data/deployments/production-proof-registry.json';
const knownGoodRegistryPath='data/deployments/known-good-releases.json';
const manifestPath='dist/api/v1/release-manifest.json';
const releaseAttestationPath='artifacts/rdx-release-attestation.json';

const tracked=[proofPath,registrationPath,knownGoodPath];
const snapshots=new Map();
for(const p of tracked) snapshots.set(p,fs.existsSync(p)?fs.readFileSync(p):null);
const proofRegistryBefore=fs.readFileSync(proofRegistryPath);
const knownGoodRegistryBefore=fs.readFileSync(knownGoodRegistryPath);

function restore(){
  for(const [p,buf] of snapshots){
    if(buf!==null){fs.mkdirSync(p.split('/').slice(0,-1).join('/'),{recursive:true});fs.writeFileSync(p,buf)}
    else if(fs.existsSync(p)) fs.rmSync(p);
  }
  fs.writeFileSync(proofRegistryPath,proofRegistryBefore);
  fs.writeFileSync(knownGoodRegistryPath,knownGoodRegistryBefore);
}
function run(script,env={}){
  const r=spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,...env}});
  if(r.status!==0){
    throw new Error(script+' failed\n'+String(r.stdout||'')+String(r.stderr||''));
  }
  return String(r.stdout||'')+String(r.stderr||'');
}
function canonicalProofHash(proof){
  const clone={...proof};
  delete clone.proof_sha256;
  delete clone.id;
  delete clone.live_proof_signed;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

try{
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const releaseAttestation=JSON.parse(fs.readFileSync(releaseAttestationPath,'utf8'));
  if(manifest.schema!=='RDX_RELEASE_MANIFEST_V1') throw new Error('manifest schema mismatch');
  if(releaseAttestation.schema!=='RDX_RELEASE_ATTESTATION_V1') throw new Error('release attestation schema mismatch');

  const proof={
    schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V2',
    status:'PASS',
    synthetic_canary:true,
    evidence_class:'SYNTHETIC_PIPELINE_CANARY_NOT_LIVE_EVIDENCE',
    base_url:'https://rdx-post-deploy-canary.invalid/',
    source_commit:manifest.source_commit,
    expected_release_aggregate_sha256:manifest.aggregate_sha256,
    actual_release_aggregate_sha256:manifest.aggregate_sha256,
    release_file_count_expected:manifest.file_count,
    release_file_count_checked:manifest.file_count,
    manifest_file_count_match:true,
    manifest_aggregate_match:true,
    provenance_matches_manifest:true,
    github_sha:null,
    github_sha_matches_provenance:true,
    release_attestation_signed:true,
    release_attestation_sha256:releaseAttestation.attestation_sha256,
    endpoint_checks:[],
    bundle_file_checks:[]
  };
  proof.proof_sha256=canonicalProofHash(proof);

  fs.mkdirSync('artifacts',{recursive:true});
  fs.writeFileSync(proofPath,JSON.stringify(proof,null,2)+'\n');

  run('scripts/build-production-proof-registration-proposal.mjs',{RDX_SIGNED_LIVE_PROOF_VERIFIED:'true'});
  run('scripts/validate-production-proof-registration-proposal.mjs');
  run('scripts/build-known-good-release-proposal.mjs');
  run('scripts/validate-known-good-release-proposal.mjs');

  const registration=JSON.parse(fs.readFileSync(registrationPath,'utf8'));
  const knownGood=JSON.parse(fs.readFileSync(knownGoodPath,'utf8'));

  const errors=[];
  if(registration.mode!=='PROPOSAL_ONLY'||registration.auto_apply!==false) errors.push('production proof proposal is not proposal-only');
  if(knownGood.mode!=='PROPOSAL_ONLY'||knownGood.auto_apply!==false) errors.push('known-good proposal is not proposal-only');
  if(registration.candidate_proof?.synthetic_canary!==true) errors.push('synthetic marker lost in registration proposal');
  if(registration.candidate_proof?.evidence_class!=='SYNTHETIC_PIPELINE_CANARY_NOT_LIVE_EVIDENCE') errors.push('synthetic evidence class lost');
  if(registration.candidate_proof?.base_url!=='https://rdx-post-deploy-canary.invalid/') errors.push('synthetic invalid-domain URL changed');
  if(knownGood.candidate_release?.deployment_base_url!=='https://rdx-post-deploy-canary.invalid/') errors.push('known-good proposal did not preserve synthetic URL');

  const proofRegistryAfter=fs.readFileSync(proofRegistryPath);
  const knownGoodRegistryAfter=fs.readFileSync(knownGoodRegistryPath);
  if(!proofRegistryBefore.equals(proofRegistryAfter)) errors.push('production proof registry mutated by proposal chain');
  if(!knownGoodRegistryBefore.equals(knownGoodRegistryAfter)) errors.push('known-good registry mutated by proposal chain');

  if(errors.length) throw new Error(errors.join('; '));

  console.log(
    'RDX Post-Deploy Chain Integration Canary: PASS '+
    'class=SYNTHETIC_PIPELINE_CANARY_NOT_LIVE_EVIDENCE '+
    'proof_proposal=PASS known_good_proposal=PASS auto_apply=false registries_unchanged=true'
  );
}catch(e){
  console.error('RDX Post-Deploy Chain Integration Canary: FAIL');
  console.error(e?.stack||String(e));
  process.exitCode=1;
}finally{
  restore();
}
