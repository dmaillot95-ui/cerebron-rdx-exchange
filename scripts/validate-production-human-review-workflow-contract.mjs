import fs from 'node:fs';

const workflow='.github/workflows/rdx-production-human-review.yml';
const required=[
  'scripts/build-production-human-review.mjs',
  'scripts/validate-production-human-review.mjs',
  'scripts/build-production-registry-update-proposal.mjs',
  'scripts/validate-production-registry-update-proposal.mjs',
  workflow
];
const errors=[];
for(const f of required) if(!fs.existsSync(f)) errors.push('missing '+f);
if(fs.existsSync(workflow)){
  const y=fs.readFileSync(workflow,'utf8');
  for(const marker of [
    'workflow_dispatch:',
    'source_run_id:',
    'Verify source deployment workflow identity',
    '"RDX GitHub Pages Public Preview"',
    '"workflow_dispatch"',
    'RDX_REVIEW_SOURCE_RUN_SHA=',
    'Bind live proof to source run',
    'test "$RDX_REVIEW_SOURCE_COMMIT" = "$RDX_REVIEW_SOURCE_RUN_SHA"',
    'decision:',
    'reviewer_id:',
    'Authenticate reviewer identity',
    'REQUESTED_REVIEWER: ${{ inputs.reviewer_id }}',
    'AUTHENTICATED_REVIEWER: ${{ github.actor }}',
    'test "$REQUESTED_REVIEWER" = "$AUTHENTICATED_REVIEWER"',
    'RDX_HUMAN_REVIEWER_ID: ${{ github.actor }}',
    'gh run download "$SOURCE_RUN_ID" -n rdx-production-deployment-proof',
    'gh run download "$SOURCE_RUN_ID" -n rdx-production-proof-registration-proposal',
    'Verify signed live deployment proof',
    'Verify signed registration proposal',
    'Sign human review decision',
    "if: ${{ inputs.decision == 'APPROVE' }}",
    'Sign registry update proposal'
  ]) if(!y.includes(marker)) errors.push('workflow missing marker '+marker);
  if(/\npush:\s*\n|\npull_request:\s*\n/.test(y)) errors.push('human review workflow must not run automatically on push/pull_request');
  if(y.includes('RDX_HUMAN_REVIEWER_ID: ${{ inputs.reviewer_id }}')) errors.push('human review artifact must use authenticated github.actor, not free-form reviewer input');
}
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Human Review Workflow Contract: FAIL');process.exit(1)}
console.log('RDX Production Human Review Workflow Contract: PASS manual_only=true auto_apply=false reviewer_actor_bound=true');
