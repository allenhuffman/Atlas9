import json, re, os, datetime

# Rooms now come from the Atlas9 Dossier — Template (swapped 2026-11-18, Allen's
# call): the Template's Rooms/Exhibits lists are the live ones. The old
# Dossier (atlas9-dossier-raw.json) is no longer the rooms source.
d = json.load(open('/home/hatch/workspace/atlas9-template-fresh.json'))

# Preserve any photo assignments and spoiler flags from a previous rooms.json
# so a refresh never wipes them (photos and spoiler calls are Allen's, not
# the Dossier's).
prev_photos = {}
prev_spoilers = {}
prev_path = '/home/hatch/workspace/atlas9-app/rooms.json'
if os.path.exists(prev_path):
    prev = json.load(open(prev_path))
    for r in prev.get('rooms', []):
        if r.get('photo'):
            prev_photos[(r['level'], r['name'])] = r['photo']
        if r.get('spoiler'):
            prev_spoilers[('L' + str(r['level']), r['name'])] = True
# Rooms whose description reveals a story beat (Allen's spoiler discipline).
# Speakereasy's origin sentence is the one clear case in the current data.
SPOILER_ROOMS = {('L2', 'Speakereasy')} | set(prev_spoilers)

heads = {}
for c in d.get('body', {}).get('content', []):
    p = c.get('paragraph')
    if not p:
        continue
    els = p.get('elements', [])
    if not els:
        continue
    s = els[0].get('startIndex', 0)
    txt = ''.join(e.get('textRun', {}).get('content', '') for e in els).strip()
    if txt in ('Level 1 Rooms (alphabetical)', 'Level 2 Rooms (alphabetical)',
               'Other Level 1 items:', 'Other Level 2 items:', 'Areas'):
        heads[txt] = s

rooms = []
cur = None
for c in d.get('body', {}).get('content', []):
    p = c.get('paragraph')
    if not p:
        continue
    els = p.get('elements', [])
    if not els:
        continue
    s = els[0].get('startIndex', 0)
    txt = ''.join(e.get('textRun', {}).get('content', '') for e in els).rstrip('\n')
    if s == heads.get('Level 1 Rooms (alphabetical)'):
        cur = ('L1', 'rooms'); continue
    if s == heads.get('Other Level 1 items:'):
        cur = ('L1', 'other'); continue
    if s == heads.get('Level 2 Rooms (alphabetical)'):
        cur = ('L2', 'rooms'); continue
    if s == heads.get('Other Level 2 items:'):
        cur = ('L2', 'other'); continue
    if s == heads.get('Areas'):
        cur = None; continue
    if cur and p.get('bullet'):
        level, section = cur
        # split name part / description on first " - "
        if ' - ' in txt:
            left, desc = txt.split(' - ', 1)
        elif txt.endswith(' -'):
            left, desc = txt[:-2], ''
        else:
            left, desc = txt, ''
        desc = desc.strip()
        # Official marker "*" sits at the end of the NAME, before the artist
        # paren: "Name* (Artist)". A bare trailing "*" with no paren is also
        # official. Non-official rooms may carry a qualifier paren like
        # "(containment zone)" — that is part of the name, not an artist.
        official = False
        artists = []
        name = left.strip()
        m = re.match(r'^(.*\*)\s*\(([^)]*)\)\s*$', name)
        if m:
            official = True
            name = m.group(1).rstrip('*').strip()
            artists = [a.strip() for a in m.group(2).split(',') if a.strip()]
        elif name.endswith('*'):
            official = True
            name = name.rstrip('*').strip()
        # name keeps Allen's form, incl. ", The" inversion and "(containment zone)" qualifiers
        rooms.append({
            'name': name,
            'official': official,
            'level': int(level[1]),
            'section': section,
            'artists': artists,
            'description': desc,
            'photo': prev_photos.get((int(level[1]), name)),
            'spoiler': (level, name) in SPOILER_ROOMS,
        })

out = {'generated': datetime.date.today().isoformat(), 'source': 'Atlas9 Dossier — Template — Rooms / Exhibits',
       'count': len(rooms), 'rooms': rooms}
with open('/home/hatch/workspace/atlas9-app/rooms.json', 'w') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"rooms: {len(rooms)}")
for r in rooms:
    print(f"  L{r['level']} [{r['section']}] {'*' if r['official'] else ' '} {r['name']} | {r['artists']} | {r['description'][:60]!r}")
