import fs from 'node:fs';
import path from 'node:path';

const registry=JSON.parse(fs.readFileSync('data/architecton/portfolio-40.json','utf8'));
const canonicalIds=new Set(Object.keys(JSON.parse(fs.readFileSync('data/architecton/object-registry.json','utf8')).objects||{}));
const soucheById=new Map((registry.souches||[]).map(s=>[s.id,s]));
const errors=[];
const warnings=[];
const allowedSheetStatus=new Set(['NOT_STARTED','DRAFT','COMPLETE']);
const startableStatuses=new Set(['READY_FOR_F01_F08','F01_F08_ACTIVE','ARCHITECTON_FROZEN','RDX_CANDIDATE']);

function fail(m){errors.push(m)}
function warn(m){warnings.push(m)}
function walk(d){
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(d,e.name);
    return e.isDirectory()?walk(p):[p];
  });
}
function refsFrom(obj){
  const refs=[];
  function rec(v,k=''){
    if(Array.isArray(v)){
      if(k.endsWith('_refs')||k==='reference_ids') for(const x of v) if(typeof x==='string') refs.push(x);
      else for(const x of v) rec(x,k);
    } else if(v && typeof v==='object'){
      for(const [kk,vv] of Object.entries(v)) rec(vv,kk);
    }
  }
  rec(obj);
  return refs;
}

const files=walk('data/architecton/dossiers').filter(f=>f.endsWith('.json')).sort();

for(const file of files){
  let d;
  try{d=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail(`${file}: invalid JSON`);continue}
  if(d.schema_version!=='ARCHITECTON-F01-F08-PACKAGE-1.0') fail(`${file}: unexpected schema_version`);
  if(!/^S(?:0[1-9]|[1-3][0-9]|40)$/.test(d.souche_id||'')) fail(`${file}: invalid souche_id`);
  const s=soucheById.get(d.souche_id);
  if(!s){fail(`${file}: souche not in canonical registry`);continue}
  if(!startableStatuses.has(s.status)) fail(`${file}: canonical status ${s.status} does not permit F01→F08`);
  if(!d.pre_rd_freeze_ref) fail(`${file}: pre_rd_freeze_ref required`);

  for(const id of ['F01','F02','F03','F04','F05','F06','F07','F08']){
    const sh=d.sheets?.[id];
    if(!sh) {fail(`${file}: missing ${id}`);continue}
    if(!allowedSheetStatus.has(sh.status)) fail(`${file}: ${id} invalid status ${sh.status}`);
  }

  const f07=d.sheets?.F07||{};
  if('calculations' in f07 || 'simulations' in f07 || 'results' in f07){
    fail(`${file}: F07 may reference canonical results but may not duplicate calculations/simulations/results`);
  }
  if(f07.duplicated_results_forbidden!==true) fail(`${file}: F07 duplicated_results_forbidden must be true`);

  for(const n of d.sheets?.F08?.business_numbers||[]){
    if(typeof n!=='object' || n===null){fail(`${file}: invalid F08 business number`);continue}
    if(!n.metric || n.value===undefined || !n.unit) fail(`${file}: F08 business number requires metric/value/unit`);
    if(!n.status) fail(`${file}: F08 business number requires status`);
    const hasSource=Array.isArray(n.source_refs)&&n.source_refs.length>0;
    const hasEstimate=n.status==='ESTIMATED' && n.method && n.range && n.uncertainty;
    if(!hasSource && !hasEstimate) fail(`${file}: F08 business number needs source_refs or ESTIMATED method/range/uncertainty`);
  }

  for(const ref of refsFrom(d.sheets||{})){
    if(/^(SRC|REQ|UNK|DAT|FORMULA|CALC|ARCH|RISK|FAIL|MODEL|SIM|RESULT|CONCEPT|IP|CLAIM|TEST|CTR|ALT|LIM|DEC|EXEC)-/.test(ref)
       && !canonicalIds.has(ref)){
      warn(`${file}: referenced canonical object not yet present: ${ref}`);
    }
  }

  if(d.status==='ARCHITECTON_FROZEN'){
    for(const id of ['F01','F02','F03','F04','F05','F06','F07','F08']){
      if(d.sheets?.[id]?.status!=='COMPLETE') fail(`${file}: ARCHITECTON_FROZEN requires ${id} COMPLETE`);
    }
    if(!Array.isArray(d.red_team_refs)||d.red_team_refs.length===0) fail(`${file}: frozen dossier requires Red Team refs`);
    if(!d.final_decision) fail(`${file}: frozen dossier requires final_decision`);
    if(!d.frozen_at) fail(`${file}: frozen dossier requires frozen_at`);
  }
}

if(files.length===0) console.log('PASS no F01→F08 dossier started yet');
warnings.forEach(w=>console.warn('WARN '+w));
errors.forEach(e=>console.error('FAIL '+e));
if(errors.length){console.error(`ARCHITECTON F01-F08 Gate: FAIL (${errors.length} errors)`);process.exit(1)}
console.log(`ARCHITECTON F01-F08 Gate: PASS (dossiers=${files.length})`);
