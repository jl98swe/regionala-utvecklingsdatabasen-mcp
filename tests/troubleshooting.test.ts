import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../src/worker.js';
import {projectSupport} from '../src/guidance.js';

const localFetch:typeof fetch=async(input,init)=>worker.fetch(new Request(input,init));
test('MCP discovery exposes short MONA and unsaved diagnostic use cases before tool calls',async()=>{
 const c=new Client({name:'diagnostic-discovery',version:'1.0.0'});
 await c.connect(new StreamableHTTPClientTransport(new URL('https://rud.example/mcp'),{fetch:localFetch}));
 try{
  const tools=(await c.listTools()).tools;
  for(const name of ['sok_variabler','hamta_kodmall']){
   const description=tools.find(t=>t.name===name)!.description!;
   assert.match(description,/MONA/);assert.match(description,/basprel/);assert.match(description,/inget ska sparas/);
  }
  assert.match(c.getInstructions()!,/MCP/);
  const support=await c.callTool({name:'hamta_kodmall',arguments:{mall:'projektstod'}});
  assert.notEqual(support.isError,true);
  const p=(support.structuredContent as {project_support:typeof projectSupport}).project_support;
  assert.deepEqual(p.troubleshooting,projectSupport.troubleshooting);
  const search=await c.callTool({name:'sok_variabler',arguments:{sokterm:'basprel'}});
  assert.notEqual(search.isError,true);
  const found=search.structuredContent as {results:{databasvy:string}[]};
  assert.ok(found.results.length>0);
  assert.ok(found.results.every(r=>r.databasvy==='bas_prelmanad'));
  const structure=await c.callTool({name:'hamta_registerstruktur',arguments:{databasvy:found.results[0].databasvy}});
  assert.notEqual(structure.isError,true);
  assert.ok((structure.structuredContent as {variables:unknown[]}).variables.length>0);
 }finally{await c.close();}
});
test('unknown return formats require observed structure, not flattening or guessed columns',()=>{
 const guidance=projectSupport.troubleshooting.unknown_return_format.join(' ');
 for(const term of ['class(objekt)','str(objekt)','names(objekt)','data.frame/tibble','Vid lista','character-vektor','unlist()','samma objekt och dimension','NA/NULL','Gissa inte kolumnnamn'])assert.ok(guidance.includes(term),term);
 const api=projectSupport.mikrodataR.find(f=>f.name==='hamta_vylista')!;
 assert.match(api.notes,/str\(\)/);assert.match(api.notes,/unlist\(\)/);
});
test('month diagnostics distinguish metadata periods, helper arguments and stored values',()=>{
 const guidance=projectSupport.troubleshooting.monthly_values.join(' ');
 for(const term of ['kontrollera_tillganglighet','YYYYMM','faktiska lagrade tidsvärdena','hamta_korrekt_vynamn()','anta inte att YYYYMM accepteras','distinkta originalvärden','ingen tidsvariabel','inledande nollor','inga kataloger'])assert.ok(guidance.includes(term),term);
 assert.match(projectSupport.mikrodataR.find(f=>f.name==='hamta_korrekt_vynamn')!.notes,/månadsargument/);
});
