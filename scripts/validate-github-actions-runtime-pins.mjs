import fs from 'node:fs';
import path from 'node:path';

const workflowDir='.github/workflows';
const approved={
  'checkout':'3d3c42e5aac5ba805825da76410c181273ba90b1',
  'setup-node':'820762786026740c76f36085b0efc47a31fe5020',
  'attest':'1e69f48acb82d1966a394da916b4c1698aa569d6',
  'upload-artifact':'ea165f8d65b6e75b540449e92b4886f43607fa02',
  'upload-pages-artifact':'7b1f4a764d45c48632c6b24a0339c27f5614fb0b',
  'configure-pages':'983d7736d9b0ae728b81ab479565c72886d7745b',
  'deploy-pages':'d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e'
};
const files=fs.readdirSync(workflowDir).filter(f=>f.endsWith('.yml')||f.endsWith('.yaml')).sort();
const errors=[];
const counts=Object.fromEntries(Object.keys(approved).map(k=>[k,0]));
let totalActions=0;
let immutableRefs=0;
let cacheOffCount=0;

for(const file of files){
  const p=path.join(workflowDir,file);
  const text=fs.readFileSync(p,'utf8');
  const refs=[...text.matchAll(/uses:\s*actions\/([A-Za-z0-9_.-]+)@([^\s#]+)/g)];
  for(const m of refs){
    const name=m[1];
    const ref=m[2];
    totalActions++;
    if(/^[0-9a-f]{40}$/.test(ref)) immutableRefs++;
    else errors.push(`${file}: actions/${name} must use immutable 40-hex SHA, got ${ref}`);
    if(!(name in approved)) errors.push(`${file}: actions/${name} is not in approved first-party action map`);
    else {
      counts[name]++;
      if(ref!==approved[name]) errors.push(`${file}: actions/${name} must be pinned to ${approved[name]}`);
    }
  }
  cacheOffCount+=(text.match(/package-manager-cache:\s*false/g)||[]).length;
}

if(files.length!==15) errors.push(`workflow inventory mismatch expected=15 actual=${files.length}`);
if(totalActions===0) errors.push('no first-party GitHub actions found');
if(immutableRefs!==totalActions) errors.push(`immutable action ref mismatch actions=${totalActions} immutable=${immutableRefs}`);
if(counts['checkout']===0) errors.push('no checkout actions found');
if(counts['setup-node']===0) errors.push('no setup-node actions found');
if(cacheOffCount!==counts['setup-node']) errors.push(`setup-node cache policy mismatch setup=${counts['setup-node']} package-manager-cache-false=${cacheOffCount}`);
for(const name of ['attest','upload-artifact','upload-pages-artifact','configure-pages','deploy-pages']){
  if(counts[name]===0) errors.push(`expected privileged action actions/${name} not found`);
}

if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX GitHub Actions Supply-Chain Pin Gate: FAIL');
  process.exit(1);
}
console.log(`RDX GitHub Actions Supply-Chain Pin Gate: PASS workflows=${files.length} actions=${totalActions} immutable_sha_refs=${immutableRefs} checkout_pins=${counts['checkout']} setup_node_pins=${counts['setup-node']} attest_pins=${counts['attest']} upload_artifact_pins=${counts['upload-artifact']} pages_action_pins=${counts['upload-pages-artifact']+counts['configure-pages']+counts['deploy-pages']} cache_disabled=${cacheOffCount}`);
