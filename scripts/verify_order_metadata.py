#!/usr/bin/env python3
"""Verify saved SCB content and distinguish documentation, code lists and pending work."""
import collections,json,sys
from datetime import datetime,timezone
from pathlib import Path
from harvest_mikrometadata import digest
ROOT=Path(__file__).resolve().parents[1]
def verify(root=ROOT):
 index=json.loads((root/'data/order-source-index.json').read_text());errors=[];groups=[];totals=collections.Counter();views=collections.defaultdict(lambda:collections.defaultdict(set));seen=set()
 for g in index['groups']:
  path=root/g['path']
  if not path.exists():groups.append({'id':g['id'],'views':g['views'],'status':'pending'});continue
  state=json.loads(path.read_text());domains={d['id']:d for d in state['domains']};count=collections.Counter()
  if state['group_id']!=g['id']:errors.append(f"{g['id']}: wrong group")
  for b in state['bindings']:
   count['bindings']+=1
   if b.get('documentation'):
    ref=b['documentation'];p=root/ref['path']
    if not p.exists():errors.append(f"{b['id']}: missing documentation");continue
    doc=json.loads(p.read_text())
    if doc['id']!=ref['id'] or digest({k:v for k,v in doc.items() if k!='id'})!=doc['id']:errors.append(f"{b['id']}: documentation checksum")
    count['documentation']+=1
    fields=doc['fields'];defined=any(f['name']=='Variabeldefinition' and f['value'].strip() for f in fields)
    method=any(f['name'] in ('VariabelOperationell_definition','Registerversionmätinformation') and f['value'].strip() for f in fields)
    count['nonempty_definition']+=defined;count['nonempty_method']+=method
    for o in b['orders']:
     key=(o['variabel'],b['register_version'],g['id']);views[o['databasvy']]['documented_versions'].add(key)
     views[o['databasvy']]['documented_columns'].add(o['variabel'])
   if not b.get('domain_id'):
    count['documentation_only']+=1
    if b.get('status')!='documentation_only':errors.append(f"{b['id']}: invalid missing domain")
    continue
   ref=domains.get(b['domain_id'])
   if not ref:errors.append(f"{b['id']}: missing domain reference");continue
   p=root/ref['path']
   if not p.exists():errors.append(f"{b['id']}: missing domain file");continue
   doc=json.loads(p.read_text())
   if doc['id']!=ref['id'] or digest({k:v for k,v in doc.items() if k!='id'})!=doc['id']:errors.append(f"{b['id']}: domain checksum")
   if len(doc['values'])!=ref['value_count']:errors.append(f"{b['id']}: wrong value count")
   if any(not isinstance(v['code'],str) or not isinstance(v['label'],str) for v in doc['values']):errors.append(f"{b['id']}: code/label not text")
   count['verified_domains']+=1;count[b['status']]+=1;seen.add(doc['id'])
  c=state['coverage'];groups.append({'id':g['id'],'views':g['views'],'complete':bool(c.get('complete')),'expected_bindings':c.get('expected_bindings'),**count,'source_errors':len(c.get('errors',[])),'source_error_examples':c.get('errors',[])[:2]})
  totals.update(count);totals['complete_groups']+=bool(c.get('complete'));totals['groups_with_source_errors']+=bool(c.get('errors'))
 totals['groups']=len(index['groups']);totals['unique_domains']=len(seen)
 return {'checked_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),'metadata_sha256':index['metadata_sha256'],'totals':dict(totals),'integrity_errors':errors,'groups':groups,'views':{v:{k:len(vals) for k,vals in counts.items()} for v,counts in sorted(views.items())},'interpretation':'Complete gäller bara granskade källvarianter och identifierade dokumentationsversioner. Det är inte full täckning av alla beställda variabler. Tomma metodfält fylls inte ut; documentation_only betyder att kodexporten inte är verifierad.'}
if __name__=='__main__':
 report=verify();out=ROOT/'data/order-metadata-verification.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'totals':report['totals'],'integrity_errors':report['integrity_errors']},ensure_ascii=False));sys.exit(bool(report['integrity_errors']))
