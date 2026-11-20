import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerContext,registerKnowledge,timeMethods} from '../src/knowledge.js';
import {search,structure,check,variableNameCandidates} from '../src/catalog.js';
import {codeTemplate} from '../src/code.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import worker from '../src/worker.js';

test('register notes separate event year from register vintage at 1998',()=>{
 const select=(periods:number[],ar_begrepp:'registerar'|'handelsear'|'okant',id:string)=>registerContext('in_utvandring_lisa',['InvUtvManad'],periods,{ar_begrepp}).notes.find(n=>n.id===id)!;
 assert.equal(select([1997,1998],'registerar','immigration-year-coverage-1998').relevance,'crosses_breakpoint');
 assert.equal(select([1998],'registerar','immigration-year-coverage-1998').relevance,'breakpoint');
 assert.equal(select([1998],'handelsear','immigration-year-coverage-1998').relevance,'different_year_basis');
 assert.equal(select([199701,199812],'handelsear','migration-month-before-1998').relevance,'crosses_breakpoint');
 assert.equal(select([1997],'handelsear','migration-month-before-1998').relevance,'affected_period');
 assert.equal(select([2020],'handelsear','migration-month-before-1998').relevance,'background');
 assert.equal(select([1998],'okant','migration-month-before-1998').relevance,'year_basis_unclear');
 assert.equal(registerContext('in_utvandring_lisa').notes[0].relevance,'context_needed');
 assert.equal(registerContext('rtb').notes.length,0);
 assert.equal(registerContext('stativ',['Kommun']).notes.length,0);
 assert.equal(registerContext('stativ',['SenInvAr']).notes[0].order_application,'requires_verification');
});
test('knowledge is returned through search, structure, availability and code without changing availability',()=>{
 assert.ok(search('InvUtvManad').register_context[0].notes.length>0);
 const s=structure('in_utvandring_lisa');assert.ok('register_context' in s&&s.register_context.notes.length>0);
 const c=check('in_utvandring_lisa','InvUtvManad',[1998],{ar_begrepp:'registerar'});
 assert.equal(c.kontroller[0].status,'unknown');assert.ok(c.register_context.notes.length>0);
 const r=codeTemplate('kombinera_register',[{databasvy:'in_utvandring_lisa',variabler:['InvUtvManad'],period:null}]);
 assert.equal(r.can_generate,true);assert.match(r.r_code!,/Förändrad täckning/);assert.match(r.r_code!,/https:\/\/www.scb.se/);
 for(const n of registerKnowledge.notes){assert.equal(n.automatic_filter,false);assert.equal(n.order_application,'requires_verification');assert.ok(n.source_pages.length);}
});
test('harmonization chooses exact original names at the 2004/2005 boundary and retains provenance',()=>{
 const r=codeTemplate('harmonisera_argangar',[{databasvy:'avggymn',variabler:['totalpoang'],period:2004},{databasvy:'avggymn',variabler:['TotalPoäng'],period:2005}]);
 assert.equal(r.can_generate,true);
 const p=r.plan as {source_variable:string;analysis_name:string}[];
 assert.deepEqual(p.map(x=>x.source_variable),['TotalPoäng','TotalPoang']);assert.ok(p.every(x=>x.analysis_name==='totalpoang'));
 assert.match(r.r_code!,/harmonisera_uttag\("TotalPoäng", "totalpoang", 2004/);
 assert.match(r.r_code!,/harmonisera_uttag\("TotalPoang", "totalpoang", 2005/);
 assert.match(r.r_code!,/bortfallskoder <- character/);
 assert.equal(r.verification!.semantic_equivalence,'user_confirmed_name_change_not_SCB_verified');
 assert.equal(check('avggymn','TotalPoäng',[2005]).kontroller[0].status,'unavailable');
 assert.ok(variableNameCandidates('avggymn').some(x=>x.variants.some(v=>v.variabel==='TotalPoäng')));
});
test('harmonization blocks missing years, unknown concepts, duplicate selections and wrong time scale',()=>{
 for(const [v,p] of [['totalpoang',1996],['totalpoang',2026],['totalpoang',200501],['unknown',2004],['totalpoang',null]] as const){
  assert.equal(codeTemplate('harmonisera_argangar',[{databasvy:'avggymn',variabler:[v],period:p}]).can_generate,false);
 }
 assert.throws(()=>codeTemplate('harmonisera_argangar',[{databasvy:'avggymn',variabler:['totalpoang','TotalPoäng'],period:2004}]),/flera gånger/);
});
test('generic time methods and analysis units do not silently choose event reduction',()=>{
 for(const key of ['ar','manad','termin','handelse','okand'])assert.ok(timeMethods[key as keyof typeof timeMethods]);
 const r=codeTemplate('invandring_etablering');assert.equal(r.can_generate,false);assert.match(r.reason as string,/Bekräfta/);
 assert.ok(codeTemplate('invandring_etablering',[],{bekrafta_metod:true}).r_code);
 assert.match(codeTemplate('kombinera_register',[{databasvy:'rtb',variabler:['Kommun'],period:2020}]).r_code!,/policy = "stop"/);
 assert.match(codeTemplate('kombinera_register',[{databasvy:'rtb',variabler:['Kommun'],period:2020}],{dubbletter:'exact'}).r_code!,/policy = "exact"/);
});
test('SDK exposes context inputs and harmonization without adding tools',async()=>{
 const c=new Client({name:'knowledge-client',version:'1'});
 const f:typeof fetch=async(input,init)=>worker.fetch(new Request(input,init));
 await c.connect(new StreamableHTTPClientTransport(new URL('https://rud.example/mcp'),{fetch:f}));
 try{
  assert.equal((await c.listTools()).tools.length,7);
  const r=await c.callTool({name:'kontrollera_tillganglighet',arguments:{urval:[{databasvy:'in_utvandring_lisa',variabler:['InvUtvManad'],perioder:[1998],kontext:{ar_begrepp:'registerar'}}]}});
  assert.notEqual(r.isError,true);assert.match(JSON.stringify(r.structuredContent),/breakpoint/);
  const h=await c.callTool({name:'hamta_kodmall',arguments:{mall:'harmonisera_argangar',urval:[{databasvy:'avggymn',variabler:['totalpoang'],period:2004}]}});
  assert.notEqual(h.isError,true);assert.equal((h.structuredContent as {can_generate:boolean}).can_generate,true);
 }finally{await c.close();}
});
