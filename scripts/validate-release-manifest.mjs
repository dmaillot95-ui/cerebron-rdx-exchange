import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root='dist';
const file='dist/api/v1/release-manifest.json';
const errors=[];
if(!fs.existsSync(file)){
  console.error('FAIL missing '+file);
  process.exit(1);
}
let m;
try{m=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){console.error('FAIL invalid manifest: '+e.message);process.exit(1)}
if(m.schema!=='RDX_RELEASE_MANIFEST_V1') errors.push('schema mismatch');
if(m.hash_algorithm!=='SHA-256') errors.push('hash_algorithm must be SHA-256');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=path.join(dir,ent.name);
    return ent.isDirectory()?walk(p):[p];
  });
}
const actual=new Map();
for(const p of walk(root)){
  const rel=path.relative(root,p).replaceAll('\\','/');
  if(rel==='api/v1/release-manifest.json') continue;
  const buf=fs.readFileSync(p);
  actual.set(rel,{path:rel,bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')});
}
const listed=new Map((m.files||[]).map(e=>[e.path,e]));
for(const [p,a] of actual){
  const e=listed.get(p);
  if(!e){errors.push('manifest missing '+p);continue}
  if(e.bytes!==a.bytes) errors.push('byte size mismatch '+p);
  if(e.sha256!==a.sha256) errors.push('sha256 mismatch '+p);
}
for(const p of listed.keys()) if(!actual.has(p)) errors.push('manifest lists absent file '+p);
if(m.file_count!==actual.size) errors.push(`file_count expected ${actual.size}, got ${m.file_count}`);
const entries=[...actual.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const canonical=entries.map(e=>`${e.sha256} ${e.bytes} ${e.path}`).join('\n')+'\n';
const aggregate=crypto.createHash('sha256').update(canonical).digest('hex');
if(m.aggregate_sha256!==aggregate) errors.push('aggregate_sha256 mismatch');
if(errors.length){
  errors.forEach(e=>console.error('FAIL '+e));
  console.error('RDX Release Manifest Gate: FAIL');
  process.exit(1);
}
console.log(`RDX Release Manifest Gate: PASS (${actual.size} files, aggregate ${aggregate})`);
