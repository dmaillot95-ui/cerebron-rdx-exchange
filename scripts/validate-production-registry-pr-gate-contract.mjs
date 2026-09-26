import fs from 'node:fs';

const workflow='.github/workflows/rdx-production-registry-pr-gate.yml';
const delta='scripts/validate-production-registry-pr-delta.mjs';
const errors=[];
for(const f of [workflow,delta]) if(!fs.existsSync(f)) errors.push('missing '+f);
if(fs.existsSync(workflow)){
  const y=fs.readFileSync(workflow,'utf8');
  const required=[
    'pull_request:',
    'branches: [main]',
    "- 'data/deployments/production-proof-registry.json'",
    'permissions:',
    'contents: read',
    'pull-requests: read',
    'actions: read',
    'Verify PR identity and changed-file boundary',
    'PR_HEAD_REPO: ${{ github.event.pull_request.head.repo.full_name }}',
    'test "$PR_HEAD_REPO" = "$GITHUB_REPOSITORY"',
    '^review/rdx-production-proof-[0-9]+-[0-9]+$',
    'RDX_SOURCE_REVIEW_RUN_ID=',
    'RDX_SOURCE_REGISTRY_PR_RUN_ID=',
    'Verify source human review run',
    '"RDX Production Human Review"',
    'Verify source registry PR workflow provenance',
    '"RDX Production Registry PR"',
    'SOURCE_REGISTRY_PR_SHA=',
    'HEAD_PARENT=',
    'test "$HEAD_PARENT" = "$SOURCE_REGISTRY_PR_SHA"',
    '"workflow_dispatch"',
    'Verify registry delta is append-only',
    'RDX_PR_BASE_SHA:',
    'scripts/validate-production-registry-pr-delta.mjs',
    'scripts/validate-production-promotion.mjs'
  ];
  for(const marker of required) if(!y.includes(marker)) errors.push('workflow missing marker '+marker);
  if(/\n  push:\s*\n/.test(y)) errors.push('registry PR gate must not run on push');
  if(/\n  workflow_dispatch:\s*\n/.test(y)) errors.push('registry PR gate must not be manually dispatched');
  for(const forbidden of ['contents: write','pull-requests: write','actions: write','id-token: write','attestations: write','secrets.']){
    if(y.includes(forbidden)) errors.push('registry PR gate contains forbidden privilege '+forbidden);
  }
}
if(fs.existsSync(delta)){
  const s=fs.readFileSync(delta,'utf8');
  for(const marker of [
    'after.length!==before.length+1',
    'existing proof modified at index',
    'latest_verified must point to the newly added proof',
    'synthetic canary forbidden',
    'approved human review required on added proof'
  ]) if(!s.includes(marker)) errors.push('delta validator missing marker '+marker);
}
if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX Production Registry PR Gate Contract: FAIL');
  process.exit(1);
}
console.log('RDX Production Registry PR Gate Contract: PASS pull_request_only=true append_only=true source_review_bound=true same_repo=true source_registry_run_bound=true parent_sha_bound=true read_only=true');
