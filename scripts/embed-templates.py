from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
data={p.stem.rsplit("_v",1)[0]:p.read_text(encoding='utf-8') for p in sorted((root/'templates').glob('*.R'))}
(root/'data/templates.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
