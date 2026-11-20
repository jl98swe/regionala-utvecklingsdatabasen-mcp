import raw from '../data/value-domains.json' with {type:'json'};
type Domain={id:string;version:string;level:string;data_type:string;values:{code:string;label:string}[]};
type Binding={id:string;register:string;variant:string;column:string;variable:string;register_version:string;domain_id:string;status:string;source_updated:string;retrieved_at:string};
const catalog=raw as unknown as {schema_version:string;source:string;registers:Record<string,unknown>;domains:Domain[];bindings:Binding[]};
const norm=(s:string)=>s.normalize('NFC').toLocaleLowerCase('sv');
const caveats=[
 'Dokumenterade värdemängder från SCB, inte observerade MONA-värden eller frekvenser. Registerversionen är inte automatiskt ett händelseår.',
 'Kolumnnamn kan förekomma i flera register med olika betydelse. Välj register, registervariant och version uttryckligen. Ingen automatisk koppling till beställningens logiska vyer görs.',
 'Tom kod bevaras som tom sträng. Koder konverteras aldrig till tal. not_enumerated betyder att SCB visar en definition utan exporterbar kodlista, inte att värden saknas i MONA.',
 'Kontrollera retrieved_at och source_updated. Saknad träff betyder att uppgiften inte har hämtats, inte att variabeln saknar värdemängd.'
];
function page<T>(items:T[],offset:number,limit:number){return {total:items.length,offset,results:items.slice(offset,offset+limit),next_offset:offset+limit<items.length?offset+limit:null};}
export function searchDomains(term='',register?:string,column?:string,version?:string,offset=0,limit=30){
 const q=norm(term);
 const found=catalog.bindings.filter(b=>(!register||b.register===register)&&(!column||b.column===column)&&(!version||b.register_version===version)&&(!q||[b.register,b.variant,b.column,b.variable].some(s=>norm(s).includes(q))));
 return {source:catalog.source,schema_version:catalog.schema_version,registers:catalog.registers,...page(found,offset,limit),caveats};
}
export function getDomain(bindingId:string,codes:string[]=[],offset=0,limit=30){
 const binding=catalog.bindings.find(b=>b.id===bindingId);
 if(!binding)throw new Error('Okänt kopplings-id. Hämta exakt id med sok_vardemangder.');
 const domain=catalog.domains.find(d=>d.id===binding.domain_id);
 if(!domain)throw new Error('Värdemängden saknas för kopplingen.');
 const wanted=new Set(codes);
 const values=domain.values.filter(v=>!wanted.size||wanted.has(v.code));
 const {values:_,...info}=domain;
 return {source:catalog.source,binding,domain:info,...page(values,offset,limit),caveats};
}
