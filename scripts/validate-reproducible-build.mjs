import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifestPath='dist/api/v1/release-manifest.json';

function runBuild(label){
  const r=spawnSync(process.execPath,['scripts/build-static-release.mjs'],{
    encoding:'utf8',
    env:process.env
  });
  if(r.status!==0){
    process.stderr.write(r.stdout||'');
    process.stderr.write(r.stderr||'');
    console.error('RDX Reproducible Build Gate: FAIL ('+label+' build failed)');
    process.exit(r.status??1);
  }
  if(!fs.existsSync(manifestPath)){
    console.error('RDX Reproducible Build Gate: FAIL (missing manifest after '+label+')');
    process.exit(1);
  }
  let m;
  try{m=JSON.parse(fs.readFileSync(manifestPath,'utf8'))}
  catch(e){
    console.error('RDX Reproducible Build Gate: FAIL (invalid manifest after '+label+': '+e.message+')');
    process.exit(1);
  }
  return {
    schema:m.schema,
    source_commit:m.source_commit,
    file_count:m.file_count,
    aggregate_sha256:m.aggregate_sha256
  };
}

const first=runBuild('first');
const second=runBuild('second');

const errors=[];
if(first.schema!=='RDX_RELEASE_MANIFEST_V1'||second.schema!=='RDX_RELEASE_MANIFEST_V1') errors.push('manifest schema mismatch');
if(first.source_commit!==second.source_commit) errors.push('source_commit changed between builds');
if(first.file_count!==second.file_count) errors.push('file_count changed between builds');
if(first.aggregate_sha256!==second.aggregate_sha256) errors.push('aggregate_sha256 changed between builds');
if(!/^[0-9a-f]{40}$/.test(first.source_commit||'')) errors.push('invalid source_commit');
if(!/^[0-9a-f]{64}$/.test(first.aggregate_sha256||'')) errors.push('invalid aggregate_sha256');

if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('FIRST '+JSON.stringify(first));
  console.error('SECOND '+JSON.stringify(second));
  console.error('RDX Reproducible Build Gate: FAIL');
  process.exit(1);
}
console.log('RDX Reproducible Build Gate: PASS source='+first.source_commit+' files='+first.file_count+' aggregate='+first.aggregate_sha256);
