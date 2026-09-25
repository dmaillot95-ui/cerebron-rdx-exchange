import fs from 'node:fs';
import crypto from 'node:crypto';

const raw=process.env.RDX_BASE_URL||process.argv[2];
if(!raw){
  console.error('RDX_BASE_URL or URL argument is required');
  process.exit(2);
}
const base=new URL(raw.endsWith('/')?raw:raw+'/');
const checks=[
  {path:'',kind:'text',must:['CÉRÉBRON R&D EXCHANGE','RDX_CLIENT_REQUEST_V1']},
  {path:'api/v1/status.json',kind:'json',mustJson:s=>s?.service==='CEREBRON_RDX_EXCHANGE'&&s?.production_mode==='CONTROLLED_MANUAL'},
  {path:'api/v1/catalog.json',kind:'json',mustJson:c=>Array.isArray(c?.packs)&&c.packs.some(p=>p.id==='RDX-000001')},
  {path:'api/v1/packs/RDX-000001.json',kind:'json',mustJson:p=>p?.id==='RDX-000001'&&p?.publication_status==='NOT_VERIFIED_NOT_PUBLISHED'},
  {path:'api/v1/release-manifest.json',kind:'json',mustJson:m=>m?.schema==='RDX_RELEASE_MANIFEST_V1'&&m?.hash_algorithm==='SHA-256'}
];

const results=[];
let manifest=null;
for(const check of checks){
  const url=new URL(check.path,base).href;
  let res;
  try{res=await fetch(url,{redirect:'follow',headers:{'user-agent':'cerebron-rdx-live-verify/1'}})}
  catch(e){results.push({url,status:'NETWORK_ERROR',error:String(e)});continue}
  const body=await res.text();
  const item={url,http_status:res.status,ok:res.ok,bytes:Buffer.byteLength(body)};
  if(!res.ok){item.status='HTTP_FAIL';results.push(item);continue}
  if(check.kind==='text'){
    const missing=(check.must||[]).filter(x=>!body.includes(x));
    item.status=missing.length?'CONTENT_FAIL':'PASS';
    if(missing.length)item.missing=missing;
  }else{
    try{
      const parsed=JSON.parse(body);
      item.status=check.mustJson(parsed)?'PASS':'SEMANTIC_FAIL';
      if(check.path.endsWith('release-manifest.json')) manifest=parsed;
    }catch(e){
      item.status='JSON_FAIL';item.error=String(e);
    }
  }
  results.push(item);
}
const failed=results.filter(r=>r.status!=='PASS');
const proof={
  schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V1',
  verified_at:new Date().toISOString(),
  base_url:base.href,
  github_sha:process.env.GITHUB_SHA||null,
  release_aggregate_sha256:manifest?.aggregate_sha256||null,
  release_file_count:manifest?.file_count??null,
  checks:results,
  status:failed.length?'FAIL':'PASS'
};
const canonical=JSON.stringify(proof);
proof.proof_sha256=crypto.createHash('sha256').update(canonical).digest('hex');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-production-deployment-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
if(failed.length) process.exit(1);
