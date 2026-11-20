#!/usr/bin/env python3
"""Match order columns to reviewed SCB register variants. Candidates are never approvals."""
import collections,gzip,json,math,re
from pathlib import Path
from harvest_mikrometadata import atomic_save,digest

def norm(s): return s.casefold()
def identity(s): return bool(re.match(r'^P\d+_LopNr_',s,re.I))
def groups(rows):
 out=collections.defaultdict(list)
 for r in rows:
  if r.get('Registerrubrik') and r.get('Kolumnnamn'):
   out[(r['Registerrubrik'],r['Registervariantrubrik'])].append(r)
 return out

def candidate_report(metadata,inventory):
 src=groups(inventory['rows']);by_view=collections.defaultdict(list)
 for r in metadata['records']:by_view[r['databasvy']].append(r)
 freq=collections.Counter(c for rows in src.values() for c in {norm(r['Kolumnnamn']) for r in rows})
 result=[]
 for view,records in sorted(by_view.items()):
  wanted={norm(r['variabel']):r['variabel'] for r in records if not identity(r['variabel'])}
  ranked=[]
  for (reg,var),rows in src.items():
   available={norm(r['Kolumnnamn']) for r in rows};common=set(wanted)&available
   if not common: continue
   weight=sum(math.log(1+len(src)/freq[c]) for c in common)
   ranked.append({'register':reg,'variant':var,'matched':len(common),'ordered_non_identity':len(wanted),'coverage':round(len(common)/max(1,len(wanted)),3),'weighted_overlap':round(weight,3),'columns':[wanted[c] for c in sorted(common)],'source_columns':len(available)})
  ranked.sort(key=lambda x:(x['weighted_overlap'],x['coverage']),reverse=True)
  result.append({'databasvy':view,'ordered_columns':len(records),'non_identity_columns':len(wanted),'candidates':ranked[:6]})
 return {'metadata_sha256':metadata['source_sha256'],'scb_source_updated':inventory['source_updated'],'views':result}

def build_plan(metadata,inventory,reviewed):
 src=groups(inventory['rows']);by_view=collections.defaultdict(list)
 for r in metadata['records']:by_view[r['databasvy']].append(r)
 results=[];tasks={}
 for view,records in sorted(by_view.items()):
  review=reviewed.get(view,{})
  selections=review.get('sources',[])
  for selection in selections:
   if (selection['register'],selection['variant']) not in src:raise ValueError(f'Okänd SCB-variant: {selection}')
  mapped=[]
  for r in records:
   matches=[]
   if not identity(r['variabel']):
    for selection in selections:
     alias=review.get('column_aliases',{}).get(r['variabel'],r['variabel'])
     source_rows=src[(selection['register'],selection['variant'])]
     exact=[s for s in source_rows if s['Kolumnnamn']==alias]
     folded=[s for s in source_rows if norm(s['Kolumnnamn'])==norm(alias)]
     selected=exact or (folded if len({s['Kolumnnamn'] for s in folded})==1 else [])
     for s in selected:
      task={k:s[k] for k in ('Registerrubrik','Registervariantrubrik','Variabelnamn','Kolumnnamn','VersionForsta','VersionSista')}
      tid=digest(task)
      relation={'databasvy':view,'variabel':r['variabel'],'ar_raw':r['ar_raw'],'kallrad':r['kallrad'],'method':'reviewed_alias' if alias!=r['variabel'] else ('exact' if alias==s['Kolumnnamn'] else 'case_only')}
      orders=tasks.setdefault(tid,dict(task,id=tid,orders=[]))['orders']
      if relation not in orders:orders.append(relation)
      matches.append({'task_id':tid,'register':selection['register'],'variant':selection['variant'],'source_column':s['Kolumnnamn'],'first_version':s['VersionForsta'],'last_version':s['VersionSista'],'method':relation['method']})
   status='identity_not_enumerated' if identity(r['variabel']) else ('matched' if matches else ('no_column_match' if selections else 'unresolved_view'))
   mapped.append({'variabel':r['variabel'],'ar_raw':r['ar_raw'],'status':status,'matches':matches})
  results.append({'databasvy':view,'status':review.get('status','unresolved'),'evidence':review.get('evidence',''),'sources':selections,'variables':mapped})
 return {'schema_version':'1.0','metadata_sha256':metadata['source_sha256'],'scb_source_updated':inventory['source_updated'],'source':'https://mikrometadata.scb.se/','views':results,'tasks':list(tasks.values())}

if __name__=='__main__':
 root=Path(__file__).parents[1]
 metadata=json.loads((root/'data/metadata.json').read_text())
 inventory=json.loads(gzip.decompress((root/'data/mikrometadata-inventory.json.gz').read_bytes()))
 candidates=candidate_report(metadata,inventory)
 atomic_save(root/'data/order-source-candidates.json',candidates)
 path=root/'data/order-source-review.json'
 reviewed=json.loads(path.read_text()) if path.exists() else {}
 plan=build_plan(metadata,inventory,reviewed)
 atomic_save(root/'data/order-source-plan.json',plan)
 print(json.dumps({'views':len(plan['views']),'reviewed_views':sum(bool(v['sources']) for v in plan['views']),'tasks':len(plan['tasks']),'variables':dict(collections.Counter(x['status'] for v in plan['views'] for x in v['variables']))},ensure_ascii=False))
