import fs from 'node:fs';

const proposalPath='artifacts/rdx-production-proof-registration-proposal.json';
if(!fs.existsSync(proposalPath)){
  console.error('FAIL missing '+proposalPath);
  process.exit(1);
}
const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
const c=proposal.candidate_proof;
const errors=[];
if(proposal.schema!=='RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1') errors.push('proof registration proposal schema mismatch');
if(proposal.mode!=='PROPOSAL_ONLY'||proposal.auto_apply!==false) errors.push('proof proposal must remain proposal-only');
if(!c||typeof c!=='object') errors.push('missing candidate proof');
if(c){
  if(c.status!=='PASS') errors.push('candidate proof status must be PASS');
  if(c.release_attestation_signed!==true) errors.push('release attestation must be signed');
  if(c.live_proof_signed!==true) errors.push('live proof must be signed');
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Known-Good Release Proposal: FAIL');
  process.exit(1);
}
const id='RDX-KNOWN-GOOD-'+c.source_commit.slice(0,12);
const out={
  schema:'RDX_KNOWN_GOOD_RELEASE_REGISTRATION_PROPOSAL_V1',
  mode:'PROPOSAL_ONLY',
  auto_apply:false,
  target_registry:'data/deployments/known-good-releases.json',
  candidate_active_release:id,
  candidate_release:{
    id,
    source_commit:c.source_commit,
    release_aggregate_sha256:c.expected_release_aggregate_sha256,
    release_attestation_sha256:c.release_attestation_sha256,
    release_attestation_signed:true,
    live_proof_id:c.id,
    live_proof_signed:true,
    deployment_base_url:c.base_url||null
  },
  required_review:[
    'Confirm the production proof registration proposal was generated from a GitHub/Sigstore-verified live proof.',
    'Confirm source commit and aggregate match the deployed bundle.',
    'Confirm this release is suitable as a known-good rollback baseline.',
    'Integrate only with explicit human review; never auto-apply.'
  ]
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-known-good-release-registration-proposal.json',JSON.stringify(out,null,2)+'\n');
console.log('RDX Known-Good Release Proposal: PASS id='+id);
