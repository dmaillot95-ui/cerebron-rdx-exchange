import fs from 'node:fs';
import crypto from 'node:crypto';

const statusPath='dist/api/v1/status.json';
const registryPath='data/deployments/production-proof-registry.json';
const policyPath='config/production-promotion-policy.json';
const humanReviewPolicyPath='config/production-human-review-policy.json';
const manifestPath='dist/api/v1/release-manifest.json';
const provenancePath='dist/api/v1/build-provenance.json';
const errors=[];

for(const f of [statusPath,registryPath,policyPath,humanReviewPolicyPath,manifestPath,provenancePath]){
  if(!fs.existsSync(f)) errors.push('missing '+f);
}
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Promotion Gate: FAIL');
  process.exit(1);
}

const status=JSON.parse(fs.readFileSync(statusPath,'utf8'));
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
const humanReviewPolicy=JSON.parse(fs.readFileSync(humanReviewPolicyPath,'utf8'));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));

if(registry.schema!=='RDX_PRODUCTION_PROOF_REGISTRY_V1') errors.push('registry schema mismatch');
if(registry.policy!=='FAIL_CLOSED') errors.push('registry policy must be FAIL_CLOSED');
if(policy.schema!=='RDX_PRODUCTION_PROMOTION_POLICY_V1') errors.push('promotion policy schema mismatch');
if(policy.required_live_proof_schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push('required live proof schema mismatch');
if(policy.require_human_review!==true) errors.push('production policy must require human review');
if(policy.human_review_schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1') errors.push('production policy human review schema mismatch');
if(humanReviewPolicy.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_POLICY_V1'||humanReviewPolicy.required!==true) errors.push('human review policy mismatch');
if(humanReviewPolicy.require_authenticated_reviewer!==true) errors.push('human review policy must require authenticated reviewer');
if(humanReviewPolicy.require_authorized_reviewer!==true) errors.push('human review policy must require authorized reviewer');
if(!Array.isArray(humanReviewPolicy.authorized_reviewers)||humanReviewPolicy.authorized_reviewers.length===0) errors.push('human review policy authorized reviewers missing');
const authorizedReviewers=new Set(Array.isArray(humanReviewPolicy.authorized_reviewers)?humanReviewPolicy.authorized_reviewers:[]);

const proofs=Array.isArray(registry.proofs)?registry.proofs:[];
const latestId=registry.latest_verified;
const latest=latestId?proofs.find(p=>p.id===latestId):null;

function canonicalProofHash(proof){
  const clone={...proof};
  delete clone.proof_sha256;
  delete clone.id;
  delete clone.live_proof_signed;
  delete clone.human_review;
  return crypto.createHash('sha256').update(JSON.stringify(clone)).digest('hex');
}

for(const p of proofs){
  if(!p||typeof p!=='object'){errors.push('invalid proof registry entry');continue}
  if(!p.id) errors.push('proof entry missing id');
  if(p.schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push((p.id||'proof')+' schema mismatch');
  if(p.status!=='PASS') errors.push((p.id||'proof')+' status must be PASS');
  if(!/^[0-9a-f]{40}$/.test(p.source_commit||'')) errors.push((p.id||'proof')+' invalid source_commit');
  if(!/^[0-9a-f]{64}$/.test(p.expected_release_aggregate_sha256||'')) errors.push((p.id||'proof')+' invalid release aggregate');
  if(p.manifest_aggregate_match!==true) errors.push((p.id||'proof')+' manifest_aggregate_match must be true');
  if(p.provenance_matches_manifest!==true) errors.push((p.id||'proof')+' provenance_matches_manifest must be true');
  if(p.github_sha && p.github_sha_matches_provenance!==true) errors.push((p.id||'proof')+' github_sha provenance mismatch');
  if(!/^[0-9a-f]{64}$/.test(p.proof_sha256||'')) errors.push((p.id||'proof')+' invalid proof_sha256');
  else if(canonicalProofHash(p)!==p.proof_sha256) errors.push((p.id||'proof')+' proof_sha256 mismatch');
  if(p.release_attestation_signed!==true) errors.push((p.id||'proof')+' signed release attestation not verified');
  if(!/^[0-9a-f]{64}$/.test(p.release_attestation_sha256||'')) errors.push((p.id||'proof')+' invalid release attestation sha256');
  if(p.live_proof_signed!==true) errors.push((p.id||'proof')+' signed live deployment proof not verified');
  if(p.synthetic_canary===true) errors.push((p.id||'proof')+' synthetic canary proof forbidden in production registry');
  if(typeof p.evidence_class==='string'&&p.evidence_class.startsWith('SYNTHETIC_')) errors.push((p.id||'proof')+' synthetic evidence class forbidden in production registry');
  try{if(p.base_url&&new URL(p.base_url).hostname.endsWith('.invalid')) errors.push((p.id||'proof')+' invalid-domain deployment URL forbidden in production registry')}catch{errors.push((p.id||'proof')+' invalid base_url')}
  const hr=p.human_review;
  if(!hr||typeof hr!=='object') errors.push((p.id||'proof')+' human review missing');
  if(hr&&typeof hr==='object'){
    if(hr.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1') errors.push((p.id||'proof')+' human review schema mismatch');
    if(hr.decision!=='APPROVE') errors.push((p.id||'proof')+' human review decision must be APPROVE');
    if(typeof hr.reviewer_id!=='string'||!hr.reviewer_id.trim()||hr.reviewer_id==='UNASSIGNED') errors.push((p.id||'proof')+' human reviewer id missing');
    else if(!authorizedReviewers.has(hr.reviewer_id)) errors.push((p.id||'proof')+' human reviewer is not authorized by production policy');
    if(typeof hr.reviewed_at!=='string'||Number.isNaN(Date.parse(hr.reviewed_at))) errors.push((p.id||'proof')+' human review timestamp invalid');
    if(!/^[0-9a-f]{64}$/.test(hr.registration_proposal_sha256||'')) errors.push((p.id||'proof')+' human review proposal sha256 invalid');
    if(hr.live_proof_sha256!==p.proof_sha256) errors.push((p.id||'proof')+' human review live proof hash mismatch');
    if(hr.source_commit!==p.source_commit) errors.push((p.id||'proof')+' human review source commit mismatch');
    if(hr.release_aggregate_sha256!==p.expected_release_aggregate_sha256) errors.push((p.id||'proof')+' human review release aggregate mismatch');
    if(hr.signed_live_proof_verified!==true) errors.push((p.id||'proof')+' human review missing signed live proof verification');
    if(hr.signed_registration_proposal_verified!==true) errors.push((p.id||'proof')+' human review missing signed registration proposal verification');
    if(hr.auto_apply!==false) errors.push((p.id||'proof')+' human review auto_apply must be false');
    const reviewClaims={
      schema:hr.schema,
      decision:hr.decision,
      reviewer_id:hr.reviewer_id,
      reviewed_at:hr.reviewed_at,
      registration_proposal_sha256:hr.registration_proposal_sha256,
      live_proof_sha256:hr.live_proof_sha256,
      source_commit:hr.source_commit,
      release_aggregate_sha256:hr.release_aggregate_sha256,
      signed_live_proof_verified:hr.signed_live_proof_verified,
      signed_registration_proposal_verified:hr.signed_registration_proposal_verified,
      auto_apply:hr.auto_apply
    };
    const expectedReviewHash=crypto.createHash('sha256').update(JSON.stringify(reviewClaims)).digest('hex');
    if(hr.review_sha256!==expectedReviewHash) errors.push((p.id||'proof')+' human review sha256 mismatch');
  }
}

if(status.production_deployment_verified===true){
  if(!latest) errors.push('public status cannot claim production verified without registry.latest_verified proof');
  if(latest){
    if(latest.source_commit!==manifest.source_commit) errors.push('latest proof source_commit differs from current release manifest');
    if(latest.source_commit!==provenance.source_commit) errors.push('latest proof source_commit differs from current build provenance');
    if(latest.expected_release_aggregate_sha256!==manifest.aggregate_sha256) errors.push('latest proof release aggregate differs from current manifest');
    if(latest.release_attestation_signed!==true) errors.push('latest proof lacks signed release attestation verification');
    if(latest.live_proof_signed!==true) errors.push('latest proof lacks signed live deployment proof verification');
  }
}else{
  if(latest && latest.status==='PASS'){
    console.log('INFO verified production proof exists in control plane, but public static status remains false until an explicit publication-state workflow binds it');
  }
}

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Production Promotion Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Promotion Gate: PASS public_claim='+String(status.production_deployment_verified)+' proofs='+proofs.length+' latest='+(latestId||'NONE')+' authorized_reviewers='+authorizedReviewers.size);
