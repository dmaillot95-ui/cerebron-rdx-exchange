import fs from 'node:fs';

const proofPath='artifacts/rdx-production-deployment-proof.json';
const proposalPath='artifacts/rdx-production-proof-registration-proposal.json';
const errors=[];
for(const f of [proofPath,proposalPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Proof Registration Proposal Gate: FAIL');
  process.exit(1);
}

const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
if(proposal.schema!=='RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1') errors.push('proposal schema mismatch');
if(proposal.mode!=='PROPOSAL_ONLY') errors.push('proposal mode must be PROPOSAL_ONLY');
if(proposal.auto_apply!==false) errors.push('proposal auto_apply must be false');
if(proposal.target_registry!=='data/deployments/production-proof-registry.json') errors.push('target registry mismatch');
const c=proposal.candidate_proof;
if(!c||typeof c!=='object') errors.push('missing candidate_proof');
if(c){
  if(c.id!==proposal.candidate_latest_verified) errors.push('candidate id/latest mismatch');
  if(c.live_proof_signed!==true) errors.push('candidate live_proof_signed must be true');
  const normalized={...c};
  delete normalized.id;
  delete normalized.live_proof_signed;
  if(JSON.stringify(normalized)!==JSON.stringify(proof)) errors.push('candidate proof differs from signed live proof payload');
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Proof Registration Proposal Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Proof Registration Proposal Gate: PASS id='+proposal.candidate_latest_verified);
