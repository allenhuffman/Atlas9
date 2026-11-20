// Routing test for Unofficial Atlas9 Wayfinder — runs the PURE section of
// the shipped index.html (not a copy of the logic) against the embedded
// rooms data.
//   node ~/workspace/atlas9vigator/test_routing.js
// Checks:
//  1. Every pickable room reaches every other pickable room, stairs
//     allowed AND avoid-stairs on (elevator only), spoilers off AND on
//     — no one gets stranded. Spoilers on adds Headshot Remixer (51st).
//  2. Nearest stairs / elevator / restrooms / exit / food-drink / FAZR
//     (any type + each type) return a real path from every pickable
//     room in both modes, and the last step is a member of the target
//     set.
//  3. No route ever steps through a crawl, a spoiler-only room (when
//     spoilers are off), or — with avoid-stairs on — a stair node.
//  4. Headshot Remixer is unreachable as a destination with spoilers
//     off (hidden doors only), and a direct 1-stop route from Break
//     Room / PhotoBooth with spoilers on.
//  5. Static guards: tier-1 buttons are labels only, checked steps
//     stay on screen with numbers kept, and only a new destination
//     scrolls the route box to the top (v1.3.4).
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const start = html.indexOf('// __PURE_START__');
const end = html.indexOf('// __PURE_END__');
if (start < 0 || end < 0 || end <= start) { console.error('PURE markers not found'); process.exit(1); }
const roomsStart = html.indexOf('const ROOMS = ');
const pure = html.slice(roomsStart, end);
// eval() would scope the consts inside itself; run the shipped code as a
// function and pull the bindings out instead.
const shipped = new Function(pure + '; return {ROOMS, STAIRS, ELEVATOR, CRAWLS, RESTROOMS, EXIT, FOOD_DRINK, FAZR_POINTS, FAZR_TYPES, PICKABLE, pickableList, fazrRooms, isSpoilerEdge, DIRECTIONS, findRoute, findNearest, viaNote, roomMatches, floorLabel, roomMeta};')();
const { ROOMS, STAIRS, ELEVATOR, CRAWLS, RESTROOMS, EXIT, FOOD_DRINK, FAZR_POINTS, FAZR_TYPES, PICKABLE, pickableList, fazrRooms, isSpoilerEdge, DIRECTIONS, findRoute, findNearest, viaNote, roomMatches, floorLabel, roomMeta } = shipped;

let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('FAIL:', msg); } }

const pickable = PICKABLE.map(r => r.name);
const pickableSpoiler = pickableList(true, false).map(r => r.name);
const pickableCrawls = pickableList(false, true).map(r => r.name);
const pickableSpoilerCrawls = pickableList(true, true).map(r => r.name);
console.log('pickable rooms:', pickable.length, '(spoilers on:', pickableSpoiler.length + ', crawls on:', pickableCrawls.length + ', both:', pickableSpoilerCrawls.length + ')');
check(pickable.length === 50, 'expected 50 pickable rooms, got ' + pickable.length);
check(pickableSpoiler.length === 51, 'expected 51 pickable rooms with spoilers on, got ' + pickableSpoiler.length);
check(pickableCrawls.length === 53, 'expected 53 pickable rooms with crawls on, got ' + pickableCrawls.length);
check(pickableSpoilerCrawls.length === 54, 'expected 54 pickable rooms with spoilers + crawls on, got ' + pickableSpoilerCrawls.length);
// v1.4.13: Letter Hallway (Allen — between StarBot and Theater
// Upper; was on the map and in his photo list, but in neither the
// Dossier nor the sheet). Public Floor 2 room, two-way edges.
check(html.includes('"Letter Hallway"'), 'Letter Hallway must be in the built data (v1.4.13)');
// v1.4.14: Hypnotizer Room connects to Sapphire Jazz Club (Allen —
 // he walked it; it was missing from the sheet). Public, both ways.
check(findRoute('Hypnotizer Room, The', 'Sapphire Jazz Club', false, false, false).length === 2, 'Hypnotizer to Jazz Club must be 1 stop (v1.4.14)');
check(!pickable.includes('Headshot Remixer'), 'Headshot Remixer must not be pickable with spoilers off');
check(pickableSpoiler.includes('Headshot Remixer'), 'Headshot Remixer must be pickable with spoilers on');
check(!pickable.some(n => CRAWLS.includes(n)), 'crawls must not be pickable with crawls off');
check(CRAWLS.every(n => pickableCrawls.includes(n)), 'all 3 crawls must be pickable with crawls on');
// Crawl rows read "Crawl" in the pickers and on route steps.
check(roomMeta(ROOMS.find(r => r.name === 'Theater Crawl')) === 'Crawl', 'Theater Crawl meta must read Crawl');
check(roomMeta(ROOMS.find(r => r.name === 'Lobby')) === 'Floor 1', 'Lobby meta must read Floor 1');
check(floorLabel(0) === 'Floor 1 & 2', 'level 0 must read Floor 1 & 2');

const nearestTargets = (spoilersOn) => [
  ['stairs', STAIRS], ['elevator', [ELEVATOR]], ['restrooms', RESTROOMS],
  ['exit', [EXIT]], ['food/drink', FOOD_DRINK],
  ['fazr-any', fazrRooms('ANY', spoilersOn)],
  ...FAZR_TYPES.map(t => ['fazr-' + t, fazrRooms(t, spoilersOn)]),
];
for (const avoid of [false, true]) {
  for (const spoilersOn of [false, true]) {
    for (const includeCrawls of [false, true]) {
      const list = spoilersOn ? (includeCrawls ? pickableSpoilerCrawls : pickableSpoiler) : (includeCrawls ? pickableCrawls : pickable);
      for (const from of list) {
        for (const to of list) {
          const p = findRoute(from, to, avoid, spoilersOn, includeCrawls);
          check(p !== null, `no route ${from} -> ${to} avoid=${avoid} spoilers=${spoilersOn} crawls=${includeCrawls}`);
          if (p) {
            check(p[0] === from && p[p.length - 1] === to, `bad endpoints ${from} -> ${to}`);
            if (!includeCrawls) check(!p.some(n => CRAWLS.includes(n)), `route via crawl ${from} -> ${to} avoid=${avoid} spoilers=${spoilersOn}: ${p}`);
            if (avoid) check(!p.some(n => STAIRS.includes(n)), `route via stairs with avoid on ${from} -> ${to}: ${p}`);
            if (!spoilersOn) check(!p.includes('Headshot Remixer'), `route via Headshot with spoilers off ${from} -> ${to}: ${p}`);
          }
        }
        for (const [label, targets] of nearestTargets(spoilersOn)) {
          if (avoid && label === 'stairs') continue; // stairs button is disabled with avoid on
          const p = findNearest(from, targets, avoid, spoilersOn, includeCrawls);
          check(p !== null, `no nearest ${label} from ${from} avoid=${avoid} spoilers=${spoilersOn} crawls=${includeCrawls}`);
          if (p) {
            check(targets.includes(p[p.length - 1]), `nearest ${label} from ${from} ends at ${p[p.length - 1]}`);
            if (!includeCrawls) check(!p.some(n => CRAWLS.includes(n)), `nearest ${label} via crawl from ${from}: ${p}`);
            if (avoid) check(!p.some(n => STAIRS.includes(n)), `nearest ${label} via stairs with avoid on from ${from}: ${p}`);
            if (!spoilersOn) check(!p.includes('Headshot Remixer'), `nearest ${label} via Headshot with spoilers off from ${from}: ${p}`);
          }
        }
      }
      console.log(`mode avoid=${avoid} spoilers=${spoilersOn} crawls=${includeCrawls}: all-pairs + nearest checks done`);
    }
  }
}
// Crawls (v1.3.1): routable only with the Config switch on. The Party
// Room -> Hypnotizer Crawl edge is a hidden door, so it needs Spoilers
// on too; the public edges into crawls work with crawls on alone.
check(JSON.stringify(findRoute('Party Room (Fun Zone)', 'Hypnotizer Crawl', false, true, true)) === JSON.stringify(['Party Room (Fun Zone)', 'Hypnotizer Crawl']), 'Party Room -> Hypnotizer Crawl must be 1 stop with spoilers + crawls on');
const prToHypOff = findRoute('Party Room (Fun Zone)', 'Hypnotizer Crawl', false, false, true);
check(prToHypOff !== null && prToHypOff.length > 2, 'Party Room -> Hypnotizer Crawl with spoilers off must go the long public way, not the direct hidden door: ' + prToHypOff);
check(JSON.stringify(findRoute('Round Mirrors', 'Hypnotizer Crawl', false, false, true)) === JSON.stringify(['Round Mirrors', 'Hypnotizer Crawl']), 'Round Mirrors -> Hypnotizer Crawl must be 1 stop with crawls on (public edge)');
check(JSON.stringify(findRoute('Theater', 'Theater Crawl', false, false, true)) === JSON.stringify(['Theater', 'Theater Crawl']), 'Theater -> Theater Crawl must be 1 stop with crawls on');
check(findRoute('Theater', 'Theater Crawl', false, false, false) === null, 'Theater -> Theater Crawl must be unreachable with crawls off');
// Headshot Remixer: unreachable as a destination with spoilers off from
// every pickable room; a direct hidden-door route with spoilers on.
for (const from of pickable) {
  check(findRoute(from, 'Headshot Remixer', false, false, false) === null, `Headshot reachable with spoilers off from ${from} — hidden-door leak`);
}
check(JSON.stringify(findRoute('Employee Break Room', 'Headshot Remixer', false, true, false)) === JSON.stringify(['Employee Break Room', 'Headshot Remixer']), 'Break Room -> Headshot must be 1 stop with spoilers on');
check(JSON.stringify(findRoute('PhotoBooth (Left)', 'Headshot Remixer', false, true, false)) === JSON.stringify(['PhotoBooth (Left)', 'Headshot Remixer']), 'PhotoBooth -> Headshot must be 1 stop with spoilers on');
// Spoiler edges: only the 4 hidden-door directions.
check(isSpoilerEdge('Employee Break Room', 'Headshot Remixer'), 'Break Room -> Headshot must be a spoiler edge');
check(isSpoilerEdge('PhotoBooth (Left)', 'Headshot Remixer'), 'PhotoBooth -> Headshot must be a spoiler edge');
check(isSpoilerEdge('Projection Room', 'Speakereasy'), 'Projection Room -> Speakereasy must be a spoiler edge');
check(isSpoilerEdge('Party Room (Fun Zone)', 'Hypnotizer Crawl'), 'Party Room -> Hypnotizer Crawl must be a spoiler edge');
check(!isSpoilerEdge('Headshot Remixer', 'Employee Break Room'), 'Headshot -> Break Room must NOT be a spoiler edge (public exit)');
check(!isSpoilerEdge('Lobby', 'Theater'), 'Lobby -> Theater must NOT be a spoiler edge');
// Via notes: lookup tries both orders, returns null when no note exists.
// (DIRECTIONS is empty until Allen supplies notes; the lookup itself is
// checked here with a sample map, not the shipped data.)
const sample = { 'Lobby|Containment Zone': 'through the double doors by the box office' };
check(viaNote(sample, 'Lobby', 'Containment Zone') === 'through the double doors by the box office', 'viaNote forward lookup');
check(viaNote(sample, 'Containment Zone', 'Lobby') === 'through the double doors by the box office', 'viaNote reverse lookup');
check(viaNote(sample, 'Lobby', 'Theater') === null, 'viaNote must be null with no note');
check(viaNote({}, 'Lobby', 'Theater') === null, 'viaNote must be null with empty map');
check(viaNote(null, 'Lobby', 'Theater') === null, 'viaNote must be null with null map');
check(typeof DIRECTIONS === 'object', 'DIRECTIONS must be embedded');
console.log('Via notes embedded in shipped file:', Object.keys(DIRECTIONS).length);
// Shortcut target lists (v1.2.0/1.3.0): exact sets, all pickable rooms.
check(JSON.stringify(FOOD_DRINK.slice().sort()) === JSON.stringify(['Concessions (Lobby)', 'Speakereasy', 'Splice Bros Pizza & Pub'].sort()), 'FOOD_DRINK must be the 3 serving rooms, got ' + FOOD_DRINK);
check(JSON.stringify(FAZR_TYPES) === JSON.stringify(['FAZR', 'Movie Poster', 'Computer', 'INTERFAZE', 'FAZR-Portal']), 'FAZR_TYPES must be the 5 types in tier-2 order');
check(FAZR_POINTS.length === 45, 'expected 45 FAZR points embedded, got ' + FAZR_POINTS.length);
check(FAZR_POINTS.filter(p => p.spoiler).length === 3, 'expected 3 spoiler FAZR points, got ' + FAZR_POINTS.filter(p => p.spoiler).length);
const sorted = (a) => JSON.stringify(a.slice().sort());
check(sorted(fazrRooms('FAZR', false)) === sorted(['Arcade', 'Crystal Cave, The', 'FACADE Field Lab', 'Grayscale Swords', 'Mesmerite, The', 'Power Supply', 'Projection Room', 'Prototyzer', 'Sapphire Jazz Club', 'Scavengers/Battle Drums', 'Scavengers/TV Den', 'StarBot', 'Theater', 'Victor\u2019s Study']), 'public FAZR rooms wrong: ' + fazrRooms('FAZR', false));
check(sorted(fazrRooms('FAZR', true)) === sorted(['Arcade', 'Crystal Cave, The', 'FACADE Field Lab', 'Grayscale Swords', 'Headshot Remixer', 'Mesmerite, The', 'PhotoBooth (Left)', 'Power Supply', 'Projection Room', 'Prototyzer', 'Sapphire Jazz Club', 'Scavengers/Battle Drums', 'Scavengers/TV Den', 'StarBot', 'Theater', 'Theater Manager\u2019s Office', 'Victor\u2019s Study']), 'spoiler-on FAZR rooms wrong: ' + fazrRooms('FAZR', true));
check(sorted(fazrRooms('Movie Poster', false)) === sorted(['MossMan', 'Sapphire Jazz Club Balcony', 'Scavengers/TV Den', 'StarBot']), 'Movie Poster rooms wrong');
check(sorted(fazrRooms('Computer', false)) === sorted(['Film Storage', 'Power Supply', 'Projection Room', 'Prototyzer', 'Theater Manager\u2019s Office']), 'Computer rooms wrong');
check(sorted(fazrRooms('INTERFAZE', false)) === sorted(['FACADE Field Lab', 'StarBot', 'Theater Manager\u2019s Office', 'VERA']), 'INTERFAZE rooms wrong');
check(sorted(fazrRooms('FAZR-Portal', false)) === sorted(['Employee Break Room', 'Lobby', 'MossMan', 'Sapphire Jazz Club', 'Sapphire Jazz Club Balcony', 'Scavengers', 'Scavengers/School Desks']), 'FAZR-Portal rooms wrong');
check(fazrRooms('ANY', false).length === 23, 'public FAZR-any rooms should be 23, got ' + fazrRooms('ANY', false).length);
check(fazrRooms('ANY', true).length === 25, 'spoiler-on FAZR-any rooms should be 25, got ' + fazrRooms('ANY', true).length);
check(!fazrRooms('ANY', false).includes('Headshot Remixer'), 'FAZR-any must exclude Headshot with spoilers off');
check(fazrRooms('ANY', true).includes('Headshot Remixer'), 'FAZR-any must include Headshot with spoilers on');
for (const n of [...FOOD_DRINK, ...fazrRooms('ANY', false)]) check(pickable.includes(n), 'shortcut target must be pickable: ' + n);
// Description search (v1.1.0): name + description + artists.
const matchNames = (n, s) => pickableList(!!s).filter(r => roomMatches(r, n, !!s)).map(r => r.name).sort();
check(JSON.stringify(matchNames('bar')) === JSON.stringify(['Concessions (Lobby)', 'Speakereasy', 'Splice Bros Pizza & Pub'].sort()), 'search "bar" should find 3 rooms, got ' + matchNames('bar'));
check(JSON.stringify(matchNames('desk')) === JSON.stringify(['Film Storage', 'Power Supply', 'Scavengers/School Desks', 'Theater Manager\u2019s Office'].sort()), 'search "desk" should find 4 rooms, got ' + matchNames('desk'));
check(JSON.stringify(matchNames('BAR')) === JSON.stringify(matchNames('bar')), 'search must be case-insensitive');
check(matchNames('starbot').includes('StarBot'), 'search by name must still work');
check(matchNames('zzzz').length === 0, 'search with no match must find nothing');
check(matchNames('').length === pickable.length, 'empty search must match all pickable rooms');
check(JSON.stringify(matchNames('guitar')) === JSON.stringify(['Scavengers/TV Den']), 'search "guitar" should find Scavengers/TV Den, got ' + matchNames('guitar'));
// Spoiler detail in search (v1.3.0): "soda machine" is Break Room hidden
// detail — found only with Spoilers on.
check(matchNames('soda machine', false).length === 0, 'search "soda machine" must find nothing with spoilers off');
check(JSON.stringify(matchNames('soda machine', true)) === JSON.stringify(['Employee Break Room']), 'search "soda machine" must find Break Room with spoilers on');
// App infrastructure: version in the page must match version.json, and the
// update-bar / About / Install / Config / Spoilers controls must be present.
const appVersion = (html.match(/const APP_VERSION = '([^']+)'/) || [])[1];
const deployedVersion = JSON.parse(fs.readFileSync(__dirname + '/version.json', 'utf8')).version;
check(appVersion === deployedVersion, `APP_VERSION ${appVersion} must match version.json ${deployedVersion}`);
for (const id of ['updateBar', 'updateBtn', 'aboutBtn', 'installBtn', 'sheetWrap', 'configBtn', 'spoilerBtn', 'catGrid', 'tier2']) {
  check(html.includes('id="' + id + '"'), 'missing element #' + id);
}
check(html.includes('id="configCrawlsBtn"'), 'missing Config element #configCrawlsBtn');
check(html.includes('scrollRouteIntoView'), 'missing scrollRouteIntoView helper (v1.3.2)');
check(html.includes('padding-bottom: 100svh'), 'missing bottom scroll room (v1.3.3)');
check(html.includes('stepnum'), 'missing numbered step badges (v1.3.2)');
// v1.3.4: shortcut buttons are labels only, checked steps stay on
// screen, and step taps do not scroll.
const catGrid = (html.match(/<div class="grid" id="catGrid">[\s\S]*?<\/div>/) || [''])[0];
check(!catGrid.includes('<span class="meta">'), 'tier-1 buttons must have no subtitles (v1.3.4)');
for (const label of ['Stairs', 'Elevator', 'Food', 'Restroom', 'Exit', 'FAZR']) {
  check(catGrid.includes('>' + label + '</button>'), 'tier-1 button must be the label only: ' + label);
}
check(!html.includes("stairsBtn.querySelector('.meta')"), 'renderAvoid must not touch a button subtitle (v1.3.4)');
check(html.includes('grid-template-columns: 1fr 1fr 1fr'), 'shortcut grid must be 3 columns / 2 rows (v1.3.5)');
check(!html.includes('>Got it</button>'), 'What\'s new must not have its own Got it button — the sheet Close does it (v1.3.5)');
check(html.includes('function setDestination(name, label, scroll)'), 'setDestination must take a scroll flag (v1.3.6)');
check((html.match(/setDestination\([^;]*?, false\)/g) || []).length === 5, 'shortcut and tier-3 picks must pass scroll=false (v1.3.6, v1.4.2)');
check(html.includes('setDestination(b.dataset.room, b.dataset.room))'), 'room-search pick must still scroll (v1.3.6)');
check(html.includes('#tier2 button.on'), 'tier-2 buttons need a gold active state (v1.3.7)');
check(html.includes('function markTier2()'), 'markTier2 must exist (v1.3.7)');
check((html.match(/markTier2\(\);/g) || []).length === 3, 'markTier2 must run from renderTier2, setDestination and renderTier3 (v1.3.7, v1.4.2, v1.4.3)');
check(html.includes('routeStart') && html.includes('routePath'), 'missing walked-route state (v1.3.4)');
check(html.includes('doneMark'), 'missing done check mark (v1.3.4)');
check(html.includes('path.slice('), 'route summary must use the remaining steps (v1.3.4)');
check((html.match(/scrollRouteIntoView\(\);/g) || []).length === 1, 'scrollRouteIntoView must be called exactly once — new destination only (v1.3.4)');
check((html.match(/<span class="chev">/g) || []).length === 1, 'chevron must appear exactly once (picker rows only, not route steps)');
check(html.includes('a9nav-seen-version'), 'missing seen-version key for What\'s new');
check(html.includes("'" + appVersion + "': ["), 'WHATS_NEW must have notes for the shipped version ' + appVersion);
check(html.indexOf('aboutCheckUpdate') < html.indexOf("'<h3>Release Notes</h3>'"), 'Check for updates must sit above Release Notes in About');
check(!html.includes('Headshot Remixer isn\u2019t listed'), 'footer must not name the hidden room');
check(!html.includes('shows hidden things'), 'About must not name hidden things');
// v1.4.0: Share + Report header icons, FAZR prefix fix, Nearest-default.
for (const id of ['shareBtn', 'reportBtn']) {
  check(html.includes('id="' + id + '"'), 'missing element #' + id + ' (v1.4.0)');
}
check(html.includes('RESEARCH_FORM_URL'), 'missing research form URL (v1.4.0)');
check(html.includes('2144553325') && html.includes('1939760705') && html.includes('828332630'), 'missing research form entry IDs (v1.4.0)');
check(html.includes('data:image/png;base64,'), 'share QR must be embedded as a data URI (v1.4.0)');
check(!html.includes('__SHARE_QR__'), 'share QR placeholder must be replaced at build time (v1.4.0)');
check(html.includes("'Nearest FAZR point'"), 'FAZR-any prefix must be Nearest FAZR point (v1.4.0)');
check(html.includes('function routeTierOpt(o)'), 'routeTierOpt must exist (v1.4.0)');
check(html.includes('routeTierOpt(tier2Opts[0])'), 'category tap must route to nearest (v1.4.0)');
check(html.includes('id="shareCopyBtn"') && html.includes('id="shareNativeBtn"'), 'share sheet must have Copy link and Share buttons (v1.4.0)');
check(html.includes('id="reportOpenBtn"'), 'report sheet must have an open-form button (v1.4.0)');
check(html.includes('REPORT_KINDS'), 'report kinds must exist (v1.4.0)');
check(html.includes('class="iconBtn"'), 'Share and Report must be icon buttons, not pills (v1.4.0)');
// v1.4.1: a nearest route's destination is also a specific option, so
// markTier2 must let Nearest win — otherwise both light up at once.
check(html.includes('fromNearest'), 'markTier2 must prefer Nearest when the route came from a Nearest option (v1.4.1)');
// v1.4.2: Elevator/Exit must go gold when tapped, and FAZR types get a
// third level listing every room of that type.
check((html.match(/b\.classList\.add\('on'\)/g) || []).length === 2, 'Elevator and Exit taps must add the gold .on state (v1.4.2)');
check(html.includes('id="tier3"'), 'missing tier-3 container (v1.4.2)');
check(html.includes('function renderTier3(') && html.includes('function markTier3()'), 'tier-3 render/highlight must exist (v1.4.2)');
check(html.includes('data-tier3'), 'tier-3 room buttons must exist (v1.4.2)');
check(html.includes("activeCat === 'fazr' && o.targets"), 'the third level must be FAZR-only (v1.4.2)');
check(html.includes('#tier3 button.on'), 'tier-3 buttons need a gold active state (v1.4.2)');
// v1.4.3: Close is a true clear (route gone, all shortcut buttons back
// to defaults, back to the top); the header subtitle is gone; Report
// starts with a room picker.
check(html.includes('id="closeRoute"'), 'route box button must be Close (v1.4.3)');
check(!html.includes('Clear route'), 'no Clear route label left (v1.4.3)');
check(html.includes('clearTier2(); window.scrollTo(0, 0)'), 'Close must reset the shortcut buttons and scroll back to the top (v1.4.3)');
check(!html.includes('class="sub"'), 'no subtitle element left in the header (v1.4.3)');
check(!html.includes('.sub {'), 'no unused subtitle CSS left (v1.4.3)');
check(html.includes('id="reportRoomSel"'), 'Report must have a room select (v1.4.3)');
check(html.indexOf('reportRoomSel') < html.indexOf('What is it?'), 'room select must come before the thing to report (v1.4.3)');
check(html.includes('function firstTypeForRoom('), 'room change must re-pick the default type (v1.4.3)');
check(html.includes('params[RESEARCH_FORM_ENTRY.where] = reportRoom'), 'report form must pre-fill the selected room (v1.4.3)');
// v1.4.4: every room chooser is a ring picker followed by a search —
// "I am in", "Or go to a room" and Report — and the long lists are
// gone. The shortcut heading is now "How do I get to…".
check(html.includes('id="fromRoomSel"'), 'missing "I am in" room picker (v1.4.4)');
check(html.includes('id="destRoomSel"'), 'missing destination room picker (v1.4.4)');
check(html.includes('function roomOptions('), 'missing room picker options builder (v1.4.4)');
check(html.includes("'<optgroup label=\"' + label + '\">'"), 'room picker options must still group by floor when Config separates them (v1.4.19)');
check(html.includes('separateFloors') && html.includes('localeCompare'), 'room pickers must offer one A–Z list by default (v1.4.19)');
check(html.includes('let separateFloors = false'), 'separate-by-floor must default off — one A–Z list (v1.4.19)');
check(html.includes('configFloorsBtn'), 'Config must have the separate-by-floor switch (v1.4.19)');
check(html.includes('.roomSel {'), 'room pickers need the shared dark select style (v1.4.4)');
check(html.includes('Type to search rooms.'), 'empty search must show a hint, not the full list (v1.4.4)');
check(html.includes('How do I get to…'), 'shortcut heading must be "How do I get to…" (v1.4.4)');
check(!html.includes('Quickest way'), 'no "Quickest way" claim left (v1.4.4)');
check(html.includes('id="reportSearch"'), 'Report must have a room search (v1.4.4)');
check(html.includes('id="reportList"'), 'missing Report search results (v1.4.4)');
check(html.indexOf('reportSearch') < html.indexOf('What is it?'), 'Report search must come before the thing to report (v1.4.4)');
// v1.4.9: every sheet gets a sticky × at the top-right (openSheet
// builds all sheets), keeping the Close button at the bottom.
check(html.includes('id="sheetX"'), 'missing sheet top-close button (v1.4.9)');
check(html.includes('class="sheetTop"'), 'missing sticky sheet top row (v1.4.9)');
check(html.includes('#sheet .sheetTop') && html.includes('position: sticky'), 'sheet top row must stick while scrolling (v1.4.9)');
check(html.includes("getElementById('sheetX')"), 'sheet × must be wired to close (v1.4.9)');
check(html.includes('id="sheetClose"'), 'bottom Close button must stay (v1.4.9)');
// v1.4.10: grab bar gone (Allen — it was decoration promising a
// swipe-down the app doesn't have); tapping the version number
// opens the release notes in their own sheet.
check(!html.includes('class="grab"'), 'grab bar must be gone (v1.4.10)');
check(!html.includes('#sheet .grab'), 'grab bar CSS must be gone (v1.4.10)');
check(html.includes('<button id="ver"'), 'version number must be a tappable button (v1.4.10)');
check(html.includes('function openReleaseNotes()'), 'missing release-notes sheet (v1.4.10)');
check(html.includes("getElementById('ver').addEventListener('click', openReleaseNotes)"), 'version tap must be wired (v1.4.10)');
// v1.4.11: choosing a destination clears the "Or go to a room"
// search (Allen — stale "Office" results sat above the route box
// after tapping Restroom); a new sheet always opens at the top
// (the Release Notes sheet kept the About sheet's scroll position).
const setDestBlock = html.slice(html.indexOf('function setDestination'), html.indexOf('function renderDestList'));
check(setDestBlock.includes("getElementById('destSearch').value = ''"), 'choosing a destination must clear the destination search (v1.4.11)');
check(setDestBlock.includes("getElementById('destClear').classList.add('hidden')"), 'destination search clear button must hide with the reset (v1.4.11)');
check(setDestBlock.includes('renderDestList();'), 'destination list must re-render after the reset (v1.4.11)');
check(html.includes('sheet.scrollTop = 0'), 'a new sheet must open at the top (v1.4.11)');
// v1.4.12: the scroll reset must run AFTER the sheet is shown —
// v1.4.11 set scrollTop while the sheet was still hidden
// (display:none), a no-op, so the reset never took and the
// browser check caught sheets opening scrolled down.
const openSheetBlock = html.slice(html.indexOf('function openSheet'), html.indexOf('function closeSheet'));
check(openSheetBlock.indexOf("classList.add('open')") < openSheetBlock.indexOf('sheet.scrollTop = 0'), 'sheet scroll reset must run after the sheet is shown (v1.4.12)');
check(openSheetBlock.includes('requestAnimationFrame'), 'sheet scroll reset must also run after layout (v1.4.12)');
// v1.4.8: release notes must never give out spoilers (Allen caught the
// v1.4.7 note naming the TV Den's hidden FAZR). Check the WHATS_NEW
// block only — "Hidden door" is a legitimate route label elsewhere.
const whatsNewBlock = html.slice(html.indexOf('const WHATS_NEW'), html.indexOf('const RELEASE_VERSIONS'));
check(!whatsNewBlock.includes('hidden FAZR'), 'release notes must never name a hidden FAZR (v1.4.8)');
check(!whatsNewBlock.includes('Hidden door'), 'release notes must never name a hidden door (v1.4.8)');
check(!whatsNewBlock.includes('Headshot'), 'release notes must never name the hidden room (v1.4.8)');
// v1.4.7: Key of Color is a prop in the TV Den with a hidden FAZR,
// not a room — it must not appear as a room anywhere in the app.
check(!html.includes('"Key of Color"'), 'Key of Color must not appear as a room (v1.4.7)');
// v1.4.6: the Report nudge warns when a pick contradicts the listing,
// but never blocks the report.
check(html.includes('id="reportNudge"'), 'missing report nudge line (v1.4.6)');
check(html.includes('const syncNudge'), 'missing syncNudge (v1.4.6)');
check(html.includes('fazrRooms(reportType, spoilersOn)'), 'nudge must check the spoiler-aware FAZR list (v1.4.6)');
check(html.includes('already lists a '), 'missing "already lists" nudge (v1.4.6)');
check(html.includes('does not list a '), 'missing "does not list" nudge (v1.4.6)');
check((html.match(/syncNudge\(\);/g) || []).length === 5, 'syncNudge must run on every Report change — room, room search, type, kind, and at open (v1.4.6)');
// v1.4.5: after picking a room in "I am in", the button scrolls back
// to the top of the visible screen; the route box sits last, after
// "Or go to a room".
check(html.includes('function scrollFromIntoView()'), 'missing scrollFromIntoView helper (v1.4.5)');
check((html.match(/scrollFromIntoView\(\);/g) || []).length === 2, 'scrollFromIntoView must run after both "I am in" picks — search row and ring picker (v1.4.5)');
check(html.indexOf('id="route"') > html.indexOf('id="destList"'), 'route box must come after the destination list in the page (v1.4.5)');
check(html.indexOf('id="route"') > html.indexOf('id="tier3"'), 'route box must come after the shortcut tiers (v1.4.5)');
// No public description may name the hidden room — the room list is
// visible with spoilers off, so a name there would leak it.
for (const r of ROOMS) {
  check(!(r.description || '').includes('Headshot'), 'public description names Headshot: ' + r.name);
}
for (const id of ['avoidBtn', 'goStairs', 'goElevator', 'goRestroom', 'goExit', 'goFood', 'goInterfaze']) {
  check(!html.includes('id="' + id + '"'), 'old element must be gone: #' + id);
}
// v1.4.21: the update bar is a fixed overlay over the title row (like the
// Guide), with a Dismiss button and dismissal tracking so the 5-minute
// checks don't pop it straight back.
check(html.includes('id="updateDismissBtn"'), 'update bar must have a Dismiss button (v1.4.21)');
check(html.includes('position:fixed;top:0;left:0;right:0;z-index:5') && html.indexOf('id="updateBar"') < html.indexOf('<header>'), 'update bar must be a fixed overlay above the header, not inside it (v1.4.21)');
check(html.includes('dismissedUpdateVersion') && html.includes('latestSeenVersion'), 'update bar dismissal tracking must exist (v1.4.21)');
console.log(failures === 0 ? 'ALL ROUTING CHECKS PASSED' : failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
