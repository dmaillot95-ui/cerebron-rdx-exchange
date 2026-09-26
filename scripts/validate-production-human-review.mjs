import fs from 'node:fs';
import crypto from 'node:crypto';

const reviewPath='artifacts/rdx-production-human-review.json';
const proofPath=process.env.RDX_LIVE_PROOF_PATH||'artifacts/input/live/rdx-production-deployment-proof.json';
const proposalPath=process.env.RDX_REGISTRATION_PROPOSAL_PATH||'artifacts/input/proposal/rdx-production-proof-registration-proposal.json';
const policyPath='config/production-human-review-policy.json';
const errors=[];
for(const f of [reviewPath,proofPath,proposalPath,policyPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Human Review Gate: FAIL');process.exit(1)}

const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
const proposalBytes=fs.readFileSync(proposalPath);
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
if(review.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1') errors.push('review schema mismatch');
if(!['APPROVE','REJECT'].includes(review.decision)) errors.push('invalid review decision');
if(typeof review.reviewer_id!=='string'||!review.reviewer_id.trim()||review.reviewer_id==='UNASSIGNED') errors.push('invalid reviewer id');
if(policy.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_POLICY_V1') errors.push('human review policy schema mismatch');
if(policy.require_authenticated_reviewer!==true) errors.push('human review policy must require authenticated reviewer');
if(policy.require_authorized_reviewer!==true) errors.push('human review policy must require authorized reviewer');
if(!Array.isArray(policy.authorized_reviewers)||policy.authorized_reviewers.length===0) errors.push('human review policy authorized reviewers missing');
else if(!policy.authorized_reviewers.includes(review.reviewer_id)) errors.push('human reviewer is not authorized by production policy');
if(typeof review.reviewed_at!=='string'||Number.isNaN(Date.parse(review.reviewed_at))) errors.push('invalid reviewed_at');
if(review.registration_proposal_sha256!==crypto.createHash('sha256').update(proposalBytes).digest('hex')) errors.push('registration proposal hash mismatch');
if(review.live_proof_sha256!==proof.proof_sha256) errors.push('live proof hash mismatch');
if(review.source_commit!==proof.source_commit) errors.push('source commit mismatch');
if(review.release_aggregate_sha256!==proof.expected_release_aggregate_sha256) errors.push('release aggregate mismatch');
if(review.signed_live_proof_verified!==true) errors.push('signed live proof not verified');
if(review.signed_registration_proposal_verified!==true) errors.push('signed registration proposal not verified');
if(review.auto_apply!==false) errors.push('auto_apply must be false');
const claims={
  schema:review.schema,decision:review.decision,reviewer_id:review.reviewer_id,reviewed_at:review.reviewed_at,
  registration_proposal_sha256:review.registration_proposal_sha256,live_proof_sha256:review.live_proof_sha256,
  source_commit:review.source_commit,release_aggregate_sha256:review.release_aggregate_sha256,
  signed_live_proof_verified:review.signed_live_proof_verified,
  signed_registration_proposal_verified:review.signed_registration_proposal_verified,
  auto_apply:review.auto_apply
};
const expected=crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
if(review.review_sha256!==expected) errors.push('review sha256 mismatch');
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Human Review Gate: FAIL');process.exit(1)}
console.log('RDX Production Human Review Gate: PASS decision='+review.decision+' reviewer='+review.reviewer_id+' authorized=true review='+review.review_sha256);
