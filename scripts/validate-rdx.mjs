import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packsDir = path.join(root, 'data', 'packs');
const allowedRelations = new Set([
  'SUPPORTS', 'CONTRADICTS', 'QUALIFIES',
  'REPLICATES', 'FAILS_TO_REPLICATE', 'CONTEXT_ONLY'
]);
const publishable = new Set(['VERIFIED', 'LIMITED', 'PUBLISHED']);

function fail(errors, location, message) {
  errors.push(`${location}: ${message}`);
}

function validatePack(pack, filename) {
  const errors = [];
  const warnings = [];
  const loc = filename;

  if (!/^RDX-[0-9]{6}$/.test(pack.id || '')) fail(errors, loc, 'invalid RDX id');
  if (!pack.title) fail(errors, loc, 'title is required');
  if (!pack.decision_question) fail(errors, loc, 'decision_question is required');
  if (!pack.scope || typeof pack.scope !== 'object') fail(errors, loc, 'scope is required');
  if (!Array.isArray(pack.claims)) fail(errors, loc, 'claims must be an array');

  const ids = new Set();
  const sourceIds = new Set((pack.sources || []).map(s => s.id));
  const executionIds = new Set((pack.executions || []).map(e => e.id));

  for (const source of pack.sources || []) {
    const sLoc = `${loc}:${source.id || 'SRC-UNKNOWN'}`;
    if (!/^SRC-[0-9]{6}$/.test(source.id || '')) fail(errors, sLoc, 'invalid source id');
    if (!source.title || !source.source_type) fail(errors, sLoc, 'title and source_type are required');
    if (!source.accessed_at) fail(errors, sLoc, 'accessed_at is required');
    if (!source.license_status) fail(errors, sLoc, 'license_status is required');
    if (!source.independence_group) fail(errors, sLoc, 'independence_group is required');
    if (publishable.has(pack.status) && source.license_status === 'UNKNOWN') {
      fail(errors, sLoc, 'publishable pack cannot use a source with UNKNOWN license');
    }
  }

  for (const execution of pack.executions || []) {
    const eLoc = `${loc}:${execution.id || 'EXEC-UNKNOWN'}`;
    if (!['CALCULATION', 'REAL_TEST', 'SIMULATION'].includes(execution.kind)) {
      fail(errors, eLoc, 'execution kind must explicitly separate calculation, real test, or simulation');
    }
    if (!execution.protocol) fail(errors, eLoc, 'protocol is required');
    if (publishable.has(pack.status) && !execution.artifact_sha256) {
      fail(errors, eLoc, 'publishable execution requires artifact_sha256');
    }
  }

  for (const claim of pack.claims || []) {
    const cLoc = `${loc}:${claim.id || 'CLM-UNKNOWN'}`;
    if (!/^CLM-[0-9]{6}$/.test(claim.id || '')) fail(errors, cLoc, 'invalid claim id');
    if (ids.has(claim.id)) fail(errors, cLoc, 'duplicate claim id');
    ids.add(claim.id);
    if (!claim.statement) fail(errors, cLoc, 'statement is required');
    if (!claim.scope || typeof claim.scope !== 'object') fail(errors, cLoc, 'scope is required');
    if (!Number.isInteger(claim.evidence_level) || claim.evidence_level < 0 || claim.evidence_level > 8) {
      fail(errors, cLoc, 'evidence_level must be an integer from 0 to 8');
    }
    if (!Array.isArray(claim.evidence)) fail(errors, cLoc, 'evidence must be an array');
    for (const ev of claim.evidence || []) {
      if (!allowedRelations.has(ev.relation)) fail(errors, cLoc, `invalid evidence relation ${ev.relation}`);
      if (ev.source_id && !sourceIds.has(ev.source_id)) fail(errors, cLoc, `unknown source ${ev.source_id}`);
      if (ev.execution_id && !executionIds.has(ev.execution_id)) fail(errors, cLoc, `unknown execution ${ev.execution_id}`);
      if (!ev.source_id && !ev.execution_id) fail(errors, cLoc, 'evidence needs a source_id or execution_id');
    }
    if (claim.material && publishable.has(pack.status) && (claim.evidence || []).length === 0) {
      fail(errors, cLoc, 'material publishable claim has no evidence');
    }
    if (claim.evidence_level >= 4) {
      const independent = new Set((claim.evidence || []).map(e => e.independence_group).filter(Boolean));
      if (independent.size < 2) fail(errors, cLoc, 'E4+ requires at least two declared independence groups');
    }
    const simulationOnly = (claim.evidence || []).length > 0 && (claim.evidence || []).every(e => {
      const execution = (pack.executions || []).find(x => x.id === e.execution_id);
      return execution?.kind === 'SIMULATION';
    });
    if (simulationOnly && claim.evidence_level > 3) {
      fail(errors, cLoc, 'simulation-only claim cannot exceed E3');
    }
  }

  if (publishable.has(pack.status)) {
    if (!Array.isArray(pack.audits) || pack.audits.length === 0) fail(errors, loc, 'publishable pack requires an audit');
    if (!pack.human_review?.completed) fail(errors, loc, 'publishable pack requires completed human review');
    if (!pack.version?.manifest_sha256) fail(errors, loc, 'publishable pack requires immutable version manifest hash');
  } else {
    warnings.push(`${loc}: draft is structurally checked but not publication-approved`);
  }

  return { errors, warnings };
}

if (!fs.existsSync(packsDir)) {
  console.error(`Missing packs directory: ${packsDir}`);
  process.exit(1);
}

const files = fs.readdirSync(packsDir).filter(name => name.endsWith('.json')).sort();
if (files.length === 0) {
  console.error('No RDX packs found');
  process.exit(1);
}

let errorCount = 0;
for (const file of files) {
  const full = path.join(packsDir, file);
  let pack;
  try {
    pack = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    console.error(`${file}: invalid JSON: ${error.message}`);
    errorCount += 1;
    continue;
  }
  const { errors, warnings } = validatePack(pack, file);
  warnings.forEach(w => console.warn(`WARN ${w}`));
  errors.forEach(e => console.error(`FAIL ${e}`));
  errorCount += errors.length;
  if (errors.length === 0) console.log(`PASS ${file}`);
}

if (errorCount > 0) {
  console.error(`RDX Evidence Gate: FAIL (${errorCount} error${errorCount > 1 ? 's' : ''})`);
  process.exit(1);
}

console.log(`RDX Evidence Gate: PASS (${files.length} pack${files.length > 1 ? 's' : ''})`);

