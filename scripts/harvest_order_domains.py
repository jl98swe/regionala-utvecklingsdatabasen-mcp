#!/usr/bin/env python3
"""Restartable order-scoped harvesting, one reviewed register variant per job."""
import argparse,collections,csv,io,json,re,time
from datetime import datetime,timezone
from pathlib import Path
from harvest_mikrometadata import SOURCE,CSV,atomic_save,digest,choose_register,select_variable,detail,download_text,parse_export

ROOT=Path(__file__).parents[1]
COLLECTOR_SHA=__import__('hashlib').sha256(Path(__file__).read_bytes()).hexdigest()
def group_id(register,variant):return digest([register,variant])[:20]
def eligible(raw,label):
 if not raw:return True  # Source documentation only; does not assert order availability.
 label=label.strip()
 # Compare the actual documented period; do not manufacture yearly versions.
 if re.fullmatch(r'\d{4}-\d{2}-\d{2}',label):
  try:datetime.strptime(label,'%Y-%m-%d')
  except ValueError:return False
  source_lo=source_hi=int(label[:4]);month=int(label[:7].replace('-',''))
 elif re.fullmatch(r'\d{4}[-–/]\d{4}',label):
  source_lo,source_hi=map(int,re.split(r'[-–/]',label));month=None
  if source_hi<source_lo:return False
 elif re.fullmatch(r'\d{4}(?:[-/]\d{1,2})?|\d{6}',label):
  digits=label.replace('-','').replace('/','')
  if len(digits)==5:digits=digits[:4]+'0'+digits[4:]
  source_lo=source_hi=int(digits[:4]);month=int(digits) if len(digits)==6 else None
  if month is not None and not 1<=month%100<=12:return False
 else:return False
 for a,b in re.findall(r'(\d{4,6})(?:\s*[-–]\s*(\d{4,6}))?',str(raw)):
  lo,hi=int(a),int(b or a)
  if len(a)==6:
   if month is not None and lo<=month<=hi:return True
   if month is None and lo//100<=source_hi and source_lo<=hi//100:return True
  elif lo<=source_hi and source_lo<=hi:return True
 return False

def path_for(gid):return ROOT/f'data/value-domains-ordered/{gid}.json'

def groups_from_plan(plan):
 g=collections.defaultdict(list)
 for t in plan['tasks']:g[group_id(t['Registerrubrik'],t['Registervariantrubrik'])].append(t)
 return g

def display_meta(values):return tuple(' '.join(v.split()) for v in values)

def export_sets(text):
 rows=list(csv.DictReader(io.StringIO(text.lstrip('\ufeff')),delimiter='\t'))
 groups=collections.defaultdict(list)
 for row in rows:
  if any(row.get(k) is None for k in ['Vardemangdsversion','Vardemangdsniva','Vardekod','Vardebenamning','Kolumnnamn','Datatyp']):
   raise ValueError('Ofullständig SCB-exportrad: '+repr(row)[:400])
  key=(row['Vardemangdsversion'],row['Vardemangdsniva'],row['Datatyp'])
  groups[key].append(row)
 result=[]
 for (version,level,dtype),values in groups.items():
  d={'version':version,'level':level,'data_type':dtype,'values':[{'code':r['Vardekod'],'label':r['Vardebenamning']} for r in values]}
  d['id']=digest(d);result.append((d,{r['Kolumnnamn'] for r in values}))
 return result

def documentation_record(rows):
 # A list preserves repeated population/object fields and empty values.
 fields=[{'name':str(name),'value':str(value)} for name,value in rows]
 if not any(f['name']=='Variabelnamn' for f in fields):
  raise ValueError('Variabelnamn saknas i dokumentationstabellen')
 document={'source':SOURCE,'fields':fields}
 document['id']=digest(document)
 return document

def capture_documentation(page):
 table=page.get_by_role('table').filter(has=page.get_by_role('cell',name='Variabeldefinition',exact=True))
 if table.count()!=1:raise ValueError('Beskrivningstabellen är inte entydig')
 rows=[]
 for row in table.get_by_role('row').all():
  cells=row.get_by_role('cell');count=cells.count()
  if count not in (1,2):raise ValueError('Oväntad struktur i beskrivningstabellen')
  rows.append((cells.nth(0).inner_text(),cells.nth(1).inner_text() if count==2 else ''))
 document=documentation_record(rows)
 path=f"data/variable-documentation/{document['id']}.json"
 if not (ROOT/path).exists():atomic_save(ROOT/path,document)
 return {'id':document['id'],'path':path}

def main(a):
 from playwright.sync_api import sync_playwright,expect
 expect.set_options(timeout=60000)
 plan=json.loads((ROOT/'data/order-source-plan.json').read_text())
 tasks=groups_from_plan(plan)[a.group]
 reg,var=tasks[0]['Registerrubrik'],tasks[0]['Registervariantrubrik']
 path=path_for(a.group)
 data=json.loads(path.read_text()) if path.exists() else {'schema_version':'2.0','source':SOURCE,'group_id':a.group,'register':reg,'variant':var,'bindings':[],'domains':[],'coverage':{}}
 old_coverage=data['coverage'];passes=old_coverage.get('passes',0)
 byid={b['id']:b for b in data['bindings']};domains={d['id']:d for d in data['domains']}
 now=datetime.now(timezone.utc).isoformat(timespec='seconds');checked=0;errors=[];expected=set();remaining=0
 task_hash=digest(tasks)
 def save(complete=False):
  refs={b['domain_id'] for b in byid.values()}
  data['bindings']=sorted(byid.values(),key=lambda b:(b['column'],b['variable'],b['register_version']))
  data['domains']=sorted((d for d in domains.values() if d['id'] in refs),key=lambda d:d['id'])
  data['coverage']={'complete':complete,'collector_sha256':COLLECTOR_SHA,'passes':passes+1,'metadata_sha256':plan['metadata_sha256'],'task_sha256':task_hash,'source_updated':update,'retrieved_at':now,'task_count':len(tasks),'expected_bindings':len(expected),'errors':errors}
  atomic_save(path,data)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(accept_downloads=True);page.set_default_timeout(60000)
  page.goto(SOURCE,wait_until='domcontentloaded');page.get_by_role('button',name='OK',exact=True).click()
  expect(page.get_by_role('textbox',name='Register',exact=True)).to_be_visible()
  expect(page.get_by_role('progressbar')).to_have_count(0)
  update=page.get_by_text(re.compile(r'^Metadata uppdaterades:')).inner_text().split(':',1)[1].strip()
  if update!=plan['scb_source_updated']:raise ValueError('SCB-indexet behöver uppdateras före hämtningen')
  if old_coverage.get('complete') and old_coverage.get('collector_sha256')==COLLECTOR_SHA and old_coverage.get('expected_bindings',0)>0 and old_coverage.get('source_updated')==update and old_coverage.get('task_sha256')==task_hash:
   print('Oförändrad källa och komplett urval; ingen export behövs.');return
  choose_register(page,reg)
  field=page.get_by_role('textbox',name='Registervariant',exact=True);field.click()
  page.get_by_role('option',name=var.strip(),exact=True).click()
  expect(field).to_have_value(re.compile(r'^\s*'+re.escape(var.strip())+r'\s*$'));expect(page.get_by_role('listbox')).to_be_hidden();expect(page.get_by_role('progressbar')).to_have_count(0)
  print(f'{reg} | {var} | {len(tasks)} granskade variabeldefinitioner',flush=True)
  schedules=[]
  # Discover actual versions first. No first/last-year interpolation.
  for task in tasks:
   try:
    versions=select_variable(page,task)
    if not versions:
     versions=[v for v in dict.fromkeys([task['VersionForsta'],task['VersionSista']]) if v and page.get_by_role('button',name=v,exact=True).count()==1]
    selected=[]
    for label in versions:
     if any(eligible(o['ar_raw'],label) for o in task['orders']):
      identity={'register':reg,'variant':var,'column':task['Kolumnnamn'],'variable':task['Variabelnamn'],'register_version':label,'source_task_id':task['id']}
      bid=digest(identity);expected.add(bid);selected.append((label,bid,identity))
    if versions and not selected:
     errors.append(f"{task['Kolumnnamn']}: inga verifierade beställningsperioder i källversionerna {versions[:2]}..{versions[-2:]}")
     print('PERIOD EJ MATCHAD | '+errors[-1],flush=True)
    if not versions:raise ValueError('Inga igenkända registerversioner; behöver manuell periodtolkning')
    schedules.append((task,list(reversed(selected))))
   except Exception as e:
    errors.append(f"{task['Kolumnnamn']}: {e}");save();print("FEL | "+errors[-1],flush=True)
  # Breadth first: one recent applicable version per variable before older history.
  maximum=max((len(vs) for _,vs in schedules),default=0)
  for depth in range(maximum):
   for task,versions in schedules:
    if depth>=len(versions):continue
    label,bid,identity=versions[depth]
    old=byid.get(bid)
    if old and old.get('documentation') and (old.get('source_updated')==update or depth>0):continue
    remaining+=1
    if checked>=a.max_checks:continue
    try:
     select_variable(page,task)
     button=page.get_by_role('button',name=label,exact=True);button.click()
     expect(button).to_have_class(re.compile(r'\bmud-button-filled-primary\b'));expect(button).to_be_enabled();expect(page.get_by_role('progressbar')).to_have_count(0)
     expect(page.get_by_role('button',name=CSV,exact=True).nth(1)).to_be_enabled()
     documentation=capture_documentation(page)
     if old and old.get('source_updated')==update:
      byid[bid]=old|{'documentation':documentation,'documentation_retrieved_at':now}
      checked+=1;save();print(f"DOKUMENTATION | {task['Kolumnnamn']} | {label} | {checked}/{a.max_checks}",flush=True)
      continue
     version,level=detail(page,'Värdemängdsversion'),detail(page,'Värdemängdsnivå')
     type_rows=page.get_by_role('row').filter(has=page.get_by_role('cell',name='Datatyp',exact=True))
     dtype=type_rows.last.get_by_role('cell').nth(1).inner_text().strip() if type_rows.last.get_by_role('cell').count()>1 else ''
     export=page.get_by_role('button',name=CSV,exact=True).last
     if page.get_by_role('textbox',name='Filtrera värdemängd',exact=True).count():expect(export).to_be_enabled()
     if export.is_enabled():
      exported=export_sets(download_text(page,export))
      selected=[(d,cols) for d,cols in exported if display_meta((d['version'],d['level'],d['data_type']))==display_meta((version,level,dtype))]
      if len(selected)!=1:raise ValueError('Exportens värdemängdsnivå matchar inte vald nivå: '+repr([(d['version'],d['level'],d['data_type']) for d,_ in exported])[:600])
      domain,columns=selected[0]
      if len(exported)>1:print('INFO | ytterligare värdemängdsnivåer i exporten: '+repr([(d['version'],d['level']) for d,_ in exported]),flush=True)
      if columns!={task['Kolumnnamn']} or display_meta((domain['version'],domain['level'],domain['data_type']))!=display_meta((version,level,dtype)):
       raise ValueError('Exportmatchning: väntat='+repr((task['Kolumnnamn'],version,level,dtype))+'; export='+repr((sorted(columns),domain['version'],domain['level'],domain['data_type'])))
      status='enumerated'
     else:
      if not version or not dtype:raise ValueError('Ofullständig definition')
      domain={'version':version,'level':level,'data_type':dtype,'values':[]};domain['id']=digest(domain);status='not_enumerated'
     domain_path=f"data/value-domain-values/{domain['id']}.json"
     if not (ROOT/domain_path).exists():atomic_save(ROOT/domain_path,domain)
     domains[domain['id']]={k:v for k,v in domain.items() if k!='values'}|{'value_count':len(domain['values']),'path':domain_path}
     orders=[o for o in task['orders'] if eligible(o['ar_raw'],label)]
     byid[bid]=identity|{'id':bid,'domain_id':domain['id'],'status':status,'source_updated':update,'retrieved_at':now,'definition_only_verified':status=='not_enumerated','orders':orders,'order_years_unknown':any(not o['ar_raw'] for o in orders),'documentation':documentation,'documentation_retrieved_at':now}
     checked+=1;save()
     print(f"OK | {task['Kolumnnamn']} | {label} | {len(domain['values'])} | {checked}/{a.max_checks}",flush=True)
     time.sleep(.2)
    except Exception as e:
     errors.append(f"{task['Kolumnnamn']} {label}: {e}");save();print("FEL | "+errors[-1],flush=True)
  complete=bool(expected) and expected.issubset(byid) and not errors
  save(complete)
  print(f'KLAR | exporter={checked} | sparade={len(byid)} | förväntade={len(expected)} | komplett={complete}',flush=True)
  browser.close()

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--group',required=True);p.add_argument('--max-checks',type=int,default=200);a=p.parse_args()
 try:main(a)
 except Exception as e:
  plan=json.loads((ROOT/'data/order-source-plan.json').read_text());tasks=groups_from_plan(plan)[a.group];path=path_for(a.group)
  d=json.loads(path.read_text()) if path.exists() else {'schema_version':'2.0','source':SOURCE,'group_id':a.group,'register':tasks[0]['Registerrubrik'],'variant':tasks[0]['Registervariantrubrik'],'bindings':[],'domains':[],'coverage':{}}
  c=d['coverage'];c.update({'complete':False,'collector_sha256':COLLECTOR_SHA,'source_updated':plan['scb_source_updated'],'errors':c.get('errors') or [str(e)],'passes':max(1,c.get('passes',0))});atomic_save(path,d)
  raise
