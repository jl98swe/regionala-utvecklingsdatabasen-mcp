import rawIndex from '../data/order-source-index.json' with {type:'json'};
import {searchDomains,getDomain} from './value-domains.js';
type Group={id:string;register:string;variant:string;views:string[];columns:string[];path:string;mappings:{databasvy:string;variabel:string;source_column:string}[]};
type Binding={id:string;column:string;variable:string;register_version:string;domain_id:string;orders:{databasvy:string;variabel:string;ar_raw:string|null}[];[key:string]:unknown};
type Domain={id:string;version:string;level:string;data_type:string;value_count:number;path:string};
type State={schema_version:string;source:string;group_id:string;register:string;variant:string;bindings:Binding[];domains:Domain[];coverage:Record<string,unknown>};
const index=rawIndex as unknown as {metadata_sha256:string;plan_sha256:string;groups:Group[];unresolved_views:{databasvy:string;status:string;unmatched_variables:string[]}[]};
export const orderDomainStamp={order_domains_metadata_sha256:index.metadata_sha256,order_domains_plan_sha256:index.plan_sha256,order_domain_source_groups:index.groups.length};
const BASE='https://raw.githubusercontent.com/jl98swe/regionala-utvecklingsdatabasen-mcp/main/';
const cache=new Map<string,{time:number;data:unknown;bytes:number}>();
const norm=(s:string)=>s.normalize('NFC').toLocaleLowerCase('sv');
const caveats=[
 'Kopplingarna gäller granskade registervarianter och överensstämmande variabelnamn. De ändrar inte MONA-beställningens population eller tillgänglighet.',
 'Endast variabler ur beställningen hämtas. Okända beställningsår är fortfarande okända även om SCB:s dokumentation hämtas för fler källversioner.',
 'Hämtningen sker i delar. Kontrollera coverage, source_updated och retrieved_at. Saknad eller blockerad hämtning betyder inte att SCB saknar en värdemängd.',
 'Samma värdemängdsnamn kan ha olika innehåll. Innehålls-id, registervariant och registerversion bevaras. Koder behålls som text, inklusive tom kod och inledande nollor.'
];
async function load(path:string){
 if(!/^data\/(value-domains-ordered\/[a-f0-9]{20}|(?:value-domain-values|variable-documentation)\/[a-f0-9]{64})\.json$/.test(path))throw new Error('Ogiltig katalogsökväg.');
 const cached=cache.get(path);if(cached&&Date.now()-cached.time<120_000)return cached.data;
 const response=await fetch(BASE+path,{signal:AbortSignal.timeout(20_000)});
 if(response.status===404)return null;
 if(!response.ok)throw new Error(`Källkatalogen kunde inte läsas (${response.status}).`);
 const text=await response.text();if(text.length>4*1024*1024)throw new Error('Katalogdelen är för stor för detta anrop.');
 const data:unknown=JSON.parse(text);
 while(cache.size&&([...cache.values()].reduce((n,v)=>n+v.bytes,0)+text.length*2>8*1024*1024||cache.size>=16))cache.delete(cache.keys().next().value!);
 cache.set(path,{time:Date.now(),data,bytes:text.length*2});return data;
}
export function clearOrderDomainCache(){cache.clear();}
export async function searchAllDomains(term='',register?:string,column?:string,version?:string,offset=0,limit=30,view?:string){
 if(!view&&(!register||!index.groups.some(g=>g.register===register))){
  return {...searchDomains(term,register,column,version,offset,limit),...orderDomainStamp,order_sources:index.groups.map(({mappings:_,...g})=>g),unresolved_views:index.unresolved_views,order_source_selection_required:true};
 }
 const groups=index.groups.filter(g=>(!view||g.views.includes(view))&&(!register||g.register===register)&&(!column||g.mappings.some(m=>(!view||m.databasvy===view)&&(m.variabel===column||m.source_column===column))));
 if(groups.length>8)return {...orderDomainStamp,source:BASE,results:[],total:0,offset,next_offset:null,source_groups:groups.map(({mappings:_,...g})=>g),selection_required:true,caveats};
 const states=await Promise.all(groups.map(async g=>({group:g,state:await load(g.path) as State|null})));
 const q=norm(term);const found:Record<string,unknown>[]=[];
 for(const {group,state} of states){
  if(!state)continue;
  if(state.group_id!==group.id||!Array.isArray(state.bindings))throw new Error('Fel registervariant i källkatalogen.');
  for(const b of state.bindings){
   if(view&&!b.orders.some(o=>o.databasvy===view))continue;
   if(column&&b.column!==column&&!b.orders.some(o=>(!view||o.databasvy===view)&&o.variabel===column))continue;
   if(version&&b.register_version!==version)continue;
   if(q&&![group.register,group.variant,b.column,b.variable,...b.orders.flatMap(o=>[o.databasvy,o.variabel])].some(s=>norm(s).includes(q)))continue;
   found.push({...b,id:group.id+':'+b.id,group_id:group.id,register:group.register,variant:group.variant});
  }
 }
 return {...orderDomainStamp,source:'https://mikrometadata.scb.se/',total:found.length,offset,results:found.slice(offset,offset+limit),next_offset:offset+limit<found.length?offset+limit:null,source_groups:states.map(({group,state})=>({id:group.id,register:group.register,variant:group.variant,views:group.views,status:state?'available':'pending',coverage:state?.coverage??null})),unresolved:index.unresolved_views.filter(v=>!view||v.databasvy===view),caveats};
}
export async function getAnyDomain(id:string,codes:string[]=[],offset=0,limit=30){
 if(!id.includes(':'))return getDomain(id,codes,offset,limit);
 if(!/^[a-f0-9]{20}:[a-f0-9]{64}$/.test(id))throw new Error('Ogiltigt kopplings-id.');
 const [gid,bid]=id.split(':');const group=index.groups.find(g=>g.id===gid);
 if(!group)throw new Error('Okänd källvariant. Sök först med sok_vardemangder.');
 const state=await load(group.path) as State|null;
 if(!state)throw new Error('Källvarianten har ännu inte hämtats.');
 const b=state.bindings.find(b=>b.id===bid);if(!b)throw new Error('Kopplingen finns inte i denna registervariant.');
 const info=state.domains.find(d=>d.id===b.domain_id);if(!info)throw new Error('Värdemängdsreferensen saknas.');
 const path=`data/value-domain-values/${info.id}.json`;
 if(info.path!==path)throw new Error('Fel innehållsadress för värdemängden.');
 const domain=await load(path) as {id:string;version:string;level:string;data_type:string;values:{code:string;label:string}[]}|null;
 if(!domain||domain.id!==info.id||domain.values.length!==info.value_count)throw new Error('Värdemängden kunde inte verifieras mot registerkatalogen.');
 let documentation:Record<string,unknown>={status:'not_yet_collected'};
 const ref=b.documentation as {id:string;path:string}|undefined;
 if(ref){
  if(!/^[a-f0-9]{64}$/.test(ref.id)||ref.path!==`data/variable-documentation/${ref.id}.json`)throw new Error('Fel dokumentationsreferens.');
  const doc=await load(ref.path) as {id:string;source:string;fields:{name:string;value:string}[]}|null;
  if(doc&&(doc.id!==ref.id||!Array.isArray(doc.fields)||!doc.fields.every(f=>typeof f.name==='string'&&typeof f.value==='string')))throw new Error('Dokumentationen kunde inte verifieras.');
  documentation=doc?{status:'available',...doc}:{status:'not_available',id:ref.id};
 }
 const wanted=new Set(codes),values=domain.values.filter(v=>!wanted.size||wanted.has(v.code));
 const {values:_,...definition}=domain;
 return {...orderDomainStamp,source:'https://mikrometadata.scb.se/',binding:{...b,id,register:group.register,variant:group.variant},coverage:state.coverage,documentation,domain:definition,total:values.length,offset,results:values.slice(offset,offset+limit),next_offset:offset+limit<values.length?offset+limit:null,caveats};
}
