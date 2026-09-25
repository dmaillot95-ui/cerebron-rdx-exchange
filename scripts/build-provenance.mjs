import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function gitHead(){
  const r=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
  return r.status===0?String(r.stdout||'').trim():null;
}
const sourceCommit=(process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||gitHead()||'').trim();
if(!/^[0-9a-f]{40}$/i.test(sourceCommit)){
  console.error('FAIL unable to determine 40-hex source commit');
  process.exit(1);
}
const provenance={
  schema:'RDX_BUILD_PROVENANCE_V1',
  source_repository:'dmaillot95-ui/cerebron-rdx-exchange',
  source_commit:sourceCommit.toLowerCase(),
  builder:'scripts/build-static-release.mjs',
  output_directory:'dist',
  deterministic_fields_only:true
};
fs.mkdirSync('dist/api/v1',{recursive:true});
fs.writeFileSync('dist/api/v1/build-provenance.json',JSON.stringify(provenance,null,2)+'\n');
console.log('Built RDX provenance for source commit '+provenance.source_commit);
