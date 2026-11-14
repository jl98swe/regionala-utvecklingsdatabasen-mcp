import templates from '../data/templates.json' with {type:'json'};
import {check, detail, getRow, metadata, stamp} from './catalog.js';
export type Selection={databasvy:string;variabler:string[];period:number|null};
export const methods={
 ltu_examen:{title:'Examenskohort, rekryteringskommun och fast uppföljningsår',source:'Analys_examinerade_LTU_v17.R, metodavsnitt och mikrodataR-mönster',
 required:{hreg_examen:['P1481_LopNr_PersonNr','HsKod','KAr'],hreg_forstaar:['P1481_LopNr_PersonNr','Ffgar'],rtb:['P1481_LopNr_PersonNr','Kommun']},
 limitations:['Avser examen, inte alla registrerade eller studieavslut.','Fast målår; referensens reservsteg och fullständiga yrkesanalys ingår inte.','HREG har okänd årstillgänglighet i metadata.']},
 invandring_etablering:{title:'Invandringskohort och fast uppföljning i RTB/BAS',source:'Analys_invandring_Nederlanderna_Norrbotten_v7.R, kohort- och uppföljningsmetod',
 required:{in_utvandring_lisa:['P1481_LopNr_PersonNr','Posttyp','InvUtvManad','InvUtvLand_Grp'],fodelseland_lisa:['P1481_LopNr_PersonNr','FodelseLandNamn_Grp'],rtb:['P1481_LopNr_PersonNr','Kommun'],bas:['P1481_LopNr_PersonNr','BAS','AstKommun']},
 limitations:['Avreseland skiljs från födelseland. Saknat födelseland räknas och exkluderas.','Första invandring inom vald period; återinvandring och utvandring analyseras inte i delmallen.','Geografisk ankomst inom tre år, skatt och inkomst ingår inte i delmallen.','Tillgänglighet för migrationsvyerna är okänd i metadata.']}
};
const quote=(x:string)=>JSON.stringify(x);
const vec=(xs:string[])=>`c(${xs.map(quote).join(', ')})`;
export type TemplateResult = Record<string,unknown> & {
 can_generate?:boolean; r_code?:string; warnings?:string[];
 verification?:{[key:string]:string}; requirements?:unknown[];
};
export function codeTemplate(id:string, selections:Selection[]=[]):TemplateResult {
 if(id==='lista')return {...stamp,templates:[{id:'kombinera_register',title:'Metadataförkontrollerad extraktion och säker koppling'},...Object.entries(methods).map(([id,m])=>({id,...m}))]};
 if(id in methods){
  const m=methods[id as keyof typeof methods];
  const requirements=Object.entries(m.required).flatMap(([v,names])=>names!.map(n=>detail(getRow(v,n))));
  return {...stamp,id,...m,verification:{metadata_names:'verified',r_syntax:'covered_by_R_CI',mona_execution:'not_run',note:'Metodstöd och namn är kontrollerade. Denna anpassning har inte körts mot MONA.'},requirements,
   warnings:m.limitations,r_code:`# Metadata SHA-256: ${metadata.source_sha256}\n${templates.common}\n${templates[id as keyof typeof templates]}`};
 }
 if(id!=='kombinera_register')throw new Error('Okänd kodmall. Välj lista, kombinera_register, ltu_examen eller invandring_etablering.');
 if(!selections.length)throw new Error('Ange minst ett register med variabler och uttrycklig period (NULL endast för dokumenterat icke årsindelad vy).');
 const key='P1481_LopNr_PersonNr';
 const checks=selections.flatMap(s=>[...new Set([key,...s.variabler])].map(v=>check(s.databasvy,v,s.period===null?[]:[s.period])));
 const blocked=checks.filter(c=>c.kontroller.some(p=>['unavailable','partial','granularity_mismatch'].includes(p.status)));
 for (const s of selections) {
  for (const v of [...new Set([key,...s.variabler])]) {
   const c=check(s.databasvy,v);
   if (c.tillganglighet.status==='known' && (s.period===null || (c.tillganglighet.granularity==='month' && s.period<10000))) blocked.push(c);
  }
 }
 if(blocked.length)return {...stamp,id,can_generate:false,reason:'År/månad saknas, är ofullständigt eller har fel granularitet. Årsindelad vy kräver år; månadsindelad vy kräver YYYYMM.',checks,blocked};
 // Metadata alone cannot prove that blank-year views are non-periodic.
 const warnings=checks.filter(c=>c.tillganglighet.status!=='known').map(c=>`${c.databasvy}.${c.variabel}: okänd tillgänglighet; verifiera i MONA.`);
 for(const s of selections)if(s.period===null)warnings.push(`${s.databasvy}: NULL-period är användarens uttryckliga val och bevisas inte av tomt årsfält.`);
 const code=selections.map((s,i)=>{
  const rows=checks.filter(c=>c.databasvy===getRow(s.databasvy,key).databasvy);
  const view=rows[0].databasvy;
  const names=[...new Set([key,...s.variabler])].map(v=>getRow(view,v).variabel);
  return `  register_${i+1} <- hamta(con, ${quote(view)}, ${s.period??'NULL'}, ${vec(names)})\n  register_${i+1} <- unik(register_${i+1}, ${quote(key)}, policy = "exact")`;
 }).join('\n');
 const joins=selections.slice(1).map((_,i)=>`  resultat <- left_join(resultat, register_${i+2}, by = ${quote(key)}, relationship = "one-to-one", suffix = c("", "_register_${i+2}"))`).join('\n');
 return {...stamp,id,can_generate:true,checks,warnings,verification:{metadata_names:'verified',availability:warnings.length?'requires_runtime_verification':'verified',mona_execution:'not_run'},
  method:'En rad per person krävs i varje uttag. Endast identiska dubblettrader tas bort. Övriga dubbletter stoppar körningen. Första registret bestämmer populationen; left_join behåller alla dess personer. Många-till-många kräver annan analysenhet och egen mall.',
  r_code:`# Metadata SHA-256: ${metadata.source_sha256}\n${templates.common}\nanalys <- function() {\n  con <- uppkoppling_db()\n  on.exit(DBI::dbDisconnect(con), add = TRUE)\n${code}\n  resultat <- register_1\n${joins}\n  stopifnot(nrow(resultat) == nrow(register_1))\n  list(internt = resultat, kontroll = c(antal_population = nrow(register_1), antal_resultat = nrow(resultat)))\n}\n# Kör i MONA efter granskning: resultat <- analys()\n`};
}
