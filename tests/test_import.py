"""Synthetic XLSX tests. No personal data or source workbook in repository."""
import importlib.util, tempfile, unittest, zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts/import_metadata.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTest(unittest.TestCase):
    def make(self, rows):
        tmp=tempfile.NamedTemporaryFile(suffix='.xlsx',delete=False);tmp.close();self.addCleanup(Path(tmp.name).unlink)
        values=['variabler','databasvy','År','Från år','Till år','Kommun','rtb','1968-2024','1968','2024']
        strings='<sst xmlns="'+m.NS['s']+'">'+''.join('<si><t>'+s+'</t></si>' for s in values)+'</sst>'
        header='<row r="1">'+''.join(f'<c r="{c}1" t="s"><v>{i}</v></c>' for i,c in enumerate('ABCDE'))+'</row>'
        # Deliberately wrong worksheet dimension, matching the supplied file.
        xml='<worksheet xmlns="'+m.NS['s']+'"><dimension ref="A1"/><sheetData>'+header+rows+'</sheetData></worksheet>'
        with zipfile.ZipFile(tmp.name,'w') as z:
            z.writestr('xl/sharedStrings.xml',strings);z.writestr('xl/worksheets/sheet1.xml',xml)
        return tmp.name
    def row(self,i):return f'<row r="{i}"><c r="A{i}" t="s"><v>5</v></c><c r="B{i}" t="s"><v>6</v></c><c r="C{i}" t="s"><v>7</v></c></row>'
    def test_ignores_bad_dimensions(self):
        d=m.load(self.make(self.row(2)));self.assertEqual(d['antal_poster'],1);self.assertEqual(d['records'][0]['ar_raw'],'1968-2024')
    def test_rejects_duplicate_names_in_view(self):
        with self.assertRaisesRegex(ValueError,'Duplicate'):m.load(self.make(self.row(2)+self.row(3)))
    def test_blank_year_unknown(self):
        d=m.load(self.make(self.row(2).replace('<c r="C2" t="s"><v>7</v></c>','')));self.assertEqual(d['antal_okanda'],1)
if __name__=='__main__':unittest.main()
