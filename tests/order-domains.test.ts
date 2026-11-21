import test from 'node:test';
import assert from 'node:assert/strict';
import index from '../data/order-source-index.json' with {type:'json'};
import {clearOrderDomainCache,searchAllDomains,getAnyDomain} from '../src/order-domains.js';
test('order lookup preserves exact codes, aliases, provenance and pending groups',async()=>{
 const group=index.groups.find(g=>g.views.includes('rtb'))!;
 const bid='b'.repeat(64),did='d'.repeat(64),docid='e'.repeat(64);
 const binding={id:bid,column:'Kommun',variable:'Synthetic example',register_version:'2024',domain_id:did,status:'enumerated',documentation:{id:docid,path:`data/variable-documentation/${docid}.json`},orders:[{databasvy:'rtb',variabel:'Kommun',ar_raw:'1968-2024'}]};
 const state={group_id:group.id,register:group.register,variant:group.variant,bindings:[binding],domains:[{id:did,version:'Synthetic example',level:'Synthetic example',data_type:'char(4)',value_count:2,path:`data/value-domain-values/${did}.json`}],coverage:{complete:false}};
 const domain={id:did,version:'Synthetic example',level:'Synthetic example',data_type:'char(4)',values:[{code:'0114',label:'Synthetic example'},{code:'',label:'Synthetic missing example'}]};
 const documentation={id:docid,source:'https://mikrometadata.scb.se/',fields:[{name:'Variabeldefinition',value:''},{name:'Populationnamn',value:'Synthetic example A'},{name:'Populationnamn',value:'Synthetic example B'}]};
 const original=globalThis.fetch;const urls:string[]=[];
 globalThis.fetch=async input=>{const u=String(input);urls.push(u);return new Response(JSON.stringify(u.endsWith(`${did}.json`)?domain:u.endsWith(`${docid}.json`)?documentation:state));};
 try{
  clearOrderDomainCache();const result=await searchAllDomains('',undefined,'Kommun','2024',0,10,'rtb');
  assert.equal(result.total,1);
  const row=result.results[0] as {id:string};assert.equal(row.id,`${group.id}:${bid}`);
  const values=await getAnyDomain(row.id,[''],0,10);assert.equal(values.total,1);assert.equal(values.results[0]!.code,'');
  assert.ok(urls.every(u=>u.startsWith('https://raw.githubusercontent.com/jl98swe/regionala-utvecklingsdatabasen-mcp/main/data/')));
  assert.equal(urls.length,3);
  assert.ok('documentation' in values);
  assert.deepEqual(values.documentation,{status:'available',...documentation});
  await assert.rejects(()=>getAnyDomain(group.id+':https://example.com'),/Ogiltigt/);
  clearOrderDomainCache();globalThis.fetch=async()=>new Response('',{status:404});
  const pending=await searchAllDomains('',undefined,undefined,undefined,0,10,'rtb');assert.equal(pending.total,0);
  assert.ok('source_groups' in pending&&pending.source_groups.some(g=>'status' in g&&g.status==='pending'));
 }finally{clearOrderDomainCache();globalThis.fetch=original;}
});
