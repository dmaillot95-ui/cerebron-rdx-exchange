import { spawnSync } from 'node:child_process';

function runGit(args){
  return spawnSync('git',args,{encoding:'utf8'});
}

const expected=(process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||'').trim().toLowerCase();
if(expected && !/^[0-9a-f]{40}$/.test(expected)){
  console.error('FAIL invalid platform source commit');
  process.exit(1);
}

const inside=runGit(['rev-parse','--is-inside-work-tree']);
if(inside.status===0 && String(inside.stdout||'').trim()==='true'){
  const head=runGit(['rev-parse','HEAD']);
  if(head.status!==0){
    console.error('FAIL unable to resolve git HEAD');
    process.exit(1);
  }
  const actual=String(head.stdout||'').trim().toLowerCase();
  if(!/^[0-9a-f]{40}$/.test(actual)){
    console.error('FAIL git HEAD is not a 40-hex commit');
    process.exit(1);
  }
  if(expected && actual!==expected){
    console.error('FAIL platform source commit differs from git HEAD');
    console.error('platform='+expected);
    console.error('git_head='+actual);
    process.exit(1);
  }

  const unstaged=runGit(['diff','--quiet','--no-ext-diff']);
  const staged=runGit(['diff','--cached','--quiet','--no-ext-diff']);
  if(unstaged.status!==0 || staged.status!==0){
    const status=runGit(['status','--porcelain','--untracked-files=no']);
    console.error('FAIL tracked source checkout is dirty before release build');
    if(status.stdout) console.error(String(status.stdout).trim());
    console.error('RDX Source Checkout Gate: FAIL');
    process.exit(1);
  }
  console.log('RDX Source Checkout Gate: PASS mode=GIT_CLEAN source='+actual);
  process.exit(0);
}

if(expected){
  console.log('RDX Source Checkout Gate: PASS mode=PLATFORM_COMMIT_NO_GIT_METADATA source='+expected);
  process.exit(0);
}

console.error('FAIL cannot establish source commit or git checkout state');
console.error('RDX Source Checkout Gate: FAIL');
process.exit(1);
