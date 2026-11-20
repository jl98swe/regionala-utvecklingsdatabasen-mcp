import {projectSupport} from './guidance.js';
import templates from '../data/templates.json' with {type:'json'};
import {check, detail, getRow, stamp} from './catalog.js';
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
const intro=(id:string,title:string,registers:string[],steps:string[],notes:string[],creator?:string)=>[
 '# ===========================================================================================================',
 '#',`# ${title}`,'#','# Register som används:',...registers.map(v=>`#   - ${v}`),'#',
 '# Tillvägagångssätt:',...steps.map(v=>`#   - ${v}`),'#','# Noteringar:',...notes.map(v=>`#   - ${v}`),'#',
 `# Skript av: ${creator?.replace(/[\r\n]/g,' ').trim()||'Ej angiven – fyll i namn'}`,
 '# Version: 1.2',`# Filnamn: ${id}_v1.2.R`,'# Skapad: 2026-11-20','# Senast uppdaterad: 2026-11-20','#',
 '# ===========================================================================================================',''
].join('\n')+'\n';
const smallNotes=['Antal under 5 visas som ... och utesluts ur redovisade totaler och andelar. Standarden kan ändras på begäran.', 'Interna individdata används bara för bearbetning i MONA. Redovisning sker med skyddade aggregat.'];
export function codeTemplate(id:string, selections:Selection[]=[], options:{skapare?:string}={}):TemplateResult {
 if(id==='projektstod')return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport};
 if(id==='lista')return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,templates:[{id:'kombinera_register',title:'Metadataförkontrollerad extraktion och säker koppling'},...Object.entries(methods).map(([id,m])=>({id,...m}))]};
 if(id in methods){
  const m=methods[id as keyof typeof methods];
  const requirements=Object.entries(m.required).flatMap(([v,names])=>names!.map(n=>detail(getRow(v,n))));
  return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,...m,verification:{metadata_names:'verified',r_syntax:'covered_by_R_CI',mona_execution:'not_run',note:'Metodstöd och namn är kontrollerade mot metadata; databasberoende beteende verifieras i användarens miljö.'},requirements,
   warnings:m.limitations,r_code:intro(id,m.title,Object.keys(m.required),[m.title,'Kontrollera dubbletter och koppla register utan att multiplicera personer.','Redovisa skyddade kontrollantal.'],[...m.limitations,...smallNotes],options.skapare)+templates.common+'\n\n'+templates[id as keyof typeof templates]};
 }
 if(id!=='kombinera_register')throw new Error('Okänd kodmall. Välj lista, projektstod, kombinera_register, ltu_examen eller invandring_etablering.');
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
 if(blocked.length)return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,can_generate:false,reason:'År/månad saknas, är ofullständigt eller har fel granularitet. Årsindelad vy kräver år; månadsindelad vy kräver YYYYMM.',checks,blocked};
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
 return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,can_generate:true,checks,warnings,verification:{metadata_names:'verified',availability:warnings.length?'requires_runtime_verification':'verified',mona_execution:'not_run'},
  method:'En rad per person krävs i varje uttag. Endast identiska dubblettrader tas bort. Övriga dubbletter stoppar körningen. Första registret bestämmer populationen; left_join behåller alla dess personer. Många-till-många kräver annan analysenhet och egen mall.',
  r_code:intro(id,'Hämta och kombinera valda register med en rad per person',selections.map(s=>s.databasvy),['Hämta verifierade variabler för valda perioder.','Ta bort identiska dubbletter; stoppa vid motstridiga nycklar.','Behåll första registrets population och redovisa skyddade kontrollantal.'],smallNotes,options.skapare)+`${templates.common}\n\n# ---- Kombinera register ----\n\nanalys <- function() {\n  con <- uppkoppling_db()\n  on.exit(DBI::dbDisconnect(con), add = TRUE)\n${code}\n  resultat <- register_1\n${joins}\n  stopifnot(nrow(resultat) == nrow(register_1))\n  kontroll <- tibble(kontroll = c("antal_population", "antal_resultat"), antal = c(nrow(register_1), nrow(resultat))) %>%\n    skydda_antal(total_grupper = "kontroll")\n\n  list(internt = resultat, kontroll = kontroll)\n}\n\n# ---- Kör analysen ----\n\n# Kör i MONA efter granskning: resultat <- analys()\n`};
}
