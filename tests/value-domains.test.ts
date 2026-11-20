import test from 'node:test';
import assert from 'node:assert/strict';
import {searchDomains,getDomain} from '../src/value-domains.js';
test('value domains expose provenance and never imply MONA availability',()=>{
 const result=searchDomains();
 assert.equal(result.source,'https://mikrometadata.scb.se/');
 assert.ok(result.caveats.some(s=>s.includes('inte observerade')));
 assert.throws(()=>getDomain('missing'),/Okänt/);
});
test('search filters and value pagination preserve exact codes',()=>{
 const all=searchDomains('',undefined,undefined,undefined,0,100);
 for(const binding of all.results){
  const filtered=searchDomains('',binding.register,binding.column,binding.register_version,0,100);
  assert.ok(filtered.results.every(b=>b.register===binding.register&&b.column===binding.column&&b.register_version===binding.register_version));
  const d=getDomain(binding.id,[],0,1);
  assert.ok(d.results.length<=1);
  if(d.results.length){
   const code=d.results[0]!.code;
   assert.ok(getDomain(binding.id,[code],0,100).results.every(v=>v.code===code));
  }
 }
});
