import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('harvest', Path(__file__).parents[1] / 'scripts/harvest_mikrometadata.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

class ValueDomainTests(unittest.TestCase):
    def test_preserves_codes_and_blank(self):
        text = '\ufeffVardemangdsversion\tVardemangdsniva\tVardekod\tVardebenamning\tKolumnnamn\tDatatyp\n2024\tKommun\t0114\tUpplands Väsby\tAstKommun\tchar(4)\n2024\tKommun\t\tUppgift saknas\tAstKommun\tchar(4)\n'
        d, columns = h.parse_export(text)
        self.assertEqual(d['values'][0]['code'], '0114')
        self.assertEqual(d['values'][1]['code'], '')
        self.assertEqual(columns, {'AstKommun'})
        # Sharing depends on domain content, not on the variable using it.
        other, _ = h.parse_export(text.replace('AstKommun', 'Kommun'))
        self.assertEqual(d['id'], other['id'])
        changed, _ = h.parse_export(text.replace('2024', '2025'))
        self.assertNotEqual(d['id'], changed['id'])

    def test_rejects_truncated_or_mixed_export(self):
        for bad in ('', '<html>Error</html>', 'Vardekod\n01\n'):
            with self.assertRaises(ValueError): h.parse_export(bad)

    def test_catalog_integrity(self):
        data = json.loads((Path(__file__).parents[1] / 'data/value-domains.json').read_text())
        domains = {d['id']: d for d in data['domains']}
        self.assertEqual(len(domains), len(data['domains']))
        self.assertEqual(len({b['id'] for b in data['bindings']}), len(data['bindings']))
        for domain in domains.values():
            self.assertEqual(domain['id'], h.digest({k:v for k,v in domain.items() if k != 'id'}))
            for value in domain['values']:
                self.assertIsInstance(value['code'], str)
                self.assertIsInstance(value['label'], str)
        for binding in data['bindings']:
            self.assertIn(binding['domain_id'], domains)
            self.assertIn(binding['status'], ('enumerated', 'not_enumerated'))
            self.assertIn(binding['register'], data['registers'])
            if binding['status'] == 'not_enumerated' and data['registers'][binding['register']]['complete']:
                self.assertTrue(binding.get('definition_only_verified'), 'Laddning får inte tolkas som saknad kodlista')

if __name__ == '__main__': unittest.main()
