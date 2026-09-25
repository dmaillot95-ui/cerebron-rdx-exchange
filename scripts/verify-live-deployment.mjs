import fs from 'node:fs';
import crypto from 'node:crypto';

const raw=process.env.RDX_BASE_URL||process.argv[2];
if(!raw){
  console.error('RDX_BASE_URL or URL argument is required');
  process.exit(2);
}
const base=new URL(raw.endsWith('/')?raw:raw+'/');
const requestHeaders={'user-agent':'cerebron-rdx-live-verify/2'};
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
  try{res=await fetch(url,{redirect:'follow',cache:'no-store',headers:requestHeaders})}
  catch(e){results.push({path:check.path,url,status:'NETWORK_ERROR',error:String(e)});continue}
  const body=await res.text();
  const item={path:check.path,url,http_status:res.status,ok:res.ok,bytes:Buffer.byteLength(body)};
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

const bundleChecks=[];
let actualAggregate=null;
let manifestAggregateMatch=false;
if(manifest&&Array.isArray(manifest.files)){
  for(const entry of manifest.files){
    const url=new URL(entry.path,base).href;
    let res;
    try{res=await fetch(url,{redirect:'follow',cache:'no-store',headers:requestHeaders})}
    catch(e){
      bundleChecks.push({path:entry.path,url,status:'NETWORK_ERROR',error:String(e),expected_sha256:entry.sha256,expected_bytes:entry.bytes});
      continue;
    }
    if(!res.ok){
      bundleChecks.push({path:entry.path,url,status:'HTTP_FAIL',http_status:res.status,expected_sha256:entry.sha256,expected_bytes:entry.bytes});
      continue;
    }
    const buf=Buffer.from(await res.arrayBuffer());
    const sha256=crypto.createHash('sha256').update(buf).digest('hex');
    const bytes=buf.length;
    const shaMatch=sha256===entry.sha256;
    const bytesMatch=bytes===entry.bytes;
    bundleChecks.push({
      path:entry.path,
      url,
      status:shaMatch&&bytesMatch?'PASS':'MISMATCH',
      sha256,
      expected_sha256:entry.sha256,
      bytes,
      expected_bytes:entry.bytes,
      sha_match:shaMatch,
      bytes_match:bytesMatch
    });
  }

  const actualEntries=bundleChecks
    .filter(x=>x.sha256)
    .map(x=>({path:x.path,bytes:x.bytes,sha256:x.sha256}))
    .sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const canonical=actualEntries.map(e=>`${e.sha256} ${e.bytes} ${e.path}`).join('\n')+'\n';
  actualAggregate=crypto.createHash('sha256').update(canonical).digest('hex');
  manifestAggregateMatch=
    bundleChecks.length===manifest.file_count &&
    bundleChecks.every(x=>x.status==='PASS') &&
    actualEntries.length===manifest.file_count &&
    actualAggregate===manifest.aggregate_sha256;
}

const endpointFailures=results.filter(r=>r.status!=='PASS');
const bundleFailures=bundleChecks.filter(r=>r.status!=='PASS');
const manifestCountMatch=!!manifest&&bundleChecks.length===manifest.file_count;
const proof={
  schema:'RDX_PRODUCTION_DEPLOYMENT_PROOF_V2',
  verified_at:new Date().toISOString(),
  base_url:base.href,
  github_sha:process.env.GITHUB_SHA||null,
  release_manifest_schema:manifest?.schema||null,
  expected_release_aggregate_sha256:manifest?.aggregate_sha256||null,
  actual_release_aggregate_sha256:actualAggregate,
  release_file_count_expected:manifest?.file_count??null,
  release_file_count_checked:bundleChecks.length,
  manifest_file_count_match:manifestCountMatch,
  manifest_aggregate_match:manifestAggregateMatch,
  endpoint_checks:results,
  bundle_file_checks:bundleChecks,
  status:(!endpointFailures.length&&!bundleFailures.length&&manifestAggregateMatch)?'PASS':'FAIL'
};
const canonicalProof=JSON.stringify(proof);
proof.proof_sha256=crypto.createHash('sha256').update(canonicalProof).digest('hex');

fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/rdx-production-deployment-proof.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
if(proof.status!=='PASS') process.exit(1);
