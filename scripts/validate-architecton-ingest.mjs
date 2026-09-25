import fs from 'node:fs';
import path from 'node:path';

const root='data/architecton/inbox';
const registryPath='data/architecton/portfolio-40.json';
const errors=[];
const warnings=[];

function fail(m){errors.push(m)}
function warn(m){warnings.push(m)}
function readJson(f){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){fail(`${f}: invalid JSON: ${e.message}`);return null}}
function walk(d){
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(d,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}

if(!fs.existsSync(registryPath)){console.error('ARCHITECTON Ingest Gate: FAIL (missing registry)');process.exit(1)}
const registry=readJson(registryPath);
if(!registry) process.exit(1);
const registryIds=new Set((registry.souches||[]).map(s=>s.id));
const registryById=new Map((registry.souches||[]).map(s=>[s.id,s]));

const typePrefix={
  SRC:'SRC-',REQ:'REQ-',UNK:'UNK-',DAT:'DAT-',FORMULA:'FORMULA-',CALC:'CALC-',
  ARCH:'ARCH-',RISK:'RISK-',FAIL:'FAIL-',MODEL:'MODEL-',SIM:'SIM-',RESULT:'RESULT-',
  CONCEPT:'CONCEPT-',IP:'IP-',CLAIM:'CLAIM-',TEST:'TEST-',CTR:'CTR-',ALT:'ALT-',
  LIM:'LIM-',DEC:'DEC-',EXEC:'EXEC-'
};

const handoffs=walk(root).filter(f=>/handoff.*\.json$/i.test(path.basename(f)) || /M0[1-6].*\.handoff\.json$/i.test(path.basename(f)));
const globalObjectIds=new Set();
let submitted=0;

for(const file of handoffs){
  const h=readJson(file); if(!h) continue;
  if(h.schema_version!=='ARCHITECTON-RD-HANDOFF-1.1') fail(`${file}: bad schema_version`);
  if(!registryIds.has(h.souche_id)) fail(`${file}: unknown souche_id ${h.souche_id}`);
  if(!/^M0[1-6]$/.test(h.phase||'')) fail(`${file}: invalid phase ${h.phase}`);
  if(!['DRAFT','SUBMITTED','VALIDATED','REJECTED'].includes(h.handoff_status)) fail(`${file}: invalid handoff_status`);
  if(h.handoff_status==='SUBMITTED') submitted++;

  const souche=registryById.get(h.souche_id);
  if(souche && souche.status==='QUEUED' && h.handoff_status==='VALIDATED'){
    fail(`${file}: cannot mark a handoff VALIDATED while canonical souche remains QUEUED`);
  }

  const producerIds=new Set(h.producer_execution_ids||[]);
  for(const eid of producerIds){
    if(!/^EXEC-[0-9]{6}$/.test(eid)) fail(`${file}: invalid producer execution id ${eid}`);
  }

  const localIds=new Set();
  const objects=Array.isArray(h.objects)?h.objects:[];
  if(!Array.isArray(h.objects)) fail(`${file}: objects must be an array`);

  for(const o of objects){
    const oid=o.object_id||'';
    const type=o.object_type||'';
    if(!typePrefix[type]) fail(`${file}: ${oid}: unsupported object_type ${type}`);
    else if(!oid.startsWith(typePrefix[type])) fail(`${file}: ${oid}: id prefix does not match ${type}`);

    if(localIds.has(oid)) fail(`${file}: duplicate object_id ${oid}`);
    localIds.add(oid);
    if(globalObjectIds.has(oid)) fail(`${file}: object_id ${oid} appears in multiple handoffs`);
    globalObjectIds.add(oid);

    if(o.evidence_level!==undefined) fail(`${file}: ${oid}: ambiguous evidence_level is forbidden in ARCHITECTON handoffs; use architecton_evidence_level`);
    if(!/^E[0-8]$/.test(o.architecton_evidence_level||'')) fail(`${file}: ${oid}: invalid architecton_evidence_level`);
    if(!Array.isArray(o.source_refs)) fail(`${file}: ${oid}: source_refs must be array`);
    if(!Array.isArray(o.execution_refs)) fail(`${file}: ${oid}: execution_refs must be array`);
    if(!Array.isArray(o.evidence_object_refs)) fail(`${file}: ${oid}: evidence_object_refs must be array`);
    if(typeof o.content!=='object' || o.content===null || Array.isArray(o.content)) fail(`${file}: ${oid}: content must be object`);

    for(const ref of o.source_refs||[]) if(!/^SRC-[0-9]{6}$/.test(ref)) fail(`${file}: ${oid}: invalid source ref ${ref}`);
    for(const ref of o.execution_refs||[]) if(!/^EXEC-[0-9]{6}$/.test(ref)) fail(`${file}: ${oid}: invalid execution ref ${ref}`);
    for(const ref of o.evidence_object_refs||[]) if(!/^(SRC|REQ|UNK|DAT|FORMULA|CALC|ARCH|RISK|FAIL|MODEL|SIM|RESULT|CONCEPT|IP|CLAIM|TEST|CTR|ALT|LIM|DEC|EXEC)-[0-9]{6}$/.test(ref)) fail(`${file}: ${oid}: invalid evidence object ref ${ref}`);

    if(type==='CLAIM'){
      const level=o.architecton_evidence_level||'E0';
      const refs=o.evidence_object_refs||[];
      if(level==='E2' && !refs.some(r=>r.startsWith('CALC-'))){
        fail(`${file}: ${oid}: ARCHITECTON E2 claim requires at least one CALC- evidence object ref`);
      }
      if(level==='E3' && !refs.some(r=>r.startsWith('SIM-'))){
        fail(`${file}: ${oid}: ARCHITECTON E3 claim requires at least one SIM- evidence object ref`);
      }
    }
    if(type==='CALC'){
      const c=o.content||{};
      if(h.handoff_status==='SUBMITTED' && (!c.inputs || !c.formula_or_method || c.result===undefined)){
        fail(`${file}: ${oid}: submitted CALC requires inputs, formula_or_method and result`);
      }
    }
    if(type==='SIM'){
      const c=o.content||{};
      if(o.status==='SIMULATED_EXECUTED'){
        if(!o.artifact_ref) fail(`${file}: ${oid}: executed simulation requires artifact_ref`);
        if(!c.protocol) fail(`${file}: ${oid}: executed simulation requires protocol`);
      }
    }
    if(type==='TEST'){
      if(o.status==='MEASURED' && !o.artifact_ref) fail(`${file}: ${oid}: measured test requires artifact_ref`);
    }
    if(type==='EXEC'){
      const c=o.content||{};
      const required=['SOUCHE_ID','FERME','MODEL_OR_AGENT','ROLE','MISSION','INPUT_HASH','OUTPUT_HASH','START','END','ARTIFACT','STATUS'];
      for(const k of required) if(c[k]===undefined || c[k]===null || c[k]==='') fail(`${file}: ${oid}: missing execution field ${k}`);
      if(c.SOUCHE_ID && c.SOUCHE_ID!==h.souche_id) fail(`${file}: ${oid}: SOUCHE_ID mismatch`);
    }
  }

  for(const eid of producerIds){
    if(!localIds.has(eid)){
      warn(`${file}: producer_execution_id ${eid} is not embedded in this handoff; integration must resolve it canonically`);
    }
  }
}

if(handoffs.length===0) console.log('PASS no R&D handoffs submitted yet; inbox structure only');
warnings.forEach(w=>console.warn('WARN '+w));
errors.forEach(e=>console.error('FAIL '+e));
if(errors.length){console.error(`ARCHITECTON Ingest Gate: FAIL (${errors.length} errors)`);process.exit(1)}
console.log(`PASS handoffs=${handoffs.length} submitted=${submitted} objects=${globalObjectIds.size}`);
console.log('ARCHITECTON Ingest Gate: PASS');
