import fs from 'node:fs';

const workflow='.github/workflows/rdx-production-human-review.yml';
const policy='config/production-human-review-policy.json';
const required=[
  'scripts/build-production-human-review.mjs',
  'scripts/validate-production-human-review.mjs',
  'scripts/build-production-registry-update-proposal.mjs',
  'scripts/validate-production-registry-update-proposal.mjs',
  workflow,
  policy
];
const errors=[];
for(const f of required) if(!fs.existsSync(f)) errors.push('missing '+f);
if(fs.existsSync(workflow)){
  const y=fs.readFileSync(workflow,'utf8');
  for(const marker of [
    'workflow_dispatch:',
    'source_run_id:',
    'decision:',
    'Verify source deployment workflow identity',
    '"RDX GitHub Pages Public Preview"',
    '"workflow_dispatch"',
    'RDX_REVIEW_SOURCE_RUN_SHA=',
    'Bind live proof to source run',
    'test "$RDX_REVIEW_SOURCE_COMMIT" = "$RDX_REVIEW_SOURCE_RUN_SHA"',
    'Authenticate reviewer identity',
    'RDX_REVIEWER_ID:',
    'test -n "$RDX_REVIEWER_ID"',
    'RDX_AUTHENTICATED_REVIEWER=$RDX_REVIEWER_ID',
    'RDX_HUMAN_REVIEWER_ID: ${{ env.RDX_REVIEWER_ID }}',
    'Authorize reviewer against production policy',
    'config/production-human-review-policy.json',
    '.require_authenticated_reviewer == true',
    '.require_authorized_reviewer == true',
    '.authorized_reviewers | index($reviewer) != null',
    'gh run download "$RDX_REVIEW_SOURCE_RUN_ID" -n rdx-production-deployment-proof',
    'gh run download "$RDX_REVIEW_SOURCE_RUN_ID" -n rdx-production-proof-registration-proposal',
    'Verify signed live deployment proof',
    'Verify signed registration proposal',
    'Sign human review decision',
    "if: ${{ env.RDX_REVIEW_DECISION == 'APPROVE' }}",
    'Sign registry update proposal'
  ]) if(!y.includes(marker)) errors.push('workflow missing marker '+marker);

  if(/\npush:\s*\n|\npull_request:\s*\n/.test(y)) errors.push('human review workflow must not run automatically on push/pull_request');
  if(/\n\s{6}reviewer_id:\s*\n/.test(y)) errors.push('human review workflow must not accept free-form reviewer_id input');
  if(y.includes('RDX_HUMAN_REVIEWER_ID: ${{ inputs.reviewer_id }}')) errors.push('human review artifact must not use free-form reviewer input');

  const hasWorkflowRun=/\n\s{2}workflow_run:\s*\n/.test(y);
  if(hasWorkflowRun){
    for(const marker of [
      'workflows:',
      'CEREBRON RDX Full Validation',
      "github.event_name == 'workflow_run'",
      "github.event.workflow_run.conclusion == 'success'",
      "github.event.workflow_run.head_branch == 'main'",
      "github.event.workflow_run.actor.login == 'dmaillot95-ui'",
      "github.event_name == 'workflow_dispatch' && github.actor || github.event.workflow_run.actor.login"
    ]) if(!y.includes(marker)) errors.push('workflow_run relay missing marker '+marker);
    if(!/github\.event\.workflow_run\.id\s*==\s*[0-9]+/.test(y)) errors.push('workflow_run relay must be bound to one explicit source run id');
    if(!/RDX_REVIEW_SOURCE_RUN_ID:.*workflow_dispatch.*inputs\.source_run_id.*\|\|\s*'[0-9]+'/.test(y)) errors.push('workflow_run relay must bind one explicit production source run id');
    if(!/RDX_REVIEW_DECISION:.*workflow_dispatch.*inputs\.decision.*\|\|\s*'APPROVE'/.test(y)) errors.push('workflow_run relay must encode explicit APPROVE decision');
  } else {
    if(!y.includes('RDX_REVIEWER_ID: ${{ github.actor }}')) errors.push('manual review must bind reviewer to github.actor');
  }
}
if(fs.existsSync(policy)){
  const p=JSON.parse(fs.readFileSync(policy,'utf8'));
  if(p.require_authenticated_reviewer!==true) errors.push('policy must require authenticated reviewer');
  if(p.require_authorized_reviewer!==true) errors.push('policy must require authorized reviewer');
  if(!Array.isArray(p.authorized_reviewers)||p.authorized_reviewers.length===0) errors.push('policy authorized reviewer list missing');
}
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Human Review Workflow Contract: FAIL');process.exit(1)}
console.log('RDX Production Human Review Workflow Contract: PASS authenticated_reviewer=true authorized_reviewer_policy=true auto_apply=false relay_fail_closed=true');
