import importlib.util,json,unittest
from pathlib import Path
import sys
ROOT=Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from harvest_mikrometadata import digest
from harvest_order_domains import eligible
class OrderTests(unittest.TestCase):
 def test_period_scope_does_not_invent_order_availability(self):
  self.assertTrue(eligible('1997-2024','2010'))
  self.assertFalse(eligible('1997-2009','2010'))
  self.assertTrue(eligible('202001-202512','2025'))
  self.assertTrue(eligible('202001-202512','2025-12'))
  self.assertFalse(eligible('202001-202512','2026-01'))
  self.assertTrue(eligible(None,'In- och utvandrade'))
  self.assertFalse(eligible('2010-2024','okänt format'))
 def test_plan_is_derived_from_order_and_reviewed_sources(self):
  meta=json.loads((ROOT/'data/metadata.json').read_text())
  path=ROOT/'data/order-source-plan.json'
  if path.exists():p=json.loads(path.read_text())
  else:
   import gzip
   from match_mikrometadata import build_plan
   inventory=json.loads(gzip.decompress((ROOT/'data/mikrometadata-inventory.json.gz').read_bytes()))
   p=build_plan(meta,inventory,json.loads((ROOT/'data/order-source-review.json').read_text()))
  self.assertEqual(meta['source_sha256'],p['metadata_sha256'])
  ordered={(r['databasvy'],r['variabel'],r['kallrad']) for r in meta['records']}
  for t in p['tasks']:
   self.assertTrue(t['orders'])
   for o in t['orders']:self.assertIn((o['databasvy'],o['variabel'],o['kallrad']),ordered)
 def test_saved_domains_and_shards_preserve_content(self):
  for path in (ROOT/'data/value-domain-values').glob('*.json'):
   d=json.loads(path.read_text());self.assertEqual(d['id'],digest({k:v for k,v in d.items() if k!='id'}))
   self.assertEqual(path.stem,d['id'])
   self.assertTrue(all(isinstance(v['code'],str) and isinstance(v['label'],str) for v in d['values']))
  for path in (ROOT/'data/value-domains-ordered').glob('*.json'):
   d=json.loads(path.read_text());domains={v['id']:v for v in d['domains']}
   self.assertEqual(len(d['bindings']),len({b['id'] for b in d['bindings']}))
   for b in d['bindings']:
    self.assertTrue(b['orders']);self.assertIn(b['domain_id'],domains)
    domain=domains[b['domain_id']];actual=json.loads((ROOT/domain['path']).read_text())
    self.assertEqual(domain['value_count'],len(actual['values']))
    if b['status']=='not_enumerated':self.assertTrue(b['definition_only_verified'])
if __name__=='__main__':unittest.main()
