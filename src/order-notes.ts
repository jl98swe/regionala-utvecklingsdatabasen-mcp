import reviewData from '../data/order-source-review.json' with {type:'json'};
type Assumption={ordered_column:string;source_column:string;period:string;assumption:string;basis:string;verification:string;[key:string]:unknown};
type Review={definition_assumptions?:Assumption[];period_handling?:Record<string,unknown>;context_notes?:Record<string,unknown>[]};
const reviews=reviewData as unknown as Record<string,Review>;
export function orderNotes(views:string[],column?:string){
 return [...new Set(views)].flatMap(databasvy=>{
  const r=reviews[databasvy];if(!r)return [];
  const assumptions=(r.definition_assumptions??[]).filter(a=>!column||a.ordered_column===column||a.source_column===column);
  if(!assumptions.length&&!r.period_handling&&!r.context_notes?.length)return [];
  return [{databasvy,definition_assumptions:assumptions,...(r.period_handling?{period_handling:r.period_handling}:{}),...(r.context_notes?{context_notes:r.context_notes}:{})}];
 });
}
