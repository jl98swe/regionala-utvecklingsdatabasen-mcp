#!/usr/bin/env python3
"""Build a stable public MCP index and choose a bounded, fair harvesting batch."""
import argparse,collections,json
from pathlib import Path
from harvest_mikrometadata import atomic_save,digest
from harvest_order_domains import ROOT,groups_from_plan,path_for,COLLECTOR_SHA

def build():
 plan=json.loads((ROOT/'data/order-source-plan.json').read_text());groups=[]
 priority=['rtb','lisa_individ','bas','bas_prelmanad','bas_slutmanad','stativ','hreg_registrerade','hreg_poang']
 for gid,tasks in groups_from_plan(plan).items():
  views=sorted({o['databasvy'] for t in tasks for o in t['orders']})
  columns=sorted({o['variabel'] for t in tasks for o in t['orders']})
  mappings=sorted({(o['databasvy'],o['variabel'],t['Kolumnnamn']) for t in tasks for o in t['orders']})
  groups.append({'id':gid,'register':tasks[0]['Registerrubrik'],'variant':tasks[0]['Registervariantrubrik'],'views':views,'columns':columns,'mappings':[{'databasvy':v,'variabel':c,'source_column':s} for v,c,s in mappings],'path':f'data/value-domains-ordered/{gid}.json','priority':min((priority.index(v) if v in priority else 100 for v in views))})
 groups.sort(key=lambda g:(g['priority'],g['register'],g['variant']))
 index={'schema_version':'2.0','metadata_sha256':plan['metadata_sha256'],'plan_sha256':digest({'metadata':plan['metadata_sha256'],'groups':groups}),'groups':groups,'unresolved_views':[{'databasvy':v['databasvy'],'status':v['status'],'unmatched_variables':[r['variabel'] for r in v['variables'] if r['status'] not in ('matched','identity_not_enumerated')]} for v in plan['views'] if any(r['status'] not in ('matched','identity_not_enumerated') for r in v['variables'])]}
 atomic_save(ROOT/'data/order-source-index.json',index)
 return plan,index

def pending(plan,index):
 out=[]
 for g in index['groups']:
  p=path_for(g['id']);c=json.loads(p.read_text()).get('coverage',{}) if p.exists() else {}
  if c.get('complete') and c.get('source_updated')==plan['scb_source_updated'] and c.get('task_sha256')==digest(groups_from_plan(plan)[g['id']]):continue
  if c.get('errors') and c.get('source_updated')==plan['scb_source_updated'] and c.get('collector_sha256')==COLLECTOR_SHA:continue
  out.append((c.get('passes',0),g['priority'],g['id']))
 return [gid for _,_,gid in sorted(out)]

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--batch-size',type=int,default=8);a=p.parse_args()
 plan,index=build();todo=pending(plan,index)
 print(json.dumps({'include':[{'group':g} for g in todo[:a.batch_size]]},ensure_ascii=False))
