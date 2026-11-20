import {test} from 'node:test';import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../src/worker.js';
const endpoint='https://rud.example/mcp';
// Real official MCP Client + Streamable HTTP transport; only network I/O is
// routed to the exact Worker fetch handler for deterministic offline testing.
const localFetch:typeof fetch=async(input,init)=>worker.fetch(new Request(input,init));
test('actual SDK client initializes, discovers nine tools and calls catalog tools',async()=>{
 const c=new Client({name:'rud-integration-client',version:'1.0.0'});
 await c.connect(new StreamableHTTPClientTransport(new URL(endpoint),{fetch:localFetch}));
 try{
  assert.deepEqual((await c.listTools()).tools.map(t=>t.name).sort(),['sok_variabler','kontrollera_tillganglighet','hamta_registerstruktur','hamta_kodmall','sok_nycklar','hamta_nyckel','kontrollera_klartextkoppling','sok_vardemangder','hamta_vardemangd'].sort());
  for(const [name,args] of [
   ['sok_variabler',{sokterm:'folkbokföring'}],
   ['sok_nycklar',{kolumn:'AstKommun'}],
   ['sok_vardemangder',{register:'Aktieägarstatistik'}],
   ['hamta_nyckel',{nyckel_id:'AstKommun.xlsx::BE0101N1',kolumn:'AstKommun',koder:['2580']}],
   ['kontrollera_klartextkoppling',{kolumner:['AstKommun']}],
   ['kontrollera_tillganglighet',{urval:[{databasvy:'rtb',variabler:['Kommun'],perioder:[2024,2025]}]}],
   ['hamta_registerstruktur',{databasvy:'bas'}],
   ['hamta_kodmall',{mall:'kombinera_register',urval:[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS'],period:2020}]}]
  ] as const){const r=await c.callTool({name,arguments:args});assert.ok(r.structuredContent);assert.notEqual(r.isError,true,name);}
  const missingDomain=await c.callTool({name:'hamta_vardemangd',arguments:{kopplings_id:'missing'}});
  assert.equal(missingDomain.isError,true);
  const support=await c.callTool({name:'hamta_kodmall',arguments:{mall:'projektstod'}});
  assert.ok((support.structuredContent as {project_support:unknown}).project_support);
  assert.match(c.getInstructions()!,/iconv/);
  const bad=await c.callTool({name:'kontrollera_tillganglighet',arguments:{urval:[{databasvy:'rtb',variabler:['bad'],perioder:[2020]}]}});assert.equal(bad.isError,true);
  const invalid=await c.callTool({name:'kontrollera_tillganglighet',arguments:{urval:[{databasvy:'rtb',variabler:['Kommun'],perioder:[202013]}]}});assert.equal(invalid.isError,true);
 }finally{await c.close();}
});
test('HTTP routes, body bounds and origin validation',async()=>{
 assert.equal((await worker.fetch(new Request('https://rud.example/health'))).status,200);
 assert.equal((await worker.fetch(new Request(endpoint))).status,405);
 assert.equal((await worker.fetch(new Request(endpoint,{method:'POST',body:'x'.repeat(65537)}))).status,413);
 assert.equal((await worker.fetch(new Request(endpoint,{method:'POST',headers:{Origin:'null'},body:'{}'}))).status,403);
 assert.equal((await worker.fetch(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:'{'}))).status,400);
});
test('tool discovery makes no outbound fetch or execution request',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Outbound access forbidden');};
 try{const r=await worker.fetch(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}));assert.equal(r.status,200);}finally{globalThis.fetch=original;}
});
