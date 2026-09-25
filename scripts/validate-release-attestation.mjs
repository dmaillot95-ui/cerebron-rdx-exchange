import fs from 'node:fs';
import crypto from 'node:crypto';

const file='artifacts/rdx-release-attestation.json';
const manifestPath='dist/api/v1/release-manifest.json';
const provenancePath='dist/api/v1/build-provenance.json';
const errors=[];
if(!fs.existsSync(file)) errors.push('missing '+file);
if(!fs.existsSync(manifestPath)) errors.push('missing '+manifestPath);
if(!fs.existsSync(provenancePath)) errors.push('missing '+provenancePath);
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Release Attestation Gate: FAIL');
  process.exit(1);
}

const a=JSON.parse(fs.readFileSync(file,'utf8'));
const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const p=JSON.parse(fs.readFileSync(provenancePath,'utf8'));
if(a.schema!=='RDX_RELEASE_ATTESTATION_V1') errors.push('schema mismatch');
if(a.attestation_type!=='SELF_ATTESTED_BUILD_FACTS_NOT_EXTERNAL_SIGNATURE') errors.push('attestation_type mismatch');
if(a.source_commit!==m.source_commit||a.source_commit!==p.source_commit) errors.push('source_commit mismatch');
if(a.release_aggregate_sha256!==m.aggregate_sha256) errors.push('release aggregate mismatch');
if(a.release_file_count!==m.file_count) errors.push('file_count mismatch');
const manifestSha=crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex');
if(a.manifest_sha256!==manifestSha) errors.push('manifest_sha256 mismatch');

const claims={
  schema:a.schema,
  source_repository:a.source_repository,
  source_commit:a.source_commit,
  manifest_path:a.manifest_path,
  manifest_sha256:a.manifest_sha256,
  release_aggregate_sha256:a.release_aggregate_sha256,
  release_file_count:a.release_file_count,
  hash_algorithm:a.hash_algorithm,
  attestation_type:a.attestation_type
};
const expected=crypto.createHash('sha256').update(JSON.stringify(claims)).digest('hex');
if(a.attestation_sha256!==expected) errors.push('attestation_sha256 mismatch');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Release Attestation Gate: FAIL');
  process.exit(1);
}
console.log('RDX Release Attestation Gate: PASS source='+a.source_commit+' attestation='+a.attestation_sha256);
