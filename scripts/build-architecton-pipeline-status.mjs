import fs from 'node:fs';
import path from 'node:path';

const registry=JSON.parse(fs.readFileSync('data/architecton/portfolio-40.json','utf8'));
const plan=JSON.parse(fs.readFileSync('data/architecton/missions/architecton-40-plan.json','utf8'));
const integrationLog=JSON.parse(fs.readFileSync('data/architecton/integration-log.json','utf8'));
const objectRegistry=JSON.parse(fs.readFileSync('data/architecton/object-registry.json','utf8'));

function walk(d){
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(d,e.name);
    return e.isDirectory()?walk(p):[p];
  });
}
function readJson(f){
  try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}
}

const handoffFiles=walk('data/architecton/inbox')
  .filter(f=>/handoff.*\.json$/i.test(path.basename(f)) || /M0[1-6].*\.handoff\.json$/i.test(path.basename(f)))
  .sort();
const handoffs=handoffFiles.map(f=>({file:f,data:readJson(f)})).filter(x=>x.data);

const dossierFiles=walk('data/architecton/dossiers').filter(f=>f.endsWith('.json')).sort();
const dossiers=dossierFiles.map(f=>({file:f,data:readJson(f)})).filter(x=>x.data);

const normalizationFiles=walk('data/architecton/normalization').filter(f=>f.endsWith('.json')).sort();
const normalizations=normalizationFiles.map(f=>({file:f,data:readJson(f)})).filter(x=>x.data);

const approvedIntegrations=(integrationLog.entries||[]).filter(e=>e.decision==='APPROVED');

const waveStatus=(plan.waves||[]).map(w=>{
  const ids=new Set((w.souches||[]).map(s=>s.id));
  const canonical=(registry.souches||[]).filter(s=>ids.has(s.id));
  const waveHandoffs=handoffs.filter(h=>ids.has(h.data.souche_id));
  const waveApproved=approvedIntegrations.filter(e=>ids.has(e.souche_id));
  const waveDossiers=dossiers.filter(d=>ids.has(d.data.souche_id));
  const waveNorm=normalizations.filter(n=>ids.has(n.data.souche_id));
  return {
    wave:w.wave,
    priority:w.priority,
    total_souches:ids.size,
    queued:canonical.filter(s=>s.status==='QUEUED').length,
    pre_rnd_active:canonical.filter(s=>s.status==='PRE_RND_ACTIVE').length,
    pre_rnd_audit:canonical.filter(s=>s.status==='PRE_RND_AUDIT').length,
    pre_rnd_frozen:canonical.filter(s=>s.status==='PRE_RND_FROZEN').length,
    ready_for_f01_f08:canonical.filter(s=>s.status==='READY_FOR_F01_F08').length,
    f01_f08_active:canonical.filter(s=>s.status==='F01_F08_ACTIVE').length,
    architecton_frozen:canonical.filter(s=>s.status==='ARCHITECTON_FROZEN').length,
    rdx_candidate:canonical.filter(s=>s.status==='RDX_CANDIDATE').length,
    handoffs_received:waveHandoffs.length,
    submitted_handoffs:waveHandoffs.filter(h=>h.data.handoff_status==='SUBMITTED').length,
    approved_integrations:waveApproved.length,
    dossiers:waveDossiers.length,
    normalization_records:waveNorm.length
  };
});

const pipeline={
  schema_version:'ARCHITECTON-PIPELINE-STATUS-1.0',
  service:'CEREBRON_RDX_EXCHANGE',
  read_only:true,
  generated_from:[
    'data/architecton/portfolio-40.json',
    'data/architecton/missions/architecton-40-plan.json',
    'data/architecton/inbox/**',
    'data/architecton/integration-log.json',
    'data/architecton/object-registry.json',
    'data/architecton/dossiers/**',
    'data/architecton/normalization/**'
  ],
  totals:{
    souches:(registry.souches||[]).length,
    m01_work_orders:(plan.waves||[]).reduce((n,w)=>n+(w.souches||[]).length,0),
    handoffs_received:handoffs.length,
    submitted_handoffs:handoffs.filter(h=>h.data.handoff_status==='SUBMITTED').length,
    validated_handoffs:handoffs.filter(h=>h.data.handoff_status==='VALIDATED').length,
    integration_decisions:(integrationLog.entries||[]).length,
    approved_integrations:approvedIntegrations.length,
    canonical_objects:objectRegistry.object_count ?? Object.keys(objectRegistry.objects||{}).length,
    dossiers_f01_f08:dossiers.length,
    architecton_frozen:dossiers.filter(d=>d.data.status==='ARCHITECTON_FROZEN').length,
    normalization_records:normalizations.length,
    normalization_approved:normalizations.filter(n=>n.data.status==='APPROVED').length,
    execution_claims:(registry.souches||[]).reduce((n,s)=>n+(Array.isArray(s.executions)?s.executions.length:0),0)
  },
  priority_wave:'WAVE-01',
  current_reality:
    handoffs.length===0
      ? 'STRUCTURE_READY_WAITING_FOR_FIRST_REAL_HANDOFF'
      : 'HANDOFFS_PRESENT_REVIEW_PIPELINE_ACTIVE',
  waves:waveStatus
};

const out='dist/api/v1/architecton-pipeline.json';
const rendered=JSON.stringify(pipeline,null,2)+'\n';

if(process.argv.includes('--check')){
  if(!fs.existsSync(out)){
    console.error('FAIL missing '+out);
    process.exit(1);
  }
  const actual=fs.readFileSync(out,'utf8');
  if(actual!==rendered){
    console.error('FAIL pipeline projection drift '+out);
    process.exit(1);
  }
  console.log('ARCHITECTON Pipeline Projection Gate: PASS');
  process.exit(0);
}

fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,rendered);
console.log('WROTE '+out);
