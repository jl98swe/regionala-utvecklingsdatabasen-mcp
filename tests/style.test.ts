import {test} from 'node:test';
import assert from 'node:assert/strict';
import {codeTemplate} from '../src/code.js';
import {projectSupport} from '../src/guidance.js';

test('all generated scripts have human intros, percent pipes and safe default count handling',()=>{
 for(const id of ['ltu_examen','invandring_etablering','kombinera_register']){
  const r=codeTemplate(id,[{databasvy:'rtb',variabler:['Kommun'],period:2020}],{bekrafta_metod:true});
  assert.ok(r.r_code);
  for(const section of ['Register som används:','Tillvägagångssätt:','Noteringar:','Skript av: Ej angiven','Version: 1.3','Skapad:','Senast uppdaterad:'])assert.ok(r.r_code.includes(section),section);
  assert.ok(r.r_code.indexOf('Register som används:')<r.r_code.indexOf('library('));
  assert.match(r.r_code,/%>%/);assert.doesNotMatch(r.r_code,/\|>|metadata_sha256|Metadata SHA|Ej körd i MONA|dir.create|Sys.getenv\("RUD_UTDATA"\)|region_norrbotten\/joe/);
  assert.match(r.r_code,/projekt_mapp <- "\/\/micro.intra\/projekt\/P1481\$\/P1481_Gem\/"/);
  assert.match(r.r_code,/sma_tal_metod <- "under_5"/);
  assert.match(r.r_code,/random_0_till_3 <- function/);
  assert.match(r.r_code,/skydda_antal\(total_grupper = "kontroll"\)/);
  for(const line of r.r_code.split('\n').filter(l=>l.trimStart().startsWith('# ----'))){
   const offset=r.r_code.indexOf(line);
   if(offset>0)assert.match(r.r_code.slice(0,offset),/\n\s*\n$/);
  }
 }
 const named=codeTemplate('ltu_examen',[],{skapare:'Exempelperson\n# annat'}).r_code!;
 assert.match(named,/# Skript av: Exempelperson # annat/);
 assert.equal(projectSupport.small_counts.blocks_generation,false);
 assert.match(projectSupport.small_counts.user_notice,/under 5.*\.\.\./);
 assert.ok('metadata_sha256' in codeTemplate('ltu_examen'));
});
