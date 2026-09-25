import fs from 'node:fs';

const proofProposalPath='artifacts/rdx-production-proof-registration-proposal.json';
const knownGoodProposalPath='artifacts/rdx-known-good-release-registration-proposal.json';
const errors=[];
for(const f of [proofProposalPath,knownGoodProposalPath]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Known-Good Release Proposal Gate: FAIL');
  process.exit(1);
}
const p=JSON.parse(fs.readFileSync(proofProposalPath,'utf8'));
const k=JSON.parse(fs.readFileSync(knownGoodProposalPath,'utf8'));
const c=p.candidate_proof;
const r=k.candidate_release;
if(k.schema!=='RDX_KNOWN_GOOD_RELEASE_REGISTRATION_PROPOSAL_V1') errors.push('schema mismatch');
if(k.mode!=='PROPOSAL_ONLY'||k.auto_apply!==false) errors.push('known-good proposal must remain proposal-only');
if(k.target_registry!=='data/deployments/known-good-releases.json') errors.push('target registry mismatch');
if(!r) errors.push('missing candidate_release');
if(r&&c){
  if(r.live_proof_id!==c.id) errors.push('live proof id mismatch');
  if(r.source_commit!==c.source_commit) errors.push('source commit mismatch');
  if(r.release_aggregate_sha256!==c.expected_release_aggregate_sha256) errors.push('aggregate mismatch');
  if(r.release_attestation_sha256!==c.release_attestation_sha256) errors.push('release attestation mismatch');
  if(r.release_attestation_signed!==true||r.live_proof_signed!==true) errors.push('signature verification flags must be true');
}
if(k.candidate_active_release!==r?.id) errors.push('candidate active release mismatch');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Known-Good Release Proposal Gate: FAIL');
  process.exit(1);
}
console.log('RDX Known-Good Release Proposal Gate: PASS id='+k.candidate_active_release);
