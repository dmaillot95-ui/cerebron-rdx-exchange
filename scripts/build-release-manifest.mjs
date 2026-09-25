import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='dist';
const out='dist/api/v1/release-manifest.json';
const relOut='api/v1/release-manifest.json';
const provenancePath='api/v1/build-provenance.json';

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}
const files=walk(root)
  .map(p=>path.relative(root,p).replaceAll('\\','/'))
  .filter(p=>p!==relOut)
  .sort();

const entries=files.map(rel=>{
  const buf=fs.readFileSync(path.join(root,rel));
  return {path:rel,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')};
});
const canonical=entries.map(e=>`${e.sha256} ${e.bytes} ${e.path}`).join('\n')+'\n';
if(!fs.existsSync(path.join(root,provenancePath))){
  console.error('FAIL missing '+provenancePath+'; run build-provenance first');
  process.exit(1);
}
const provenance=JSON.parse(fs.readFileSync(path.join(root,provenancePath),'utf8'));
if(provenance.schema!=='RDX_BUILD_PROVENANCE_V1'||!/^[0-9a-f]{40}$/.test(provenance.source_commit||'')){
  console.error('FAIL invalid build provenance');
  process.exit(1);
}
const manifest={
  schema:'RDX_RELEASE_MANIFEST_V1',
  hash_algorithm:'SHA-256',
  source_commit:provenance.source_commit,
  provenance_path:provenancePath,
  scope:'dist/** excluding api/v1/release-manifest.json',
  file_count:entries.length,
  aggregate_sha256:crypto.createHash('sha256').update(canonical).digest('hex'),
  files:entries
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(manifest,null,2)+'\n');
console.log(`Built RDX release manifest: ${entries.length} files, aggregate ${manifest.aggregate_sha256}`);
