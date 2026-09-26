import net from 'node:net';

const RESERVED_EXACT_HOSTS=new Set([
  'localhost','local','broadcasthost',
  'example.com','example.net','example.org'
]);
const RESERVED_SUFFIXES=['.localhost','.local','.internal','.invalid','.test','.example'];

function isNonPublicIpv4(host){
  const p=host.split('.').map(Number);
  if(p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255)) return true;
  const [a,b,c]=p;
  if(a===0||a===10||a===127) return true;
  if(a===100&&b>=64&&b<=127) return true;
  if(a===169&&b===254) return true;
  if(a===172&&b>=16&&b<=31) return true;
  if(a===192&&b===0&&c===0) return true;
  if(a===192&&b===0&&c===2) return true;
  if(a===192&&b===88&&c===99) return true;
  if(a===192&&b===168) return true;
  if(a===198&&(b===18||b===19)) return true;
  if(a===198&&b===51&&c===100) return true;
  if(a===203&&b===0&&c===113) return true;
  if(a>=224) return true;
  return false;
}

function isNonPublicIpv6(host){
  const h=host.replace(/^\[|\]$/g,'').toLowerCase();
  if(h==='::'||h==='::1') return true;
  if(h.startsWith('fc')||h.startsWith('fd')) return true;
  if(/^fe[89ab]/.test(h)) return true;
  if(h.startsWith('ff')) return true;
  if(h==='2001:db8::'||h.startsWith('2001:db8:')) return true;
  return false;
}

export function validatePublicHttpsDeploymentUrl(raw){
  const errors=[];
  let url=null;
  try{ url=new URL(raw); }
  catch{ return {ok:false,errors:['invalid deployment URL'],url:null}; }

  if(url.protocol!=='https:') errors.push('deployment URL must use https');
  if(url.username||url.password) errors.push('deployment URL must not contain credentials');
  if(url.search) errors.push('deployment URL must not contain query parameters');
  if(url.hash) errors.push('deployment URL must not contain a fragment');

  const host=url.hostname.replace(/\.$/,'').toLowerCase();
  if(!host) errors.push('deployment URL hostname missing');
  if(RESERVED_EXACT_HOSTS.has(host)||RESERVED_SUFFIXES.some(s=>host.endsWith(s))){
    errors.push('deployment hostname is reserved or local');
  }

  const bareHost=host.replace(/^\[|\]$/g,'');
  const ipKind=net.isIP(bareHost);
  if(ipKind===4&&isNonPublicIpv4(bareHost)) errors.push('deployment IPv4 address is not globally routable');
  if(ipKind===6&&isNonPublicIpv6(bareHost)) errors.push('deployment IPv6 address is not globally routable');
  if(ipKind===0&&!host.includes('.')) errors.push('deployment hostname must be a public DNS name');

  return {ok:errors.length===0,errors,url:errors.length?null:url};
}

export function requirePublicHttpsDeploymentUrl(raw){
  const result=validatePublicHttpsDeploymentUrl(raw);
  if(!result.ok) throw new Error(result.errors.join('; '));
  return result.url;
}
