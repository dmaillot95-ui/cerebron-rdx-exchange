import fs from 'node:fs';
import crypto from 'node:crypto';

const proofPath=process.env.RDX_LIVE_PROOF_PATH||'artifacts/input/live/rdx-production-deployment-proof.json';
const proposalPath=process.env.RDX_REGISTRATION_PROPOSAL_PATH||'artifacts/input/proposal/rdx-production-proof-registration-proposal.json';
const decision=String(process.env.RDX_HUMAN_DECISION||'').trim().toUpperCase();
const reviewerId=String(process.env.RDX_HUMAN_REVIEWER_ID||'').trim();
const signedLive=process.env.RDX_SIGNED_LIVE_PROOF_VERIFIED==='true';
const signedProposal=process.env.RDX_SIGNED_REGISTRATION_PROPOSAL_VERIFIED==='true';

const errors=[];
for(const f of [proofPath,proposalPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(!['APPROVE','REJECT'].includes(decision)) errors.push('decision must be APPROVE or REJECT');
if(!reviewerId||reviewerId==='UNASSIGNED') errors.push('reviewer id is required');
if(!signedLive) errors.push('signed live proof verification required');
if(!signedProposal) errors.push('signed registration proposal verification required');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Human Review Build: FAIL');
  process.exit(1);
}

const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));
const proposalBytes=fs.readFileSync(proposalPath);
const proposal=JSON.parse(proposalBytes);
if(proof.schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2'||proof.status!=='PASS') errors.push('live proof must be PASS V2');
if(proposal.schema!=='RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1'||proposal.mode!=='PROPOSAL_ONLY'||proposal.auto_apply!==false) errors.push('registration proposal contract mismatch');
if(proposal.candidate_proof?.proof_sha256!==proof.proof_sha256) errors.push('registration proposal proof hash mismatch');
if(proposal.candidate_proof?.source_commit!==proof.source_commit) errors.push('registration proposal source commit mismatch');
if(proposal.candidate_proof?.expected_release_aggregate_sha256!==proof.expected_release_aggregate_sha256) errors.push('registration proposal release aggregate mismatch');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Human Review Build: FAIL');
  process.exit(1);
}

const reviewedAt=new Date().toISOString();
const claims={
  schema:'RDX_PRODUCTION_HUMAN_REVIEW_V1',
  decision,
  reviewer_id:reviewerId,
  reviewed_at:reviewedAt,
  registration_proposal_sha256:crypto.createHash('sha256').update(proposalBytes).digest('hex'),
  live_proof_sha256:proof.proof_sha256,
  source_commit:proof.source_commit,
  release_aggregate_sha256:proof.expected_release_aggregate_sha256,
  signed_live_proof_verified:true,
  signed_registration_proposal_verified:true,
  auto_apply:false
};
const review={...claims,review_sha256:crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex')};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-production-human-review.json',JSON.stringify(review,null,2)+'\n');
console.log('RDX Production Human Review Build: PASS decision='+decision+' review='+review.review_sha256);
