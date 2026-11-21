import test from 'node:test';
import assert from 'node:assert/strict';
import {orderNotes} from '../src/order-notes.js';
import {searchAllDomains,clearOrderDomainCache} from '../src/order-domains.js';
test('approved old FEK definitions remain assumptions with original periods',()=>{
 const n=orderNotes(['fek_lve'],'MedeltalAnstallda');assert.equal(n.length,1);
 assert.equal(n[0]!.definition_assumptions.length,1);
 assert.equal(n[0]!.definition_assumptions[0]!.period,'1998–2002');
 assert.equal(n[0]!.definition_assumptions[0]!.verification,'user_approved_assumption_not_independently_verified');
 assert.equal(orderNotes(['fek_lve'],'lhar6103')[0]!.definition_assumptions[0]!.period,'2002');
 assert.equal(orderNotes(['rtb']).length,0);
});
test('missing source vintage still returns the approved assumption, without inventing a result',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:404});
 try{clearOrderDomainCache();const r=await searchAllDomains('',undefined,'MedeltalAnstallda','1998',0,10,'fek_lve');
  assert.equal(r.total,0);assert.ok('view_notes' in r);assert.equal(r.view_notes[0]!.definition_assumptions[0]!.period,'1998–2002');
 }finally{clearOrderDomainCache();globalThis.fetch=original;}
});
test('user explanations do not fabricate availability',()=>{
 const n=orderNotes(['fodelseuppg','in_utvandring_lisa','hreg_examen']);assert.equal(n.length,3);
 assert.ok(n.every(v=>!('available_years' in v)));
});
