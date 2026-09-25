import fs from 'node:fs';

const gates=JSON.parse(fs.readFileSync('config/architecton-phase-gates.json','utf8'));
const registry=JSON.parse(fs.readFileSync('data/architecton/portfolio-40.json','utf8'));
const log=JSON.parse(fs.readFileSync('data/architecton/integration-log.json','utf8'));

const approved=(log.entries||[]).filter(e=>e && e.decision==='APPROVED');
const phaseOrder=['M01','M02','M03','M04','M05','M06'];
const proposals=[];

for(const s of registry.souches||[]){
  const bySouche=approved.filter(e=>e.souche_id===s.id);
  const approvedPhases=new Set(bySouche.map(e=>e.phase));
  let next='M01';
  for(const p of phaseOrder){
    if(approvedPhases.has(p)){
      next=(gates.phases.find(x=>x.id===p)||{}).next||null;
    } else {
      next=p;
      break;
    }
  }

  if(next==='M01'){
    proposals.push({
      souche_id:s.id,
      canonical_status:s.status,
      proposed_phase:'M01',
      proposal_status:'ALREADY_PREPARED',
      reason:'M01 work order exists; no approved M01 integration yet.',
      auto_apply:false
    });
    continue;
  }

  if(next==='F01_F08'){
    const m06=bySouche.find(e=>e.phase==='M06' && e.decision==='APPROVED');
    proposals.push({
      souche_id:s.id,
      canonical_status:s.status,
      proposed_phase:'F01_F08',
      proposal_status:'REVIEW_REQUIRED',
      reason:'M06 has approved integration; verify freeze package and READY gate before F01→F08.',
      source_integration_entry:m06?.integration_id||null,
      auto_apply:false
    });
    continue;
  }

  const prev=phaseOrder[phaseOrder.indexOf(next)-1];
  const prior=bySouche.find(e=>e.phase===prev && e.decision==='APPROVED');
  proposals.push({
    souche_id:s.id,
    canonical_status:s.status,
    proposed_phase:next,
    proposal_status:'READY_TO_PREPARE_WORK_ORDER',
    unlocked_by_phase:prev,
    source_integration_entry:prior?.integration_id||null,
    auto_apply:false
  });
}

const out={
  schema_version:'ARCHITECTON-PHASE-ADVANCE-PROPOSAL-1.0',
  generated_at:new Date().toISOString(),
  mode:'PROPOSAL_ONLY',
  auto_apply:false,
  approved_integration_entries:approved.length,
  proposals
};

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/architecton-phase-advance-proposal.json',JSON.stringify(out,null,2)+'\n');
console.log(`Phase proposals: ${proposals.length}; approved integrations: ${approved.length}`);
