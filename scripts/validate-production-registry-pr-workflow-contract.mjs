import fs from 'node:fs';

const workflow='.github/workflows/rdx-production-registry-pr.yml';
const script='scripts/apply-production-registry-update-proposal.mjs';
const errors=[];
for(const f of [workflow,script]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(fs.existsSync(workflow)){
  const y=fs.readFileSync(workflow,'utf8');
  const required=[
    'workflow_dispatch:',
    'source_review_run_id:',
    'workflow_run:',
    'RDX Production Human Review',
    "github.event_name == 'workflow_run'",
    "github.event.workflow_run.conclusion == 'success'",
    "github.event.workflow_run.head_branch == 'main'",
    'Resolve source human review run',
    'WORKFLOW_RUN_ID: ${{ github.event.workflow_run.id }}',
    'RDX_SOURCE_REVIEW_RUN_ID=',
    'RDX_OPERATOR_ID=$GITHUB_ACTOR',
    'Verify source human review workflow identity',
    '"RDX Production Human Review"',
    'test "$EVENT" = "workflow_dispatch" -o "$EVENT" = "workflow_run"',
    'RDX_REVIEW_WORKFLOW_SHA=',
    'Verify signed human review',
    'Verify signed registry update proposal',
    "RDX_APPLY_REGISTRY_PROPOSAL: 'true'",
    'Ensure only production registry changed',
    'test "$(git diff --name-only)" = "data/deployments/production-proof-registry.json"',
    'git checkout -b "$BRANCH"',
    'git push origin "$BRANCH"',
    'gh pr create --base main --head "$BRANCH"'
  ];
  for(const m of required) if(!y.includes(m)) errors.push('workflow missing marker '+m);

  for(const forbidden of ['gh pr merge','git push origin main','--force','--auto']){
    if(y.includes(forbidden)) errors.push('workflow contains forbidden operation '+forbidden);
  }
  if(/\n\s{2}push:\s*\n/.test(y)) errors.push('registry PR workflow must not run from push');
  if(/\n\s{2}pull_request:\s*\n/.test(y)) errors.push('registry PR workflow must not run from pull_request');
  if(/\n\s{6}operator_id:\s*\n/.test(y)) errors.push('registry PR workflow must not accept free-form operator_id input');
  if(!y.includes('pull-requests: write')) errors.push('registry PR workflow needs pull-request write permission for proposal creation');
  if(!y.includes('contents: write')) errors.push('registry PR workflow needs contents write permission for review branch creation');
}
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry PR Workflow Contract: FAIL');process.exit(1)}
console.log('RDX Production Registry PR Workflow Contract: PASS review_event_or_manual=true pr_only=true auto_merge=false operator_actor_bound=true');
