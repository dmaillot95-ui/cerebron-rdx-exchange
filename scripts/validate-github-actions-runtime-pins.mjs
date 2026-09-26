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
let allUses=0;
let externalActions=0;
let firstPartyActions=0;
let localActions=0;
let immutableRefs=0;
let cacheOffCount=0;

function validateUseSpec(spec,label,{count=true}={}){
  const localErrors=[];
  if(spec.startsWith('./')){
    if(count) localActions++;
    return localErrors;
  }

  const match=spec.match(/^([^/]+)\/([^@]+)@([^\s#]+)$/);
  if(!match){
    localErrors.push(`${label}: unsupported uses target ${spec}`);
    return localErrors;
  }

  const owner=match[1];
  const name=match[2];
  const ref=match[3];
  if(count) externalActions++;

  if(owner!=='actions'){
    localErrors.push(`${label}: external action owner ${owner} is not approved`);
    return localErrors;
  }

  if(count) firstPartyActions++;
  if(/^[0-9a-f]{40}$/.test(ref)){
    if(count) immutableRefs++;
  }else{
    localErrors.push(`${label}: actions/${name} must use immutable 40-hex SHA, got ${ref}`);
  }

  if(!(name in approved)){
    localErrors.push(`${label}: actions/${name} is not in approved first-party action map`);
  }else{
    if(count) counts[name]++;
    if(ref!==approved[name]) localErrors.push(`${label}: actions/${name} must be pinned to ${approved[name]}`);
  }
  return localErrors;
}

for(const file of files){
  const p=path.join(workflowDir,file);
  const text=fs.readFileSync(p,'utf8');
  const refs=[...text.matchAll(/uses:\s*['"]?([^'"\s#]+)['"]?/g)].map(m=>m[1]);
  allUses+=refs.length;
  for(const spec of refs) errors.push(...validateUseSpec(spec,file));
  cacheOffCount+=(text.match(/package-manager-cache:\s*false/g)||[]).length;
}

const thirdPartyCanaryErrors=validateUseSpec(`evilcorp/checkout@${approved.checkout}`,'CANARY_THIRD_PARTY',{count:false});
const thirdPartyCanaryPass=thirdPartyCanaryErrors.some(e=>e.includes('external action owner evilcorp is not approved'));
if(!thirdPartyCanaryPass) errors.push('third-party action bypass canary did not reject unapproved owner');

const mutableRefCanaryErrors=validateUseSpec('actions/checkout@v7','CANARY_MUTABLE_REF',{count:false});
const mutableRefCanaryPass=mutableRefCanaryErrors.some(e=>e.includes('must use immutable 40-hex SHA'));
if(!mutableRefCanaryPass) errors.push('mutable action ref canary did not reject mutable tag');

if(files.length!==15) errors.push(`workflow inventory mismatch expected=15 actual=${files.length}`);
if(allUses===0) errors.push('no workflow uses targets found');
if(externalActions===0) errors.push('no external GitHub actions found');
if(firstPartyActions!==externalActions) errors.push(`approved-owner mismatch external=${externalActions} first_party=${firstPartyActions}`);
if(immutableRefs!==firstPartyActions) errors.push(`immutable action ref mismatch first_party=${firstPartyActions} immutable=${immutableRefs}`);
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
console.log(`RDX GitHub Actions Supply-Chain Pin Gate: PASS workflows=${files.length} uses=${allUses} external_actions=${externalActions} first_party_actions=${firstPartyActions} local_actions=${localActions} immutable_sha_refs=${immutableRefs} checkout_pins=${counts['checkout']} setup_node_pins=${counts['setup-node']} attest_pins=${counts['attest']} upload_artifact_pins=${counts['upload-artifact']} pages_action_pins=${counts['upload-pages-artifact']+counts['configure-pages']+counts['deploy-pages']} cache_disabled=${cacheOffCount} third_party_bypass_canary=PASS mutable_ref_canary=PASS`);
