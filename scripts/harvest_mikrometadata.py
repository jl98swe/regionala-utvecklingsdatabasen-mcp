#!/usr/bin/env python3
"""Collect public SCB value domains, never MONA records. Restart from JSON checkpoints."""
import argparse
import csv
import hashlib
import io
import json
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SOURCE = 'https://mikrometadata.scb.se/'
CSV = 'Ladda ned som textfil (.csv)'


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def parse_export(text):
    # SCB calls this CSV but the downloaded file is UTF-8 tab-separated.
    rows = list(csv.DictReader(io.StringIO(text.lstrip('\ufeff')), delimiter='\t'))
    if not rows:
        raise ValueError('Exporten är tom; ersätter inte tidigare värdemängd.')
    required = {'Vardemangdsversion', 'Vardemangdsniva', 'Vardekod', 'Vardebenamning', 'Kolumnnamn', 'Datatyp'}
    if not required.issubset(rows[0]):
        raise ValueError('Oväntade exportkolumner')
    meta = {k: rows[0][k] for k in ('Vardemangdsversion', 'Vardemangdsniva', 'Datatyp')}
    if any(any(row[k] != v for k, v in meta.items()) for row in rows):
        raise ValueError('Flera värdemängder i samma export')
    domain = {'version': meta['Vardemangdsversion'], 'level': meta['Vardemangdsniva'],
              'data_type': meta['Datatyp'], 'values': [{'code': r['Vardekod'], 'label': r['Vardebenamning']} for r in rows]}
    domain['id'] = digest(domain)
    return domain, {r['Kolumnnamn'] for r in rows}


def atomic_save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)


def download_text(page, button):
    with page.expect_download(timeout=60000) as event:
        button.click()
    download = event.value
    if download.failure():
        raise RuntimeError(download.failure())
    text = Path(download.path()).read_text(encoding='utf-8-sig')
    from playwright.sync_api import expect
    expect(page.get_by_role('progressbar')).to_have_count(0)
    return text


def choose_register(page, register):
    field = page.get_by_role('textbox', name='Register', exact=True)
    field.click()
    page.get_by_role('option', name=register, exact=True).click()
    from playwright.sync_api import expect
    expect(field).to_have_value(register)
    expect(page.get_by_role('listbox')).to_be_hidden()
    expect(page.get_by_role('progressbar')).to_have_count(0)


def detail(page, label):
    row = page.get_by_role('row').filter(has=page.get_by_role('cell', name=label, exact=True))
    if row.count() != 1:
        raise ValueError(f'Attributet {label} är inte entydigt')
    cells = row.get_by_role('cell')
    return cells.nth(1).inner_text().strip() if cells.count() > 1 else ''


def select_variable(page, item):
    from playwright.sync_api import expect
    search = page.get_by_role('textbox', name='Söktext', exact=True)
    search.fill(item['Kolumnnamn'])
    search.press('Enter')
    table = page.get_by_role('table').first
    row = table.get_by_role('row').filter(has=page.get_by_role('cell', name=item['Kolumnnamn'], exact=True))
    for name in ('Registerrubrik', 'Registervariantrubrik', 'Variabelnamn'):
        row = row.filter(has=page.get_by_role('cell', name=item[name].strip(), exact=True))
    # Column names can have several definitions/validity intervals in one register.
    row = row.filter(has=page.get_by_role('cell', name=item['VersionForsta'], exact=True))
    row = row.filter(has=page.get_by_role('cell', name=item['VersionSista'], exact=True))
    expect(row).to_have_count(1)
    row.locator('td[data-label="Kolumn"]').click()
    expect(row).to_have_class(re.compile(r'\bmud-theme-primary\b'))
    expect(page.get_by_role('progressbar')).to_have_count(0)
    expect(page.get_by_role('button', name=CSV, exact=True).nth(1)).to_be_enabled()
    expect(page.get_by_role('row').filter(has=page.get_by_role('cell', name='Variabelnamn', exact=True)).get_by_role('cell').nth(1)).to_have_text(item['Variabelnamn'])
    # Only actual displayed versions are used, never an assumed continuous year range.
    versions = page.get_by_role('button').filter(has_text=re.compile(r'^\d{4}(?:[-/].*)?$')).all_text_contents()
    return [v.strip() for v in versions]


def harvest(args):
    from playwright.sync_api import sync_playwright, expect
    expect.set_options(timeout=60000)
    path = Path(args.output)
    data = json.loads(path.read_text()) if path.exists() else {'schema_version': '1.0', 'source': SOURCE, 'registers': {}, 'domains': [], 'bindings': []}
    domains = {d['id']: d for d in data['domains']}
    bindings = {b['id']: b for b in data['bindings']}
    errors = []
    checked = 0
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(accept_downloads=True)
        page.set_default_timeout(45000)
        page.goto(SOURCE, wait_until='domcontentloaded')
        expect(page.get_by_role('button', name='OK', exact=True)).to_be_visible()
        page.get_by_role('button', name='OK', exact=True).click()
        expect(page.get_by_role('textbox', name='Register', exact=True)).to_be_visible()
        update = page.get_by_text(re.compile(r'^Metadata uppdaterades:')).inner_text().split(':', 1)[1].strip()
        previous = data['registers'].get(args.register, {})
        repair_needed = any(b['register'] == args.register and b['status'] == 'not_enumerated' and not b.get('definition_only_verified') for b in bindings.values())
        if previous.get('complete') and previous.get('source_updated') == update and not args.refresh_history and not repair_needed:
            print('SCB:s uppdateringsdatum är oförändrat; behåller tidigare data.', flush=True)
            return
        choose_register(page, args.register)
        inventory_text = download_text(page, page.get_by_role('button', name=CSV, exact=True).first)
        inventory = list(csv.DictReader(io.StringIO(inventory_text), delimiter='\t'))
        if not inventory or any(r['Registerrubrik'] != args.register for r in inventory):
            raise ValueError('Fel eller tomt register i variabelexporten')
        print(f'{args.register}: {len(inventory)} variabeldefinitioner; SCB {update}', flush=True)
        scope = {'source_updated': update, 'retrieved_at': now, 'complete': False, 'inventory_count': len(inventory), 'errors': []}
        data['registers'][args.register] = scope

        def checkpoint():
            referenced = {b['domain_id'] for b in bindings.values()}
            data['domains'] = sorted((d for d in domains.values() if d['id'] in referenced), key=lambda d: d['id'])
            data['bindings'] = sorted(bindings.values(), key=lambda b: (b['register'], b['variant'], b['column'], b['variable'], b['register_version']))
            atomic_save(path, data)

        for item in inventory:
            try:
                versions = select_variable(page, item)
                if not versions:
                    raise ValueError('Inga registerversioner hittades')
                for version in versions:
                    identity = {'register': args.register, 'variant': item['Registervariantrubrik'], 'column': item['Kolumnnamn'],
                                'variable': item['Variabelnamn'], 'first_version': item['VersionForsta'],
                                'last_version': item['VersionSista'], 'register_version': version}
                    key = digest(identity)
                    old = bindings.get(key)
                    needs_verification = old and old['status'] == 'not_enumerated' and not old.get('definition_only_verified')
                    if old and not needs_verification and not args.refresh_history and (version != versions[-1] or old.get('source_updated') == update):
                        continue
                    if args.max_checks and checked >= args.max_checks:
                        scope['errors'] = ['Avsiktligt avbruten efter max-checks; återstart fortsätter från JSON.']
                        checkpoint()
                        return
                    button = page.get_by_role('button', name=version, exact=True)
                    button.click()
                    expect(button).to_have_class(re.compile(r'\bmud-button-filled-primary\b'))
                    expect(button).to_be_enabled()
                    expect(page.get_by_role('progressbar')).to_have_count(0)
                    expect(page.get_by_role('button', name=CSV, exact=True).nth(1)).to_be_enabled()
                    version_name = detail(page, 'Värdemängdsversion')
                    level = detail(page, 'Värdemängdsnivå')
                    # Datatyp occurs in both the variable description and domain summary.
                    type_rows = page.get_by_role('row').filter(has=page.get_by_role('cell', name='Datatyp', exact=True))
                    dtype = type_rows.last.get_by_role('cell').nth(1).inner_text().strip() if type_rows.last.get_by_role('cell').count() > 1 else ''
                    export = page.get_by_role('button', name=CSV, exact=True).last
                    if page.get_by_role('textbox', name='Filtrera värdemängd', exact=True).count():
                        expect(export).to_be_enabled()
                    if export.is_enabled():
                        domain, columns = parse_export(download_text(page, export))
                        if columns != {item['Kolumnnamn']} or (domain['version'], domain['level'], domain['data_type']) != (version_name, level, dtype):
                            raise ValueError('Exporten matchar inte vald variabel/värdemängd')
                        status = 'enumerated'
                    else:
                        if not version_name or not dtype:
                            raise ValueError('Ofullständig värdemängdsdefinition; klassas inte som saknad')
                        domain = {'version': version_name, 'level': level, 'data_type': dtype, 'values': []}
                        domain['id'] = digest(domain)
                        status = 'not_enumerated'
                    domains[domain['id']] = domain
                    bindings[key] = dict(identity, id=key, domain_id=domain['id'], status=status, source_updated=update, retrieved_at=now, definition_only_verified=(status == 'not_enumerated'))
                    checked += 1
                    print(f"OK | {item['Kolumnnamn']} | {version} | {status} | {len(domain['values'])}", flush=True)
                    checkpoint()
            except Exception as exc:
                message = f"{item['Kolumnnamn']} ({item['Variabelnamn']}): {exc}"
                print(f'FEL | {message}', flush=True)
                errors.append(message)
                scope['errors'] = errors
                checkpoint()
                # Stop on UI/network failures rather than hammering an unusable site.
                break
        scope['complete'] = not errors
        scope['errors'] = errors
        checkpoint()
        browser.close()
    if errors:
        raise RuntimeError(f'{len(errors)} fel; tidigare lyckade exporter finns kvar i JSON')
    print(f'Klar: {checked} kontroller, {len(domains)} lagrade värdemängder.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--register', default='Aktieägarstatistik')
    parser.add_argument('--output', default='data/value-domains.json')
    parser.add_argument('--refresh-history', action='store_true')
    parser.add_argument('--max-checks', type=int, default=0)
    harvest(parser.parse_args())
