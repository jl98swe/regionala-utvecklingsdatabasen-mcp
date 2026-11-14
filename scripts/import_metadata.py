"""Import public metadata; never connects to MONA. Python standard library only."""
import argparse, collections, hashlib, json, re, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
def load(path):
    with zipfile.ZipFile(path) as z:
        strings = ["".join(e.itertext()) for e in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        rows = []
        for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).findall("s:sheetData/s:row", NS):
            cells = [None] * 5
            for c in row.findall("s:c", NS):
                col = re.match(r"[A-Z]+", c.attrib["r"])[0]
                idx = 0
                for ch in col: idx = idx * 26 + ord(ch) - 64
                if idx > 5: raise ValueError("Unexpected column")
                v = c.find("s:v", NS)
                value = None if v is None else v.text
                if c.attrib.get("t") == "s" and value is not None: value = strings[int(value)]
                if c.attrib.get("t") == "inlineStr": value = "".join(c.find("s:is", NS).itertext())
                cells[idx-1] = value
            rows.append(cells)
    if rows[0] != ["variabler", "databasvy", "År", "Från år", "Till år"]: raise ValueError("Invalid metadata headers")
    records=[]
    for i, row in enumerate(rows[1:], 2):
        if not any(row): continue
        variable, view, period, first, last = row
        if not variable or not view: raise ValueError(f"Missing variable/view in row {i}")
        if any(ord(c) < 32 for c in variable + view): raise ValueError(f"Control character in row {i}")
        records.append(dict(variabel=variable,databasvy=view,ar_raw=period,vy_fran=first,vy_till=last,kallrad=i))
    keys=[(r["databasvy"],r["variabel"]) for r in records]
    if len(set(keys)) != len(keys): raise ValueError("Duplicate variable/view rows: resolve explicitly")
    return dict(schema_version=1,source_sha256=hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                antal_poster=len(records),antal_vyer=len(set(r["databasvy"] for r in records)),
                antal_okanda=sum(not r["ar_raw"] for r in records),records=records)

if __name__ == "__main__":
    p=argparse.ArgumentParser();p.add_argument("source");p.add_argument("--output",default="data/metadata.json");a=p.parse_args()
    data=load(a.source)
    Path(a.output).write_text(json.dumps(data,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in data.items() if k!="records"},ensure_ascii=False))
