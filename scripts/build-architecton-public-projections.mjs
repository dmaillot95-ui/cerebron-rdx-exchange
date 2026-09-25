import fs from 'node:fs';
import path from 'node:path';
const root='dist/api/v1';
const registryPath='data/architecton/portfolio-40.json';
const planPath='data/architecton/missions/architecton-40-plan.json';

const rawRegistry=fs.readFileSync(registryPath,'utf8');
const rawPlan=fs.readFileSync(planPath,'utf8');
const registry=JSON.parse(rawRegistry);
const plan=JSON.parse(rawPlan);

const counts=(registry.souches||[]).reduce((a,s)=>{
  a[s.status]=(a[s.status]||0)+1;
  return a;
},{});

const publicRegistry={
  service:'CEREBRON_RDX_EXCHANGE',
  resource:'ARCHITECTON_40_REGISTRY',
  projection_schema_version:'ARCHITECTON-PUBLIC-PROJECTION-1.0',
  projection:true,
  read_only:true,
  canonical_source:registryPath,
  source_versions:{registry_schema_version:registry.schema_version,registry_updated_at:registry.updated_at,mission_plan_schema_version:plan.schema_version},
  schema_version:registry.schema_version,
  program:registry.program,
  mode:registry.mode,
  total_souches:(registry.souches||[]).length,
  counts,
  waves:registry.waves,
  souches:(registry.souches||[]).map(s=>({
    id:s.id,
    name:s.name,
    group:s.group,
    status:s.status,
    phase:s.phase,
    evidence_max:s.evidence_max,
    execution_count:Array.isArray(s.executions)?s.executions.length:0,
    next_evidence_gate:s.next_evidence_gate
  }))
};

const publicMissions={
  service:'CEREBRON_RDX_EXCHANGE',
  resource:'ARCHITECTON_M01_MISSIONS',
  projection_schema_version:'ARCHITECTON-PUBLIC-PROJECTION-1.0',
  read_only:true,
  canonical_registry:registryPath,
  mission_plan:planPath,
  source_versions:{registry_schema_version:registry.schema_version,registry_updated_at:registry.updated_at,mission_plan_schema_version:plan.schema_version},
  total_missions:(plan.waves||[]).reduce((n,w)=>n+(w.souches||[]).length,0),
  ready_to_assign:(plan.waves||[]).reduce((n,w)=>n+(w.souches||[]).filter(s=>s.mission_status==='PLANNED').length,0),
  active:(registry.souches||[]).filter(s=>s.status==='PRE_RND_ACTIVE').length,
  execution_claims:(registry.souches||[]).reduce((n,s)=>n+(Array.isArray(s.executions)?s.executions.length:0),0),
  priority_wave:'WAVE-01',
  note:'READY_TO_ASSIGN is a prepared work order, not an executed R&D mission.',
  waves:(plan.waves||[]).map(w=>({
    wave:w.wave,
    priority:w.priority,
    status:'READY_TO_ASSIGN',
    inbox:`data/architecton/inbox/${w.wave}/index.json`,
    souches:(w.souches||[]).map(s=>({
      id:s.id,
      name:s.name,
      phase:'M01',
      mission_status:'READY_TO_ASSIGN',
      canonical_registry_status:(registry.souches||[]).find(x=>x.id===s.id)?.status||'UNKNOWN',
      work_order:`data/architecton/missions/${w.wave}/${s.id}-M01.json`
    }))
  }))
};

const wave01=publicMissions.waves.find(w=>w.wave==='WAVE-01');
const publicWave01={
  service:'CEREBRON_RDX_EXCHANGE',
  resource:'ARCHITECTON_WAVE_01',
  projection_schema_version:'ARCHITECTON-PUBLIC-PROJECTION-1.0',
  read_only:true,
  canonical_registry:registryPath,
  mission_plan:planPath,
  source_versions:{registry_schema_version:registry.schema_version,registry_updated_at:registry.updated_at,mission_plan_schema_version:plan.schema_version},
  wave:'WAVE-01',
  total_souches:(wave01?.souches||[]).length,
  execution_claims:(registry.souches||[])
    .filter(s=>(wave01?.souches||[]).some(m=>m.id===s.id))
    .reduce((n,s)=>n+(Array.isArray(s.executions)?s.executions.length:0),0),
  status:'READY_TO_ASSIGN',
  note:'No farm, model or agent is credited as executed until a verifiable EXEC trace is registered.',
  souches:(wave01?.souches||[]).map(m=>{
    const mission=JSON.parse(fs.readFileSync(m.work_order,'utf8'));
    return {
      id:m.id,
      name:m.name,
      phase:'M01',
      mission_status:'READY_TO_ASSIGN',
      registry_status:(registry.souches||[]).find(s=>s.id===m.id)?.status||'UNKNOWN',
      intent:mission.mission_intent,
      dependency_refs:mission.dependency_refs||[]
    };
  })
};

const outputs={
  'architecton-40.json':publicRegistry,
  'architecton-missions.json':publicMissions,
  'architecton-wave-01.json':publicWave01
};

const rendered=Object.fromEntries(
  Object.entries(outputs).map(([name,obj])=>[name,JSON.stringify(obj,null,2)+'\n'])
);

if(process.argv.includes('--check')){
  let bad=0;
  for(const [name,expected] of Object.entries(rendered)){
    const file=path.join(root,name);
    if(!fs.existsSync(file)){
      console.error(`FAIL missing public projection ${file}`);
      bad++;
      continue;
    }
    const actual=fs.readFileSync(file,'utf8');
    if(actual!==expected){
      console.error(`FAIL projection drift ${file}`);
      bad++;
    }else{
      console.log(`PASS ${file}`);
    }
  }
  if(bad){
    console.error(`ARCHITECTON Public Projection Gate: FAIL (${bad} drift item(s))`);
    process.exit(1);
  }
  console.log('ARCHITECTON Public Projection Gate: PASS');
  process.exit(0);
}

fs.mkdirSync(root,{recursive:true});
for(const [name,content] of Object.entries(rendered)){
  fs.writeFileSync(path.join(root,name),content);
  console.log(`WROTE ${path.join(root,name)}`);
}
