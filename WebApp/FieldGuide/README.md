# FieldGuide — Atlas9 mobile fan guide (spreadsheet version)

The current, sheet-driven app.

- **Version:** 1.17.20
- **Live at:** https://parkhopping.com/a9/
- **Data source:** the "Atlas9 Data" Google spreadsheet. All six JSON
  files are generated from the spreadsheet by column header (builders
  in the workspace, `atlas9-v2-build/`).
- **Contents:** `index.html` (the whole app), `rooms.json`,
  `people.json`, `phones.json`, `telephones.json`, `timeline.json`,
  `fazr.json`, `version.json`, `.htaccess`.

Changes since FieldGuide-V0 (1.8.18): 59 rooms (was 51), 11 telephones (the
speakerphone prop is gone), phone photos on the telephone detail
sheets and list thumbnails, "RESEARCH NEEDED. Submit information."
for blank descriptions, the sheet-driven data model (rooms carry
connections, spoiler detail, and official-name flags), "Connects to:"
on room cards (each connected room is a tappable row that opens that
room), the three crawls as rooms of their own (Theater Crawl,
Hypnotizer Crawl, Concession Crawl), "Auditorium #9" renamed to
"Auditorium #9 Lower" (Level 1) and "Auditorium #9 Upper" (Level 2),
a Timeline tab (28 entries from the Dossier's "Timeline of
Events", public, not spoiler-gated), and a FAZR tab (45 points).

## Photos

`photos/` holds the 14 people photos (same as FieldGuide-V0) plus the 11 phone
photos: `ContainmentZone-phone.jpg`, `FACADEFieldLab-phone.jpg`,
`FilmStorage-phone.jpg`, `ManagersOffice-phone.jpg`,
`PowerSupply-phone.jpg`, `ProjectionRoom-phone.jpg`,
`Prototyzer-phone.jpg`, `ScavengersDen-phone.jpg`,
`Speakereasy-phone.jpg`, `SpliceBrosPizza-phone.jpg`,
`VERA-phone.jpg`. (Binary JPEGs are added separately from the text
snapshot — they were committed by Allen.)
