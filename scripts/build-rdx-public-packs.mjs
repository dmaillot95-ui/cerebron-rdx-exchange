import fs from 'node:fs';
import path from 'node:path';

const srcDir='data/packs';
const outApi='dist/api/v1/packs';
const outHtml='dist/dossiers';
fs.mkdirSync(outApi,{recursive:true});
fs.mkdirSync(outHtml,{recursive:true});

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files=fs.readdirSync(srcDir).filter(x=>x.endsWith('.json')).sort();

for(const file of files){
  const p=JSON.parse(fs.readFileSync(path.join(srcDir,file),'utf8'));
  const maxEvidence=Math.max(0,...(p.claims||[]).map(c=>Number(c.evidence_level)||0));
  const publicPack={
    schema_version:'RDX-PUBLIC-PACK-1.1',
    id:p.id,title:p.title,decision_question:p.decision_question,vertical:p.vertical,status:p.status,
    publication_status:['VERIFIED','LIMITED','PUBLISHED'].includes(p.status)?p.status:'NOT_VERIFIED_NOT_PUBLISHED',
    human_review_completed:Boolean(p.human_review?.completed),
    scope:p.scope||{},
    evidence_summary:{
      highest_claim_evidence_level:maxEvidence,
      material_claims:(p.claims||[]).filter(c=>c.material).length,
      sources:(p.sources||[]).length,
      executions:(p.executions||[]).length,
      audits:(p.audits||[]).length
    },
    claims:(p.claims||[]).map(c=>({
      id:c.id,evidence_level:c.evidence_level,statement:c.statement,
      evidence:(c.evidence||[]).map(e=>({
        source_id:e.source_id??null,execution_id:e.execution_id??null,relation:e.relation,
        independence_group:e.independence_group??null,extract_locator:e.extract_locator??null
      }))
    })),
    sources:(p.sources||[]).map(s=>({id:s.id,title:s.title,author_or_org:s.author_or_org,url:s.url,source_type:s.source_type,license_status:s.license_status})),
    open_work:p.open_work||[],
    claim_ceiling:['VERIFIED','LIMITED','PUBLISHED'].includes(p.status)?'PACK_STATUS_CONTROLS_PUBLIC_CLAIMS':'SOURCED_OR_DRAFT_PREVIEW_ONLY_NO_VERIFIED_DECISION_CLAIM'
  };
  fs.writeFileSync(path.join(outApi,p.id+'.json'),JSON.stringify(publicPack,null,2)+'\n');

  const evidenceHtml=e=>`<li><b>${esc(e.relation)}</b> · ${e.source_id?`<a href="#${esc(e.source_id)}">${esc(e.source_id)}</a>`:esc(e.execution_id||'EVIDENCE')}${e.independence_group?` · groupe ${esc(e.independence_group)}`:''}${e.extract_locator?`<div class="muted">Locator : ${esc(e.extract_locator)}</div>`:''}</li>`;
  const claims=publicPack.claims.map(c=>`<div class="claim"><b>${esc(c.id)} · E${esc(c.evidence_level)}</b><div>${esc(c.statement)}</div><ul class="evidence-list">${(c.evidence||[]).map(evidenceHtml).join('')}</ul></div>`).join('');
  const sources=publicPack.sources.map(s=>`<div class="source" id="${esc(s.id)}"><b>${esc(s.id)}</b> · ${esc(s.author_or_org)}<br><a href="${esc(s.url)}" rel="noreferrer">${esc(s.title)}</a><div class="muted">${esc(s.source_type)} · licence: ${esc(s.license_status)}</div></div>`).join('');
  const work=publicPack.open_work.map(x=>`<li>${esc(x)}</li>`).join('');
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${esc(p.id)} — Fiche de preuve</title><style>:root{--bg:#070a12;--panel:#101624;--text:#f3f6fb;--muted:#9ca9bd;--line:#263247;--aqua:#6ee7d8;--amber:#f2c66d;--max:1080px}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}.wrap{width:min(var(--max),calc(100% - 32px));margin:auto}.nav{border-bottom:1px solid var(--line);padding:18px 0}.nav a,a{color:var(--aqua)}.hero{padding:62px 0 34px}.eyebrow{color:var(--aqua);font-weight:800}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:22px;padding:26px 0 60px}.panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:24px}.claim,.source{padding:14px 0;border-top:1px solid var(--line)}.evidence-list{margin:10px 0 0;padding-left:22px}.evidence-list li{margin:8px 0}.muted{color:var(--muted)}.warning{border-left:4px solid var(--amber);padding:14px 16px;background:#171613}.pill{display:inline-block;border:1px solid var(--line);padding:7px 11px;border-radius:999px;margin:4px}@media(max-width:800px){.grid{grid-template-columns:1fr}}</style></head><body><div class="nav"><div class="wrap"><a href="../index.html">← CÉRÉBRON R&D EXCHANGE</a></div></div><main><section class="hero"><div class="wrap"><div class="eyebrow">${esc(p.id)} · fiche de preuve</div><h1>${esc(p.title)}</h1><p>${esc(p.decision_question)}</p><span class="pill">${esc(p.status)}</span><span class="pill">E${maxEvidence} max</span></div></section><div class="wrap"><div class="warning"><strong>Claim ceiling :</strong> ${esc(publicPack.claim_ceiling)}</div><div class="grid"><div class="panel"><h2>Claims et preuves liées</h2>${claims}</div><aside><div class="panel"><h2>Travaux ouverts</h2><ul>${work}</ul></div></aside></div><div class="panel"><h2>Sources</h2>${sources}</div></div></main></body></html>`;
  fs.writeFileSync(path.join(outHtml,p.id+'.html'),html);
}
console.log(`Built ${files.length} public RDX pack projection(s)`);
