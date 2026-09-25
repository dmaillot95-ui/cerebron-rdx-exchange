import fs from 'node:fs';
import crypto from 'node:crypto';

const registryPath='data/deployments/production-proof-registry.json';
const reviewPath='artifacts/rdx-production-human-review.json';
const updatePath='artifacts/rdx-production-registry-update-proposal.json';
const errors=[];
for(const f of [registryPath,reviewPath,updatePath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Update Proposal Gate: FAIL');process.exit(1)}

const registryBytes=fs.readFileSync(registryPath);
const registry=JSON.parse(registryBytes);
const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
const proposal=JSON.parse(fs.readFileSync(updatePath,'utf8'));
if(proposal.schema!=='RDX_PRODUCTION_REGISTRY_UPDATE_PROPOSAL_V1') errors.push('schema mismatch');
if(proposal.mode!=='PROPOSAL_ONLY'||proposal.auto_apply!==false) errors.push('proposal must remain non-applying');
if(proposal.target_registry!==registryPath) errors.push('target registry mismatch');
if(proposal.registry_before_sha256!==crypto.createHash('sha256').update(registryBytes).digest('hex')) errors.push('registry before hash mismatch');
if(proposal.human_review_sha256!==review.review_sha256) errors.push('human review hash mismatch');
if(review.decision!=='APPROVE') errors.push('human review must be APPROVE');
if(proposal.candidate_id!==proposal.proposed_registry?.latest_verified) errors.push('candidate/latest mismatch');
const candidate=(proposal.proposed_registry?.proofs||[]).find(x=>x.id===proposal.candidate_id);
if(!candidate) errors.push('candidate missing from proposed registry');
if(candidate?.human_review?.review_sha256!==review.review_sha256) errors.push('candidate human review mismatch');
if((registry.proofs||[]).some(x=>x.id===proposal.candidate_id)) errors.push('current registry already contains candidate');
const claims={...proposal};delete claims.proposal_sha256;
const expected=crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
if(proposal.proposal_sha256!==expected) errors.push('proposal sha256 mismatch');
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry Update Proposal Gate: FAIL');process.exit(1)}
console.log('RDX Production Registry Update Proposal Gate: PASS candidate='+proposal.candidate_id+' auto_apply=false');
