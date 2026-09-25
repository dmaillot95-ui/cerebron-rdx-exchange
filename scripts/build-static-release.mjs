import { spawnSync } from 'node:child_process';

const commands=[
  ['node',['scripts/validate-source-checkout.mjs']],
  ['node',['scripts/build-architecton-public-projections.mjs']],
  ['node',['scripts/build-architecton-pipeline-status.mjs']],
  ['node',['scripts/build-rdx-public-packs.mjs']],
  ['node',['scripts/validate-architecton.mjs']],
  ['node',['scripts/validate-architecton-ingest.mjs']],
  ['node',['scripts/validate-architecton-integration-log.mjs']],
  ['node',['scripts/validate-architecton-f01-f08.mjs']],
  ['node',['scripts/validate-architecton-rdx-normalization.mjs']],
  ['node',['scripts/validate-rdx.mjs']],
  ['node',['scripts/validate-deployment-readiness.mjs']],
  ['node',['scripts/validate-site-contract.mjs']],
  ['node',['scripts/validate-hosting-portability.mjs']],
  ['node',['scripts/validate-browser-js.mjs']],
  ['node',['scripts/validate-static-security.mjs']],
  ['node',['scripts/build-provenance.mjs']],
  ['node',['scripts/build-release-manifest.mjs']],
  ['node',['scripts/validate-release-manifest.mjs']],
  ['node',['scripts/build-release-attestation.mjs']],
  ['node',['scripts/validate-release-attestation.mjs']],
  ['node',['scripts/validate-static-links.mjs']]
];

for(const [cmd,args] of commands){
  console.log('\n=== '+cmd+' '+args.join(' ')+' ===');
  const r=spawnSync(cmd,args,{stdio:'inherit'});
  if(r.status!==0){
    console.error('\nRDX static release build: FAIL');
    process.exit(r.status??1);
  }
}
console.log('\nRDX static release build: PASS');
