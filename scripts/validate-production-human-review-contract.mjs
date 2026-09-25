import fs from 'node:fs';

const policyPath='config/production-human-review-policy.json';
const templatePath='templates/rdx-production-human-review-v1.json';
const errors=[];
for(const f of [policyPath,templatePath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Human Review Contract Gate: FAIL');
  process.exit(1);
}
const p=JSON.parse(fs.readFileSync(policyPath,'utf8'));
const t=JSON.parse(fs.readFileSync(templatePath,'utf8'));
if(p.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_POLICY_V1') errors.push('policy schema mismatch');
if(p.required!==true) errors.push('human review must be required');
if(p.review_schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1') errors.push('review schema mismatch');
if(p.required_for_registry_entry!==true) errors.push('review must be required for registry entry');
if(p.approved_decision_required_for_production!==true) errors.push('APPROVE must be required for production');
if(p.require_signed_live_proof_verified!==true) errors.push('signed live proof verification must be required');
if(p.require_signed_registration_proposal_verified!==true) errors.push('signed registration proposal verification must be required');
if(p.auto_apply!==false) errors.push('human review policy auto_apply must be false');
if(!Array.isArray(p.allowed_decisions)||!p.allowed_decisions.includes('APPROVE')||!p.allowed_decisions.includes('REJECT')) errors.push('allowed decisions must include APPROVE and REJECT');
if(t.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1') errors.push('template schema mismatch');
if(t.decision!=='PENDING') errors.push('template decision must remain PENDING');
if(t.reviewer_id!=='UNASSIGNED') errors.push('template reviewer must remain UNASSIGNED');
if(t.auto_apply!==false) errors.push('template auto_apply must be false');
if(t.review_sha256!==null) errors.push('template review_sha256 must remain null');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Human Review Contract Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Human Review Contract Gate: PASS mode=HUMAN_APPROVAL_REQUIRED_NO_AUTO_APPLY');
