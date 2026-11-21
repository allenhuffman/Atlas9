import json, os, datetime

# Physical telephones from the Atlas9 Dossier — Template:
#   basic lists: "Telephones — Level 1" (8) + "Telephones — Level 2" (4)
#     under Telephone System — name + where it is, NO number inline.
#   spoiler numbers: "Spoilers — Telephones", one bullet per phone grouped
#     by level IN THE SAME ORDER as the basic lists (the Template's own
#     guidance says that order is the join key) — "Spoiler: Phone # ...".
# A phone's number IS a spoiler (Allen, 2026-11-18), so the number rides in
# the JSON for the app to gate behind the Spoilers toggle; it never appears
# in the basic list rows.
d = json.load(open('/home/hatch/workspace/atlas9-template-fresh.json'))

paras = []
for c in d.get('body', {}).get('content', []):
    p = c.get('paragraph')
    if not p:
        continue
    els = p.get('elements', [])
    if not els:
        continue
    txt = ''.join(e.get('textRun', {}).get('content', '') for e in els).rstrip('\n')
    style = p.get('paragraphStyle', {}).get('namedStyleType', '')
    paras.append((style, bool(p.get('bullet')), txt))

def section_bullets(heading, heading_styles=('HEADING_4', 'HEADING_3')):
    """Bullets under a heading until the next heading of equal-or-higher level."""
    out = []
    in_section = False
    for style, bul, txt in paras:
        if style in heading_styles and txt.strip() == heading:
            in_section = True
            continue
        if in_section and style.startswith('HEADING'):
            break
        if in_section and bul and txt.strip():
            out.append(txt.strip())
    return out

basic = {}
for lvl, heading in ((1, 'Telephones — Level 1'), (2, 'Telephones — Level 2')):
    for b in section_bullets(heading):
        if ' - ' in b:
            name, desc = b.split(' - ', 1)
        else:
            name, desc = b, ''
        basic.setdefault(lvl, []).append({'name': name.strip(), 'description': desc.strip()})

spoilers = {}
for lvl, heading in ((1, 'Level 1'), (2, 'Level 2')):
    # Spoilers — Telephones has H3 "Level 1"/"Level 2"; scope to that section
    in_sp = False
    in_lvl = False
    lst = []
    for style, bul, txt in paras:
        if style == 'HEADING_2' and txt.strip() == 'Spoilers — Telephones':
            in_sp = True
            continue
        if in_sp and style == 'HEADING_2':
            break
        if in_sp and style == 'HEADING_3' and txt.strip() == heading:
            in_lvl = True
            continue
        if in_sp and in_lvl and style == 'HEADING_3':
            break
        if in_sp and in_lvl and bul and txt.strip():
            lst.append(txt.strip())
    spoilers[lvl] = lst

telephones = []
for lvl in (1, 2):
    blist = basic.get(lvl, [])
    slist = spoilers.get(lvl, [])
    assert len(blist) == len(slist), f'L{lvl}: {len(blist)} basic vs {len(slist)} spoiler bullets'
    for b, s in zip(blist, slist):
        # "Name (...) - Spoiler: Phone # 314-101." / "... Phone # unknown. RESEARCH NEEDED..."
        num = None
        confirmed = False
        if 'Spoiler: Phone # ' in s:
            raw = s.split('Spoiler: Phone # ', 1)[1].strip().rstrip('.')
            if not raw.lower().startswith('unknown'):
                num = raw
                confirmed = not (num.endswith('?') or num.endswith('(?)'))
        telephones.append({
            'name': b['name'],
            'level': lvl,
            'description': b['description'],
            'number': num,
            'confirmed': confirmed,
        })

out = {'generated': datetime.date.today().isoformat(),
       'source': 'Atlas9 Dossier — Template — Telephone System / Spoilers — Telephones',
       'count': len(telephones), 'telephones': telephones}
with open('/home/hatch/workspace/atlas9-app/telephones.json', 'w') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print('telephones:', len(telephones))
for t in telephones:
    print(f"  L{t['level']} {t['name']} — {t['description']} | number={t['number']} confirmed={t['confirmed']}")
