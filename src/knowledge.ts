import data from '../data/register-knowledge.json' with {type:'json'};

export type YearBasis='registerar'|'handelsear'|'uppfoljningsar'|'okant';
export type TimeScale='ar'|'manad'|'termin'|'handelse'|'okand';
export type AnalysisContext={ar_begrepp?:YearBasis;upplosning?:TimeScale;analysenhet?:string};
export const registerKnowledge=data;

export const timeMethods={
 ar:'Definiera årskull och en bestämd referenstidpunkt för varje uppföljningsår. Årsstatus visar inte när under året en övergång skedde.',
 manad:'Definiera övergång, första arbetsmånad och eventuell minsta varaktighet. Skilj faktiskt nollutfall från månader utan observation och hantera december/januari som kalendertid.',
 termin:'Verifiera terminens kodning och ordning. Bestäm om utfallet är registrering, poäng eller examen och hur flera registreringar per person och termin hanteras.',
 handelse:'Behåll händelseordning och händelsetyp tills analysenheten är vald. Samma person kan bidra med flera giltiga händelser.',
 okand:'Fastställ år, månad, termin eller händelse före metodval. Registerårgång, händelsedatum och uppföljningsår är olika tidsbegrepp.'
};

export function registerContext(view:string,variables:string[]=[],periods:number[]=[],context:AnalysisContext={}){
 const basis=context.ar_begrepp??'okant';
 const years=periods.map(p=>p>9999?Math.floor(p/100):p);
 const notes=data.notes.filter(n=>n.views.includes(view)&&(!variables.length||!Object.keys(n.variables).length||variables.some(v=>(n.variables as Record<string,string[]>)[view]?.includes(v)))).map(n=>{
  let relevance='background';
  if(n.year_basis!=='none'){
   if(!years.length)relevance='context_needed';
   else if(basis==='okant')relevance='year_basis_unclear';
   else if(basis!==n.year_basis)relevance='different_year_basis';
   else if(n.breakpoint!==null){
    const before=years.some(y=>y<n.breakpoint!),at=years.includes(n.breakpoint!),after=years.some(y=>y>=n.breakpoint!);
    relevance=before&&after?'crosses_breakpoint':at?'breakpoint':before?'affected_period':'background';
   }
  }
  const source=data.sources.find(s=>s.id===n.source_id)!;
  return {...n,relevance,level:['crosses_breakpoint','breakpoint','affected_period','year_basis_unclear'].includes(relevance)?'warning':'information',source};
 });
 return {databasvy:view,knowledge_version:data.version,notes,context:{...context,ar_begrepp:basis},
  time_guidance:timeMethods[context.upplosning??'okand'],
  analysis_unit:context.analysenhet??'Inte vald. Löpnummer behöver inte vara unikt för registrets rader.',
  duplicate_handling:'Ingen generell regel väljer första/sista rad eller summerar. Dokumentera användarens val: behåll händelser, aggregera eller prioritera en hel rad. Kontrollera nycklar och kopplingens kardinalitet.',
  population_guidance:'För antal bosatta med en egenskap: utgå från befolkningen i geografin vid vald tidpunkt och koppla egenskapen. Ett händelseregister avgränsar observerade händelser och kan inte ensamt beskriva hela den bosatta befolkningen.',
  harmonizations:data.harmonizations.filter(h=>h.view===view&&(!variables.length||variables.some(v=>v===h.concept||h.variants.some(x=>x.variable===v))))
 };
}
