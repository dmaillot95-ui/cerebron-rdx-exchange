import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='data/architecton/inbox';
const canonicalObjectRegistryPath='data/architecton/object-registry.json';
const outDir='artifacts';
const outFile=path.join(outDir,'architecton-integration-proposal.json');

function walk(d){
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(d,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}

const files=walk(root).filter(f=>/handoff.*\.json$/i.test(path.basename(f)) || /M0[1-6].*\.handoff\.json$/i.test(path.basename(f))).sort();
const handoffs=[];
const canonical=fs.existsSync(canonicalObjectRegistryPath)?JSON.parse(fs.readFileSync(canonicalObjectRegistryPath,'utf8')):{objects:{}};
const canonicalIds=new Set(Object.keys(canonical.objects||{}));

for(const file of files){
  const raw=fs.readFileSync(file,'utf8');
  const h=JSON.parse(raw);
  if(!['SUBMITTED','VALIDATED'].includes(h.handoff_status)) continue;
  handoffs.push({
    source_file:file,
    source_sha256:sha256(raw),
    souche_id:h.souche_id,
    phase:h.phase,
    handoff_status:h.handoff_status,
    produced_at:h.produced_at,
    producer_execution_ids:h.producer_execution_ids||[],
    object_ids:(h.objects||[]).map(o=>o.object_id),
    collisions_with_canonical:(h.objects||[]).map(o=>o.object_id).filter(id=>canonicalIds.has(id)),
    object_count:(h.objects||[]).length,
    decision:h.decision??null
  });
}

const proposal={
  schema_version:'ARCHITECTON-INTEGRATION-PROPOSAL-1.0',
  generated_at:new Date().toISOString(),
  mode:'PROPOSAL_ONLY',
  auto_apply:false,
  auto_publish:false,
  canonical_registry:'data/architecton/portfolio-40.json',
  handoff_count:handoffs.length,
  object_count:handoffs.reduce((n,h)=>n+h.object_count,0),
  canonical_collision_count:handoffs.reduce((n,h)=>n+h.collisions_with_canonical.length,0),
  handoffs,
  required_human_actions:[
    'Review source and execution provenance.',
    'Check duplicate canonical IDs and cross-souche references.',
    'Approve or reject each proposed object.',
    'Only then update the canonical registry and public projection.'
  ]
};

fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(outFile,JSON.stringify(proposal,null,2)+'\n');
console.log(`Wrote ${outFile}: handoffs=${proposal.handoff_count}, objects=${proposal.object_count}`);
