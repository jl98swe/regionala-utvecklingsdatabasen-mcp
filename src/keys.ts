import raw from '../data/keys.json' with {type:'json'};
type Profile={distinct_values:number;null_rows:number;duplicate_values:number;conflicting_values:number};
type Table={id:string;file:string;sheet:string;sha256:string;annotations:{cell:string;value:string}[];formulas:{cell:string;formula:string}[];columns:string[];numeric_source_columns:string[];profiles:Record<string,Profile>;row_count:number;source_rows:number[];rows:(string|null)[][]};
const data=raw as unknown as {snapshot:string;archive_sha256:string;schema_version:string;tables:Table[]};
export const keyStamp={keys_snapshot:data.snapshot,keys_archive_sha256:data.archive_sha256,keys_schema_version:data.schema_version};
export const keySummary={...keyStamp,files:new Set(data.tables.map(t=>t.file)).size,sheets:data.tables.length,rows:data.tables.reduce((n,t)=>n+t.row_count,0)};
const caveats=[
 'Rubrikraden styr matchning, inte filnamnet. Registret beskriver möjliga kopplingar; det kör inte fjoin_klartext och garanterar inte dess slutresultat.',
 'Kolumner som redan finns kan påverka kopplingen. Flera matchande filer, bearbetningsordning, kolumnkollisioner och upprepade kopplingar måste verifieras mot installerad funktion.',
 'Nyckeln bevisar inte att variabeln finns i en databasvy eller för ett visst år. Kontrollera databasmetadata separat. Giltighetsår är okända om de inte verifierats; snapshot är importens referensdatum.',
 'Originalvärden bevaras: numeriska Excel-celler återges som text utan automatisk nollutfyllnad. Tom cell är null, skild från tom sträng och särskilda bortfallskoder. Numeriska källkolumner kräver formatkontroll mot MONA.',
 'Ingen originalfil ändras. Dubblettrader bevaras. Dubbletter på kopplingskolumner kan multiplicera observationer; välj inte godtyckligt första raden.'
];
const norm=(v:string)=>v.normalize('NFC').toLocaleLowerCase('sv');
const page=<T>(xs:T[],offset:number,limit:number)=>({total:xs.length,offset,results:xs.slice(offset,offset+limit),next_offset:offset+limit<xs.length?offset+limit:null});
function overview(t:Table){return {id:t.id,file:t.file,sheet:t.sheet,sha256:t.sha256,columns:t.columns,row_count:t.row_count,numeric_source_columns:t.numeric_source_columns,column_profiles:t.profiles,validity_years:null,formula_cells:t.formulas,unheaded_annotations:t.annotations};}
export function searchKeys(term='',column:string|undefined=undefined,offset=0,limit=30){
 const q=norm(term);
 const found=data.tables.filter(t=>(!column||t.columns.includes(column))&&(!q||[t.file,...t.columns].some(v=>norm(v).includes(q))));
 return {...keyStamp,search_scope:'file_and_column_names',column_match:'exact_case_sensitive',...page(found.map(overview),offset,limit),caveats};
}
export function getKey(id:string,term='',column:string|undefined=undefined,codes:string[]=[],offset=0,limit=30){
 const t=data.tables.find(t=>t.id===id);if(!t)throw new Error('Okänt nyckel-id. Hämta exakt id med sok_nycklar.');
 const ci=column===undefined?undefined:t.columns.indexOf(column);
 if(ci===-1)throw new Error('Kolumnen finns inte i nyckeln.');
 if(codes.length&&ci===undefined)throw new Error('Ange kolumn för exakta kodurval.');
 const q=norm(term), wanted=new Set(codes);
 const matches:number[]=[];
 for(let i=0;i<t.rows.length;i++){
  const row=t.rows[i];const cells=ci===undefined?row:[row[ci]];
  if(wanted.size&&!wanted.has(row[ci!]!))continue;
  if(q&&!cells.some(v=>v!==null&&norm(v).includes(q)))continue;
  matches.push(i);
 }
 const selected=matches.slice(offset,offset+limit).map(i=>({source_row:t.source_rows[i],values:Object.fromEntries(t.columns.map((c,j)=>[c,t.rows[i][j]]))}));
 return {...keyStamp,key:overview(t),total:matches.length,offset,results:selected,next_offset:offset+limit<matches.length?offset+limit:null,caveats};
}
export function checkKeyJoin(columns:string[],caseSensitive=true){
 const eq=(a:string,b:string)=>caseSensitive?a===b:norm(a)===norm(b);
 const plans=data.tables.flatMap(t=>{
  const shared=t.columns.filter(c=>columns.some(d=>eq(c,d)));if(!shared.length)return [];
  const indices=shared.map(c=>t.columns.indexOf(c));
  const seen=new Map<string,{count:number;row:string;conflict:boolean}>();let nullRows=0;
  for(const row of t.rows){
   const values=indices.map(i=>row[i]);if(values.some(v=>v===null))nullRows++;
   const key=JSON.stringify(values), serialized=JSON.stringify(row),prev=seen.get(key);
   if(prev){prev.count++;if(prev.row!==serialized)prev.conflict=true;}else seen.set(key,{count:1,row:serialized,conflict:false});
  }
  const groups=[...seen.values()];
  return [{...overview(t),matching_columns:shared,input_column_matches:shared.map(c=>({key_column:c,input_columns:columns.filter(d=>eq(c,d))})),possible_added_columns:t.columns.filter(c=>!shared.includes(c)),
   candidate_composite_key:{columns:shared,duplicate_values:groups.filter(g=>g.count>1).length,conflicting_values:groups.filter(g=>g.conflict).length,null_rows:nullRows},
   diagnostic_only:true}];
 });
 return {...keyStamp,input_columns:columns,case_sensitive:caseSensitive,matched_files:plans.length,results:plans,
  unmatched_columns:columns.filter(c=>!data.tables.some(t=>t.columns.some(h=>eq(c,h)))),
  cross_file_column_overlaps:[...new Set(plans.flatMap(p=>p.possible_added_columns))].filter(c=>plans.filter(p=>p.possible_added_columns.includes(c)).length>1),
  caveats:[...caveats,'Dubblettkontrollen använder alla gemensamma rubriker som en möjlig sammansatt nyckel. Den bevisar inte att funktionen använder just dessa kopplingsvillkor. Ingen kopplingsordning eller transitiv koppling antas.']};
}
