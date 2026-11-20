import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import assert from 'node:assert/strict';
const url=process.argv[2]??'http://127.0.0.1:8787/mcp';
const c=new Client({name:'regionala-utvecklingsdatabasen-smoke',version:'1.0.0'});
await c.connect(new StreamableHTTPClientTransport(new URL(url),{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(30_000)})}));
try{
 const tools=await c.listTools();assert.equal(tools.tools.length,7);
 assert.equal(c.getServerVersion()?.version,'0.5.0');
 for(const name of ['sok_variabler','hamta_kodmall'])assert.match(tools.tools.find(t=>t.name===name)!.description!,/inget ska sparas/);
 const support=await c.callTool({name:'hamta_kodmall',arguments:{mall:'projektstod'}});
 assert.notEqual(support.isError,true);
 assert.equal((support.structuredContent as {project_support:{version:string}}).project_support.version,'1.4');
 console.log(JSON.stringify({tool:'hamta_kodmall',case:'updated_project_support',status:'PASS'}));
 for(const [name,args] of [
  ['sok_variabler',{sokterm:'personnummer',databasvy:'rtb'}],
  ['sok_nycklar',{kolumn:'AstKommun'}],
  ['hamta_nyckel',{nyckel_id:'AstKommun.xlsx::BE0101N1',kolumn:'AstKommun',koder:['2580']}],
  ['kontrollera_klartextkoppling',{kolumner:['AstKommun']}],
  ['hamta_registerstruktur',{databasvy:'bas_prelmanad'}],
  ['kontrollera_tillganglighet',{urval:[{databasvy:'rtb',variabler:['Kommun'],perioder:[2024]}]}],
  ['hamta_kodmall',{mall:'kombinera_register',urval:[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS'],period:2020}]}]
 ] as const){const result=await c.callTool({name,arguments:args});assert.notEqual(result.isError,true);assert.ok(result.structuredContent);console.log(JSON.stringify({tool:name,status:'PASS'}));}
 const note=await c.callTool({name:'kontrollera_tillganglighet',arguments:{urval:[{databasvy:'in_utvandring_lisa',variabler:['InvUtvManad'],perioder:[1997,1998],kontext:{ar_begrepp:'registerar'}}]}});
 assert.notEqual(note.isError,true);assert.match(JSON.stringify(note.structuredContent),/crosses_breakpoint/);
 const h=await c.callTool({name:'hamta_kodmall',arguments:{mall:'harmonisera_argangar',urval:[{databasvy:'avggymn',variabler:['totalpoang'],period:2004},{databasvy:'avggymn',variabler:['totalpoang'],period:2005}]}});
 assert.notEqual(h.isError,true);assert.equal((h.structuredContent as {can_generate:boolean}).can_generate,true);
 console.log(JSON.stringify({cases:['register_notes','yearly_harmonization'],status:'PASS'}));
 console.log(JSON.stringify({client:'official MCP TypeScript SDK',transport:'Streamable HTTP',url,status:'PASS'}));
}finally{await c.close();}
