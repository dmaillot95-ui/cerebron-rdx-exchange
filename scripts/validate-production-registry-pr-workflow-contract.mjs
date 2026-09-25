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
    'operator_id:',
    'Verify signed human review',
    'Verify signed registry update proposal',
    "RDX_APPLY_REGISTRY_PROPOSAL: 'true'",
    'Ensure only production registry changed',
    'git checkout -b "$BRANCH"',
    'git push origin "$BRANCH"',
    'gh pr create --base main --head "$BRANCH"'
  ];
  for(const m of required) if(!y.includes(m)) errors.push('workflow missing marker '+m);
  for(const forbidden of ['gh pr merge','git push origin main','--force','--auto']){
    if(y.includes(forbidden)) errors.push('workflow contains forbidden operation '+forbidden);
  }
  if(/\npush:\s*\n|\npull_request:\s*\n/.test(y)) errors.push('registry PR workflow must be manual only');
}
if(errors.length){errors.forEach(e=>console.error('FAIL '+e));console.error('RDX Production Registry PR Workflow Contract: FAIL');process.exit(1)}
console.log('RDX Production Registry PR Workflow Contract: PASS manual_only=true pr_only=true auto_merge=false');
