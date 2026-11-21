import importlib.util,json,unittest
from pathlib import Path
import sys
ROOT=Path(__file__).parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from harvest_mikrometadata import digest
from harvest_order_domains import eligible,export_sets,documentation_record,collection_complete
class OrderTests(unittest.TestCase):
 def test_period_scope_does_not_invent_order_availability(self):
  self.assertTrue(eligible('1997-2024','2010'))
  self.assertFalse(eligible('1997-2009','2010'))
  self.assertTrue(eligible('202001-202512','2025'))
  self.assertTrue(eligible('202001-202512','2025-12'))
  self.assertFalse(eligible('202001-202512','2026-01'))
  self.assertTrue(eligible(None,'In- och utvandrade'))
  self.assertFalse(eligible('2010-2024','okänt format'))
 def test_actual_date_and_combined_source_periods(self):
  self.assertTrue(eligible('1998-2024','2024-12-31'))
  self.assertFalse(eligible('1998-2024','2025-12-31'))
  self.assertFalse(eligible('2024','2024-02-31'))
  self.assertTrue(eligible('2005-2024','2005-2025'))
  self.assertFalse(eligible('2000-2004','2005-2025'))
  self.assertTrue(eligible('202401-202412','2024-12-31'))
  self.assertFalse(eligible('202401-202411','2024-12-31'))
  self.assertFalse(eligible('2024','Kvartal 1-3 fr.o.m. 2009'))
 def test_export_separates_levels_preserving_codes(self):
  header='Vardemangdsversion\tVardemangdsniva\tDatatyp\tKolumnnamn\tVardekod\tVardebenamning\n'
  text=header+'v\tDetalj\tText\tX\t001\tEtt\n'+'v\tDetalj\tText\tX\t\tSaknas\n'+'v\tGrupp\tText\tX\t1\tGrupp ett\n'
  result=export_sets(text)
  self.assertEqual(len(result),2)
  self.assertEqual(result[0][0]['values'],[{'code':'001','label':'Ett'},{'code':'','label':'Saknas'}])
  self.assertEqual(result[0][1],{'X'})
 def test_documentation_preserves_repeated_and_empty_source_fields(self):
  rows=[('Variabelnamn','Syntetiskt exempel'),('Variabeldefinition',''),('Populationnamn','A'),('Populationnamn','B'),('Registerversionmätinformation','Metodexempel')]
  d=documentation_record(rows)
  self.assertEqual(d['fields'],[{'name':k,'value':v} for k,v in rows])
  self.assertEqual(d['id'],digest({k:v for k,v in d.items() if k!='id'}))
  with self.assertRaises(ValueError):documentation_record([('Annan rubrik','exempel')])
 def test_existing_code_lists_do_not_mark_partial_documentation_complete(self):
  bindings={'a':{'documentation':{'id':'example'}},'b':{}}
  self.assertFalse(collection_complete({'a','b'},bindings,[]))
  bindings['b']['documentation']={'id':'example2'}
  self.assertTrue(collection_complete({'a','b'},bindings,[]))
  self.assertFalse(collection_complete({'a','b'},bindings,['export error']))
  self.assertFalse(collection_complete(set(),bindings,[]))
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
    if b.get('documentation'):
     ref=b['documentation'];doc=json.loads((ROOT/ref['path']).read_text())
     self.assertEqual(ref['id'],doc['id']);self.assertEqual(doc['id'],digest({k:v for k,v in doc.items() if k!='id'}))
    self.assertTrue(b['orders']);self.assertIn(b['domain_id'],domains)
    domain=domains[b['domain_id']];actual=json.loads((ROOT/domain['path']).read_text())
    self.assertEqual(domain['value_count'],len(actual['values']))
    if b['status']=='not_enumerated':self.assertTrue(b['definition_only_verified'])
if __name__=='__main__':unittest.main()
