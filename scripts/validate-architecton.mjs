import fs from 'node:fs';

const path = 'data/architecton/portfolio-40.json';
const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

if (!fs.existsSync(path)) {
  console.error(`ARCHITECTON Registry Gate: FAIL (missing ${path})`);
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (error) {
  console.error(`ARCHITECTON Registry Gate: FAIL (invalid JSON: ${error.message})`);
  process.exit(1);
}

const souches = Array.isArray(registry.souches) ? registry.souches : [];
const allowedStatuses = new Set(registry.allowed_statuses || []);
const allowedPhases = new Set(registry.pre_rnd_phases || []);
const ids = new Set();

if (registry.schema_version !== 'ARCHITECTON-40-REGISTRY-1.0') fail('unexpected schema_version');
if (registry.mode !== 'CONTROLLED_MANUAL') fail('mode must remain CONTROLLED_MANUAL');
if (registry.canonical_registry !== true) fail('canonical_registry must be true');
if (souches.length !== 40) fail(`expected exactly 40 souches, found ${souches.length}`);

for (const s of souches) {
  const loc = s?.id || 'S??';
  if (!/^S(?:0[1-9]|[1-3][0-9]|40)$/.test(loc)) fail(`${loc}: invalid souche id`);
  if (ids.has(loc)) fail(`${loc}: duplicate souche id`);
  ids.add(loc);

  if (!s.name) fail(`${loc}: name required`);
  if (!s.group) fail(`${loc}: group required`);
  if (!allowedStatuses.has(s.status)) fail(`${loc}: invalid status ${s.status}`);
  if (s.phase !== null && !allowedPhases.has(s.phase)) fail(`${loc}: invalid phase ${s.phase}`);
  if (!/^E[0-8]$/.test(s.evidence_max || '')) fail(`${loc}: invalid evidence_max`);
  if (!Array.isArray(s.executions)) fail(`${loc}: executions must be an array`);
  if (!Array.isArray(s.source_register)) fail(`${loc}: source_register must be an array`);
  if (!Array.isArray(s.claim_register)) fail(`${loc}: claim_register must be an array`);

  if (s.status === 'QUEUED' && s.phase !== null) fail(`${loc}: QUEUED cannot have an active phase`);
  if (s.status === 'QUEUED' && s.executions.length > 0) fail(`${loc}: QUEUED cannot claim executions`);

  if (['PRE_RND_ACTIVE','PRE_RND_AUDIT'].includes(s.status) && s.phase === null) {
    fail(`${loc}: active/audit status requires a phase`);
  }

  if (['PRE_RND_FROZEN','READY_FOR_F01_F08','F01_F08_ACTIVE','ARCHITECTON_FROZEN','RDX_CANDIDATE'].includes(s.status)
      && !s.freeze_package) {
    fail(`${loc}: ${s.status} requires freeze_package`);
  }

  const execIds = new Set();
  for (const ex of s.executions || []) {
    const eid = ex?.EXEC_ID || ex?.id;
    if (!/^EXEC-[0-9]{6}$/.test(eid || '')) fail(`${loc}: execution missing valid EXEC_ID`);
    if (execIds.has(eid)) fail(`${loc}: duplicate execution ${eid}`);
    execIds.add(eid);
    const required = ['SOUCHE_ID','FERME','MODEL_OR_AGENT','ROLE','MISSION','INPUT_HASH','OUTPUT_HASH','START','END','ARTIFACT','STATUS'];
    for (const key of required) {
      if (ex[key] === undefined || ex[key] === null || ex[key] === '') fail(`${loc}:${eid}: missing ${key}`);
    }
    if (ex.SOUCHE_ID && ex.SOUCHE_ID !== loc) fail(`${loc}:${eid}: SOUCHE_ID mismatch`);
  }
}

for (let i = 1; i <= 40; i++) {
  const expected = `S${String(i).padStart(2,'0')}`;
  if (!ids.has(expected)) fail(`missing ${expected}`);
}

const seenInWaves = new Map();
for (const [wave, members] of Object.entries(registry.waves || {})) {
  if (!/^WAVE-0[1-8]$/.test(wave)) fail(`${wave}: invalid wave id`);
  if (!Array.isArray(members) || members.length !== 5) fail(`${wave}: expected exactly 5 souches`);
  for (const id of members || []) {
    if (!ids.has(id)) fail(`${wave}: unknown souche ${id}`);
    seenInWaves.set(id, (seenInWaves.get(id) || 0) + 1);
  }
}
for (const id of ids) {
  if ((seenInWaves.get(id) || 0) !== 1) fail(`${id}: must appear in exactly one wave`);
}

for (const [id, deps] of Object.entries(registry.cross_souche_dependencies || {})) {
  if (!ids.has(id)) fail(`dependency graph has unknown source ${id}`);
  if (!Array.isArray(deps)) fail(`${id}: dependencies must be an array`);
  for (const dep of deps || []) {
    if (!ids.has(dep)) fail(`${id}: unknown dependency ${dep}`);
    if (dep === id) fail(`${id}: self-dependency forbidden`);
  }
}

warnings.forEach(w => console.warn(`WARN ${w}`));
errors.forEach(e => console.error(`FAIL ${e}`));

if (errors.length) {
  console.error(`ARCHITECTON Registry Gate: FAIL (${errors.length} error${errors.length > 1 ? 's' : ''})`);
  process.exit(1);
}

console.log('PASS portfolio-40.json');
console.log('ARCHITECTON Registry Gate: PASS (40 souches, 8 waves)');
