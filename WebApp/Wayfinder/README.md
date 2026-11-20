# Unofficial Atlas9 Wayfinder — wayfinding-only Atlas9 app

Live: https://parkhopping.com/a9nav/ — v1.4.17 (2026-11-20; browser-verified 14:46)

v1.4.17 (Allen, 2026-11-20): your starting room and Config settings (Avoid stairs, Include crawls) are now saved on this phone (localStorage key a9nav-settings) and restored on launch. Spoilers is deliberately NOT saved — it still starts off every time. Config note and About reworded: "saved on this phone only… may reset when the app updates — that's expected, not a bug." Deploy note: the first SFTP session uploaded the Guide's files to a9nav/ (wrong local cwd) — caught by the curl check and fixed; see AGENTS.md for the rule.

v1.4.14 (Allen, 2026-11-20): Hypnotizer Room ↔ Sapphire Jazz
Club ADDED (public, both ways). Allen's sketched routes all
used it; the edge was missing from the sheet — the Hypnotizer
Room only connected to Mesmerite and the Hypnotizer Crawl.
Added to the sheet: Connections rows 164–165, builders
re-run: 59 rooms, 82 public pairs, no warnings. It does NOT
change the shortest routes (Mesmerite → Jazz Club direct is
still 1 stop vs 2 via the Hypnotizer) — it makes the graph
match the walk. v1.4.14 also ships the Letter Hallway
description ("Hallway with red letters on the ceiling.").
What was checked in Allen's three sketched routes: every
other edge exists (Dub Den → Film Storage → StarBot is real;
Projection Room → Speakereasy is the spoiler hidden door;
Elevator → Speakereasy goes via StarBot, his shorthand
skipped it).

Still open from the Lobby-area discussion: the navigation-only
hallway node (Allen's path: Elevator/Stairs — hallway between
Break Room door/Restrooms — Arcade — Lobby — Concessions).
Navigation-only locations are possible (stairs/elevator
already work that way), but for the hallway to change any
route, the rooms that walk through it must move their Lobby
link to it — otherwise the Lobby already connects them all
and the hallway is invisible to routing. Trade-off: Break
Room → Lobby is 1 stop today, 3 via hallway → Arcade →
Lobby; Lobby → Elevator is 1 today, 3 via Arcade → hallway.
Name and rewiring unconfirmed. Also open: Break Room ↔
Restrooms (Lobby) ↔ Arcade and Restrooms ↔ Elevator/Stairs
(Allen: elevator and stairs, or one?) — the Lobby already
connects all of them, so those links would mainly help the
Restrooms themselves (Restrooms → Speakereasy 4 → 3 stops).
The alphabetical room-list Config option (offered 13:17)
is still unanswered.

v1.4.13 (Allen, 2026-11-20): Letter Hallway ADDED. It was on the
Atlas9 map (Level 2 backstage box) and in Allen's photo list, but
in NEITHER the Dossier Template nor the sheet — the one true miss
found by spot-checking the Dossier list (see below). Added to the
sheet: Rooms row 23 (inserted alphabetically between Hypnotizer
Room and Licorice Lounge; '?', Floor 2, Section 'Rooms' — Allen
corrected 13:34: NOT a backstage hallway, a real room with art
in it (the 'Other items' value first written was wrong and
fixed the same day) — no artist, no description yet,
Connections rows 160–163 (Theater Upper ↔ Letter Hallway and
Letter Hallway ↔ StarBot, all public, two-way). Builders re-run:
59 rooms, 81 public pairs, no warnings. Wayfinder pickable
counts now 50/51/53/54 (was 49/50/52/53). Routing change: with
Spoilers off, Projection Room → Speakereasy is now 4 stops via
Theater Upper → Letter Hallway → StarBot (was 8 via the
elevator); the hidden-door shortcut (1 stop, Spoilers on) is
unchanged. Mesmerite → Speakereasy still goes by elevator (6
stops) — the Letter Hallway path from there is 8. The Guide
still needs a rebuild from the same rooms.json to show Letter
Hallway (main-chat work).

Dossier spot check (2026-11-20, Allen asked): Template's 51
rooms vs current 58 — nearly all differences are renames
(Auditorium #9 → Theater, Auditorium #9 Projection Room →
Projection Room, Film Reel Storage → Film Storage, StarBot ship
→ StarBot, Tickets: FunZone → Party Room (Fun Zone),
Scavengers Den → Scavengers/TV Den, lobby/Starbot elevator and
stairs merged into (Lobby/Starbot) connectors; Auditorium Gum
Tunnel = Theater Crawl, connections match exactly) plus the
deliberate Key of Color removal. The two remaining Template
entries, Mirror Doorway and Mirror Pedestal, are aliases Allen
resolved 13:25: Mirror Doorway is the Temple of the Iris one,
Mirror Pedestal is the Chant of the Mesmerite one — features of
existing rooms, not missing rooms. How Letter Hallway was
missed: every check runs sheet-first — the rescans only asked
"does each sheet room have a folder?", never "does each folder
have a sheet room?", so a folder for an unlisted room was just
counted, never flagged. The systematic fix (offered, Allen is
re-checking his rooms himself instead): a folder-vs-Rooms diff.

v1.4.12 (2026-11-20): the v1.4.11 sheet-top fix did not work, so
it is fixed properly here. Root cause: v1.4.11 set sheet.scrollTop
= 0 while the sheet was still hidden (display:none) — a no-op —
so a new sheet kept the previous sheet's scroll position, and
the browser check caught it twice. Now the reset runs AFTER
sheetWrap gets .open, plus a requestAnimationFrame repeat to
cover scroll anchoring re-applying the old offset after layout.
Tests now check the ORDER (reset after the .open class, inside
openSheet) instead of merely the presence of the line — the
presence check is what let v1.4.11's dead line pass.

v1.4.11 (Allen, 2026-11-20): choosing a destination clears the
"Or go to a room" search. Built in setDestination (the single
choke point for all six call sites: search rows, dest select,
tier-3 rooms, routeTierOpt, Elevator, Exit) — clears
#destSearch, hides #destClear, re-renders the list back to the
hint. Browser-verified 13:11: "Office" → Box Office,
Containment Zone, Theater Manager's Office; after tapping
Restroom the search box is empty, the hint is back, and the
route shows Nearest restroom (Restrooms (Lobby)), 1 stop. The
sheet-top half of v1.4.11 FAILED verification (see v1.4.12).

v1.4.10 (Allen, 2026-11-20): grab bar REMOVED from sheets, and
tapping the version number opens the release notes. The sheet top
row is now just the sticky × at the top-right (justify-content:
flex-end); the #sheet .grab CSS rule and the grab div are gone,
with test guards that neither appears in the built file. The
header version is now a <button id="ver"> (same gold 13px look,
button reset in #ver CSS) wired to openReleaseNotes(), a sheet
with <h2>Release Notes</h2> + the same releaseNotesHTML() list
About uses — newest first. Browser-verified 13:07 (all 4 checks):
header v1.4.10, About has no grab bar and a clean top edge, ×
present and sticky while scrolling, version tap opens Release
Notes with v1.4.10 first, × closes it. One observation from the
check, NOT yet fixed: the Release Notes sheet opened already
scrolled down, keeping the About sheet's scroll position — #sheet
keeps its scrollTop between openSheet calls. Fix queued for
v1.4.11 (one line: sheet.scrollTop = 0 in openSheet).

v1.4.9 (Allen, 2026-11-20 — "Yes the X to close would be nicer"):
every sheet now has a × at the top-right. Built in openSheet, so
it covers all sheets (About, What's New, Report, Config, Share,
Install). The × lives in a sticky top row with the grab handle
(position: sticky, top 0, sheet background, z-index 2), so it
stays visible while a long sheet scrolls; the Close button at the
bottom stays. It respects the noClose flag (no call site uses it).
The × glyph is ✕, same as the search clear buttons. Tests: sheetX
id, sheetTop class, sticky CSS, wiring to closeSheet, bottom
Close still present. Browser-verified 13:00 (all 4 checks): ×
visible on open in About and Report, stays put while scrolling
down through the release notes, closes the sheet while scrolled,
bottom Close still there, header v1.4.9. (The What's New sheet
itself was closed with its × during the check.)

v1.4.8 (Allen caught it, 2026-11-20): SPOILER LEAK in the v1.4.7
release note — it read "it is a prop in the TV Den with a hidden
FAZR, not a room you can walk into", naming a hidden FAZR in a
specific room in copy every user sees with Spoilers off. Fixed with
Allen's wording: v1.4.7's note is now just "Removing Key of Color
(not a real room).", and v1.4.8's own note is "Release notes
corrected." New test guard: the WHATS_NEW block must not contain
"hidden FAZR", "Hidden door" or "Headshot" — checked on the notes
block only, since "Hidden door" is a legitimate route label
elsewhere. (The code comment above the guard in whatsNewHTML
already states the rule: "The wording stays vague on purpose — a
spoilers-off user reads this, so no hidden room or route is named."
— the v1.4.7 note broke it.) Verified live: "hidden FAZR" occurs
0 times in the served page. Bumped to 1.4.8 (not fixed in place)
so the corrected note reaches everyone through the update
mechanism. OPEN (Allen, 12:53): large sheets make him scroll all
the way to the bottom for Close — is there a top close control?
The sheet system today: grab handle (visual only) at top, Close
button appended at the bottom, tap-outside-the-sheet also closes.
Proposed: a fixed × at the top-right of every sheet, keeping the
bottom Close — the PC convention he named. Awaiting his go-ahead
to build (likely v1.4.9).

v1.4.7 (Allen, 2026-11-20): Key of Color removed as a room.
Browser-verified 12:52 (all 3 checks): searching "key of color"
returns "No rooms match", the ring picker has no Key of Color, TV
Den still lists, and its hidden FAZR is still there with Spoilers
on (route to TV Den works: 4 stops from Lobby). Full story in the
v1.4.7 section below.

v1.4.7 (Allen, 2026-11-20): Key of Color is not a room you can
go into — it is a prop in the TV Den with a hidden FAZR, like the
filing cabinet in the Manager's Office (spoiler FAZR "hidden
behind filing cabinet"). The TV Den already had the point: FAZR
tab row 33, spoiler FAZR "hidden in the small mound behind a
painting", Notes "where you obtain the Key of Color" — so no new
point was needed. Deleted from the master sheet: Rooms row 23
(Key of Color) and Connections rows 51 (Key of Color → TV Den)
and 132 (TV Den → Key of Color, the reverse edge — found only
because the builder warned "does not resolve to Rooms-tab names"
on the first rebuild). Re-ran atlas9-v2-build/build-rooms-json.py:
58 rooms, 79 public pairs, no warning; TV Den now connects to
Scavengers and Scavengers Stairs only. Wayfinder tests updated:
pickable 49/50/52/53 (was 50/51/53/54) + a guard that no
"Key of Color" room entry appears in the built file. The Dossier
Template snapshot (Nov 18) still lists Key of Color — Template
work deferred per Allen (12:53), and the old Template-based
build-rooms-json.py in atlas9-app-v2/ is a known footgun if
re-run. The Guide still shows Key of Color until it rebuilds
from the same data (main-chat work). Browser-verified 12:52 (all
3 checks): "key of color" search → "No rooms match", ring picker
has no Key of Color, TV Den still lists and its hidden FAZR is
still there with Spoilers on (route to TV Den works, 4 stops
from Lobby). (The v1.4.7 release note leaked the spoiler — see
v1.4.8.)

v1.4.6 (Allen, 2026-11-20 — "The nudge is good"): Report checking.
Until now the only gate was that a kind had to be picked — any
room + type + kind went through, even a contradictory one (e.g.
"There but not listed" for a type the room already lists). Now a
gold nudge line appears under the problem kinds when the pick
contradicts what the app lists, checked against the spoiler-aware
FAZR list (fazrRooms(reportType, spoilersOn)): "There but not
listed" + room lists the type → 'Heads up: this room already lists
a <type> — is this a different one?'; "Listed here but not
actually there" + room lists no such type → 'Heads up: this room
does not list a <type> — is that the right type?'. It never blocks
the form — a room can hold a second object of the same type that is
not listed yet, so the nudge is a heads-up only. syncNudge() runs
on every Report change (room select, room search tap, type tap,
kind tap, at open) so the line stays correct as the picks change.
New #reportNudge element (class viaNote, hidden until a message
exists — needed its own #reportNudge.hidden rule, since .hidden is
scoped per element, not global). Tests: element, syncNudge, the
fazrRooms check, both message strings, exactly 5 syncNudge call
sites. Browser-verified 12:40 (all 3 cases): Lobby + FAZR-Portal +
"There but not listed" → the "already lists" nudge, button still
enabled; switch to Computer → nudge clears, then "Listed here but
not actually there" → the "does not list" nudge, button still
enabled; Computer + "There but not listed" → no nudge at all.
Allen's alternative if the nudge version does not work out: reorder
Report to Room → kind (Report Missing / Report Not Listed) → type,
greying out types based on what is known to be in the room — NOT
built, his call later.

v1.4.5 (Allen, 2026-11-20 — "yes"): two phone-tested fixes. (1)
After picking a room in "I am in", the button scrolls back to the
top of the visible screen: new scrollFromIntoView(), the same
measured smooth scroll the route box uses (header height minus 8),
called from both "I am in" picks — the search-row tap and the ring
picker change. The picker closing used to collapse the page and pop
the view down to the shortcut buttons. Tests: helper exists, called
exactly twice. Browser-verified 12:33: after picking Theater the
button showing Theater is the first content under the sticky header.
One cosmetic note from that check: the small "I am in" heading
itself sits just above the viewport at that scroll position (the
scroll targets the button) — the button, which carries the room
name, is fully visible. (2) The route box moved after "Or go to a
room" in the page, so the screen reads I am in / How do I get to…
(options) / Or go to a room / ROUTE — before, the destination picker
sat below the route when you picked a room. Pure HTML move (the
#route div after #destList); all JS references it by id. Tests:
route div after destList and after tier3. Browser-verified 12:33:
full top-to-bottom order confirmed, route to Power Supply at the
bottom with its steps intact.

v1.4.4 (Allen, 2026-11-20 — "yes"): every room chooser is now a
ring picker followed by a search. "I am in", "Or go to a room" and
Report all start with a room <select> (shared roomOptions() helper,
grouped Floor 1 / Floor 2 via <optgroup>, same pickableList universe
as before — spoiler/crawl rules apply), and the long list of every
room is gone: an empty search shows only a "Type to search rooms."
hint, typing shows matches. "I am in" picker: the select shows the
current room; picking from it does what tapping a search row did
(sets fromName, re-renders, closes the picker). Destination picker:
"Choose a room…" placeholder first, leaves out the room you are
standing in (like its list); picking routes like a row tap (scrolls).
Report: a search box + results under the Room select; tapping a
match sets the picker and re-picks the default type. The selects
stay fresh: renderFromSel()/renderDestSel() run at startup, on
picker open, on every setDestination/Close/step-tap, and on
Spoilers/Config toggles. The shortcut heading is now "How do I get
to…" (Allen picked it over "Route to…" — the old heading claimed
the route was the quickest, which the app cannot know: some rooms
are huge and there is no time reference). Shared .roomSel CSS for
all three selects (was #reportRoomSel). Tests: new v1.4.4 guards
(picker ids, roomOptions, optgroup construction, .roomSel CSS, the
hint, the new heading, no "Quickest way", Report search ids and
order). One guard fix while building: the optgroup check had to
match the constructed source string, not the runtime string.
Browser-verified 12:27, all 4 checks: heading exact, "I am in"
picker order + theater search + pick closes and sets Theater,
destination placeholder + Power Supply route + arcade search
matches exactly the rooms with "arcade" in their descriptions,
Report search power → Power Supply → Computer gold.

v1.4.3 (Allen, 2026-11-20 — "Let's see it"): three small things.
(1) The route box button is now Close, a true clear: on tap it
clears the route, calls clearTier2() (every shortcut button back to
dark, tier-2 and tier-3 closed) and scrolls the page back to the top
(window.scrollTo(0, 0)); "I am in" stays where you arrived. The old
handler only cleared the destination and called markTier2(), leaving
the buttons lit and the sub-list open. Tests: markTier2() call sites
now 3 (renderTier2, setDestination, renderTier3), plus guards for the
Close label, the clearTier2+scrollTo handler, and no "Clear route".
(2) The header subtitle line "Wayfinding only — no dossier." is
gone, with its .sub CSS rule — the title already says what the app
is, and the line pushed the version onto its own line on Allen's
phone. (The What's New note for 1.4.3 quotes the removed line, so
the phrase still appears once in the file, in the note only.)
(3) The Report sheet starts with a Room picker (a <select> of
pickableList — same rooms as "I am in", spoiler rules apply), first
in the sheet, defaulting to the current room; the type buttons sit
below it. Changing the room re-picks the default type for that room
via firstTypeForRoom() (first FAZR point type recorded for the room,
else FAZR); the route-derived default still wins at open time. The
form pre-fill now uses the selected room (where entry), and the old
"Room: X — you can change it in the form." line is gone. Tests: new
v1.4.3 guards (reportRoomSel id, select before "What is it?",
firstTypeForRoom, where=reportRoom).

v1.4.2 (Allen, 2026-11-20 — "Yes, give it a try"): Elevator and
Exit now stay gold when tapped, like the other buttons (their tap
branches add .on after clearTier2 — before, a tap gave no feedback
that it was selected). FAZR gets a third level: tapping a FAZR type
still routes to the nearest of that type, and now also lists every
room holding one underneath (renderTier3, FAZR-only — the other
categories already list every option at tier 2). The type stays gold
while its list is open; a room in the list goes gold only when the
route came from tapping that room (same nearest rule as v1.4.1).
Toggling Spoilers re-opens the open type's list with fresh targets
(Headshot joins when on). Tests: new v1.4.2 guards (two
classList.add('on') sites, tier3 container/render/highlight,
FAZR-only gate, tier-3 gold CSS); the setDestination(..., false)
count is now 5 and markTier2() call sites were 4 at the time
(renderTier3 added one; v1.4.3 removed the clear-route one, back to
3).

v1.4.1 (2026-11-20): the browser check of v1.4.0 caught one real
bug — a category tap lit TWO sub-buttons at once, because the
nearest room is also a listed specific (nearest stairs from the
Lobby IS Stairs (Lobby/Starbot)). markTier2 now lets Nearest win: a
route that came from a Nearest option lights only Nearest; a route
to a specific room lights only that room. The same check confirmed
the FAZR gold moves between options and is never on both at once
(correct — the check wording had asked for the wrong thing), and
that the Share sheet's Share… button hides itself on a desktop
browser with no native sharing (it appears on a phone, where
sharing is supported). Wayfinder only — the Guide stays v1.17.4.

v1.4.0 (Allen, 2026-11-20): the batch he called "let's do them now".
Tapping a category (Stairs, Food, Restroom, FAZR) now routes to the
nearest one right away, with Nearest gold — the sub-buttons refine it
from there (shared routeTierOpt helper, used by both the category tap
and the tier-2 taps). The FAZR highlight bug is fixed: the ANY
option's prefix is now 'Nearest FAZR point', distinct from the
FAZR-type option's 'Nearest FAZR', so tapping FAZR lights only
Nearest. New header icons, both icons not pills: Share (standard
share glyph — sheet with a QR code, a link to copy, and the phone's
share sheet; the QR is a data URI embedded by build.py, so the app
stays one self-contained file) and Report (flag — sheet with tap-only
picks for item type, defaulting to the current destination's type,
and problem kind; the room comes from "I am in"; the button opens
the Guide's research form pre-filled, no typing in the app). The
Guide got Share too (v1.17.4, same sheet, its own QR). Tests: new
v1.4.0 guards (share/report buttons, form entry IDs, embedded QR
data URI, 'Nearest FAZR point', routeTierOpt + category-tap call);
the setDestination(..., false) count stays 4 after the refactor.

v1.3.7 (Allen, 2026-11-20): the tier-2 sub-option that produced the
current route now stays gold, like the category button above it.
markTier2() derives it from destName/destLabel and runs from
setDestination, renderTier2 and clear-route, so a room-search pick
clears it and a fresh tier-2 tap sets it. Tests: #tier2 button.on
CSS, markTier2 exists, exactly three call sites.

Home-screen icons (Allen, 2026-11-20): family pair, wired in 11:19
with no version bump (fresh installs only). Both are built by
icons/build_family_icons.py — one shared small A9 master (Liberation
Sans Bold, apps' gold #e0a800) rendered once and composited into both,
glyph large as the hero, small A9 at the bottom. Wayfinder: compass
(ring + split needle — a solid diamond alone reads as a gem).
Guide: magnifying glass (compass finds a place, magnifier examines
one — "Sherlock Holmes would love this place"). The map alternate
looked like a football field and compass + map do the same job, so it
was dropped; the book alternate was dropped too. Files:
apple-touch-icon.png (180×180) in each app's folder, linked from the
<head>. Already-installed home-screen icons keep the old image until
removed and re-added. SFTP note: chmod each file separately — a
multi-file chmod only touches the first (the icon 403'd until fixed).

v1.3.6 (Allen, 2026-11-20): shortcut picks no longer scroll — tapping a
tier-2 sub-button (or Elevator/Exit) shows the route right below the
buttons, so you can tap through the options and glance at each one.
Picking a room from the "Or go to a room" search list still scrolls the
route to the top. Tests: setDestination takes a scroll flag; exactly four
setDestination(..., false) call sites (the plain ", false)" count is 5 —
roomListHTML(q, fromName, false) predates it).

v1.3.5 (Allen, 2026-11-20): shortcut grid is now 3 columns × 2 rows
(Stairs / Elevator / Food, Restroom / Exit / FAZR); Food/Drink
shortened to Food so the labels fit the narrower buttons. What's New
sheet loses its own "Got it" button (Allen: Close was already on the
sheet) — the sheet's Close dismisses it, like every other sheet.

v1.3.4 (Allen, 2026-11-20): checked-off steps — the route keeps its
full path while you walk it. Steps you have reached keep their
numbers and are marked checked (struck-through name, gold check; the
start row's badge becomes a check), and tapping one moves "I am in"
back there. The dot moves to the row you are standing in. The count
is the stops still to go, so arriving reads "You're already there."
Step taps no longer scroll at all — the list stays where it is, so a
long route doesn't jump back to the top; only picking a new
destination scrolls the route box to the top (the v1.3.3 bottom room
stays, for that scroll). The six shortcut buttons are labels only
(Stairs, Elevator, Food/Drink, Restroom, Exit, FAZR) — no subtitles;
renderAvoid just disables the Stairs button while Avoid stairs is on,
with the explanation in Config's hint. A toggle change mid-walk
recomputes the route from where it started when that still passes
through "I am in", otherwise from "I am in".

v1.3.3 (Allen, 2026-11-20): body bottom padding (100vh/100svh) so the
route box top can always reach the viewport top — the browser stops
at the bottom of the document otherwise, and the box lands mid-screen.
Browser-verified: box top at exactly 74px from the viewport top on
both step taps (was ~300px), empty scroll room below the footer
confirmed.

v1.3.2 (Allen, 2026-11-20): route steps are numbered — the row you
stand in gets a dot, each row after it is the stop number, so the
last number matches the "N stops" count. The chevron is gone from
route steps (it implied "go onward", the wrong idea); picker rows
keep theirs, where it means "tap to choose this room". Scroll fix:
the old scrollIntoView landed the "Route to …" title UNDER the
sticky header, which read as the screen jumping off the top — taps
now measure the header's real height and scroll the title to the top
of the visible screen. (A "Tap a step to move 'I am in' there as
you walk." hint was already in the route box since v1.3.0.)

v1.3.1 (Allen, 2026-11-20): spoiler-leak fix — About and the footer
no longer name anything hidden; Spoilers is described only as
enabling "hidden routes and hidden items" (the old text named the
hidden room and its routes). Config gains Include crawls, off by
default, in-memory only: the three crawl passages count as rooms
while on, with "Crawl" as their row meta; the Party Room hidden-door
edge into Hypnotizer Crawl still needs Spoilers on too. What's new:
after an update, a "What's new in vX.Y.Z" sheet appears once (first
install shows About instead); About is restructured — Check for
updates + Install on Home Screen at the top, about text, then a
Release Notes section (v1.3.1 / v1.3.0 / v1.2.0) for anyone who wants
to scroll. If that proves too hidden, the fallback is two About tabs
(About / Release Notes). Standing in a room that stops being
available (Spoilers off while in Headshot, crawls off while in a
crawl) drops you back in the Lobby. Share (icon) landed in v1.4.0,
both apps.

v1.3.0 (Allen, 2026-11-20): two-tier shortcuts — tier 1 categories
(Stairs, Elevator, Food/Drink, Restroom, Exit, FAZR); tier 2 opens
below with Nearest first, then each specific target (Stairs lists all
4 staircases; FAZR lists types FAZR / Movie Poster / Computer /
INTERFAZE / FAZR-Portal, Portal included per Allen). Elevator and Exit
have one target each, so they route at once with no tier 2. Spoilers
button top-right next to Config (same pill + gold-on style as the
Field Guide): while on, hidden doors are edges, Headshot Remixer is
pickable, spoiler FAZR points join the lists, spoiler detail shows in
rows and in search — off on every launch, never remembered. Crawls
stay excluded even with Spoilers on (not a walkable route; the Guide
keeps them as a separate toggle). FAZR lists are built from fazr.json
(room + type + spoiler only, no point descriptions); spoiler points
(3) filtered out unless Spoilers are on; Headshot left out of FAZR
lists unless Spoilers are on (unreachable otherwise). Route steps
through a hidden door are marked "Hidden door" while Spoilers are on.

v1.2.0 (Allen, 2026-11-20): Config button top-right (like the Field
Guide's Profile button) — the Avoid stairs choice moved there from the
main screen; defaults live in Config. Shortcuts are now "Quickest way
to the nearest…" with 6 buttons: Stairs, Elevator, Restroom, Exit,
Food/Drink (Concessions snack bar, Speakereasy, Splice Bros Pizza &
Pub — curated, not keyword-matched), INTERFAZE (nearest room holding a
public INTERFAZE screen, from the Guide's fazr.json — all 4 are public,
so no spoiler leak). Search matches names + descriptions + artists
("guitar" finds Scavengers/TV Den).

v1.1.2 renames the app from Atlas9vigator to Unofficial Atlas9
Wayfinder (home-screen label "A9 Wayfinder"); rebuilt from the Guide's
v1.17.2 rooms.json, so the three fixed reverse connections are in
(Prototyzer ↔ Concession Caverns, Sapphire Stroll ↔ MossMan,
Power Supply ↔ Scavengers).

v1.1.0 adds: search by room description (name + description + artists,
so "bar" / "desk" find rooms), descriptions shown in list rows, and the
Guide's app infrastructure ported over — update check (version.json poll
on show + every 5 min, gold update bar, one-tap reload), Install on Home
Screen sheet (iOS/Android steps), About sheet + first-run welcome.
Unofficial Atlas9 Wayfinder stores nothing (no account, no saved data).

Single self-contained `index.html` (rooms data embedded). Rebuild with:

    python3 build.py          # from atlas9-app-v2/rooms.json + door-notes.json
    node test_routing.js      # full routing matrix on the shipped file

Deploy: SFTP `index.html` + `version.json` + `apple-touch-icon.png`
to `public_html/a9nav/` as parkhop (explicit key flags — see AGENTS.md
SFTP note), chmod 644 each file separately.

## Door directions (Via notes)

Routes show a "which door to go through" line under a step when a note
exists for that connection. Notes live in the Atlas9 Data sheet's
Connections tab, "Door (how to get through)" column — one note per
directed connection, written from the room you're leaving, as a full
phrase starting with a preposition ("through the…", "under the…",
"behind the…"). The reverse leg needs its own note. `build-rooms-json.py` writes them to
`atlas9-app-v2/door-notes.json`, and `build.py` embeds them.

- `Door` is a full phrase, e.g. `through the door disguised as a soda machine` —
  the app shows it verbatim.
- Empty `Door` = no note yet; the route renders exactly as before.
- Never invent a door description — notes come from Allen / on-site
  knowledge only. `build.py` warns on unknown room names and skips them.

Source of the graph: the Guide's Wayfinder (directional public graph,
BFS shortest path, crawls always excluded, no spoiler connections).
