import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const registryPath='data/deployments/production-proof-registry.json';
const baseSha=process.env.RDX_PR_BASE_SHA||'';
const errors=[];

if(!/^[0-9a-f]{40}$/.test(baseSha)) errors.push('RDX_PR_BASE_SHA must be a 40-char git SHA');
if(!fs.existsSync(registryPath)) errors.push('missing '+registryPath);

let base=null;
let current=null;
if(!errors.length){
  try{
    const baseText=execFileSync('git',['show',`${baseSha}:${registryPath}`],{encoding:'utf8'});
    base=JSON.parse(baseText);
    current=JSON.parse(fs.readFileSync(registryPath,'utf8'));
  }catch(e){
    errors.push('cannot load base/current registry: '+String(e.message||e));
  }
}

if(base&&current){
  for(const [label,r] of [['base',base],['current',current]]){
    if(r.schema!=='RDX_PRODUCTION_PROOF_REGISTRY_V1') errors.push(label+' registry schema mismatch');
    if(r.policy!=='FAIL_CLOSED') errors.push(label+' registry policy mismatch');
    if(!Array.isArray(r.proofs)) errors.push(label+' registry proofs must be an array');
  }
  const before=Array.isArray(base.proofs)?base.proofs:[];
  const after=Array.isArray(current.proofs)?current.proofs:[];
  if(after.length!==before.length+1) errors.push(`PR must add exactly one proof before=${before.length} after=${after.length}`);
  for(let i=0;i<before.length;i++){
    if(JSON.stringify(before[i])!==JSON.stringify(after[i])) errors.push('existing proof modified at index '+i);
  }
  const added=after.length===before.length+1?after[after.length-1]:null;
  if(added){
    if(!added.id) errors.push('added proof missing id');
    if(before.some(p=>p?.id===added.id)) errors.push('added proof id already exists in base registry');
    if(current.latest_verified!==added.id) errors.push('latest_verified must point to the newly added proof');
    if(added.schema!=='RDX_PRODUCTION_DEPLOYMENT_PROOF_V2') errors.push('added proof schema mismatch');
    if(added.status!=='PASS') errors.push('added proof status must be PASS');
    if(added.live_proof_signed!==true) errors.push('added proof must have verified signed live proof');
    if(added.release_attestation_signed!==true) errors.push('added proof must have verified signed release attestation');
    if(added.synthetic_canary===true) errors.push('synthetic canary forbidden');
    if(typeof added.evidence_class==='string'&&added.evidence_class.startsWith('SYNTHETIC_')) errors.push('synthetic evidence class forbidden');
    if(added.human_review?.schema!=='RDX_PRODUCTION_HUMAN_REVIEW_V1'||added.human_review?.decision!=='APPROVE') errors.push('approved human review required on added proof');
  }
}

if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX Production Registry PR Delta Gate: FAIL');
  process.exit(1);
}
console.log(`RDX Production Registry PR Delta Gate: PASS base_proofs=${base.proofs.length} current_proofs=${current.proofs.length} added=${current.latest_verified}`);
