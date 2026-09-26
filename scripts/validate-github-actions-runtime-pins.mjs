import fs from 'node:fs';
import path from 'node:path';

const workflowDir='.github/workflows';
const checkout='actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const setupNode='actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';
const files=fs.readdirSync(workflowDir).filter(f=>f.endsWith('.yml')||f.endsWith('.yaml')).sort();
const errors=[];
let checkoutCount=0;
let setupCount=0;
let cacheOffCount=0;

for(const file of files){
  const p=path.join(workflowDir,file);
  const text=fs.readFileSync(p,'utf8');
  const checkoutRefs=[...text.matchAll(/actions\/checkout@([^\s#]+)/g)].map(m=>m[0]);
  const setupRefs=[...text.matchAll(/actions\/setup-node@([^\s#]+)/g)].map(m=>m[0]);
  checkoutCount+=checkoutRefs.length;
  setupCount+=setupRefs.length;
  cacheOffCount+=(text.match(/package-manager-cache:\s*false/g)||[]).length;
  for(const ref of checkoutRefs) if(ref!==checkout) errors.push(`${file}: checkout must be pinned to ${checkout}`);
  for(const ref of setupRefs) if(ref!==setupNode) errors.push(`${file}: setup-node must be pinned to ${setupNode}`);
}

if(checkoutCount===0) errors.push('no checkout actions found');
if(setupCount===0) errors.push('no setup-node actions found');
if(cacheOffCount!==setupCount) errors.push(`setup-node cache policy mismatch setup=${setupCount} package-manager-cache-false=${cacheOffCount}`);

if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX GitHub Actions Runtime Pin Gate: FAIL');
  process.exit(1);
}
console.log(`RDX GitHub Actions Runtime Pin Gate: PASS workflows=${files.length} checkout_pins=${checkoutCount} setup_node_pins=${setupCount} cache_disabled=${cacheOffCount}`);
