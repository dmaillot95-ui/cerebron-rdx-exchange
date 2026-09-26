import { validatePublicHttpsDeploymentUrl } from './lib/public-deployment-url.mjs';

const valid=[
  'https://dmaillot95-ui.github.io/cerebron-rdx-exchange/',
  'https://rdx.maillot.fr/',
  'https://8.8.8.8/'
];
const invalid=[
  ['http://rdx.maillot.fr/','https'],
  ['https://localhost/','reserved or local'],
  ['https://rdx.local/','reserved or local'],
  ['https://127.0.0.1/','not globally routable'],
  ['https://10.0.0.7/','not globally routable'],
  ['https://172.16.0.1/','not globally routable'],
  ['https://192.168.1.5/','not globally routable'],
  ['https://169.254.1.1/','not globally routable'],
  ['https://100.64.0.1/','not globally routable'],
  ['https://192.0.2.8/','not globally routable'],
  ['https://198.51.100.8/','not globally routable'],
  ['https://203.0.113.8/','not globally routable'],
  ['https://[::1]/','not globally routable'],
  ['https://[fd00::1]/','not globally routable'],
  ['https://rdx.invalid/','reserved or local'],
  ['https://user:pass@rdx.maillot.fr/','credentials'],
  ['https://rdx.maillot.fr/?token=x','query'],
  ['https://rdx.maillot.fr/#debug','fragment']
];

const errors=[];
for(const url of valid){
  const r=validatePublicHttpsDeploymentUrl(url);
  if(!r.ok) errors.push('valid URL rejected '+url+' :: '+r.errors.join('; '));
}
for(const [url,expected] of invalid){
  const r=validatePublicHttpsDeploymentUrl(url);
  if(r.ok) errors.push('invalid URL accepted '+url);
  else if(!r.errors.some(x=>x.includes(expected))) errors.push('wrong rejection for '+url+' :: '+r.errors.join('; '));
}

if(errors.length){
  for(const e of errors) console.error('FAIL '+e);
  console.error('RDX Public HTTPS Deployment URL Policy Canary: FAIL');
  process.exit(1);
}
console.log('RDX Public HTTPS Deployment URL Policy Canary: PASS valid='+valid.length+' rejected='+invalid.length);
