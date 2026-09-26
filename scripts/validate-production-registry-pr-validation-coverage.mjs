import fs from 'node:fs';

const workflow='.github/workflows/cerebron-rdx-full-validation.yml';
const errors=[];
if(!fs.existsSync(workflow)) errors.push('missing '+workflow);
else{
  const y=fs.readFileSync(workflow,'utf8');
  const marker="      - 'data/deployments/**'";
  const pushStart=y.indexOf('\n  push:\n');
  const prStart=y.indexOf('\n  pull_request:\n');
  const dispatchStart=y.indexOf('\n  workflow_dispatch:\n');
  if(pushStart<0||prStart<0||dispatchStart<0) errors.push('full validation trigger structure missing');
  else{
    const pushSection=y.slice(pushStart,prStart);
    const prSection=y.slice(prStart,dispatchStart);
    if(!pushSection.includes(marker)) errors.push('push paths do not cover data/deployments/**');
    if(!prSection.includes(marker)) errors.push('pull_request paths do not cover data/deployments/**');
  }
  const occurrences=(y.match(/      - 'data\/deployments\/\*\*'/g)||[]).length;
  if(occurrences!==2) errors.push('expected exactly two data/deployments/** trigger entries, got '+occurrences);
}
if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX Production Registry PR Validation Coverage Gate: FAIL');
  process.exit(1);
}
console.log('RDX Production Registry PR Validation Coverage Gate: PASS push=true pull_request=true');
