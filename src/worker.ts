import {WebStandardStreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {createServer} from './server.js';
import {metadata,stamp} from './catalog.js';
import {keySummary} from './keys.js';
import {orderDomainStamp} from './order-domains.js';
const MAX_BODY=64*1024;
export default {
 async fetch(request:Request):Promise<Response>{
  const url=new URL(request.url);
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id','Access-Control-Expose-Headers':'MCP-Protocol-Version, MCP-Session-Id','X-Content-Type-Options':'nosniff'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(url.pathname==='/health')return Response.json({status:'ok',server_version:'0.7.0',keys:keySummary,...orderDomainStamp,template_version:'1.3',...stamp,records:metadata.antal_poster,views:metadata.antal_vyer},{headers:cors});
  if(url.pathname==='/')return Response.json({name:'Regionala utvecklingsdatabasen MCP',endpoint:'/mcp',transport:'Streamable HTTP',authentication:'none',read_only:true,mona_connection:false,...stamp},{headers:cors});
  if(url.pathname!=='/mcp')return new Response('Not found',{status:404,headers:cors});
  if(request.method!=='POST')return new Response('Use POST Streamable HTTP; no standalone SSE stream.',{status:405,headers:{...cors,Allow:'POST, OPTIONS'}});
  // Public anonymous metadata: any HTTPS web origin may read it. No cookies,
  // credentials, caller-controlled hosts, remote URLs or execution tools exist.
  if(request.headers.has('Origin')){
   try{const o=new URL(request.headers.get('Origin')!);if(o.protocol!=='https:' && o.hostname!=='localhost' && o.hostname!=='127.0.0.1')return new Response('Invalid origin',{status:403,headers:cors});}
   catch{return new Response('Invalid origin',{status:403,headers:cors});}
  }
  const reader=request.body?.getReader();if(!reader)return new Response('Missing body',{status:400,headers:cors});
  let size=0;const chunks:Uint8Array[]=[];
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BODY){await reader.cancel();return new Response('Request too large',{status:413,headers:cors});}chunks.push(value);}
  const body=new Uint8Array(size);let offset=0;for(const c of chunks){body.set(c,offset);offset+=c.length;}
  const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  const server=createServer();
  try{
   await server.connect(transport);
   const response=await transport.handleRequest(new Request(request.url,{method:'POST',headers:request.headers,body}));
   const headers=new Headers(response.headers);for(const [k,v] of Object.entries(cors))headers.set(k,v);
   // Buffer before cleanup: JSON-only replies have no long-lived stream.
   return new Response(await response.arrayBuffer(),{status:response.status,headers});
  }finally{await server.close();}
 }
};
