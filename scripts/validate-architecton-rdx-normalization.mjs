import fs from 'node:fs';
import path from 'node:path';

const cfg=JSON.parse(fs.readFileSync('config/architecton-rdx-normalization.json','utf8'));
const registry=JSON.parse(fs.readFileSync('data/architecton/portfolio-40.json','utf8'));
const objectRegistry=JSON.parse(fs.readFileSync('data/architecton/object-registry.json','utf8'));
const soucheIds=new Set((registry.souches||[]).map(s=>s.id));
const canonicalIds=new Set(Object.keys(objectRegistry.objects||{}));
const errors=[];
const warnings=[];

function fail(m){errors.push(m)}
function warn(m){warnings.push(m)}
function walk(d){
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(d,e.name);
    return e.isDirectory()?walk(p):[p];
  });
}

const files=walk('data/architecton/normalization').filter(f=>f.endsWith('.json')).sort();
const normalizationIds=new Set();

for(const file of files){
  let n;
  try{n=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){fail(`${file}: invalid JSON`);continue}
  if(n.schema_version!=='ARCHITECTON-RDX-NORMALIZATION-RECORD-1.0') fail(`${file}: unexpected schema_version`);
  if(!/^NRM-[0-9]{6}$/.test(n.normalization_id||'')) fail(`${file}: invalid normalization_id`);
  if(normalizationIds.has(n.normalization_id)) fail(`${file}: duplicate normalization_id ${n.normalization_id}`);
  normalizationIds.add(n.normalization_id);
  if(!soucheIds.has(n.souche_id)) fail(`${file}: unknown souche_id ${n.souche_id}`);
  if(!/^CLAIM-[0-9]{6}$/.test(n.source_architecton_claim_id||'')) fail(`${file}: invalid ARCHITECTON claim id`);
  if(!/^CLM-[0-9]{6}$/.test(n.proposed_rdx_claim_id||'')) fail(`${file}: invalid proposed RDX claim id`);
  if(!cfg.statuses.includes(n.status)) fail(`${file}: invalid status ${n.status}`);
  if(!/^E[0-8]$/.test(n.architecton_evidence_level||'')) fail(`${file}: invalid architecton_evidence_level`);
  if(n.evidence_level!==undefined) fail(`${file}: ambiguous evidence_level forbidden; use architecton_evidence_level and proposed_rdx_evidence_level`);
  if(!Array.isArray(n.evidence_object_refs)) fail(`${file}: evidence_object_refs must be array`);
  if(!Array.isArray(n.normalization_basis_refs)) fail(`${file}: normalization_basis_refs must be array`);
  if(!Array.isArray(n.source_refs)) fail(`${file}: source_refs must be array`);
  if(!Array.isArray(n.execution_refs)) fail(`${file}: execution_refs must be array`);

  for(const ref of n.evidence_object_refs||[]){
    if(!canonicalIds.has(ref)) warn(`${file}: evidence object not yet canonical: ${ref}`);
  }

  if(n.status==='APPROVED'){
    if(!Number.isInteger(n.proposed_rdx_evidence_level)||n.proposed_rdx_evidence_level<0||n.proposed_rdx_evidence_level>8){
      fail(`${file}: APPROVED requires proposed_rdx_evidence_level integer 0..8`);
    }
    if((n.normalization_basis_refs||[]).length===0) fail(`${file}: APPROVED requires normalization_basis_refs`);
    if(!n.statement_transform?.rdx_statement) fail(`${file}: APPROVED requires rdx_statement`);
    if(n.statement_transform?.scope_preserved!==true) fail(`${file}: APPROVED requires scope_preserved=true`);
    if(n.statement_transform?.qualifiers_preserved!==true) fail(`${file}: APPROVED requires qualifiers_preserved=true`);
    if(!n.reviewer || !n.reviewed_at) fail(`${file}: APPROVED requires reviewer and reviewed_at`);
  }
}

if(files.length===0) console.log('PASS no ARCHITECTON→RDX normalization records yet');
warnings.forEach(w=>console.warn('WARN '+w));
errors.forEach(e=>console.error('FAIL '+e));
if(errors.length){console.error(`ARCHITECTON→RDX Normalization Gate: FAIL (${errors.length} errors)`);process.exit(1)}
console.log(`ARCHITECTON→RDX Normalization Gate: PASS (records=${files.length})`);
