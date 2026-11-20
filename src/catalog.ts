import {projectSupport} from './guidance.js';
import {registerContext,type AnalysisContext} from './knowledge.js';
import data from '../data/metadata.json' with { type: 'json' };
export type Row = typeof data.records[number];
export type Availability = {status:'known'|'unknown'|'unparsed'; granularity:'year'|'month'|null; periods:number[]; raw:string|null};
export const metadata = data;
export const normalize = (s:string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function parsePeriod(raw:string|null):Availability {
  if (!raw?.trim()) return {status:'unknown',granularity:null,periods:[],raw};
  const parts=raw.trim().replace(/[–—]/g,'-').split(/[,;]\s*/);
  let granularity:'year'|'month'|null=null; const periods:number[]=[];
  for(const part of parts) {
    const m=part.trim().match(/^(\d{4}|\d{6})(?:\s*-\s*(\d{4}|\d{6}))?$/);
    if(!m || (m[2] && m[1].length!==m[2].length)) return {status:'unparsed',granularity:null,periods:[],raw};
    const g=m[1].length===6?'month':'year';
    if(granularity && granularity!==g) return {status:'unparsed',granularity:null,periods:[],raw};
    granularity=g;
    const index=(s:string) => g==='month' ? Number(s.slice(0,4))*12+Number(s.slice(4))-1 : Number(s);
    if(g==='month' && [m[1],m[2]??m[1]].some(s=>Number(s.slice(4))<1||Number(s.slice(4))>12)) return {status:'unparsed',granularity:null,periods:[],raw};
    const start=index(m[1]),end=index(m[2]??m[1]);
    if(start>end || end-start>2400) return {status:'unparsed',granularity:null,periods:[],raw};
    for(let p=start;p<=end;p++) periods.push(g==='month'?Math.floor(p/12)*100+p%12+1:p);
  }
  return {status:'known',granularity,periods:[...new Set(periods)].sort((a,b)=>a-b),raw};
}
const searchable=new Map(data.records.map(r=>[r,normalize(r.variabel+" "+r.databasvy)]));
const parsed=new Map(data.records.map(r=>[r,parsePeriod(r.ar_raw)]));
export const views=[...new Set(data.records.map(r=>r.databasvy))].sort();
const byView=new Map(views.map(v=>[v,data.records.filter(r=>r.databasvy===v)]));
export const stamp = {metadata_sha256:data.source_sha256,schema_version:data.schema_version};
export function canonicalView(view:string) {
  const exact=views.find(v=>v===view); if(exact) return exact;
  const matches=views.filter(v=>normalize(v)===normalize(view));
  if(matches.length===1) return matches[0];
  throw new Error(`Okänd eller tvetydig databasvy: ${view}. Använd sok_variabler.`);
}
export function getRow(view:string,variable:string) {
  const v=canonicalView(view); const rows=byView.get(v)!;
  const exact=rows.find(r=>r.variabel===variable);if(exact)return exact;
  const matches=rows.filter(r=>normalize(r.variabel)===normalize(variable));
  if(matches.length===1)return matches[0];
  throw new Error(`Okänd eller tvetydig variabel: ${variable} i ${v}. Använd sok_variabler.`);
}
export function detail(r:Row) {return {...r,tillganglighet:parsed.get(r)!};}
export function check(view:string,variable:string,periods:number[]=[],context:AnalysisContext={}){
 const r=getRow(view,variable),a=parsed.get(r)!;
 return {...detail(r),register_context:registerContext(r.databasvy,[r.variabel],periods,context),kontroller:periods.map(period=>{
  let status:string='unknown',available:number[]=[];
  if(a.status==='known') {
   if(a.granularity==='month' && period<10000) {available=a.periods.filter(p=>Math.floor(p/100)===period);status=available.length===12?'available':available.length?'partial':'unavailable';}
   else if(a.granularity==='year' && period>9999) status='granularity_mismatch';
   else status=a.periods.includes(period)?'available':'unavailable';
  }
  return {period,status,...(a.granularity==='month'&&period<10000?{available_months:available}:{})};
 })};
}
const aliases:Record<string,string[]>={
 'personnummer':['P1481_LopNr_PersonNr'], 'lopnummer':['LopNr'], 'student':['hreg'], 'studenter':['hreg'],
 'hogskola':['hreg'], 'universitet':['hreg'], 'invandring':['in_utvandring_lisa'], 'utvandring':['in_utvandring_lisa'],
 'fodelseland':['fodelseland_lisa'], 'folkbokforing':['rtb'], 'befolkning':['rtb'],
 'sysselsattning':['bas','lisa_individ'], 'manadsregister':['bas_prelmanad'], 'arbetsstalle':['Ast','Cfar'],
};
export function search(query:string,view?:string,offset=0,limit=30){
 const v=view?canonicalView(view):undefined;
 const tokens=query.trim().split(/\s+/).filter(Boolean).map(normalize);
 const alternatives=tokens.map(t=>[t,...(aliases[t]??[]).map(normalize)]);
 const matched=(v?byView.get(v)!:data.records).filter(r=>alternatives.every(options=>options.some(s=>searchable.get(r)!.includes(s))));
 return {...stamp,total:matched.length,offset,next_offset:offset+limit<matched.length?offset+limit:null,
  register_context:[...new Set(matched.slice(offset,offset+limit).map(r=>r.databasvy))].map(v=>registerContext(v,matched.filter(r=>r.databasvy===v).map(r=>r.variabel))),
  results:matched.slice(offset,offset+limit).map(detail),notice:'Sökning är normaliserad; använd svarens exakta namn i R. Metadata saknar variabeldefinitioner och kodlistor.'};
}
export function structure(view?:string,offset=0,limit=50,periods:number[]=[],context:AnalysisContext={}){
 if(!view)return {...stamp,project_support:projectSupport,total:views.length,next_offset:offset+limit<views.length?offset+limit:null,
  views:views.slice(offset,offset+limit).map(v=>({databasvy:v,antal_variabler:data.records.filter(r=>r.databasvy===v).length}))};
 const v=canonicalView(view),rows=byView.get(v)!;
 return {...stamp,definitions_url:projectSupport.definitions_url,databasvy:v,total:rows.length,next_offset:offset+limit<rows.length?offset+limit:null,
  variables:rows.slice(offset,offset+limit).map(detail),
  register_context:registerContext(v,[],periods,context),
  variable_name_candidates:variableNameCandidates(v),
  candidate_keys:rows.filter(r=>/LopNr/i.test(r.variabel)).map(r=>r.variabel),
  notice:'Löpnummer är möjliga kopplingsnycklar. Unikhet, kardinalitet, kodbetydelser och analysenhet framgår inte av metadata. Från år/Till år gäller vyn och styr aldrig variabeltillgänglighet.'};
}

// Candidates are for review, never proof of equivalent definitions or units.
export function variableNameCandidates(view:string){
 const rows=byView.get(canonicalView(view))!;
 const groups=new Map<string,Row[]>();
 for(const r of rows){const key=normalize(r.variabel);groups.set(key,[...(groups.get(key)??[]),r]);}
 return [...groups.values()].filter(xs=>xs.length>1).map(xs=>({variants:xs.map(detail),equivalence:'not_established',notice:'Liknande namn kan vara olika begrepp. Använd bara en uttryckligt dokumenterad harmonisering.'}));
}
