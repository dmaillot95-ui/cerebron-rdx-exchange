import fs from 'node:fs';
import crypto from 'node:crypto';

const manifestPath='dist/api/v1/release-manifest.json';
const provenancePath='dist/api/v1/build-provenance.json';
if(!fs.existsSync(manifestPath)||!fs.existsSync(provenancePath)){
  console.error('FAIL release manifest and build provenance are required');
  process.exit(1);
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const provenance=JSON.parse(fs.readFileSync(provenancePath,'utf8'));
if(manifest.source_commit!==provenance.source_commit){
  console.error('FAIL manifest/provenance source commit mismatch');
  process.exit(1);
}
const manifestBytes=fs.readFileSync(manifestPath);
const manifestSha256=crypto.createHash('sha256').update(manifestBytes).digest('hex');
const claims={
  schema:'RDX_RELEASE_ATTESTATION_V1',
  source_repository:provenance.source_repository,
  source_commit:provenance.source_commit,
  manifest_path:'api/v1/release-manifest.json',
  manifest_sha256:manifestSha256,
  release_aggregate_sha256:manifest.aggregate_sha256,
  release_file_count:manifest.file_count,
  hash_algorithm:'SHA-256',
  attestation_type:'SELF_ATTESTED_BUILD_FACTS_NOT_EXTERNAL_SIGNATURE'
};
const canonical=JSON.stringify(claims);
const attestation={...claims,attestation_sha256:crypto.createHash('sha256').update(canonical).digest('hex')};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-release-attestation.json',JSON.stringify(attestation,null,2)+'\n');
console.log('Built RDX release attestation '+attestation.attestation_sha256);
