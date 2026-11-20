import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchKeys,getKey,checkKeyJoin,keySummary} from '../src/keys.js';
test('complete snapshot and exact header search separate from values',()=>{
 assert.equal(keySummary.files,86);assert.equal(keySummary.rows,71412);
 const found=searchKeys('','AstKommun');assert.equal(found.total,1);
 assert.deepEqual(found.results[0].columns,['AstKommun','AstKommun_namn']);
 assert.equal(searchKeys('','astkommun').total,0);
 assert.equal(searchKeys('Luleå').total,0);
 const r=getKey(found.results[0].id,'','AstKommun',['2580']);
 assert.equal(r.total,1);assert.equal(r.results[0].values.AstKommun_namn,'Luleå');
});
test('join plan preserves multiple matches and reports conflicting duplicates',()=>{
 const p=checkKeyJoin(['AstNgS07']);assert.equal(p.results.length,2);
 assert.ok(p.cross_file_column_overlaps.includes('AstNgS07_namn'));
 assert.ok(p.results.some(r=>r.possible_added_columns.includes('AstNgS07_avdkod')));
 const d=checkKeyJoin(['Byrkstalln']);assert.equal(d.results[0].candidate_composite_key.conflicting_values,1);
 assert.equal(checkKeyJoin(['byrkstalln']).results.length,0);
 assert.equal(checkKeyJoin(['byrkstalln'],false).results.length,1);
});
test('content pagination, nulls, original zeros, duplicate rows and source rows survive',()=>{
 const t=searchKeys('','KursKod').results[0];
 const r=getKey(t.id,'','KursKod',['ADMADM00S']);assert.equal(r.total,2);
 assert.notEqual(r.results[0].source_row,r.results[1].source_row);
 const h=searchKeys('','HsKod').results[0];assert.equal(getKey(h.id,'','HsKod',['002']).results[0].values.HsKod_namn,'Luleå tekniska universitet');
 const k=searchKeys('','Beh_Gymn').results[0];assert.ok(getKey(k.id).results.some(r=>r.values.Beh_Gymn===null));
 const large=searchKeys('','Varukod').results[0];const a=getKey(large.id,'',undefined,[],0,2),b=getKey(large.id,'',undefined,[],2,2);
 assert.equal(a.next_offset,2);assert.notDeepEqual(a.results,b.results);
 assert.throws(()=>getKey(large.id,'','missing'));assert.throws(()=>getKey(large.id,'',undefined,['01']));assert.throws(()=>getKey('../etc/passwd'));
});
test('numeric Excel codes are not silently padded; cached formulas retain provenance',()=>{
 const s=searchKeys('','SSYK4_2012').results.find(r=>r.file==='SSYK4_2012.xlsx')!;
 assert.ok(s.numeric_source_columns.includes('SSYK4_2012'));
 assert.equal(getKey(s.id,'','SSYK4_2012',['110']).total,1);
 assert.equal(getKey(s.id,'','SSYK4_2012',['0110']).total,0);
 const ibb=searchKeys('','IBB').results[0];assert.ok(ibb.formula_cells.length>0);
 assert.equal(getKey(ibb.id,'','Ar',['2002']).results[0].values.Grans_SF,'116400');
});
