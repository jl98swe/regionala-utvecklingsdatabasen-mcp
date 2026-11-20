import {projectSupport} from './guidance.js';
import {registerKnowledge,registerContext,type AnalysisContext} from './knowledge.js';
import templates from '../data/templates.json' with {type:'json'};
import {check, detail, getRow, stamp, canonicalView} from './catalog.js';
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
 '# Version: 1.3',`# Filnamn: ${id}_v1.3.R`,'# Skapad: 2026-11-20','# Senast uppdaterad: 2026-11-20','#',
 '# ===========================================================================================================',''
].join('\n')+'\n';
const smallNotes=['Antal under 5 visas som ... och utesluts ur redovisade totaler och andelar. Standarden kan ändras på begäran.', 'Interna individdata används bara för bearbetning i MONA. Redovisning sker med skyddade aggregat.'];
export function codeTemplate(id:string, selections:Selection[]=[], options:{skapare?:string;kontext?:AnalysisContext;bekrafta_metod?:boolean;dubbletter?:"stop"|"exact"}={}):TemplateResult {
 if(id==='harmonisera_argangar')return harmonizeTemplate(selections,options);
 if(id==='projektstod')return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport};
 if(id==='lista')return {...stamp,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,templates:[{id:'harmonisera_argangar',title:'Dokumenterade namnbyten per år till gemensamma analysnamn'},{id:'kombinera_register',title:'Metadataförkontrollerad extraktion och säker koppling'},...Object.entries(methods).map(([id,m])=>({id,...m}))]};
 if(id in methods){
  const m=methods[id as keyof typeof methods];
  const requirements=Object.entries(m.required).flatMap(([v,names])=>names!.map(n=>detail(getRow(v,n))));
  const contexts=Object.entries(m.required).map(([v,names])=>registerContext(v,names!,selections.filter(s=>s.databasvy===v&&s.period!==null).map(s=>s.period!),options.kontext));
  const registerNotes=contextComments(contexts);
  const methodSelection=id==='invandring_etablering'?{method:'första_invandring_inom_vald_period',requires_confirmation:true,confirmed:options.bekrafta_metod===true,alternatives:['behåll samtliga händelser','räkna händelser per person','välj en sakligt prioriterad hel rad']}:null;
  if(methodSelection&&!methodSelection.confirmed)return {...stamp,project_support:projectSupport,register_context:contexts,can_generate:false,method_selection:methodSelection,reason:'Invandringsmallen väljer första invandring inom vald period. Bekräfta detta metodval uttryckligen eller välj en annan analysenhet; ingen generell dubblettregel har valts.'};
  return {...stamp,register_context:contexts,method_selection:methodSelection,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,...m,verification:{metadata_names:'verified',r_syntax:'covered_by_R_CI',mona_execution:'not_run',note:'Metodstöd och namn är kontrollerade mot metadata; databasberoende beteende verifieras i användarens miljö.'},requirements,
   warnings:[...m.limitations,...registerNotes],r_code:intro(id,m.title,Object.keys(m.required),[m.title,'Kontrollera dubbletter och koppla register utan att multiplicera personer.','Redovisa skyddade kontrollantal.'],[...m.limitations,...smallNotes,...registerNotes],options.skapare)+templates.common+'\n\n'+templates[id as keyof typeof templates].replace('dubbletter = "stop"',`dubbletter = "${options.dubbletter??'stop'}"`)};
 }
 if(id!=='kombinera_register')throw new Error('Okänd kodmall. Välj lista, projektstod, harmonisera_argangar, kombinera_register, ltu_examen eller invandring_etablering.');
 if(!selections.length)throw new Error('Ange minst ett register med variabler och uttrycklig period (NULL endast för dokumenterat icke årsindelad vy).');
 const key='P1481_LopNr_PersonNr';
 const contexts=selections.map(s=>registerContext(canonicalView(s.databasvy),s.variabler,s.period===null?[]:[s.period],options.kontext));
 const checks=selections.flatMap(s=>[...new Set([key,...s.variabler])].map(v=>check(s.databasvy,v,s.period===null?[]:[s.period],options.kontext)));
 const blocked=checks.filter(c=>c.kontroller.some(p=>['unavailable','partial','granularity_mismatch'].includes(p.status)));
 for (const s of selections) {
  for (const v of [...new Set([key,...s.variabler])]) {
   const c=check(s.databasvy,v);
   if (c.tillganglighet.status==='known' && (s.period===null || (c.tillganglighet.granularity==='month' && s.period<10000))) blocked.push(c);
  }
 }
 if(blocked.length)return {...stamp,register_context:contexts,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,can_generate:false,reason:'År/månad saknas, är ofullständigt eller har fel granularitet. Årsindelad vy kräver år; månadsindelad vy kräver YYYYMM.',checks,blocked};
 // Metadata alone cannot prove that blank-year views are non-periodic.
 const warnings=contextComments(contexts).concat(checks.filter(c=>c.tillganglighet.status!=='known').map(c=>`${c.databasvy}.${c.variabel}: okänd tillgänglighet; verifiera i MONA.`));
 for(const s of selections)if(s.period===null)warnings.push(`${s.databasvy}: NULL-period är användarens uttryckliga val och bevisas inte av tomt årsfält.`);
 const code=selections.map((s,i)=>{
  const rows=checks.filter(c=>c.databasvy===getRow(s.databasvy,key).databasvy);
  const view=rows[0].databasvy;
  const names=[...new Set([key,...s.variabler])].map(v=>getRow(view,v).variabel);
  return `  register_${i+1} <- hamta(con, ${quote(view)}, ${s.period??'NULL'}, ${vec(names)})\n  register_${i+1} <- unik(register_${i+1}, ${quote(key)}, policy = "${options.dubbletter??'stop'}")`;
 }).join('\n');
 const joins=selections.slice(1).map((_,i)=>`  resultat <- left_join(resultat, register_${i+2}, by = ${quote(key)}, relationship = "one-to-one", suffix = c("", "_register_${i+2}"))`).join('\n');
 return {...stamp,register_context:contexts,user_notice:projectSupport.small_counts.user_notice,project_support:projectSupport,id,can_generate:true,checks,warnings,verification:{metadata_names:'verified',availability:checks.some(c=>c.tillganglighet.status!=='known')?'requires_runtime_verification':'verified',mona_execution:'not_run'},
  method:'En rad per person krävs i varje uttag. Ingen rad tas bort som standard. Exakt identiska rader får tas bort endast med uttryckligt val dubbletter=exact. Övriga konflikter kräver metodval. Första registret bestämmer populationen; left_join behåller alla dess personer. Många-till-många kräver annan analysenhet och egen mall.',
  r_code:intro(id,'Hämta och kombinera valda register med en rad per person',selections.map(s=>s.databasvy),['Hämta verifierade variabler för valda perioder.','Kontrollera den valda nyckeln; tillämpa endast uttryckligt vald dubblettregel.','Behåll första registrets population och redovisa skyddade kontrollantal.'],[...smallNotes,...contextComments(contexts)],options.skapare)+`${templates.common}\n\n# ---- Kombinera register ----\n\nanalys <- function() {\n  con <- uppkoppling_db()\n  on.exit(DBI::dbDisconnect(con), add = TRUE)\n${code}\n  resultat <- register_1\n${joins}\n  stopifnot(nrow(resultat) == nrow(register_1))\n  kontroll <- tibble(kontroll = c("antal_population", "antal_resultat"), antal = c(nrow(register_1), nrow(resultat))) %>%\n    skydda_antal(total_grupper = "kontroll")\n\n  list(internt = resultat, kontroll = kontroll)\n}\n\n# ---- Kör analysen ----\n\n# Kör i MONA efter granskning: resultat <- analys()\n`};
}


type RegisterContext=ReturnType<typeof registerContext>;
function contextComments(contexts:RegisterContext[]):string[]{
 return [...new Map(contexts.flatMap(c=>c.notes.map(n=>[n.id,`${n.title}: ${n.message} Analyskonsekvens: ${n.consequence} ${n.scope_note} Källa: ${n.source.title}, s. ${n.source_pages.join(', ')}; ${n.source.url}`] as const))).values()];
}

function harmonizeTemplate(selections:Selection[],options:{skapare?:string;kontext?:AnalysisContext}):TemplateResult{
 if(!selections.length)throw new Error('Ange vy, variabel/begrepp och uttryckligt år för varje uttag.');
 const plan=selections.flatMap(s=>s.variabler.map(name=>{
  const canonical=canonicalView(s.databasvy);
  const mapping=registerKnowledge.harmonizations.find(h=>h.view===canonical&&(h.concept===name||h.variants.some(v=>v.variable===name)));
  if(s.period===null||s.period>9999)return {view:canonical,requested:name,year:s.period,error:'Harmoniseringsmallen kräver ett registerår (YYYY).'};
  if(!mapping)return {view:canonical,requested:name,year:s.period,error:'Ingen dokumenterad namnkoppling finns. Liknande stavning bevisar inte samma innehåll.'};
  const variants=mapping.variants.filter(v=>s.period!>=v.from&&s.period!<=v.to);
  if(variants.length!==1)return {view:canonical,requested:name,year:s.period,error:'Ingen entydig variabelversion för året.'};
  const source=variants[0].variable;
  const availability=check(canonical,source,[s.period],options.kontext);
  const key=check(canonical,'P1481_LopNr_PersonNr',[s.period],options.kontext);
  return {view:canonical,requested:name,year:s.period,source_variable:source,analysis_name:mapping.analysis_name,mapping,availability,key};
 }));
 const contexts=selections.map(s=>registerContext(canonicalView(s.databasvy),[],s.period===null?[]:[s.period],options.kontext));
 const blocked=plan.filter(p=>'error' in p||p.availability?.kontroller.some(c=>c.status!=='available')||p.key?.kontroller.some(c=>c.status!=='available'));
 if(blocked.length)return {...stamp,project_support:projectSupport,register_context:contexts,can_generate:false,plan,blocked,reason:'Harmonisering kräver dokumenterad namnkoppling och verifierade variabler för varje år.'};
 const accepted=plan as {view:string;year:number;source_variable:string;analysis_name:string;mapping:typeof registerKnowledge.harmonizations[number]}[];
 const keys=accepted.map(p=>`${p.view}\0${p.year}\0${p.analysis_name}`);
 if(new Set(keys).size!==keys.length)throw new Error('Samma begrepp och år förekommer flera gånger; slå ihop urvalet.');
 const warnings=[...new Set(accepted.map(p=>p.mapping.comparability)),...contextComments(contexts)];
 const blocks=accepted.map((p,i)=>`  uttag_${i+1} <- hamta(con, ${quote(p.view)}, ${p.year}, ${vec(['P1481_LopNr_PersonNr',p.source_variable])}) %>%\n    harmonisera_uttag(${quote(p.source_variable)}, ${quote(p.analysis_name)}, ${p.year}, bortfallskoder)`);
 // Multiple concepts in the same year are separate long tables; never join implicitly.
 const outputs=accepted.map((p,i)=>`    uttag_${i+1} %>% mutate(begrepp = ${quote(p.analysis_name)})`);
 return {...stamp,project_support:projectSupport,user_notice:projectSupport.small_counts.user_notice,register_context:contexts,id:'harmonisera_argangar',can_generate:true,plan,warnings,
  verification:{metadata_names:'verified',availability:'verified',semantic_equivalence:'not_verified',mona_execution:'not_run'},
  r_code:intro('harmonisera_argangar','Hämta variabelversioner per år och samla dem under gemensamma analysnamn',[...new Set(accepted.map(p=>p.view))],['Hämta rätt källvariabel enligt den dokumenterade årsplanen.','Byt till gemensamt namn och konvertera före vidare beräkning.','Behåll uttagsår och begrepp; välj analysenhet före eventuell registerkoppling.'],[...warnings,...smallNotes],options.skapare)+templates.common+`\n\n# ---- Harmoniserade årsuttag ----\n\n# Sätt TRUE först efter kontroll av definition, enhet och kodning.\njamforbarhet_kontrollerad <- FALSE\n\n# Ange bara verifierade bortfallskoder. Inga koder gissas.\nbortfallskoder <- character()\n\nanalys <- function() {\n  con <- uppkoppling_db()\n  on.exit(DBI::dbDisconnect(con), add = TRUE)\n  if (!isTRUE(jamforbarhet_kontrollerad)) stop("Kontrollera definition, enhet och kodning innan variabelversioner förs samman.")\n\n${blocks.join('\n\n')}\n\n  bind_rows(\n${outputs.join(',\n')}\n  )\n}\n\n# ---- Kör analysen ----\n\n# resultat <- analys()\n`};
}
