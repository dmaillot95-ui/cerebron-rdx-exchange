import fs from 'node:fs';
import crypto from 'node:crypto';

const registryPath='data/deployments/production-proof-registry.json';
const proposalPath=process.env.RDX_REGISTRY_UPDATE_PROPOSAL_PATH||'artifacts/input/update/rdx-production-registry-update-proposal.json';
const signedReview=process.env.RDX_SIGNED_HUMAN_REVIEW_VERIFIED==='true';
const signedUpdate=process.env.RDX_SIGNED_REGISTRY_UPDATE_PROPOSAL_VERIFIED==='true';
const allowWrite=process.env.RDX_APPLY_REGISTRY_PROPOSAL==='true';
const errors=[];

for(const f of [registryPath,proposalPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(!signedReview) errors.push('signed human review verification required');
if(!signedUpdate) errors.push('signed registry update proposal verification required');
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Proposal Apply: FAIL');process.exit(1)}

const registryBytes=fs.readFileSync(registryPath);
const registry=JSON.parse(registryBytes);
const proposal=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
if(proposal.schema!=='RDX_PRODUCTION_REGISTRY_UPDATE_PROPOSAL_V1') errors.push('proposal schema mismatch');
if(proposal.mode!=='PROPOSAL_ONLY'||proposal.auto_apply!==false) errors.push('proposal must remain PROPOSAL_ONLY auto_apply=false');
if(proposal.target_registry!==registryPath) errors.push('target registry mismatch');
const beforeHash=crypto.createHash('sha256').update(registryBytes).digest('hex');
if(proposal.registry_before_sha256!==beforeHash) errors.push('current registry changed since proposal was built');
const claims={...proposal};delete claims.proposal_sha256;
const expectedProposalHash=crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
if(proposal.proposal_sha256!==expectedProposalHash) errors.push('proposal sha256 mismatch');

const proposed=proposal.proposed_registry;
if(!proposed||proposed.schema!=='RDX_PRODUCTION_PROOF_REGISTRY_V1'||proposed.policy!=='FAIL_CLOSED') errors.push('proposed registry contract mismatch');
if(proposed?.latest_verified!==proposal.candidate_id) errors.push('candidate/latest mismatch');
const currentProofs=Array.isArray(registry.proofs)?registry.proofs:[];
const proposedProofs=Array.isArray(proposed?.proofs)?proposed.proofs:[];
if(proposedProofs.length!==currentProofs.length+1) errors.push('proposal must add exactly one proof');
for(let i=0;i<currentProofs.length;i++){
  if(JSON.stringify(proposedProofs[i])!==JSON.stringify(currentProofs[i])) errors.push('proposal modifies existing proof at index '+i);
}
const candidate=proposedProofs.find(p=>p.id===proposal.candidate_id);
if(!candidate) errors.push('candidate missing');
if(candidate){
  if(candidate.synthetic_canary===true) errors.push('synthetic canary forbidden');
  if(typeof candidate.evidence_class==='string'&&candidate.evidence_class.startsWith('SYNTHETIC_')) errors.push('synthetic evidence class forbidden');
  try{if(candidate.base_url&&new URL(candidate.base_url).hostname.endsWith('.invalid')) errors.push('invalid-domain deployment URL forbidden')}catch{errors.push('invalid candidate base_url')}
  if(candidate.live_proof_signed!==true) errors.push('signed live proof required');
  if(candidate.release_attestation_signed!==true) errors.push('signed release attestation required');
  const review=candidate.human_review;
  if(!review||review.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1'||review.decision!=='APPROVE') errors.push('approved human review required');
  if(review?.auto_apply!==false) errors.push('human review auto_apply must be false');
  if(review?.review_sha256!==proposal.human_review_sha256) errors.push('human review hash mismatch');
  if(review){
    const reviewClaims={
      schema:review.schema,decision:review.decision,reviewer_id:review.reviewer_id,reviewed_at:review.reviewed_at,
      registration_proposal_sha256:review.registration_proposal_sha256,live_proof_sha256:review.live_proof_sha256,
      source_commit:review.source_commit,release_aggregate_sha256:review.release_aggregate_sha256,
      signed_live_proof_verified:review.signed_live_proof_verified,
      signed_registration_proposal_verified:review.signed_registration_proposal_verified,
      auto_apply:review.auto_apply
    };
    const expectedReviewHash=crypto.createHash('sha256').update(JSON.stringify(reviewClaims)).digest('hex');
    if(review.review_sha256!==expectedReviewHash) errors.push('human review sha256 mismatch');
  }
  const proofClone={...candidate};
  delete proofClone.id;delete proofClone.live_proof_signed;delete proofClone.human_review;
  const expectedProofHash=crypto.createHash('sha256').update(JSON.stringify(proofClone)).digest('hex');
  if(candidate.proof_sha256!==expectedProofHash) errors.push('candidate proof sha256 mismatch');
}
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Proposal Apply: FAIL');process.exit(1)}

if(!allowWrite){
  console.log('RDX Production Registry Proposal Apply: PASS DRY_RUN candidate='+proposal.candidate_id);
  process.exit(0);
}
fs.writeFileSync(registryPath,JSON.stringify(proposed,null,2)+'\n');
console.log('RDX Production Registry Proposal Apply: PASS WORKTREE_ONLY_NOT_MAIN candidate='+proposal.candidate_id);
