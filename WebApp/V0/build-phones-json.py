#!/usr/bin/env python3
"""Regenerate phones.json from the Atlas9 Telephone Directory sheet and
attach voicemail transcripts.

Reads the Number Locations tab (sheetId 0, columns A-H) via the Google
Workspace CLI, builds one phone dict per data row (same fields and order
as the original phones.json), and attaches a "transcript" field from the
local transcript texts in transcripts/ (copied from Allen's Mac
Transcriptions folder).

Transcript mapping (by base number — the number with any "(...)" suffix
stripped):
  - One transcript per number: attached as a plain string to every row
    with that base number.
  - 8000 has two transcripts: attached as an object
    {"Film Storage": "...", "Manager's Office": "..."} to both 8000 rows.
  - Numbers with no transcript get no "transcript" field at all.

Usage: python3 build-phones-json.py
Writes: phones.json (same directory as this script).
"""
import json
import os
import re
import subprocess
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
TRANSCRIPTS_DIR = os.path.join(HERE, 'transcripts')
OUT_PATH = os.path.join(HERE, 'phones.json')

SPREADSHEET_ID = '1W0x_m8ABVb-IfTel8dGI7gjqJztgXDxvO-RBjTyVCqw'
RANGE = 'Number Locations'

# 8000 transcript files -> the label used in the transcript object.
EIGHT_THOUSAND_LABELS = {
    'film-storage': 'Film Storage',
    'managers-office': "Manager's Office",
}


def base_number(number):
    """Strip any parenthetical suffix, e.g. '030-263(BND)' -> '030-263'."""
    return re.sub(r'\(.*', '', number).strip()


def load_transcripts():
    """Return {base_number: transcript} where a transcript is a string,
    except for 8000 which is {"Film Storage": ..., "Manager's Office": ...}."""
    transcripts = {}
    eight = {}
    if not os.path.isdir(TRANSCRIPTS_DIR):
        return transcripts
    for name in sorted(os.listdir(TRANSCRIPTS_DIR)):
        if not name.endswith('.txt'):
            continue
        stem = name[:-4]
        path = os.path.join(TRANSCRIPTS_DIR, name)
        with open(path, encoding='utf-8') as f:
            text = f.read().rstrip('\n')
        if stem.startswith('8000-'):
            label = EIGHT_THOUSAND_LABELS.get(stem[len('8000-'):])
            if label:
                eight[label] = text
            else:
                print(f'WARNING: unrecognized 8000 transcript file {name}', file=sys.stderr)
        else:
            transcripts[stem] = text
    if eight:
        transcripts['8000'] = eight
    return transcripts


def fetch_sheet():
    """Fetch the Number Locations tab via the GWS CLI; return the values list."""
    cmd = [
        '/opt/hatch/bin/hatch_gws_cli', 'sheets', 'spreadsheets', 'values', 'get',
        '--params', json.dumps({'spreadsheetId': SPREADSHEET_ID, 'range': RANGE}),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print('Sheet fetch failed:', result.stderr.strip(), file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    values = data.get('values', [])
    if not values:
        print('Sheet returned no values.', file=sys.stderr)
        sys.exit(1)
    return values


def main():
    values = fetch_sheet()
    header = values[0]
    expected = ['Number', 'Descripton', 'Found In', 'Found On What',
                'Found Notes', 'Reported By', 'Recording', 'Photo']
    if header != expected:
        print(f'WARNING: header changed: {header}', file=sys.stderr)

    transcripts = load_transcripts()
    phones = []
    for row in values[1:]:
        # Pad short rows (trailing empty cells are dropped by the API).
        row = list(row) + [''] * (8 - len(row))
        raw_number = row[0].strip()
        number = raw_number.replace('(?)', '').strip()
        confirmed = '(?)' not in raw_number
        phone = {
            'number': number,
            'confirmed': confirmed,
            'description': row[1],
            'foundIn': row[2],
            'foundOn': row[3],
            'foundNotes': row[4],
            'recording': row[6],
            'photo': row[7],
        }
        t = transcripts.get(base_number(number))
        if t is not None:
            phone['transcript'] = t
        phones.append(phone)

    out = {
        'generated': date.today().isoformat(),
        'source': 'Atlas9 Telephone Directory — Number Locations',
        'count': len(phones),
        'phones': phones,
    }
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')

    with_transcript = sorted({base_number(p['number']) for p in phones if 'transcript' in p})
    print(f'phones: {len(phones)}')
    print(f'numbers with a transcript ({len(with_transcript)}): {", ".join(with_transcript)}')
    print(f'wrote {OUT_PATH}')


if __name__ == '__main__':
    main()
