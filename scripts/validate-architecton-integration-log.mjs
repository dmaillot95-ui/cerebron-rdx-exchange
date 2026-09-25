import fs from 'node:fs';

const file='data/architecton/integration-log.json';
const registry=JSON.parse(fs.readFileSync('data/architecton/portfolio-40.json','utf8'));
const objectRegistry=JSON.parse(fs.readFileSync('data/architecton/object-registry.json','utf8'));
const policy=JSON.parse(fs.readFileSync('config/architecton-integration-policy.json','utf8'));
const ids=new Set((registry.souches||[]).map(s=>s.id));
const canonicalIds=new Set(Object.keys(objectRegistry.objects||{}));
const errors=[];
const warnings=[];

function fail(m){errors.push(m)}
function warn(m){warnings.push(m)}
const log=JSON.parse(fs.readFileSync(file,'utf8'));

if(log.schema_version!=='ARCHITECTON-INTEGRATION-LOG-1.0') fail('integration-log: unexpected schema_version');
if(log.mode!=='APPEND_ONLY_DECISIONS') fail('integration-log: mode must be APPEND_ONLY_DECISIONS');
if(!Array.isArray(log.entries)) fail('integration-log: entries must be an array');

const integrationIds=new Set();
const handoffKeys=new Map();

for(const e of log.entries||[]){
  const loc=e.integration_id||'INT-??????';
  if(!/^INT-[0-9]{6}$/.test(loc)) fail(`${loc}: invalid integration_id`);
  if(integrationIds.has(loc)) fail(`${loc}: duplicate integration_id`);
  integrationIds.add(loc);

  if(!ids.has(e.souche_id)) fail(`${loc}: unknown souche_id ${e.souche_id}`);
  if(!/^M0[1-6]$/.test(e.phase||'')) fail(`${loc}: invalid phase ${e.phase}`);
  if(!policy.allowed_decisions.includes(e.decision)) fail(`${loc}: invalid decision ${e.decision}`);
  if(!e.handoff_file) fail(`${loc}: handoff_file required`);
  if(!/^[a-f0-9]{64}$/.test(e.handoff_sha256||'')) fail(`${loc}: valid handoff_sha256 required`);

  const handoffKey=`${e.handoff_file}#${e.handoff_sha256}`;
  const prior=handoffKeys.get(handoffKey)||[];
  prior.push(loc);
  handoffKeys.set(handoffKey,prior);

  for(const key of ['accepted_object_ids','rejected_object_ids','deferred_object_ids','canonical_object_ids_after','reasons']){
    if(!Array.isArray(e[key])) fail(`${loc}: ${key} must be an array`);
  }

  const buckets=[
    ...(e.accepted_object_ids||[]).map(x=>['accepted',x]),
    ...(e.rejected_object_ids||[]).map(x=>['rejected',x]),
    ...(e.deferred_object_ids||[]).map(x=>['deferred',x])
  ];
  const seenObjects=new Map();
  for(const [bucket,id] of buckets){
    if(!/^(SRC|REQ|UNK|DAT|FORMULA|CALC|ARCH|RISK|FAIL|MODEL|SIM|RESULT|CONCEPT|IP|CLAIM|TEST|CTR|ALT|LIM|DEC|EXEC)-[0-9]{6}$/.test(id||'')){
      fail(`${loc}: invalid object id ${id}`);
    }
    if(seenObjects.has(id)) fail(`${loc}: object ${id} appears in both ${seenObjects.get(id)} and ${bucket}`);
    seenObjects.set(id,bucket);
  }

  if(e.decision!=='PENDING'){
    if(!e.reviewer) fail(`${loc}: reviewer required for ${e.decision}`);
    if(!e.decided_at) fail(`${loc}: decided_at required for ${e.decision}`);
  }

  if(e.decision==='APPROVED'){
    const checks=e.checks||{};
    for(const k of ['ingest_gate_passed','duplicate_check_passed','provenance_check_passed','evidence_semantics_check_passed','phase_output_check_passed']){
      if(checks[k]!==true) fail(`${loc}: APPROVED requires ${k}=true`);
    }
    if((e.accepted_object_ids||[]).length===0) fail(`${loc}: APPROVED requires accepted_object_ids`);
    for(const id of e.accepted_object_ids||[]){
      if(!canonicalIds.has(id)) fail(`${loc}: accepted object ${id} is not present in canonical object registry`);
    }
    for(const id of e.canonical_object_ids_after||[]){
      if(!canonicalIds.has(id)) fail(`${loc}: canonical_object_ids_after contains noncanonical ${id}`);
    }
  }

  if(e.decision==='REJECTED' && (e.accepted_object_ids||[]).length>0){
    fail(`${loc}: REJECTED cannot contain accepted_object_ids`);
  }
}

for(const [handoff,refs] of handoffKeys.entries()){
  const approved=(log.entries||[]).filter(e=>refs.includes(e.integration_id)&&e.decision==='APPROVED');
  if(approved.length>1) fail(`${handoff}: more than one APPROVED integration decision`);
}

warnings.forEach(w=>console.warn('WARN '+w));
errors.forEach(e=>console.error('FAIL '+e));
if(errors.length){
  console.error(`ARCHITECTON Integration Decision Gate: FAIL (${errors.length} errors)`);
  process.exit(1);
}
console.log(`ARCHITECTON Integration Decision Gate: PASS (entries=${(log.entries||[]).length})`);
