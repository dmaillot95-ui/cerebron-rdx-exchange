import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='dist';
const out='dist/api/v1/release-manifest.json';
const relOut='api/v1/release-manifest.json';

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
const manifest={
  schema:'RDX_RELEASE_MANIFEST_V1',
  hash_algorithm:'SHA-256',
  scope:'dist/** excluding api/v1/release-manifest.json',
  file_count:entries.length,
  aggregate_sha256:crypto.createHash('sha256').update(canonical).digest('hex'),
  files:entries
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(manifest,null,2)+'\n');
console.log(`Built RDX release manifest: ${entries.length} files, aggregate ${manifest.aggregate_sha256}`);
