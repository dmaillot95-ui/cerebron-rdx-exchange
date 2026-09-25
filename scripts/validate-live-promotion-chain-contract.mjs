import fs from 'node:fs';

const workflowPath='.github/workflows/rdx-github-pages.yml';
const proofBuilder='scripts/build-production-proof-registration-proposal.mjs';
const rollbackBuilder='scripts/build-known-good-release-proposal.mjs';
const errors=[];

for(const f of [workflowPath,proofBuilder,rollbackBuilder]){
  if(!fs.existsSync(f)) errors.push('missing '+f);
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Live Promotion Chain Contract: FAIL');
  process.exit(1);
}

const y=fs.readFileSync(workflowPath,'utf8');
for(const marker of [
  'id-token: write',
  'attestations: write',
  'Signed production deployment proof',
  'Verify signed production deployment proof',
  'subject-path: artifacts/rdx-production-deployment-proof.json',
  'Signed production proof registration proposal',
  'Verify signed production proof registration proposal',
  'subject-path: artifacts/rdx-production-proof-registration-proposal.json',
  'Signed known-good rollback baseline proposal',
  'Verify signed known-good rollback baseline proposal',
  'subject-path: artifacts/rdx-known-good-release-registration-proposal.json',
  'gh attestation verify artifacts/rdx-production-deployment-proof.json',
  'gh attestation verify artifacts/rdx-production-proof-registration-proposal.json',
  'gh attestation verify artifacts/rdx-known-good-release-registration-proposal.json'
]){
  if(!y.includes(marker)) errors.push('workflow missing '+marker);
}

const proof=fs.readFileSync(proofBuilder,'utf8');
for(const marker of ["mode:'PROPOSAL_ONLY'","auto_apply:false","signed live deployment proof must be verified before registration proposal"]){
  if(!proof.includes(marker)) errors.push('proof proposal builder missing '+marker);
}

const rollback=fs.readFileSync(rollbackBuilder,'utf8');
for(const marker of ["mode:'PROPOSAL_ONLY'","auto_apply:false","release attestation must be signed","live proof must be signed"]){
  if(!rollback.includes(marker)) errors.push('known-good proposal builder missing '+marker);
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Live Promotion Chain Contract: FAIL');
  process.exit(1);
}
console.log('RDX Live Promotion Chain Contract: PASS signed_live_proof=true signed_proof_proposal=true signed_rollback_proposal=true auto_apply=false');
