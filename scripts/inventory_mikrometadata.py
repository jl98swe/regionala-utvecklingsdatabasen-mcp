#!/usr/bin/env python3
"""Export SCB's complete public variable index for auditable order matching."""
import csv,gzip,io,json,re
from collections import Counter
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from harvest_mikrometadata import SOURCE,CSV,download_text,atomic_save

def main():
 expect.set_options(timeout=90000)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page(accept_downloads=True);page.set_default_timeout(90000)
  page.goto(SOURCE,wait_until='domcontentloaded')
  page.get_by_role('button',name='OK',exact=True).click()
  expect(page.get_by_role('textbox',name='Register',exact=True)).to_be_visible()
  expect(page.get_by_role('progressbar')).to_have_count(0)
  date=page.get_by_text(re.compile(r'^Metadata uppdaterades:')).inner_text().split(':',1)[1].strip()
  rows_text=page.get_by_text(re.compile(r'^[\d\s\u00a0]+Rader$')).inner_text()
  expected=int(re.sub(r'\D','',rows_text))
  rows=list(csv.DictReader(io.StringIO(download_text(page,page.get_by_role('button',name=CSV,exact=True).first)),delimiter='\t'))
  assert len(rows)==expected,(len(rows),expected)
  required={'Registernamn','Registerrubrik','Registervariantnamn','Registervariantrubrik','Kolumnnamn','Variabelnamn','VersionForsta','VersionSista','Identitetsvariabel'}
  assert rows and required.issubset(rows[0])
  data={'source':SOURCE,'source_updated':date,'row_count':len(rows),'rows':rows}
  out=Path('data/mikrometadata-inventory.json.gz');out.parent.mkdir(exist_ok=True)
  # mtime=0 makes the archive stable when SCB's contents have not changed.
  out.write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
  counts=Counter((r['Registerrubrik'],r['Registervariantrubrik']) for r in rows)
  atomic_save(Path('data/mikrometadata-inventory-summary.json'),{'source':SOURCE,'source_updated':date,'rows':len(rows),'variants':[{'register':k[0],'variant':k[1],'columns':v} for k,v in sorted(counts.items())]})
  print(json.dumps({'rows':len(rows),'variants':len(counts),'compressed_bytes':out.stat().st_size,'source_updated':date}))
  browser.close()
if __name__=='__main__':main()
