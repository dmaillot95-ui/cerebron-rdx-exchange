import fs from 'node:fs';

const proofPath='artifacts/rdx-production-deployment-proof.json';
if(!fs.existsSync(proofPath)){
  console.error('FAIL missing '+proofPath);
  process.exit(1);
}
const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
const errors=[];
if(proof.schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push('proof schema mismatch');
if(proof.status!=='PASS') errors.push('proof status must be PASS');
if(proof.release_attestation_signed!==true) errors.push('signed release attestation must be verified');
if(!/^[0-9a-f]{64}$/.test(proof.release_attestation_sha256||'')) errors.push('invalid release attestation sha256');
if(!/^[0-9a-f]{64}$/.test(proof.proof_sha256||'')) errors.push('invalid proof sha256');
if(!/^[0-9a-f]{40}$/.test(proof.source_commit||'')) errors.push('invalid source commit');
if(proof.manifest_aggregate_match!==true) errors.push('manifest aggregate mismatch');
if(proof.provenance_matches_manifest!==true) errors.push('provenance mismatch');
if(proof.github_sha && proof.github_sha_matches_provenance!==true) errors.push('github sha mismatch');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Proof Registration Proposal: FAIL');
  process.exit(1);
}
const id='RDX-LIVE-'+proof.source_commit.slice(0,12)+'-'+proof.proof_sha256.slice(0,12);
const proposal={
  schema:'RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1',
  mode:'PROPOSAL_ONLY',
  auto_apply:false,
  target_registry:'data/deployments/production-proof-registry.json',
  candidate_latest_verified:id,
  candidate_proof:{id,...proof},
  required_review:[
    'Confirm deployment URL belongs to the intended RDX production surface.',
    'Confirm GitHub/Sigstore release attestation verification passed in the same workflow.',
    'Confirm proof status is PASS and source commit/aggregate match the deployed bundle.',
    'Only then integrate candidate_proof into the fail-closed registry.'
  ]
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-production-proof-registration-proposal.json',JSON.stringify(proposal,null,2)+'\n');
console.log('RDX Production Proof Registration Proposal: PASS id='+id);
