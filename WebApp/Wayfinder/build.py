#!/usr/bin/env python3
"""Build Unofficial Atlas9 Wayfinder (v1.4.2) from the Unofficial Atlas9 Field Guide's rooms data.

Shares code + data with the Unofficial Atlas9 Field Guide (~/workspace/atlas9-app-v2/):
- rooms.json is the Guide's file, same source as the live app (v1.17.2).
  Public connections are always embedded. Spoiler connections and
  spoiler detail are embedded too (v1.3.0) but the app only uses them
  while Spoilers are on — spoilers off is the same leak-proof graph as
  before, and Spoilers reset to off on every launch, never remembered.
- fazr.json supplies the FAZR points (v1.3.0): room + type + spoiler
  flag only, no point descriptions. The app derives per-type room lists
  from them, filtering spoiler points out unless Spoilers are on.
- The routing section is adapted from the Guide's Wayfinder (v1.10.0 /
  v1.14.0): directional public graph, BFS shortest path.
- The share QR (v1.4.0) is generated here at build time and embedded
  as a data URI, so the app stays one self-contained file.

Rebuild after any Rooms sheet change:
    python3 ~/workspace/atlas9vigator/build.py
Then re-run the routing test:
    node ~/workspace/atlas9vigator/test_routing.js
"""
import base64
import csv
import io
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC_ROOMS = Path.home() / "workspace" / "atlas9-app-v2" / "rooms.json"
SRC_FAZR = Path.home() / "workspace" / "atlas9-app-v2" / "fazr.json"

def load_fazr_points():
    """FAZR points as {room, type, spoiler} — no descriptions.

    The app derives per-type room lists from these and filters spoiler
    points out unless Spoilers are on, so a hidden point never leaks
    into a spoilers-off list. Unknown room names are warned about.
    """
    data = json.loads(SRC_FAZR.read_text())
    rooms = json.loads(SRC_ROOMS.read_text())
    known = {r["name"] for r in rooms["rooms"]}
    points = []
    for p in data.get("fazr") or []:
        if p.get("room") not in known:
            print(f"  WARNING: fazr.json point in unknown room: {p.get('room')!r} — skipped")
            continue
        points.append({"room": p["room"], "type": p.get("type"), "spoiler": bool(p.get("spoiler"))})
    return points

def load_directions():
    """Via notes from directions.csv: {\"Room A|Room B\": note}.

    One note per connection pair, worded neutrally (a complete phrase
    such as \"through the double doors by the box office\") so it reads
    the same in either direction. Empty cells are skipped. Unknown room
    names are warned about, never silently embedded.
    """
    path = HERE / "directions.csv"
    notes = {}
    if not path.exists():
        return notes
    data = json.loads(SRC_ROOMS.read_text())
    known = {r["name"] for r in data["rooms"]}
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            frm, to = (row.get("From") or "").strip(), (row.get("To") or "").strip()
            note = (row.get("Via") or "").strip()
            if not note:
                continue
            if frm not in known or to not in known:
                print(f"  WARNING: directions.csv row with unknown room: {frm!r} / {to!r} — skipped")
                continue
            notes[f"{frm}|{to}"] = note
    return notes

def share_qr_data_uri():
    """QR code for the app URL, as a data URI embedded in the page.

    Black on white with a quiet zone (border=2), generated with the
    qrcode package — deterministic for the same input, so rebuilds
    produce the same image. Displayed at 200px in the share sheet.
    """
    import qrcode
    qr = qrcode.QRCode(border=2, box_size=6)
    qr.add_data("https://parkhopping.com/a9nav/")
    qr.make()
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def main():
    data = json.loads(SRC_ROOMS.read_text())
    # description + artists are embedded so the pickers can search them
    # (v1.1.0: search "bar" / "desk" finds rooms by description, not just
    # by name). Descriptions come from the master sheet via rooms.json and
    # improve there over time — a rebuild picks them up.
    # Spoiler connections + spoiler detail are embedded (v1.3.0) but the
    # app only reads them while Spoilers are on; spoilers off never
    # touches them, so the default graph stays leak-proof.
    rooms = [
        {"name": r["name"], "level": r["level"],
         "description": r.get("description") or "",
         "artists": list(r.get("artists") or []),
         "connections": list(r.get("connections") or []),
         "spoilerConnections": list(r.get("spoilerConnections") or []),
         "spoilerDetail": r.get("spoilerDetail") or ""}
        for r in data["rooms"]
    ]
    notes = load_directions()
    fazr_points = load_fazr_points()
    template = (HERE / "index.html.template").read_text()
    assert "__ROOMS_JSON__" in template, "template placeholder missing"
    assert "__DIRECTIONS_JSON__" in template, "template directions placeholder missing"
    assert "__FAZR_POINTS_JSON__" in template, "template FAZR points placeholder missing"
    assert "__SHARE_QR__" in template, "template share QR placeholder missing"
    html = template.replace("__ROOMS_JSON__", json.dumps(rooms, ensure_ascii=False))
    html = html.replace("__DIRECTIONS_JSON__", json.dumps(notes, ensure_ascii=False))
    html = html.replace("__FAZR_POINTS_JSON__", json.dumps(fazr_points, ensure_ascii=False))
    qr_uri = share_qr_data_uri()
    html = html.replace("__SHARE_QR__", qr_uri)
    (HERE / "index.html").write_text(html)
    # Keep a reference copy of the full source file next to the build.
    shutil.copyfile(SRC_ROOMS, HERE / "rooms.json")
    print(f"built index.html: {len(rooms)} rooms from {SRC_ROOMS}")
    print(f"  source rooms.json: generated={data.get('generated')} count={data.get('count')}")
    print(f"  FAZR points embedded: {len(fazr_points)} ({sum(1 for p in fazr_points if p['spoiler'])} spoiler)")
    print(f"  rooms with spoiler connections: {sum(1 for r in rooms if r['spoilerConnections'])}")
    print(f"  Via notes embedded: {len(notes)}")
    print(f"  share QR embedded: {len(qr_uri)} chars")

if __name__ == "__main__":
    main()
