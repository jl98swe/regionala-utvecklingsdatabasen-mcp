import {test} from 'node:test';import assert from 'node:assert/strict';
import {metadata,parsePeriod,check,search,structure} from '../src/catalog.js';
import {codeTemplate} from '../src/code.js';
test('snapshot has 4138 rows, 88 views and 1264 unknowns',()=>{
 assert.equal(metadata.antal_poster,4138);assert.equal(metadata.antal_vyer,88);assert.equal(metadata.antal_okanda,1264);
 assert.equal(new Set(metadata.records.map(r=>r.databasvy+'\0'+r.variabel)).size,4138);
});
test('all source periods are recognized without inventing unknowns',()=>{
 for(const r of metadata.records)assert.equal(parsePeriod(r.ar_raw).status,r.ar_raw?'known':'unknown',`${r.databasvy}.${r.variabel}`);
});
test('different years in same view: ak6 Antal vs En',()=>{
 assert.equal(check('ak6','Antal',[2013]).kontroller[0].status,'unavailable');
 assert.equal(check('ak6','En',[2013]).kontroller[0].status,'available');
});
test('RTB variable changes do not inherit view availability',()=>{
 assert.equal(check('rtb','DistriktsKod',[2014]).kontroller[0].status,'unavailable');
 assert.equal(check('rtb','Kommun',[2014]).kontroller[0].status,'available');
 assert.equal(check('rtb','Forsamling',[2015]).kontroller[0].status,'unavailable');
});
test('blank year stays unknown even when requested',()=>{
 assert.equal(check('hreg_examen','KAr',[2021]).kontroller[0].status,'unknown');
 assert.equal(check('hreg_examen','KAr').tillganglighet.periods.length,0);
});
test('month ranges cross December correctly; no invalid 202013',()=>{
 const a=parsePeriod('202011-202102');assert.deepEqual(a.periods,[202011,202012,202101,202102]);
 assert.equal(parsePeriod('202013-202102').status,'unparsed');
});
test('single years, month singles, gaps, unknown and bad ranges',()=>{
 assert.deepEqual(parsePeriod('2020;2022–2023').periods,[2020,2022,2023]);
 assert.deepEqual(parsePeriod('202001').periods,[202001]);
 assert.equal(parsePeriod('2024-2020').status,'unparsed');assert.equal(parsePeriod('2020-202012').status,'unparsed');
 assert.equal(parsePeriod(null).status,'unknown');assert.equal(parsePeriod('n/a').status,'unparsed');
});
test('monthly register supports months and complete year',()=>{
 assert.equal(check('bas_prelmanad','BAS',[202012]).kontroller[0].status,'available');
 assert.equal(check('bas_prelmanad','BAS',[2020]).kontroller[0].status,'available');
 assert.equal(check('bas_prelmanad','BAS',[201912]).kontroller[0].status,'unavailable');
 assert.equal(check('bas','BAS',[202012]).kontroller[0].status,'granularity_mismatch');
});
test('alternate spellings preserve original names',()=>{
 assert.equal(search('p1481 lopnr personnr','RTB').results[0].variabel,'P1481_LopNr_PersonNr');
 assert.ok(search('sysselsättning').total>0);assert.ok(search('invandring').results.some(r=>r.databasvy==='in_utvandring_lisa'));
});
test('wrong variable and wrong view never fall back silently',()=>{
 assert.throws(()=>check('rtb','Kommunnn',[2020]),/Okänd/);assert.throws(()=>check('rtbb','Kommun',[2020]),/Okänd/);
 assert.equal(check('rtb','Kommun',[2025]).kontroller[0].status,'unavailable');
});
test('paging covers entire catalog',()=>{
 let n=0;for(let o=0;o<4138;o+=100)n+=search('',undefined,o,100).results.length;assert.equal(n,4138);
 assert.equal(structure().total,88);
});
test('combining registers validates all variables at selected periods',()=>{
 const r=codeTemplate('kombinera_register',[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS','AstKommun'],period:2020}]);
 assert.equal(r.can_generate,true);assert.match(r.r_code!,/relationship = "one-to-one"/);assert.match(r.r_code!,/on.exit/);
 assert.doesNotMatch(r.r_code!,/read.xlsx|read_excel|region_norrbotten\/joe/);
 const b=codeTemplate('kombinera_register',[{databasvy:'rtb',variabler:['DistriktsKod'],period:2014}]);assert.equal(b.can_generate,false);
});
test('unknown availability produces explicit warning, not verification',()=>{
 const r=codeTemplate('kombinera_register',[{databasvy:'hreg_examen',variabler:['KAr'],period:2020}]);
 assert.equal(r.verification!.availability,'requires_runtime_verification');assert.ok(r.warnings!.length);
});
test('both method templates reference real names and describe untested MONA execution',()=>{
 for(const id of ['ltu_examen','invandring_etablering']){const r=codeTemplate(id);assert.equal(r.verification!.mona_execution,'not_run');assert.ok(r.requirements!.length>0);assert.ok(r.r_code!.length>2000);}
});
test('code cannot use NULL for known yearly data or YYYY for monthly data',()=>{
 assert.equal(codeTemplate('kombinera_register',[{databasvy:'rtb',variabler:['Kommun'],period:null}]).can_generate,false);
 assert.equal(codeTemplate('kombinera_register',[{databasvy:'bas_prelmanad',variabler:['BAS'],period:2020}]).can_generate,false);
 assert.equal(codeTemplate('kombinera_register',[{databasvy:'bas_prelmanad',variabler:['BAS'],period:202012}]).can_generate,true);
});
test('LTU first-year view uses the chosen cohort year as in the source method',()=>{
 assert.match(codeTemplate('ltu_examen').r_code!,/hamta\(con, "hreg_forstaar", examensar,/);
});

test('project support exposes supplied APIs, source priority and editing rules',()=>{
 const r=codeTemplate('projektstod');
 const p=r.project_support as {source_priority:string[];rules:string[];mikrodataR:{name:string;usage:string}[]};
 assert.equal(p.source_priority.length,5);
 assert.ok(p.mikrodataR.some(f=>f.name==='hamta_korrekt_vynamn'&&f.usage.includes('valt_ar, databasvy')));
 for(const name of ['uppkoppling_db','alla_ar','forsta_ar','senaste_ar','hamta_vylista','hamta_variabler','sok_variabler','fjoin_klartext'])assert.ok(p.mikrodataR.some(f=>f.name===name));
 assert.ok(p.rules.some(s=>s.includes('iconv')));assert.ok(p.rules.some(s=>s.includes('hela skriptet')));
 assert.ok(p.rules.some(s=>s.includes('examen')));
 assert.ok('project_support' in structure());
});
test('complete code carries versions, documented API and character protections',()=>{
 for(const id of ['ltu_examen','invandring_etablering','kombinera_register']){
  const r=codeTemplate(id,[{databasvy:'rtb',variabler:['Kommun'],period:2020}]);
  assert.match(r.r_code!,/Filnamn: .*_v1[.]2[.]R/);
  assert.match(r.r_code!,/Skript av:/);assert.match(r.r_code!,/Skapad:/);assert.match(r.r_code!,/Senast uppdaterad:/);
  assert.match(r.r_code!,/iconv\(x, from = "", to = "UTF-8", sub = "byte"\)/);
  assert.match(r.r_code!,/valt_ar = period, databasvy = vy/);
  assert.ok(r.project_support);
 }
 assert.match(codeTemplate('ltu_examen').r_code!,/ar <- numeriskt\(bas\$Ffgar\)/);
 const migr=codeTemplate('invandring_etablering').r_code!;
 assert.ok(migr.indexOf('manad <- numeriskt')<migr.indexOf('summarise(Invandringsar = min'));
});
