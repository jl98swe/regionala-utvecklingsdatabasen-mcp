"""Build a separate key catalogue; never modify the source workbooks.
Usage: python scripts/import-keys.py ARCHIVE --snapshot YYYY-MM-DD
Requires openpyxl. All nonempty cells/rows and duplicate rows are retained.
"""
import argparse, collections, hashlib, io, json, pathlib, zipfile
import openpyxl


def build(archive, snapshot):
    tables = []
    with zipfile.ZipFile(archive) as z:
        for name in sorted(z.namelist()):
            if not name.endswith('.xlsx') or pathlib.PurePosixPath(name).name.startswith(('~$', '.')):
                continue
            raw = z.read(name)
            cached = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
            book = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=False)
            for sheet in book:
                original = list(sheet.rows)
                if not original:
                    continue
                used = [i for i in range(len(original[0])) if original[0][i].value is not None]
                annotations = [{'cell': c.coordinate, 'value': str(c.value)} for row in original[1:] for i, c in enumerate(row) if i not in used and c.value is not None]
                if not used:
                    continue
                headers = [original[0][i].value for i in used]
                if any(not isinstance(h, str) or not h for h in headers) or len(set(headers)) != len(headers):
                    raise ValueError(f'Invalid/duplicate headers: {name}/{sheet.title}')
                rows, source_rows, numeric_columns, formulas = [], [], set(), []
                cached_rows = list(cached[sheet.title].rows)
                for row_number, row in enumerate(original[1:], 2):
                    if not any(row[i].value is not None for i in used):
                        continue
                    values = []
                    for j, i in enumerate(used):
                        cell = row[i]
                        if cell.data_type == 'f':
                            formulas.append({'cell': cell.coordinate, 'formula': cell.value})
                            cell = cached_rows[row_number - 1][i]
                            if cell.value is None:
                                raise ValueError(f'Formula has no cached result: {name}/{sheet.title}/{cell.coordinate}')
                        if isinstance(cell.value, (int, float)):
                            numeric_columns.add(headers[j])
                        values.append(None if cell.value is None else str(cell.value))
                    rows.append(values)
                    source_rows.append(row_number)
                profiles = {}
                for i, header in enumerate(headers):
                    groups = collections.defaultdict(list)
                    for row in rows:
                        groups[row[i]].append(tuple(row))
                    duplicated = [rs for rs in groups.values() if len(rs) > 1]
                    profiles[header] = {'distinct_values': len(groups), 'null_rows': len(groups.get(None, [])),
                        'duplicate_values': len(duplicated), 'conflicting_values': sum(len(set(rs)) > 1 for rs in duplicated)}
                tables.append({'id': pathlib.PurePosixPath(name).name + '::' + sheet.title,
                    'file': pathlib.PurePosixPath(name).name, 'sheet': sheet.title,
                    'sha256': hashlib.sha256(raw).hexdigest(), 'columns': headers, 'annotations': annotations,
                    'numeric_source_columns': sorted(numeric_columns), 'formulas': formulas, 'profiles': profiles,
                    'row_count': len(rows), 'source_rows': source_rows, 'rows': rows})
    return {'snapshot': snapshot, 'archive_sha256': hashlib.sha256(pathlib.Path(archive).read_bytes()).hexdigest(),
        'schema_version': '1.0', 'tables': tables}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('archive'); p.add_argument('--snapshot', required=True)
    p.add_argument('--output', default='data/keys.json')
    args = p.parse_args()
    result = build(args.archive, args.snapshot)
    pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f"Imported {len(result['tables'])} sheets; {sum(t['row_count'] for t in result['tables'])} rows")
