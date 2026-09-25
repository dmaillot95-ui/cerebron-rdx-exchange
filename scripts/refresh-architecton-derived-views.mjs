import { spawnSync } from 'node:child_process';

const commands=[
  ['node',['scripts/build-architecton-public-projections.mjs']],
  ['node',['scripts/build-architecton-pipeline-status.mjs']]
];

for(const [cmd,args] of commands){
  const r=spawnSync(cmd,args,{stdio:'inherit'});
  if(r.status!==0){
    console.error(`Derived view refresh failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status??1);
  }
}

console.log('ARCHITECTON derived views refreshed.');
console.log('Review the generated diff before commit. No automatic publication was performed.');
