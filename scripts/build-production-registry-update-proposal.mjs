import fs from 'node:fs';
import crypto from 'node:crypto';

const registryPath='data/deployments/production-proof-registry.json';
const reviewPath='artifacts/rdx-production-human-review.json';
const proposalPath=process.env.RDX_REGISTRATION_PROPOSAL_PATH||'artifacts/input/proposal/rdx-production-proof-registration-proposal.json';
const errors=[];
for(const f of [registryPath,reviewPath,proposalPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Update Proposal: FAIL');process.exit(1)}

const registryBytes=fs.readFileSync(registryPath);
const registry=JSON.parse(registryBytes);
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const registration=JSON.parse(fs.readFileSync(proposalPath,'utf8'));
if(review.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1'||review.decision!=='APPROVE') errors.push('APPROVE human review required');
if(review.auto_apply!==false) errors.push('human review auto_apply must be false');
if(registration.schema!=='RDX_PRODUCTION_PROOF_REGISTRATION_PROPOSAL_V1'||registration.auto_apply!==false) errors.push('registration proposal contract mismatch');
const candidate={...registration.candidate_proof,human_review:review};
if(candidate.proof_sha256!==review.live_proof_sha256) errors.push('review/live proof mismatch');
if(candidate.source_commit!==review.source_commit) errors.push('review/source mismatch');
if(candidate.expected_release_aggregate_sha256!==review.release_aggregate_sha256) errors.push('review/aggregate mismatch');
if((registry.proofs||[]).some(p=>p.id===candidate.id)) errors.push('candidate already exists in registry');
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Update Proposal: FAIL');process.exit(1)}

const proposedRegistry={...registry,latest_verified:candidate.id,proofs:[...(registry.proofs||[]),candidate]};
const claims={
  schema:'RDX_PRODUCTION_REGISTRY_UPDATE_PROPOSAL_V1',
  mode:'PROPOSAL_ONLY',
  auto_apply:false,
  target_registry:registryPath,
  registry_before_sha256:crypto.createHash('sha256').update(registryBytes).digest('hex'),
  candidate_id:candidate.id,
  human_review_sha256:review.review_sha256,
  source_commit:candidate.source_commit,
  release_aggregate_sha256:candidate.expected_release_aggregate_sha256,
  proposed_registry:proposedRegistry
};
const out={...claims,proposal_sha256:crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex')};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-production-registry-update-proposal.json',JSON.stringify(out,null,2)+'\n');
console.log('RDX Production Registry Update Proposal: PASS candidate='+candidate.id+' proposal='+out.proposal_sha256);
