# WebApp — Atlas9 mobile fan guide

The Atlas9 mobile web app (a fan-made guide to the Atlas9 immersive
experience in Kansas City, KS). Two snapshots live side by side:

- **FieldGuide-V0/** — the prototype. Built from the "Atlas9 Dossier — Template"
  Google Doc (Template-built data). Version 1.8.18. Kept as a snapshot;
  not currently deployed.
- **FieldGuide/** — the spreadsheet version. Data generated from the "Atlas9 Data"
  Google spreadsheet (sheet-driven builders). Version 1.17.20. Live at
  https://parkhopping.com/a9/
- **Wayfinder/** — the wayfinding-only app ("Unofficial Atlas9
  Wayfinder"). One self-contained `index.html` (data embedded) plus its
  build source (`index.html.template`, `build.py`, `rooms.json`,
  `test_routing.js`). The Via notes come from the Atlas9 Data sheet's
  Door column. Live at https://parkhopping.com/a9nav/

FieldGuide-V0 is the original app, kept as a snapshot. FieldGuide is the current,
sheet-driven app. Both are static files (one `index.html` plus JSON data
files); the app runs entirely in the browser and keeps all user data
(checkmarks, profile) on the device.

## Photos

The `photos/` folders are in this repo alongside the code. Each
`FieldGuide-V0/photos/` and `FieldGuide/photos/` folder holds the matching
`photos/*.jpg` files:

- FieldGuide-V0/photos/: the 7 people photos plus their 7 `-doc` variants
  (agent00, arthur, blair, burny, casper, frank, melissa).
- FieldGuide/photos/: the same 14 people photos, plus the 11 phone photos
  (`ContainmentZone-phone.jpg`, `FACADEFieldLab-phone.jpg`,
  `FilmStorage-phone.jpg`, `ManagersOffice-phone.jpg`,
  `PowerSupply-phone.jpg`, `ProjectionRoom-phone.jpg`,
  `Prototyzer-phone.jpg`, `ScavengersDen-phone.jpg`,
  `Speakereasy-phone.jpg`, `SpliceBrosPizza-phone.jpg`,
  `VERA-phone.jpg`).
