import json, os, datetime

# People now come from the Atlas9 Dossier — Template, Characters — People
# (swapped 2026-11-18, Allen's call): Part 1 entries are name + who they are
# ONLY — the short tier-1 text. Encounter/source detail lives in
# Spoilers — Characters in the Template, not in these descriptions.
# The old Dossier (atlas9-dossier-raw.json) is no longer the people source.
d = json.load(open('/home/hatch/workspace/atlas9-template-fresh.json'))

# Character photos: Drive "Character photos" folder, converted PNG->JPG for the
# app (masters stay PNG). App paths are relative to /a9/. Keyed by the
# Template's plain names (no qualifiers: "Casper Voss", "Burny").
PHOTOS = {
  'Arthur McAllistor': 'photos/arthur.jpg',
  'Melissa Hartwell': 'photos/melissa.jpg',
  'Agent 00 (zero zero)': 'photos/agent00.jpg',
  'Blair Paul': 'photos/blair.jpg',
  'Frank Roberts': 'photos/frank.jpg',
  'Casper Voss': 'photos/casper.jpg',
  'Burny': 'photos/burny.jpg',
}
prev_photos = {}
prev_path = '/home/hatch/workspace/atlas9-app/people.json'
if os.path.exists(prev_path):
    prev = json.load(open(prev_path))
    for p in prev.get('people', []):
        if p.get('photo'):
            prev_photos[p['name']] = p['photo']

def short_desc(name, desc):
    # The app lists the name as the heading, so a description that opens
    # with the name just repeats it ("Frank Roberts / Frank Roberts is...").
    # Drop a leading "<Name> is (the )" and capitalise what's left, so the
    # entry reads as a role fragment: "Projectionist that invented the
    # HOLOMAX system." (Allen, 2026-11-18).
    prefix = name + ' is '
    if desc.startswith(prefix):
        rest = desc[len(prefix):]
        if rest.lower().startswith('the '):
            rest = rest[4:]
        if rest:
            rest = rest[0].upper() + rest[1:]
        return rest
    return desc

people = []
in_chars = False
in_people = False
cur = None
for c in d.get('body', {}).get('content', []):
    p = c.get('paragraph')
    if not p:
        continue
    els = p.get('elements', [])
    if not els:
        continue
    txt = ''.join(e.get('textRun', {}).get('content', '') for e in els).rstrip('\n')
    style = p.get('paragraphStyle', {}).get('namedStyleType', '')
    if style == 'HEADING_2' and txt.strip() == 'Characters':
        in_chars = True
        continue
    if in_chars and style == 'HEADING_2':
        break
    if in_chars and style == 'HEADING_3' and txt.strip() == 'People':
        in_people = True
        continue
    if in_people and style == 'HEADING_3':
        break
    if in_people and style == 'HEADING_4' and txt.strip():
        name = txt.strip()
        cur = {'name': name, 'description': '',
               'photo': PHOTOS.get(name) or prev_photos.get(name)}
        people.append(cur)
    elif in_people and cur is not None and style == 'NORMAL_TEXT' and txt.strip():
        cur['description'] = (cur['description'] + ' ' + txt.strip()).strip()
        cur['description'] = short_desc(cur['name'], cur['description'])

out = {'generated': datetime.date.today().isoformat(),
       'source': 'Atlas9 Dossier — Template — Characters / People',
       'count': len(people), 'people': people}
with open('/home/hatch/workspace/atlas9-app/people.json', 'w') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print('people:', len(people))
for p in people:
    print(' ', p['name'], '|', p.get('photo'), '|', p['description'][:70])
