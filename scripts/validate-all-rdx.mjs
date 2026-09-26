import { spawnSync } from 'node:child_process';

const commands=[
  ['node',['scripts/validate-source-checkout.mjs']],
  ['node',['scripts/validate-architecton.mjs']],
  ['node',['scripts/validate-architecton-ingest.mjs']],
  ['node',['scripts/validate-architecton-integration-log.mjs']],
  ['node',['scripts/build-architecton-public-projections.mjs','--check']],
  ['node',['scripts/build-architecton-pipeline-status.mjs','--check']],
  ['node',['scripts/validate-architecton-f01-f08.mjs']],
  ['node',['scripts/validate-architecton-rdx-normalization.mjs']],
  ['node',['scripts/validate-rdx.mjs']],
  ['node',['scripts/validate-deployment-readiness.mjs']],
  ['node',['scripts/validate-site-contract.mjs']],
  ['node',['scripts/validate-hosting-portability.mjs']],
  ['node',['scripts/validate-browser-js.mjs']],
  ['node',['scripts/validate-static-security.mjs']],
  ['node',['scripts/validate-github-actions-runtime-pins.mjs']],
  ['node',['scripts/build-provenance.mjs']],
  ['node',['scripts/build-release-manifest.mjs']],
  ['node',['scripts/validate-release-manifest.mjs']],
  ['node',['scripts/build-release-attestation.mjs']],
  ['node',['scripts/validate-release-attestation.mjs']],
  ['node',['scripts/validate-production-human-review-contract.mjs']],
  ['node',['scripts/validate-production-human-review-workflow-contract.mjs']],
  ['node',['scripts/validate-production-registry-pr-workflow-contract.mjs']],
  ['node',['scripts/validate-production-promotion.mjs']],
  ['node',['scripts/validate-production-fail-closed-negative.mjs']],
  ['node',['scripts/validate-human-review-pre-registry-negative.mjs']],
  ['node',['scripts/validate-production-rollback-negative.mjs']],
  ['node',['scripts/validate-live-promotion-chain-contract.mjs']],
  ['node',['scripts/validate-post-deploy-chain-integration-canary.mjs']],
  ['node',['scripts/validate-production-rollback.mjs']],
  ['node',['scripts/validate-production-deployment-url-policy.mjs']],
  ['node',['scripts/validate-static-links.mjs']],
  ['node',['scripts/validate-static-release-build.mjs']],
  ['node',['scripts/validate-reproducible-build.mjs']],
  ['node',['--check','scripts/lib/public-deployment-url.mjs']],
  ['node',['--check','scripts/verify-live-deployment.mjs']],
  ['node',['--check','scripts/build-production-proof-registration-proposal.mjs']],
  ['node',['--check','scripts/validate-production-proof-registration-proposal.mjs']]
];

for(const [cmd,args] of commands){
  console.log('\n=== '+cmd+' '+args.join(' ')+' ===');
  const r=spawnSync(cmd,args,{stdio:'inherit'});
  if(r.status!==0){
    console.error('\nCEREBRON RDX full validation: FAIL');
    process.exit(r.status??1);
  }
}
console.log('\nCEREBRON RDX full validation: PASS');
