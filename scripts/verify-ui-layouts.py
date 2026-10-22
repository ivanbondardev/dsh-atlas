"""Refresh source evidence for the curated layouts; fail on stale slot references."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root.parent/'source'
view=root/'assets/js/views/customize.js'
text=view.read_text()
section=text.split('const regions = {',1)[1].split('const all =',1)[0]
keys=re.findall(r"\['([^']+)',",section)
def data(name):
 s=(root/'data'/name).read_text();return json.loads(s[s.find('{'):s.rfind('}')+1])
m=data('dsh-model.js'); detail=data('dsh-detail.js')
slots={s['key']:{**s,**detail['slots'][i]} for i,s in enumerate(m['slots'])}
files=list((source/'packages/client').rglob('*.tsx'))+list((source/'packages/client').rglob('*.ts'))
evidence={}
for key in keys:
 assert key in slots, f'Unknown slot: {key}'
 sites=[]
 for f in files:
  if '/tests/' in str(f):continue
  lines=f.read_text().splitlines()
  for n,line in enumerate(lines):
   if re.search(r"renderSlot\(\s*['\"]"+re.escape(key)+r"['\"]",line):
    sites.append(str(f.relative_to(source))+':'+str(n+1))
 assert sites, f'No render site: {key}'
 registrations=[]
 for o in slots[key]['occupants']:
  if not o.get('pkg'):continue
  package=next((p for p in m['packages'] if p['id']==o['pkg']),None)
  # Match package manifests rather than infer a package directory from its name.
  for manifest in (source/'packages/client').glob('*/package.json'):
   p=json.loads(manifest.read_text())
   if p.get('name')!=o['pkg']:continue
   for f in (manifest.parent/'src').rglob('*.ts*'):
    for n,line in enumerate(f.read_text().splitlines()):
     if re.search(r"name:\s*['\"]"+re.escape(key)+r"['\"]",line):
      registrations.append({'pkg':o['pkg'],'source':str(f.relative_to(source))+':'+str(n+1)})
 evidence[key]={'render':sites,'registrations':registrations}
block='  const LAYOUT_EVIDENCE = '+json.dumps(evidence,ensure_ascii=False,indent=2)+'\n'
text=re.sub(r'  // BEGIN LAYOUT EVIDENCE.*?  // END LAYOUT EVIDENCE\n','',text,flags=re.S)
text=text.replace('  const TABS =', '  // BEGIN LAYOUT EVIDENCE\n'+block+'  // END LAYOUT EVIDENCE\n  const TABS =',1)
view.write_text(text)
print(f'Verified {len(keys)} slots and their render sites; refreshed registration evidence.')
