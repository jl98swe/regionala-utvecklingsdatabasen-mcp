import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import assert from 'node:assert/strict';
const url=process.argv[2]??'http://127.0.0.1:8787/mcp';
const c=new Client({name:'regionala-utvecklingsdatabasen-smoke',version:'1.0.0'});
await c.connect(new StreamableHTTPClientTransport(new URL(url),{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30_000)})}));
try{
 const tools=await c.listTools();assert.equal(tools.tools.length,4);
 assert.equal(c.getServerVersion()?.version,'0.3.0');
 for(const name of ['sok_variabler','hamta_kodmall'])assert.match(tools.tools.find(t=>t.name===name)!.description!,/inget ska sparas/);
 const support=await c.callTool({name:'hamta_kodmall',arguments:{mall:'projektstod'}});
 assert.notEqual(support.isError,true);
 assert.equal((support.structuredContent as {project_support:{version:string}}).project_support.version,'1.3');
 console.log(JSON.stringify({tool:'hamta_kodmall',case:'updated_project_support',status:'PASS'}));
 for(const [name,args] of [
  ['sok_variabler',{sokterm:'personnummer',databasvy:'rtb'}],
  ['hamta_registerstruktur',{databasvy:'bas_prelmanad'}],
  ['kontrollera_tillganglighet',{urval:[{databasvy:'rtb',variabler:['Kommun'],perioder:[2024]}]}],
  ['hamta_kodmall',{mall:'kombinera_register',urval:[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS'],period:2020}]}]
 ] as const){const result=await c.callTool({name,arguments:args});assert.notEqual(result.isError,true);assert.ok(result.structuredContent);console.log(JSON.stringify({tool:name,status:'PASS'}));}
 console.log(JSON.stringify({client:'official MCP TypeScript SDK',transport:'Streamable HTTP',url,status:'PASS'}));
}finally{await c.close();}
