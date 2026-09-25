import fs from 'node:fs';
import path from 'node:path';

const registryPath = 'data/architecton/portfolio-40.json';
const missionPlanPath = 'data/architecton/missions/architecton-40-plan.json';
const missionsRoot = 'data/architecton/missions';
const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(`${file}: invalid JSON: ${error.message}`); return null; }
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(registryPath)) {
  console.error(`ARCHITECTON Registry Gate: FAIL (missing ${registryPath})`);
  process.exit(1);
}

const registry = readJson(registryPath);
if (!registry) process.exit(1);

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

// Mission queue integrity.
if (!fs.existsSync(missionPlanPath)) {
  fail(`missing ${missionPlanPath}`);
} else {
  const plan = readJson(missionPlanPath);
  if (plan) {
    if (plan.schema_version !== 'ARCHITECTON-40-MISSION-PLAN-1.0') fail('mission plan: unexpected schema_version');
    if (plan.status !== 'PLANNED') fail('mission plan: global status must remain PLANNED until verified executions exist');
    if (plan.automatic_start !== false) fail('mission plan: automatic_start must be false');
    if (plan.automatic_spending !== false) fail('mission plan: automatic_spending must be false');
    if (plan.automatic_publication !== false) fail('mission plan: automatic_publication must be false');
    if (!Array.isArray(plan.waves) || plan.waves.length !== 8) fail('mission plan: expected 8 waves');

    const plannedIds = new Set();
    for (const wave of plan.waves || []) {
      if (!/^WAVE-0[1-8]$/.test(wave.wave || '')) fail(`mission plan: invalid wave ${wave.wave}`);
      if (wave.status !== 'PLANNED') fail(`${wave.wave}: wave must remain PLANNED until execution is registered`);
      if (wave.parallelism_target !== 5) warn(`${wave.wave}: parallelism_target differs from 5`);
      if (!Array.isArray(wave.souches) || wave.souches.length !== 5) fail(`${wave.wave}: expected 5 planned souches`);
      for (const m of wave.souches || []) {
        if (!ids.has(m.id)) fail(`${wave.wave}: unknown planned souche ${m.id}`);
        if (plannedIds.has(m.id)) fail(`mission plan: duplicate planned souche ${m.id}`);
        plannedIds.add(m.id);
        if (m.registry_status !== 'QUEUED') fail(`${m.id}: planned mission cannot override registry QUEUED state`);
        if (m.next_phase !== 'M01') fail(`${m.id}: initial next_phase must be M01`);
        if (m.mission_status !== 'PLANNED') fail(`${m.id}: initial mission_status must be PLANNED`);
      }
    }
    if (plannedIds.size !== 40) fail(`mission plan: expected 40 unique souches, found ${plannedIds.size}`);
  }
}

// Per-souche M01 work-order integrity.
const missionFiles = walk(missionsRoot)
  .filter(f => /S\d{2}-M01\.json$/.test(f))
  .sort();

for (const file of missionFiles) {
  const m = readJson(file);
  if (!m) continue;
  const id = m.souche_id || 'S??';
  if (m.schema_version !== 'ARCHITECTON-M01-MISSION-1.0') fail(`${file}: unexpected schema_version`);
  if (!ids.has(id)) fail(`${file}: unknown souche_id ${id}`);
  if (!/^WAVE-0[1-8]$/.test(m.wave || '')) fail(`${file}: invalid wave ${m.wave}`);
  const expectedWave = Object.entries(registry.waves || {}).find(([,members]) => (members || []).includes(id))?.[0];
  if (expectedWave && m.wave !== expectedWave) fail(`${file}: wave ${m.wave} does not match canonical ${expectedWave}`);
  if (m.phase !== 'M01') fail(`${file}: phase must be M01`);
  if (m.mission_status !== 'READY_TO_ASSIGN') fail(`${file}: mission_status must be READY_TO_ASSIGN, not an execution claim`);
  if (m.registry_status_required_before_execution !== 'QUEUED') fail(`${file}: must require QUEUED before execution`);
  if (m.registry_status_after_verified_start !== 'PRE_RND_ACTIVE') fail(`${file}: verified start must map to PRE_RND_ACTIVE`);
  if (m.automatic_start !== false || m.automatic_spending !== false || m.automatic_publication !== false) {
    fail(`${file}: automatic start/spending/publication must all be false`);
  }
  if (!Array.isArray(m.role_pool) || m.role_pool.length < 12 || m.role_pool.length > 20) {
    fail(`${file}: role_pool must contain 12 to 20 distinct useful roles`);
  }
  if (new Set(m.role_pool || []).size !== (m.role_pool || []).length) fail(`${file}: duplicate role in role_pool`);
  if (!Array.isArray(m.required_outputs) || m.required_outputs.length < 8) fail(`${file}: required_outputs incomplete`);
  for (const dep of m.dependency_refs || []) {
    if (!ids.has(dep)) fail(`${file}: unknown dependency_ref ${dep}`);
    if (dep === id) fail(`${file}: self dependency forbidden`);
  }
}

const missionSoucheIds = missionFiles.map(f => path.basename(f).slice(0,3));
const foundMissionIds = new Set(missionSoucheIds);
if (foundMissionIds.size !== missionSoucheIds.length) fail('M01 work orders: duplicate souche mission file detected');
if (foundMissionIds.size !== 40) fail(`M01 work orders: expected exactly 40 unique missions, found ${foundMissionIds.size}`);
for (const id of foundMissionIds) if (!ids.has(id)) fail(`M01 work orders: unexpected souche ${id}`);
for (const id of ids) if (!foundMissionIds.has(id)) fail(`M01 work orders: missing mission for ${id}`);

for (const [wave,members] of Object.entries(registry.waves || {})) {
  const expected = new Set(members || []);
  const actual = new Set(missionFiles
    .filter(f => f.includes(`/${wave}/`))
    .map(f => path.basename(f).slice(0,3)));
  if (actual.size !== 5) fail(`${wave}: expected exactly 5 M01 work orders, found ${actual.size}`);
  for (const id of expected) if (!actual.has(id)) fail(`${wave}: missing M01 work order for ${id}`);
  for (const id of actual) if (!expected.has(id)) fail(`${wave}: unexpected M01 work order for ${id}`);
}

warnings.forEach(w => console.warn(`WARN ${w}`));
errors.forEach(e => console.error(`FAIL ${e}`));

if (errors.length) {
  console.error(`ARCHITECTON Registry Gate: FAIL (${errors.length} error${errors.length > 1 ? 's' : ''})`);
  process.exit(1);
}

console.log('PASS portfolio-40.json');
console.log('PASS architecton-40-plan.json');
console.log(`PASS M01 work orders (${missionFiles.length})`);
console.log('ARCHITECTON Registry Gate: PASS');
